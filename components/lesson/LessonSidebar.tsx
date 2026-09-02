"use client";

import { CheckCircle2, ChevronDown, ChevronLeft, Circle, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { analytics } from "@/lib/analytics/client";
import { formatHms } from "@/components/course/courseFormat";
import { ProgressBar } from "@/components/ui/ProgressBar";

export type SidebarLesson = {
  id: string;
  slug: string | null;
  title: string;
  duration: number;
};

export type SidebarModule = {
  key: string;
  title: string;
  durationSeconds: number;
  lessons: SidebarLesson[];
};

type LessonStatus = "completed" | "playing" | "upcoming";

function StatusIcon({ status }: { status: LessonStatus }) {
  if (status === "completed")
    return <CheckCircle2 size={16} strokeWidth={2} className="text-primary-300" />;
  if (status === "playing")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-neutral-900">
        <Play size={11} strokeWidth={2} fill="currentColor" className="ml-px" />
      </span>
    );
  return <Circle size={16} strokeWidth={2} className="text-neutral-500" />;
}

function ModuleBlock({
  module,
  moduleNumber,
  defaultOpen,
  currentLessonId,
  statusFor,
}: {
  module: SidebarModule;
  moduleNumber: number;
  defaultOpen: boolean;
  currentLessonId: string;
  statusFor: (lessonId: string) => LessonStatus;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-4 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-500 text-small text-neutral-200">
          {moduleNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body text-neutral-0">{module.title}</span>
          <span className="text-small text-neutral-400">
            {formatHms(module.durationSeconds)}
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="space-y-1 pb-3">
          {module.lessons.map((lesson) => {
            const status = statusFor(lesson.id);
            const active = lesson.id === currentLessonId;
            const inner = (
              <span
                className={`flex items-start gap-3 rounded-md px-3 py-2 ${
                  active ? "bg-neutral-800" : "hover:bg-neutral-800/60"
                }`}
              >
                <span className="mt-0.5">
                  <StatusIcon status={status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-body ${
                      active ? "text-primary-300" : "text-neutral-100"
                    }`}
                  >
                    {lesson.title}
                  </span>
                  <span className="text-small text-neutral-400">
                    {active ? "Now playing" : formatHms(lesson.duration)}
                  </span>
                </span>
              </span>
            );

            return (
              <li key={lesson.id}>
                {lesson.slug ? (
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() =>
                      analytics.lessonClicked({
                        lesson_slug: lesson.slug,
                        module_number: moduleNumber,
                        source: "lesson_sidebar",
                      })
                    }
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function LessonSidebar({
  courseTitle,
  courseSlug,
  courseInitial,
  modules,
  currentModuleIndex,
  currentLessonId,
  progressPercent,
}: {
  courseTitle: string;
  courseSlug: string;
  courseInitial: string;
  modules: SidebarModule[];
  currentModuleIndex: number;
  currentLessonId: string;
  progressPercent: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Presentational progress: lessons before the current one (in curriculum
  // order) read as completed. No real learner-progress backend yet.
  const orderedIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const currentPos = orderedIds.indexOf(currentLessonId);
  const statusFor = (lessonId: string): LessonStatus => {
    if (lessonId === currentLessonId) return "playing";
    const pos = orderedIds.indexOf(lessonId);
    return pos > -1 && pos < currentPos ? "completed" : "upcoming";
  };

  const body = (
    <>
      <Link
        href={`/courses/${courseSlug}`}
        className="inline-flex items-center gap-2 text-body text-primary-300 hover:text-primary-200"
      >
        <ChevronLeft size={16} strokeWidth={2} />
        Back to course
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-0 text-h3 font-semibold text-neutral-900">
          {courseInitial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body text-neutral-0">{courseTitle}</p>
          <p className="text-small text-neutral-400">{progressPercent}% complete</p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar percent={progressPercent} />
      </div>

      <p className="mt-6 text-small font-semibold uppercase tracking-wide text-neutral-400">
        Module {currentModuleIndex + 1} of {modules.length}
      </p>

      <div className="mt-2">
        {modules.map((module, index) => (
          <ModuleBlock
            key={module.key}
            module={module}
            moduleNumber={index + 1}
            defaultOpen={index === currentModuleIndex}
            currentLessonId={currentLessonId}
            statusFor={statusFor}
          />
        ))}
      </div>
    </>
  );

  return (
    <aside className="border-b border-neutral-600 lg:h-screen lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between px-6 py-4 text-body text-neutral-0 lg:hidden"
      >
        Course content
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`text-neutral-300 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`${mobileOpen ? "block" : "hidden"} px-6 pb-8 lg:block lg:pt-6`}>
        {body}
      </div>
    </aside>
  );
}
