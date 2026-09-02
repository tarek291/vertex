"use client";

import { type ReactNode, useState } from "react";
import { analytics } from "@/lib/analytics/client";

type TabKey = "content" | "notes";

/**
 * Underline tab switcher for the lesson body. Panels are server-rendered and
 * passed in as nodes so the Portable Text renderer stays out of this bundle.
 */
export function LessonTabs({
  lessonSlug,
  content,
  notes,
}: {
  lessonSlug: string;
  content: ReactNode;
  notes: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("content");

  const select = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    analytics.lessonTabSelected({ lesson_slug: lessonSlug, tab: next });
  };

  const tabClass = (key: TabKey) =>
    `-mb-px border-b-2 pb-3 text-body-lg transition-colors ${
      tab === key
        ? "border-primary-400 text-neutral-0"
        : "border-transparent text-neutral-300 hover:text-neutral-100"
    }`;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Lesson sections"
        className="flex items-center gap-8 border-b border-neutral-600"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "content"}
          className={tabClass("content")}
          onClick={() => select("content")}
        >
          Lesson Content
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "notes"}
          className={tabClass("notes")}
          onClick={() => select("notes")}
        >
          Notes
        </button>
      </div>

      <div role="tabpanel">{tab === "content" ? content : <div className="pt-8">{notes}</div>}</div>
    </div>
  );
}
