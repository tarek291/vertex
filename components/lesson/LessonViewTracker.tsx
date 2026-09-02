"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics/client";

/**
 * Fires `lesson_viewed` once when the lesson page mounts. Rendered as a hidden
 * element inside the server component (mirrors CourseViewTracker).
 */
export function LessonViewTracker({
  lessonSlug,
  courseSlug,
  lessonLabel,
  freePreview,
}: {
  lessonSlug: string;
  courseSlug: string | null;
  lessonLabel: string | null;
  freePreview: boolean;
}) {
  useEffect(() => {
    analytics.lessonViewed({
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      lesson_label: lessonLabel,
      free_preview: freePreview,
    });
    // Only fire on mount — slug is the stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonSlug]);

  return null;
}
