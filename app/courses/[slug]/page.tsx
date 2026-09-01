import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Clock,
  Code,
  FileText,
  Gauge,
  Layers,
  type LucideIcon,
  Puzzle,
  Rocket,
  Shield,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CourseContent,
  type CourseContentModule,
} from "@/components/course/CourseContent";
import {
  BookmarkButton,
  ContinueLearningLink,
  CourseViewTracker,
} from "@/components/course/CoursePageActions";
import {
  capitalize,
  formatCount,
  formatHms,
} from "@/components/course/courseFormat";
import { Badge } from "@/components/ui/Badge";
import { Navbar } from "@/components/ui/Navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCourseBySlug, getCourseSlugs } from "@/sanity/lib/api";
import { urlFor } from "@/sanity/lib/image";

// TODO: wire to the learner-progress feature once it exists. Presentational only.
const PLACEHOLDER_PROGRESS_PERCENT = 35;

// Curated lucide icons for the learning-outcome list. Kept explicit (not a
// dynamic namespace lookup) for tree-shaking and type safety. Falls back to
// Sparkles for any unmapped name.
const OUTCOME_ICONS: Record<string, LucideIcon> = {
  code: Code,
  gauge: Gauge,
  layers: Layers,
  puzzle: Puzzle,
  rocket: Rocket,
  shield: Shield,
  sparkles: Sparkles,
  workflow: Workflow,
};

function outcomeIcon(name: string | null): LucideIcon {
  if (!name) return Sparkles;
  return OUTCOME_ICONS[name.toLowerCase()] ?? Sparkles;
}

export async function generateStaticParams() {
  const slugs = await getCourseSlugs();
  return slugs
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found | Vertex" };
  return {
    title: `${course.title} | Vertex`,
    description: course.summary ?? undefined,
  };
}

export default async function CoursePage({
  params,
}: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const {
    title,
    summary,
    level,
    popular,
    studentCount,
    coverImage,
    learningOutcomes,
    moduleCount,
    totalDurationSeconds,
    modules,
  } = course;

  const safeModules = modules ?? [];

  // Shape the curriculum for the client list: derive each module's duration from
  // its lessons and keep only serializable display fields.
  const moduleViews: CourseContentModule[] = safeModules.map((mod, index) => {
    const lessons = (mod.lessons ?? []).map((lesson) => ({
      id: lesson._id,
      slug: lesson.slug,
      title: lesson.title ?? "Untitled lesson",
      duration: lesson.duration ?? 0,
      freePreview: lesson.freePreview ?? false,
    }));
    return {
      key: mod._key ?? `module-${index}`,
      title: mod.title ?? `Module ${index + 1}`,
      summary: mod.summary,
      durationSeconds: lessons.reduce((sum, l) => sum + l.duration, 0),
      lessons,
    };
  });

  const firstLessonSlug = moduleViews[0]?.lessons[0]?.slug ?? null;
  const continueHref = firstLessonSlug ? `/lessons/${firstLessonSlug}` : "#";

  const coverUrl = coverImage?.asset?.url
    ? urlFor(coverImage).width(640).height(800).fit("crop").url()
    : null;

  const modulesLabel = `${moduleCount ?? safeModules.length} modules`;
  const durationLabel = formatHms(totalDurationSeconds);
  const studentLabel =
    studentCount && studentCount > 0
      ? `${formatCount(studentCount)} students`
      : null;

  const outcomes = learningOutcomes ?? [];

  const ContinueButton = (
    <button
      type="button"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-b from-primary-300 to-primary-500 px-6 font-medium text-sm text-neutral-900 shadow-lg transition-colors hover:from-primary-200 hover:to-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      Continue Learning
      <ArrowRight size={18} strokeWidth={2} />
    </button>
  );

  return (
    <div className="flex-1 pb-24">
      <CourseViewTracker
        courseTitle={title ?? ""}
        courseSlug={slug}
        courseLevel={level ?? null}
        isPopular={popular ?? false}
      />
      <Navbar />

      <main>
        {/* Breadcrumb */}
        <div className="mx-auto max-w-[1100px] px-8 pt-8">
          <nav className="flex items-center gap-2 text-small text-neutral-300">
            <Link href="/courses" className="hover:text-primary-300">
              All Courses
            </Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="text-neutral-0">{title}</span>
          </nav>
        </div>

        {/* Hero */}
        <section className="mx-auto max-w-[1100px] px-8 pt-8">
          <div className="grid gap-10 md:grid-cols-[minmax(0,340px)_1fr]">
            <div className="mx-auto w-full max-w-[340px] md:mx-0">
              {coverUrl ? (
                <div
                  className="aspect-[4/5] overflow-hidden rounded-xl border border-neutral-600 shadow-lg"
                  style={
                    coverImage?.asset?.metadata?.lqip
                      ? {
                          backgroundImage: `url(${coverImage.asset.metadata.lqip})`,
                          backgroundSize: "cover",
                        }
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt={coverImage?.alt || title || "Course cover"}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-neutral-600 bg-neutral-800 shadow-lg">
                  <span className="font-display text-[72px] font-semibold text-neutral-0">
                    {(title ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div>
              {popular && <Badge variant="popular">Popular</Badge>}
              <h1 className="font-display mt-4 text-[40px] font-bold leading-tight sm:text-5xl md:text-[56px] md:leading-[1.05]">
                {title}
              </h1>
              {summary && (
                <p className="text-body-lg text-neutral-200 mt-5 max-w-xl">
                  {summary}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-neutral-300">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3
                    size={14}
                    strokeWidth={2}
                    className="text-primary-300"
                  />
                  {capitalize(level) || "All levels"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} strokeWidth={2} className="text-primary-300" />
                  {durationLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText
                    size={14}
                    strokeWidth={2}
                    className="text-primary-300"
                  />
                  {modulesLabel}
                </span>
                {studentLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users
                      size={14}
                      strokeWidth={2}
                      className="text-primary-300"
                    />
                    {studentLabel}
                  </span>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ContinueLearningLink href={continueHref} courseTitle={title ?? ""} courseSlug={slug}>
                  {ContinueButton}
                </ContinueLearningLink>
                <BookmarkButton courseTitle={title ?? ""} courseSlug={slug} />
              </div>
            </div>
          </div>
        </section>

        {/* What you'll learn */}
        {outcomes.length > 0 && (
          <section className="mx-auto max-w-[1100px] px-8 py-16">
            <h2 className="text-display-2 font-display">What you&rsquo;ll learn</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {outcomes.map((outcome) => {
                const Icon = outcomeIcon(outcome.icon);
                return (
                  <div
                    key={outcome._key}
                    className="flex gap-4 rounded-lg border border-neutral-600 bg-neutral-800/50 p-6"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary-500/40 text-primary-300">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-h2 font-display">{outcome.title}</h3>
                      <p className="text-body text-neutral-200 mt-2">
                        {outcome.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Course content */}
        <CourseContent
          moduleCount={moduleCount ?? safeModules.length}
          totalDurationSeconds={totalDurationSeconds ?? 0}
          modules={moduleViews}
        />
      </main>

      {/* Sticky progress bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-600 bg-neutral-900/95 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-primary-500/20 to-transparent blur-2xl"
        />
        <div className="relative mx-auto flex max-w-[1100px] flex-wrap items-center gap-4 px-8 py-4">
          <div className="min-w-[220px] flex-1">
            <span className="text-small text-neutral-200">Your Progress</span>
            <div className="mt-1">
              <ProgressBar percent={PLACEHOLDER_PROGRESS_PERCENT} />
            </div>
          </div>
          <ContinueLearningLink href={continueHref} courseTitle={title ?? ""} courseSlug={slug} className="shrink-0">
            {ContinueButton}
          </ContinueLearningLink>
        </div>
      </div>
    </div>
  );
}
