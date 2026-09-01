import { ArrowRight, Search, Sparkles, Star, ZoomIn } from "lucide-react";
import Link from "next/link";
import { CourseGrid } from "@/components/course/CourseGrid";
import { ExploreCoursesButton } from "@/components/ui/ExploreCoursesButton";
import { Navbar } from "@/components/ui/Navigation";
import { getCourses } from "@/sanity/lib/api";

function HeroSearch() {
  return (
    <div className="relative w-full max-w-2xl">
      <Search
        size={20}
        strokeWidth={2}
        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-primary-400"
      />
      <input
        readOnly
        placeholder="Ask anything about your learning…"
        className="h-14 w-full rounded-lg border border-neutral-600 bg-neutral-800/60 pl-14 pr-20 text-body-lg text-neutral-0 placeholder:text-neutral-300 outline-none focus:border-primary-500"
      />
      <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-neutral-600 px-2 py-1 text-small text-neutral-300 sm:block">
        ⌘K
      </kbd>
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-neutral-600 px-8 py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <Sparkles
          size={18}
          strokeWidth={2}
          className="mb-4 text-primary-300"
        />
        <span className="rounded-full border border-primary-500/60 px-4 py-1 text-small font-semibold uppercase tracking-[0.2em] text-primary-300">
          Intelligent Learning
        </span>
        <h1 className="font-display mt-6 text-[40px] font-bold leading-tight sm:text-5xl md:text-6xl md:leading-[1.1]">
          Search your learning
          <br className="hidden sm:block" /> in{" "}
          <span className="text-primary-400">plain English.</span>
        </h1>
        <p className="text-body-lg text-neutral-200 mt-6 max-w-xl">
          Vertex understands what you want to learn and finds the exact lessons
          across all your courses.
        </p>

        <div className="relative mt-10 flex items-center justify-center">
          <span
            aria-hidden
            className="absolute -left-16 hidden h-10 w-10 items-center justify-center rounded-full border border-primary-500/50 text-primary-300 md:flex"
          >
            <ZoomIn size={18} strokeWidth={2} />
          </span>
          <ExploreCoursesButton />
        </div>

        <div className="mt-8 flex w-full justify-center">
          <HeroSearch />
        </div>
      </div>
    </section>
  );
}

async function AllCourses() {
  const courses = await getCourses();

  return (
    <section className="mx-auto max-w-[1440px] px-8 py-16">
      <div className="flex items-end justify-between">
        <h2 className="text-display-2 font-display">All Courses</h2>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-body text-primary-300 hover:text-primary-200"
        >
          View all courses
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
      <div className="mt-8">
        <CourseGrid courses={courses} />
      </div>
    </section>
  );
}

function FooterStrip() {
  return (
    <footer className="relative overflow-hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-8 pb-16">
        <span className="h-px flex-1 bg-neutral-600" />
        <span className="inline-flex items-center gap-2 text-body text-neutral-200">
          <Star
            size={16}
            strokeWidth={2}
            className="text-primary-400"
            fill="currentColor"
          />
          New courses and lessons added every week.
        </span>
        <span className="h-px flex-1 bg-neutral-600" />
      </div>
      <div
        aria-hidden
        className="flex h-48 items-end justify-center gap-3 px-8 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      >
        {[40, 72, 55, 96, 64, 120, 80, 100, 52, 84, 60, 44].map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className="w-10 rounded-t-sm bg-gradient-to-t from-primary-500/70 via-primary-500/25 to-transparent blur-[1px]"
          />
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary-500/20 to-transparent blur-2xl"
      />
    </footer>
  );
}

export default function Home() {
  return (
    <div className="flex-1">
      <Navbar />
      <main>
        <Hero />
        <AllCourses />
        <FooterStrip />
      </main>
    </div>
  );
}
