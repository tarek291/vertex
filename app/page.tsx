import {
  Bell,
  Bookmark,
  BarChart2,
  Clock,
  FileText,
  PlayCircle,
  Search,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TextInput, Select } from "@/components/ui/Input";
import {
  CourseCard,
  LessonVideoCard,
  LessonCard,
  ResourceCard,
} from "@/components/ui/Card";
import { Navbar, Breadcrumbs, Pagination } from "@/components/ui/Navigation";

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-neutral-600 bg-neutral-800/50 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-small font-semibold uppercase tracking-wide text-primary-300">
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const swatch = (label: string, hex: string, className: string) => (
  <div key={label} className="flex flex-col gap-2">
    <div
      className={`h-16 w-full rounded-sm border border-neutral-600 ${className}`}
    />
    <div className="text-small text-neutral-200">{label}</div>
    <div className="text-small text-neutral-300">{hex}</div>
  </div>
);

export default function Home() {
  return (
    <div className="flex-1">
      <Navbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-10">
        <header>
          <div className="flex items-center gap-2 text-small font-semibold uppercase tracking-wide text-primary-300">
            Vertex Design System
          </div>
          <h1 className="text-display-1 font-display mt-2">Design System</h1>
          <p className="text-body-lg text-neutral-200 mt-2 max-w-2xl">
            A unified design language for Vertex learning platform. Clean,
            modern and focused on clarity, consistency and intuitive learning
            experiences.
          </p>
        </header>

        <Section number="01" title="Colors">
          <div className="text-small text-neutral-300 mb-2">Primary</div>
          <div className="grid grid-cols-5 gap-4 mb-6">
            {swatch("Primary 500", "#F59E0B", "bg-primary-500")}
            {swatch("Primary 400", "#D97706", "bg-primary-400")}
            {swatch("Primary 300", "#FBBF24", "bg-primary-300")}
            {swatch("Primary 200", "#FCD34D", "bg-primary-200")}
            {swatch("Primary 100", "#FEF3C7", "bg-primary-100")}
          </div>
          <div className="text-small text-neutral-300 mb-2">Neutral</div>
          <div className="grid grid-cols-5 gap-4 sm:grid-cols-10">
            {swatch("900", "#0B0B0D", "bg-neutral-900")}
            {swatch("800", "#111214", "bg-neutral-800")}
            {swatch("700", "#1A181F", "bg-neutral-700")}
            {swatch("600", "#23262B", "bg-neutral-600")}
            {swatch("500", "#2F3338", "bg-neutral-500")}
            {swatch("400", "#4B5158", "bg-neutral-400")}
            {swatch("300", "#687280", "bg-neutral-300")}
            {swatch("200", "#9CA3AF", "bg-neutral-200")}
            {swatch("100", "#E5E7EB", "bg-neutral-100")}
            {swatch("White", "#FFFFFF", "bg-neutral-0")}
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Section number="02" title="Typography">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-display-2 font-display">Ag</div>
                <div className="text-body text-neutral-200">
                  Playfair Display — Elegant · Readable · Timeless
                </div>
              </div>
              <div>
                <div className="text-display-2">Ag</div>
                <div className="text-body text-neutral-200">
                  Inter — Clean · Modern · Highly legible
                </div>
              </div>
            </div>
          </Section>

          <Section number="03" title="Type Scale">
            <div className="flex flex-col gap-2 text-body text-neutral-200">
              <div className="text-display-1 font-display">Display 1</div>
              <div className="text-display-2 font-display">Display 2</div>
              <div className="text-h1">Heading 1</div>
              <div className="text-h2">Heading 2</div>
              <div className="text-h3">Heading 3</div>
              <div className="text-body-lg">Body Large</div>
              <div className="text-body">Body</div>
              <div className="text-small">Small</div>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Section number="04" title="Spacing System">
            <div className="text-small text-neutral-300 mb-3">Base unit: 4px</div>
            <div className="flex items-end gap-3">
              {[4, 8, 12, 16, 24, 32, 40, 48, 64].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-xs bg-primary-400"
                    style={{ width: s, height: s }}
                  />
                  <span className="text-small text-neutral-300">{s}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section number="05" title="Radius & Shadows">
            <div className="flex gap-4 mb-4">
              {[
                ["xs", "rounded-xs"],
                ["sm", "rounded-sm"],
                ["md", "rounded-md"],
                ["lg", "rounded-lg"],
                ["xl", "rounded-xl"],
                ["circle", "rounded-full"],
              ].map(([label, cls]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`h-12 w-12 border border-neutral-400 ${cls}`} />
                  <span className="text-small text-neutral-300">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              {["sm", "md", "lg", "xl"].map((s) => (
                <div
                  key={s}
                  className={`h-12 w-16 rounded-sm bg-neutral-700 shadow-${s} flex items-center justify-center text-small`}
                >
                  {s}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section number="06" title="Icons">
          <div className="flex gap-6 text-neutral-100">
            <Bell size={22} strokeWidth={2} />
            <Search size={22} strokeWidth={2} />
            <PlayCircle size={22} strokeWidth={2} />
            <FileText size={22} strokeWidth={2} />
            <Bookmark size={22} strokeWidth={2} />
            <BarChart2 size={22} strokeWidth={2} />
            <Clock size={22} strokeWidth={2} />
            <User size={22} strokeWidth={2} />
            <ChevronRight size={22} strokeWidth={2} />
          </div>
        </Section>

        <Section number="07" title="Buttons">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Get Started</Button>
            <Button variant="secondary">Explore Courses</Button>
            <Button variant="tertiary" externalLink>
              View Lesson
            </Button>
            <Button variant="text">Watch Video</Button>
            <Button variant="primary" disabled>
              Get Started
            </Button>
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Section number="08" title="Inputs">
            <div className="flex flex-col gap-4">
              <TextInput placeholder="Search anything..." />
              <Select defaultValue="relevant">
                <option value="relevant">Most Relevant</option>
                <option value="recent">Most Recent</option>
              </Select>
            </div>
          </Section>

          <Section number="09" title="Badges / Tags">
            <div className="flex gap-3">
              <Badge variant="video">Video</Badge>
              <Badge variant="lesson">Lesson</Badge>
              <Badge variant="popular">Popular</Badge>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Section number="10" title="Status / Indicators">
            <div className="flex flex-wrap gap-4">
              <StatusIndicator status="in-progress" />
              <StatusIndicator status="completed" />
              <StatusIndicator status="now-playing" />
              <StatusIndicator status="locked" />
            </div>
          </Section>

          <Section number="11" title="Progress Bar">
            <ProgressBar percent={35} />
          </Section>
        </div>

        <Section number="12" title="Cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CourseCard
              initial="N"
              title="Next.js for Production"
              description="Build scalable, high-performance web applications with Next.js."
              level="Intermediate"
              duration="32 min"
              modules="12 modules"
            />
            <LessonVideoCard
              title="Data Fetching in Server Components"
              description="Learn how to fetch data on the server using async/await and Next.js best practices."
              lessonMeta="Lesson 5.1 · 12:45"
              watchLabel="Watch from 12:45"
            />
            <LessonCard
              title="Data Fetching & Caching"
              description="Explore different data fetching methods in Next.js and how to cache and revalidate data for optimal performance."
              moduleMeta="Module 5"
            />
            <ResourceCard
              title="Caching and Revalidation Guide"
              description="Deep dive into Next.js caching strategies."
              meta="PDF · 1.2 MB"
            />
          </div>
        </Section>

        <Section number="13" title="Navigation">
          <div className="flex flex-col gap-4">
            <Breadcrumbs
              items={["All Courses", "Next.js for Production", "Data Fetching & Caching"]}
            />
            <Pagination current={1} total={8} />
          </div>
        </Section>

        <Section number="14" title="Principles">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div>
              <h3 className="text-h3">Clarity First</h3>
              <p className="text-body text-neutral-200 mt-1">
                Every element should communicate clearly.
              </p>
            </div>
            <div>
              <h3 className="text-h3">Consistency</h3>
              <p className="text-body text-neutral-200 mt-1">
                Use components and patterns consistently across the platform.
              </p>
            </div>
            <div>
              <h3 className="text-h3">Focus & Calm</h3>
              <p className="text-body text-neutral-200 mt-1">
                Remove noise and help learners focus on what matters.
              </p>
            </div>
            <div>
              <h3 className="text-h3">Accessible</h3>
              <p className="text-body text-neutral-200 mt-1">
                Design with accessibility and inclusivity in mind.
              </p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
