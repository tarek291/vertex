"use client";

import { useEffect, type ReactNode } from "react";
import posthog from "posthog-js";

/**
 * Fires a course_viewed event once when the course detail page mounts.
 * Rendered as a hidden element inside the server component.
 */
export function CourseViewTracker({
  courseTitle,
  courseSlug,
  courseLevel,
  isPopular,
}: {
  courseTitle: string;
  courseSlug: string;
  courseLevel: string | null;
  isPopular: boolean;
}) {
  useEffect(() => {
    posthog.capture("course_viewed", {
      course_title: courseTitle,
      course_slug: courseSlug,
      course_level: courseLevel,
      is_popular: isPopular,
    });
    // Only fire on mount — slug is the stable identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  return null;
}

/**
 * Client link that wraps the Continue Learning CTA and tracks clicks.
 */
export function ContinueLearningLink({
  href,
  courseTitle,
  courseSlug,
  children,
  className,
}: {
  href: string;
  courseTitle: string;
  courseSlug: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() =>
        posthog.capture("continue_learning_clicked", {
          course_title: courseTitle,
          course_slug: courseSlug,
        })
      }
    >
      {children}
    </a>
  );
}

/**
 * Bookmark button with PostHog capture.
 */
export function BookmarkButton({
  courseTitle,
  courseSlug,
}: {
  courseTitle: string;
  courseSlug: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        posthog.capture("bookmark_clicked", {
          course_title: courseTitle,
          course_slug: courseSlug,
        })
      }
      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-neutral-500 px-6 font-medium text-sm text-neutral-0 transition-colors hover:border-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
      Bookmark
    </button>
  );
}
