import type { Metadata } from "next";
import { CourseGrid } from "@/components/course/CourseGrid";
import { Navbar } from "@/components/ui/Navigation";
import { getCourses } from "@/sanity/lib/api";

export const metadata: Metadata = {
  title: "All Courses | Vertex",
  description: "Browse every course on Vertex.",
};

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="flex-1">
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-8 py-16">
        <h1 className="text-display-2 font-display">All Courses</h1>
        <p className="text-body text-neutral-300 mt-2">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </p>

        {courses.length > 0 ? (
          <div className="mt-8">
            <CourseGrid courses={courses} />
          </div>
        ) : (
          <p className="text-body text-neutral-200 mt-8">No courses yet.</p>
        )}
      </main>
    </div>
  );
}
