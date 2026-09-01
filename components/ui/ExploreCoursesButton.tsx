"use client";

import { ArrowRight } from "lucide-react";
import posthog from "posthog-js";

export function ExploreCoursesButton() {
  return (
    <button
      type="button"
      onClick={() => posthog.capture("explore_courses_clicked", { source: "hero" })}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-b from-primary-300 to-primary-500 px-6 font-medium text-sm text-neutral-900 shadow-lg transition-colors hover:from-primary-200 hover:to-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      Explore Courses
      <ArrowRight size={18} strokeWidth={2} />
    </button>
  );
}
