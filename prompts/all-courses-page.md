# Implementation Prompt: All Courses (catalog) page

## Goal

Build the `/courses` catalog page — the destination for the home page's "View all
courses" link and the course detail breadcrumb's "All Courses" crumb. Keep it simple:
a page header + a responsive grid of every course, each card linking to its detail
page. No filters, no sort, no pagination, no search (search is its own feature).

## Skills / docs read

- `AGENTS.md` — §3 (no reference image for this page, so build sensibly and reuse
  existing components/Tailwind patterns; responsive to mobile), §5 (pages are read-only,
  display stored data), §14 (keep it small).
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` — plain
  server-component page at `app/courses/page.tsx`.
- No Clerk/PostHog/search work in scope.

## Code inspected

- `app/page.tsx` — the home "All Courses" section already renders exactly this grid:
  `getCourses()` → `<Link href={/courses/${slug}}>` wrapping `<CourseCard>` with a
  `CourseIcon` monogram, `formatHms` duration, `moduleCount` modules, `popular` →
  `highlighted`. This markup will be extracted so both pages share it.
- `components/ui/Card.tsx` — `CourseCard` (icon, title, description, level, duration,
  modules, highlighted). Reused as-is.
- `components/ui/CourseIcon.tsx` — monogram tile. Reused as-is.
- `components/ui/Navigation.tsx` — `Navbar`. Reused.
- `components/course/courseFormat.ts` — `formatHms`. Reused.
- `sanity/lib/api.ts` — `getCourses()` (tokened server-only read; `COURSES_QUERY`
  already orders `popular desc, _createdAt desc`). Reused.
- `sanity/queries/courses.ts` — `COURSES_QUERY` returns everything a card needs
  (`_id`, `title`, `slug`, `summary`, `level`, `popular`, `moduleCount`,
  `totalDurationSeconds`). No query change.
- No `app/courses/page.tsx` exists yet (only `app/courses/[slug]/page.tsx`).

## Decisions & assumptions

1. **New route** `app/courses/page.tsx`, server component, no `"use client"`.
2. **Extract** the shared grid to `components/course/CourseGrid.tsx` — a presentational
   component taking `courses: COURSES_QUERY_RESULT` and rendering the `Link` +
   `CourseCard` grid (`grid gap-6 md:grid-cols-2 lg:grid-cols-3`). Update
   `app/page.tsx`'s `AllCourses` section to use it (removes the duplicated map). This is
   the only change to `app/page.tsx`.
3. **Page layout**: `<Navbar />`, then a `<main>` with `max-w-[1440px] mx-auto px-8 py-16`
   containing an `<h1 class="text-display-2 font-display">All Courses</h1>`, a one-line
   muted subtitle with the course count (e.g. `10 courses`), and `<CourseGrid>`.
   Matches the home page's spacing/type tokens. No breadcrumb (top-level page).
4. **Empty state**: if `getCourses()` returns `[]`, show a short muted line
   ("No courses yet.") instead of an empty grid.
5. **Metadata**: `export const metadata = { title: "All Courses | Vertex" }`.
6. No filters / categories / sort / pagination — explicitly out of scope ("keep it
   simple"). Ordering is whatever `COURSES_QUERY` already returns (popular first).
7. No new dependencies. Route will render dynamic (`ƒ`) like the rest, since Sanity
   reads are tokened/uncached — acceptable.

## Files to touch

- `app/courses/page.tsx` — new. Header + count + `<CourseGrid>` + empty state.
- `components/course/CourseGrid.tsx` — new. Shared `Link`+`CourseCard` grid.
- `app/page.tsx` — swap the inline `courses.map(...)` grid in `AllCourses` for
  `<CourseGrid courses={courses} />`; keep the section heading + "View all courses" link.

## Requirements

- `/courses` shows the `Navbar`, an "All Courses" heading (Playfair, `text-display-2`),
  a course count, and a grid of every course.
- Each card: monogram tile (title initial), title, summary, level, `formatHms` duration,
  `N modules`, `popular` courses visually highlighted; whole card links to
  `/courses/<slug>`.
- Responsive: 1 col on mobile, 2 on `md`, 3 on `lg`; no horizontal scroll at 375px.
- Home page still renders its "All Courses" section identically (now via `CourseGrid`).

## Security considerations

- Read-only. `getCourses()` is server-only and tokened; nothing sensitive reaches the
  client. No auth gating (browsing is public). No new env vars. No writes.

## Acceptance criteria

- `/courses` lists all 10 seeded courses, each linking to a working detail page.
- `/` "All Courses" section unchanged visually; "View all courses" → `/courses`.
- `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.
- Verified against `next start`: `/courses` → 200 with 10 cards; a card click → 200 detail.

## Checks to run

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. `npm run dev` (or `next start`) → open `/courses`, click through to a detail page,
   check `/` still renders its grid, resize to 375px.

## Manual test steps

1. `npm run dev`.
2. Open `http://localhost:3000/courses` → "All Courses" heading, `10 courses`, grid of
   cards, popular ones highlighted.
3. Click a card → lands on `/courses/<slug>` detail page (200).
4. Open `/` → "All Courses" section looks the same; "View all courses →" goes to
   `/courses`.
5. Resize to 375px → cards stack to 1 column, no sideways scroll.
6. Run checks 1–3; all pass.

## Needs your attention

- No design reference exists for `/courses`; layout mirrors the home page's "All
  Courses" section. Flag if you want it different.
- Category filter / sort / pagination intentionally omitted — say if you want any.
