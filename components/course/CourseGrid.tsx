"use client";

import Link from "next/link";
import posthog from "posthog-js";
import type { COURSES_QUERY_RESULT } from "@/sanity.types";
import { CourseCard } from "@/components/ui/Card";
import { CourseIcon } from "@/components/ui/CourseIcon";
import { formatHms } from "./courseFormat";

/**
 * Responsive grid of course cards, each linking to its detail page. Shared by
 * the home page's "All Courses" section and the /courses catalog page.
 */
export function CourseGrid({ courses }: { courses: COURSES_QUERY_RESULT }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course._id}
          href={`/courses/${course.slug}`}
          onClick={() =>
            posthog.capture("course_card_clicked", {
              course_title: course.title ?? "Untitled course",
              course_slug: course.slug,
              course_level: course.level ?? "All levels",
              is_popular: course.popular ?? false,
            })
          }
        >
          <CourseCard
            icon={
              <CourseIcon
                label={(course.title ?? "?").charAt(0).toUpperCase()}
                className="bg-neutral-900 text-neutral-0"
              />
            }
            title={course.title ?? "Untitled course"}
            description={course.summary ?? ""}
            level={course.level ?? "All levels"}
            duration={formatHms(course.totalDurationSeconds)}
            modules={`${course.moduleCount ?? 0} modules`}
            highlighted={course.popular ?? false}
          />
        </Link>
      ))}
    </div>
  );
}
