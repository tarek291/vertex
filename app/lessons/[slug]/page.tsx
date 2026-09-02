import { Suspense } from "react";
import { BarChart3, ChevronRight, Clock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { capitalize, formatHms } from "@/components/course/courseFormat";
import { BookmarkLessonButton } from "@/components/lesson/BookmarkLessonButton";
import { LessonContent } from "@/components/lesson/LessonContent";
import { MockLessonPlaceholder } from "@/components/lesson/MockLessonPlaceholder";
import { LessonNotesTab } from "@/components/lesson/LessonNotesTab";
import {
  LessonSidebar,
  type SidebarModule,
} from "@/components/lesson/LessonSidebar";
import { LessonTabs } from "@/components/lesson/LessonTabs";
import { LessonViewTracker } from "@/components/lesson/LessonViewTracker";
import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { Navbar } from "@/components/ui/Navigation";
import { getMockLessonBySlug } from "@/lib/search/mock-catalog";
import { parseVideoUrl } from "@/lib/video";
import { getCourseBySlug, getLessonBySlug, getLessonSlugs } from "@/sanity/lib/api";

// Dev-only: the search route can serve results from a local mock catalog before
// content is in Sanity (see lib/search/mock.ts). Render a placeholder for those
// slugs instead of a 404 so the search UI stays clickable. Never true in prod.
const mockFallbackAllowed = process.env.NODE_ENV !== "production";

// TODO: wire to the learner-progress feature once it exists. Presentational only
// (matches the course detail page's placeholder).
const PLACEHOLDER_PROGRESS_PERCENT = 35;

const numberFmt = new Intl.NumberFormat("en-US");

export async function generateStaticParams() {
  const slugs = await getLessonSlugs();
  return slugs
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) {
    const mock = mockFallbackAllowed ? getMockLessonBySlug(slug) : undefined;
    if (mock) return { title: `${mock.lessonTitle} · ${mock.courseTitle} | Vertex` };
    return { title: "Lesson not found | Vertex" };
  }
  const course = lesson.course?.title ? ` · ${lesson.course.title}` : "";
  return { title: `${lesson.title}${course} | Vertex` };
}

/** First readable sentence of the notes, used as the header lead-in. */
function leadIn(notes: NonNullable<Awaited<ReturnType<typeof getLessonBySlug>>>["notes"]) {
  const firstBlock = (notes ?? []).find(
    (n): n is Extract<typeof n, { _type: "block" }> => n._type === "block",
  );
  const text = (firstBlock?.children ?? [])
    .map((c) => c.text ?? "")
    .join("")
    .trim();
  return text || null;
}

export default async function LessonPage({
  params,
}: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) {
    const mock = mockFallbackAllowed ? getMockLessonBySlug(slug) : undefined;
    if (mock) return <MockLessonPlaceholder lesson={mock} />;
    notFound();
  }

  const {
    _id,
    title,
    videoUrl,
    duration,
    freePreview,
    studentCount,
    poster,
    keyPoints,
    proTip,
    notes,
    resources,
    course,
  } = lesson;

  const lessonTitle = title ?? "Untitled lesson";
  const courseDetail = course?.slug ? await getCourseBySlug(course.slug) : null;

  // Sidebar curriculum from the owning course (no query change — reuses the
  // course detail query).
  const sidebarModules: SidebarModule[] = (courseDetail?.modules ?? []).map(
    (mod, index) => {
      const lessons = (mod.lessons ?? []).map((l) => ({
        id: l._id,
        slug: l.slug,
        title: l.title ?? "Untitled lesson",
        duration: l.duration ?? 0,
      }));
      return {
        key: mod._key ?? `module-${index}`,
        title: mod.title ?? `Module ${index + 1}`,
        durationSeconds: lessons.reduce((sum, l) => sum + l.duration, 0),
        lessons,
      };
    },
  );

  const currentModuleIndex = Math.max(
    0,
    sidebarModules.findIndex((m) => m.lessons.some((l) => l.id === _id)),
  );

  const courseTitle = course?.title ?? courseDetail?.title ?? null;
  const courseInitial = (courseTitle ?? lessonTitle).charAt(0).toUpperCase();
  const label = course?.label ?? null;
  const moduleTitle = course?.moduleTitle ?? null;

  const poster_ = poster?.asset?.url ?? parseVideoUrl(videoUrl).thumbnailUrl;
  const lead = leadIn(notes);

  const levelLabel = capitalize(courseDetail?.level) || "All levels";
  const studentLabel =
    studentCount && studentCount > 0
      ? `${numberFmt.format(studentCount)} students`
      : null;

  const hasSidebar = Boolean(course && sidebarModules.length > 0);

  return (
    <div className="flex-1">
      <LessonViewTracker
        lessonSlug={slug}
        courseSlug={course?.slug ?? null}
        lessonLabel={label}
        freePreview={freePreview ?? false}
      />
      <Navbar />

      <div className="flex flex-col lg:flex-row">
        {hasSidebar && (
          <LessonSidebar
            courseTitle={courseTitle ?? ""}
            courseSlug={course!.slug ?? ""}
            courseInitial={courseInitial}
            modules={sidebarModules}
            currentModuleIndex={currentModuleIndex}
            currentLessonId={_id}
            progressPercent={PLACEHOLDER_PROGRESS_PERCENT}
          />
        )}

        <main className="min-w-0 flex-1 px-6 pb-24 pt-8 sm:px-10">
          <div className="mx-auto max-w-[760px]">
            {/* Breadcrumb */}
            <nav className="flex flex-wrap items-center gap-2 text-small text-neutral-300">
              <Link href="/courses" className="hover:text-primary-300">
                All Courses
              </Link>
              {course?.slug && courseTitle && (
                <>
                  <ChevronRight size={12} strokeWidth={2} />
                  <Link
                    href={`/courses/${course.slug}`}
                    className="hover:text-primary-300"
                  >
                    {courseTitle}
                  </Link>
                </>
              )}
              {moduleTitle && (
                <>
                  <ChevronRight size={12} strokeWidth={2} />
                  <span>{moduleTitle}</span>
                </>
              )}
              <ChevronRight size={12} strokeWidth={2} />
              <span className="text-neutral-0">{lessonTitle}</span>
            </nav>

            {/* Header */}
            <div className="mt-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {label && (
                  <span className="inline-flex items-center rounded-xs border border-primary-500/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
                    Lesson {label}
                  </span>
                )}
                <h1 className="font-display mt-3 text-[40px] font-bold leading-tight md:text-5xl">
                  {lessonTitle}
                </h1>
              </div>
              <BookmarkLessonButton lessonSlug={slug} />
            </div>

            {lead && (
              <p className="mt-4 max-w-xl text-body-lg text-neutral-300">{lead}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-neutral-300">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} strokeWidth={2} className="text-primary-300" />
                {formatHms(duration)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 size={14} strokeWidth={2} className="text-primary-300" />
                {levelLabel}
              </span>
              {studentLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <Users size={14} strokeWidth={2} className="text-primary-300" />
                  {studentLabel}
                </span>
              )}
              {freePreview && (
                <span className="inline-flex items-center gap-1.5 text-primary-300">
                  Free preview
                </span>
              )}
            </div>

            {/* Video */}
            <div className="mt-8">
              <Suspense
                fallback={
                  <div className="aspect-video w-full rounded-xl border border-neutral-600 bg-neutral-900 shadow-lg" />
                }
              >
                <VideoPlayer
                  videoUrl={videoUrl}
                  title={lessonTitle}
                  posterUrl={poster_}
                  courseInitial={courseInitial}
                  courseSlug={course?.slug ?? null}
                  lessonSlug={slug}
                  lessonLabel={label}
                />
              </Suspense>
            </div>

            {/* Tabs */}
            <div className="mt-10">
              <LessonTabs
                lessonSlug={slug}
                content={
                  <LessonContent
                    notes={notes}
                    keyPoints={keyPoints}
                    proTip={proTip}
                    resources={resources}
                    lessonSlug={slug}
                  />
                }
                notes={<LessonNotesTab />}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
