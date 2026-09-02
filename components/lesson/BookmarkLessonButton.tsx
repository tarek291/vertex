"use client";

import { Bookmark } from "lucide-react";
import { analytics } from "@/lib/analytics/client";

/** Presentational bookmark toggle for the lesson header (no persistence yet). */
export function BookmarkLessonButton({ lessonSlug }: { lessonSlug: string }) {
  return (
    <button
      type="button"
      aria-label="Bookmark this lesson"
      onClick={() =>
        analytics.lessonBookmarkClicked({ lesson_slug: lessonSlug })
      }
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-600 text-neutral-200 transition-colors hover:border-neutral-400 hover:text-primary-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      <Bookmark size={18} strokeWidth={2} />
    </button>
  );
}
