"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatClock, formatHms } from "./courseFormat";

export type CourseContentLesson = {
  id: string;
  slug: string | null;
  title: string;
  duration: number;
  freePreview: boolean;
};

export type CourseContentModule = {
  key: string;
  title: string;
  summary: string | null;
  durationSeconds: number;
  lessons: CourseContentLesson[];
};

// Modules shown before the "Show all" toggle kicks in (matches the reference,
// which previews a subset and reveals the rest on demand).
const PREVIEW_COUNT = 5;

function ModuleRow({
  module,
  moduleNumber,
}: {
  module: CourseContentModule;
  moduleNumber: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-5 text-left sm:px-6"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-500 text-small text-neutral-200">
          {moduleNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-h3 text-neutral-0">{module.title}</span>
          {module.summary && (
            <span className="mt-1 block text-body text-neutral-300">
              {module.summary}
            </span>
          )}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          <span className="text-small text-primary-300">
            {formatHms(module.durationSeconds)}
          </span>
          <ChevronDown
            size={18}
            strokeWidth={2}
            className={`text-neutral-300 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {open && module.lessons.length > 0 && (
        <ul className="border-t border-neutral-600 bg-neutral-900/40 px-4 pb-4 pt-2 sm:px-6">
          {module.lessons.map((lesson, lessonIndex) => {
            const label = `Lesson ${moduleNumber}.${lessonIndex + 1}`;
            const row = (
              <span className="flex items-center gap-3 py-2">
                <span className="w-16 shrink-0 text-small text-neutral-400">
                  {label}
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-neutral-100">
                  {lesson.title}
                </span>
                {lesson.freePreview && <Badge variant="lesson">Free preview</Badge>}
                <span className="shrink-0 text-small text-neutral-400">
                  {formatClock(lesson.duration)}
                </span>
              </span>
            );
            return (
              <li key={lesson.id} className="border-b border-neutral-700 last:border-0">
                {lesson.slug ? (
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className="block rounded-sm hover:bg-neutral-800/60"
                  >
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CourseContent({
  moduleCount,
  totalDurationSeconds,
  modules,
}: {
  moduleCount: number;
  totalDurationSeconds: number;
  modules: CourseContentModule[];
}) {
  const [showAll, setShowAll] = useState(false);
  const hasToggle = modules.length > PREVIEW_COUNT;
  const visible = showAll || !hasToggle ? modules : modules.slice(0, PREVIEW_COUNT);

  return (
    <section className="mx-auto max-w-[1100px] px-8 py-16">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-display-2 font-display">Course Content</h2>
        <span className="text-small text-neutral-300">
          {moduleCount} modules &middot; {formatHms(totalDurationSeconds)}
        </span>
      </div>

      <div className="mt-8 divide-y divide-neutral-600 overflow-hidden rounded-lg border border-neutral-600 bg-neutral-800/50">
        {visible.map((module, index) => (
          <ModuleRow key={module.key} module={module} moduleNumber={index + 1} />
        ))}
      </div>

      {hasToggle && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-2 text-body text-primary-300 hover:text-primary-200"
          >
            {showAll ? "Show less" : `Show all ${modules.length} modules`}
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={`transition-transform ${showAll ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      )}
    </section>
  );
}
