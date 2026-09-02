import { ChevronRight, Clock, FlaskConical } from "lucide-react";
import Link from "next/link";
import { formatHms } from "@/components/course/courseFormat";
import { Navbar } from "@/components/ui/Navigation";
import type { MockLesson } from "@/lib/search/mock-catalog";

/**
 * Stand-in for a lesson page when a **dev-only** mock search result is opened
 * before the matching content exists in Sanity (see `lib/search/mock.ts`).
 * Renders instead of `notFound()` so the search UI stays clickable end-to-end.
 * Never reached in production — the mock catalog is dev-only.
 */
export function MockLessonPlaceholder({ lesson }: { lesson: MockLesson }) {
  return (
    <div className="flex-1">
      <Navbar />
      <main className="px-6 pb-24 pt-8 sm:px-10">
        <div className="mx-auto max-w-[760px]">
          <nav className="flex flex-wrap items-center gap-2 text-small text-neutral-300">
            <Link href="/courses" className="hover:text-primary-300">
              All Courses
            </Link>
            <ChevronRight size={12} strokeWidth={2} />
            <span>{lesson.courseTitle}</span>
            <ChevronRight size={12} strokeWidth={2} />
            <span className="text-neutral-0">{lesson.lessonTitle}</span>
          </nav>

          <div className="mt-6 flex items-center gap-2 rounded-md border border-primary-500/40 bg-primary-500/10 px-3 py-2 text-small text-primary-200">
            <FlaskConical size={14} strokeWidth={2} />
            Placeholder content from the local search mock &mdash; this lesson is
            not in Sanity yet.
          </div>

          <span className="mt-6 inline-flex items-center rounded-xs border border-primary-500/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
            {lesson.lessonLabel ?? "Lesson"}
          </span>
          <h1 className="font-display mt-3 text-[40px] font-bold leading-tight md:text-5xl">
            {lesson.lessonTitle}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-neutral-300">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} strokeWidth={2} className="text-primary-300" />
              {formatHms(lesson.durationSeconds ?? 0)}
            </span>
            <span>{lesson.courseTitle}</span>
            {lesson.moduleLabel && <span>{lesson.moduleLabel}</span>}
          </div>

          <div className="mt-8 aspect-video w-full rounded-xl border border-neutral-600 bg-neutral-900" />

          <h2 className="font-display mt-10 text-h3">In this lesson</h2>
          <ul className="mt-4 space-y-2 text-body text-neutral-200">
            {lesson.keyPoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-xl text-body text-neutral-300">
            {lesson.notes}
          </p>

          <div className="mt-10 flex gap-4 text-small">
            <Link
              href="/search"
              className="rounded-md border border-neutral-600 px-4 py-2 hover:border-neutral-500"
            >
              Back to search
            </Link>
            <Link
              href="/courses"
              className="rounded-md border border-neutral-600 px-4 py-2 hover:border-neutral-500"
            >
              Browse the catalog
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
