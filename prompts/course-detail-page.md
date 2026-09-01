# Implementation Prompt: Course Detail Page

## Goal

Build the course detail page at `app/courses/[slug]/page.tsx`, reproducing `vertex.cours.png`
exactly on desktop and degrading sensibly to tablet/mobile. The page is **read-only** and
wired to the seeded Sanity content through the existing server-only data layer
(`getCourseBySlug`). No new schema, no writes, no client data fetching.

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — boundaries (§5), decisions already made (§7), UI rules (§3:
  reproduce the reference exactly, reuse existing components, responsive down to mobile),
  checks (§13).
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` — App
  Router dynamic segments, `params` is a `Promise`, `PageProps<'/courses/[slug]'>` global
  helper, `generateStaticParams`, `generateMetadata`.
- `.agents/skills/create-agent-with-sanity-context/references/ecommerce/app/src/app/products/[slug]/page.tsx`
  — reference pattern for a Sanity-backed dynamic detail route (generateStaticParams +
  generateMetadata + notFound + typing off the generated query result).
- No Sanity/Clerk/PostHog/search skill work is in scope — the content model, queries and
  data layer already exist.

## Code inspected

- `app/page.tsx` — home page; hardcoded `COURSES` with `// TODO: source from Sanity`. Its
  cards currently link nowhere. Uses `Navbar`, `CourseCard`, `CourseIcon`, the footer
  "skyline" motif, and the `text-display-*` / `font-display` type utilities.
- `app/layout.tsx` — root layout already wires fonts, `bg-neutral-900 text-neutral-0`,
  `min-h-full flex flex-col`, `<SanityLive />`. No change.
- `app/globals.css` — design tokens (`primary-100..500`, `neutral-0..900`), radius/shadow
  scale, type-scale utilities (`text-display-1/2`, `text-h1..3`, `text-body-lg/body/small`,
  `font-display`). Reuse; add none.
- `components/ui/Navigation.tsx` — `Navbar` (matches the reference top bar as-is),
  `Breadcrumbs({ items: string[] })` (renders `ChevronRight` separators, last item
  `text-neutral-0`), `Pagination` (unused here).
- `components/ui/Button.tsx` — `Button` with `variant` (`primary` / `secondary` / …),
  `size` (`md` | `lg`), `icon` (trailing). "Continue Learning" = `primary` + `ArrowRight`;
  "Bookmark" = `secondary` + leading `Bookmark` icon (pass as children, not `icon`, since
  `icon` renders trailing — or extend; see decisions).
- `components/ui/CourseIcon.tsx` — `CourseIcon({ label, className })`, 56px rounded tile.
  Used as the cover fallback (course title initial) and small course glyph.
- `components/ui/Card.tsx` — `CardShell` is not exported; `CourseCard` is a catalog card,
  not a fit for outcome cards or module rows. Outcome cards and module rows are built in
  page-local components.
- `components/ui/ProgressBar.tsx` — `ProgressBar({ percent })`: track + `NN% complete`
  label. Reused in the sticky progress bar.
- `components/ui/Badge.tsx` — `Badge({ variant })` supports `popular`
  (`bg-primary-500 text-neutral-900`). Used for the "POPULAR" pill (uppercase already).
- `sanity/queries/courses.ts` — `COURSE_BY_SLUG_QUERY` already selects everything the
  reference needs: `title`, `summary`, `level`, `price`, `popular`, `studentCount`,
  `coverImage` (asset url + lqip + alt), `instructor` (name/slug/photo/expertise),
  `category` (title/slug), `learningOutcomes[]{ icon, title, description }`,
  `moduleCount`, `lessonCount`, `totalDurationSeconds`, and
  `modules[]{ title, summary, lessons[]->{ _id, title, slug, duration, freePreview,
  studentCount, poster, keyPoints } }`. `COURSE_SLUGS_QUERY` for static params.
- `sanity/lib/api.ts` — `getCourseBySlug(slug)` (via `sanityFetch` / Live Content API,
  React-cached) and `getCourseSlugs()` (tokened `serverClient`, published perspective).
  Both `server-only`. Use these; do not touch the Sanity client directly.
- `sanity/lib/image.ts` — `urlFor(source)` image URL builder.
- `sanity.types.ts` — `COURSE_BY_SLUG_QUERY_RESULT`, `COURSE_SLUGS_QUERY_RESULT`
  generated. Type the page off `NonNullable<COURSE_BY_SLUG_QUERY_RESULT>`.
- `seed.ndjson` — 10 courses, each 4 modules × 3 lessons (12 lessons). `level` values are
  lowercase (`"intermediate"`); schema list is capitalized. `learningOutcomes[].icon`
  holds lucide names in varying case (`"layers"`, `"gauge"`, `"workflow"`, `"rocket"`,
  `"shield-check"`, …). `coverImage` seeded as picsum `_sanityAsset` refs (real assets
  after import). `totalDurationSeconds` for a seeded course ≈ 6000s (~1h 40m) — the
  reference's "18h 24m / 12 modules" is mockup copy, not seed data; the page shows the
  real derived values.
- No `/courses` catalog route and no `/lessons/[slug]` route exist yet.

## Decisions & assumptions

1. **Route**: `app/courses/[slug]/page.tsx`. Breadcrumb "All Courses" links to `/courses`
   (catalog route not built — dead link, consistent with the home page's existing
   "Explore Courses" → `/courses`).
2. **Data**: `generateStaticParams` from `getCourseSlugs()`; page calls
   `getCourseBySlug(slug)` and `notFound()` when null. `generateMetadata` sets
   `` `${title} | Vertex` `` + `summary`.
3. **Rendering**: server component, no `"use client"` — **except** the "Course Content"
   module list, which needs expand/collapse. Extract it to a small client component
   `components/course/CourseContent.tsx` (`"use client"`, `useState`) that receives
   already-fetched, plain-serializable module data as props. No data or tokens cross the
   boundary — only display strings/numbers.
4. **Cover (left of hero)**: if `coverImage.asset.url` exists, render it via
   `urlFor(...).width(640).height(800).url()` in a `rounded-xl` frame with `lqip`
   background; otherwise fall back to a large `CourseIcon` with the course title's first
   letter (mirrors the reference's "N" tile and the home page pattern).
5. **Meta row** (under the title): `level` (capitalize first letter for display; icon
   `BarChart3`/`Signal`), `totalDurationSeconds` formatted `Xh Ym` (icon `Clock`),
   `moduleCount` + " modules" (icon `FileText`), `studentCount` formatted `1.2k` /
   `2.1k` (icon `Users`). Hide any item whose value is null/0 (except level).
6. **"POPULAR" pill**: `Badge variant="popular"` shown only when `popular === true`.
7. **CTAs in hero**: "Continue Learning" = `Button variant="primary"` + trailing
   `ArrowRight`, wrapped in a `<Link>` to the first lesson
   (`/lessons/${firstLesson.slug}`; route pending — acceptable dead link, same pattern as
   above). "Bookmark" = `Button variant="secondary"` with a leading `Bookmark` icon +
   label; **presentational only** (no bookmark feature exists). To get a *leading* icon
   without changing `Button`'s API, pass the icon and label together as `children` and
   omit the `icon` prop.
8. **"What you'll learn"**: 2-column grid (`md:grid-cols-2`, 1 col on mobile) of
   page-local `OutcomeCard`s — `rounded-lg border border-neutral-600 bg-neutral-800/50
   p-6`, lucide icon resolved from `outcome.icon` (see 9), `text-h2 font-display` title,
   `text-body text-neutral-200` description. Section hidden entirely if
   `learningOutcomes` is empty.
9. **Dynamic lucide icon**: map `outcome.icon` → component via a small explicit lookup
   (normalize to PascalCase, e.g. `"shield-check"` → `ShieldCheck`) over a curated set of
   icons that actually appear in the seed (`layers`, `gauge`, `workflow`, `rocket`,
   `shield-check`, `database`, `cloud`, `zap`, `search`, `git-branch`, …), with a
   `Circle`/`Sparkles` fallback for anything unmapped. Do **not** dynamically index the
   whole `lucide-react` namespace (tree-shaking + type safety). Confirm each name exists
   in the installed `lucide-react@1.37` before referencing it.
10. **"Course Content"** (`CourseContent.tsx`, client): header row — left
    `text-display-2 font-display` "Course Content"; right `text-small text-neutral-300`
    `${moduleCount} modules · ${Xh Ym}`. Then one row per module:
    - left: circular index badge (1-based module number, derived from order — never
      stored), module `title` (`text-h3`), module `summary` (`text-body
      text-neutral-200`, one line / clamped).
    - right: module duration `Xh Ym` or `Nm` (sum of its lessons' `duration`) in
      `text-primary-300`, then a `ChevronDown` that rotates when open.
    - expanded: list of that module's lessons — `Lesson X.Y` label (module# . lesson#,
      both 1-based from order), lesson `title`, lesson `duration` (`M:SS` / `Xm`), a
      "Free preview" `Badge` when `freePreview`, each row linking to
      `/lessons/${lesson.slug}` (route pending).
    - **"Show all N modules"** toggle: if `modules.length > 5`, render the first 5 and a
      centered `text-primary-300` "Show all N modules" / "Show less" button with a
      `ChevronDown`. With the current seed (4 modules) the toggle never shows, but it is
      built to match the reference.
11. **Sticky progress bar** (bottom): `sticky bottom-0` (or fixed) full-width strip,
    `border-t border-neutral-600 bg-neutral-900/95 backdrop-blur`, decorative amber
    "skyline"/glow behind it echoing the home footer (`aria-hidden`). Left: "Your
    Progress" label + `ProgressBar percent={...}`. Right: "Continue Learning"
    `Button variant="primary"` + `ArrowRight` → first lesson.
    **Progress is presentational** — no progress feature exists yet. Render with a
    hard-coded placeholder `percent` and a `// TODO: wire to learner progress feature`
    comment, mirroring the home page's hardcoded-with-TODO approach. Flagged for the
    user in "Needs your attention".
12. **Instructor**: the reference course header does not show the instructor by name, so
    do not add one (AGENTS.md §3: do not add beyond the reference). Instructor surfacing
    lives on its own future task.
13. No new npm packages. No changes to `app/layout.tsx`, `app/globals.css`,
    `sanity/**`, `studio/**`, `package.json`, `proxy.ts`.
14. **Home page wiring (small)**: so the new route is reachable from the UI, wrap each
    home `CourseCard` in a `<Link href={`/courses/${slug}`}>`. This needs the home cards
    to carry a slug. Minimal option: convert `app/page.tsx`'s "All Courses" section to
    read `getCourses()` from the data layer and map real courses (keeps the existing
    `CourseCard` markup, drops the hardcoded `COURSES`). If the user prefers to keep the
    home page untouched in this task, skip this and reach the page by URL. **Asked in
    the approval step.**

## Files to touch

- `app/courses/[slug]/page.tsx` — **new**. Server component: `generateStaticParams`,
  `generateMetadata`, fetch + `notFound`, renders `Navbar`, `Breadcrumbs`, hero
  (cover + title + summary + meta + CTAs), "What you'll learn", `<CourseContent />`,
  sticky progress bar.
- `components/course/CourseContent.tsx` — **new**, `"use client"`. Expand/collapse module
  list + "Show all" toggle. Props: `moduleCount`, `totalDurationSeconds`, and
  `modules: { title, summary, durationSeconds, lessons: { slug, title, duration,
  freePreview }[] }[]` (shaped in the page from the query result).
- `components/course/courseFormat.ts` — **new** (or inline in the page): `formatHms`
  (`Xh Ym` / `Nm`), `formatClock` (`M:SS`), `formatCount` (`2.1k`), `capitalize`.
  Small pure helpers; put here if reused by both server page and client component.
- `app/page.tsx` — **only if** the user approves 14: replace hardcoded `COURSES` in the
  "All Courses" section with `getCourses()` data and wrap cards in `<Link>`. Otherwise
  untouched.
- No other files.

## Requirements (from `vertex.cours.png`)

- **Top bar**: existing `Navbar` (Vertex mark, "Courses" active, "My Learning", bell,
  avatar). No change.
- **Breadcrumb**: `All Courses  ›  <Course Title>` — `Breadcrumbs items={['All Courses',
  title]}`; wrap the first crumb in a `<Link href="/courses">` (extend `Breadcrumbs` to
  accept `{ label, href? }[]` **or** keep it string-only and render the breadcrumb
  inline on this page — pick the smaller diff; do not break the home/other callers).
- **Hero** (2-col on desktop `md:grid-cols-[minmax(0,360px)_1fr]` approx, stacks on
  mobile with cover on top):
  - Left: cover image in a `rounded-xl` frame, portrait-ish aspect (~4/5), subtle border
    + shadow; fallback monogram tile as in decision 4.
  - Right: "POPULAR" pill (if popular); `h1` in `font-display` ~`text-display-1` bumped
    to ≈56px desktop via responsive classes; `summary` in `text-body-lg
    text-neutral-200` (~3 lines, `max-w-xl`); meta row (decision 5) in `text-small
    text-neutral-300` with amber icons; button row — gold "Continue Learning" + arrow,
    outline "Bookmark" with bookmark glyph.
- **What you'll learn**: `text-display-2 font-display` heading; 2-col outcome card grid
  (decision 8). Matches the reference's four cards (icon top-left, serif title,
  muted description).
- **Course Content**: heading left, `N modules · Xh Ym` right; numbered expandable module
  rows with divider between them (`divide-y divide-neutral-600` inside a
  `rounded-lg border border-neutral-600` container); duration in amber + chevron;
  "Show all N modules" when > 5 (decision 10).
- **Sticky bottom bar**: "Your Progress" + `NN% complete` + track on the left,
  "Continue Learning" on the right, amber skyline glow behind (decision 11).
- **Responsive**: at ~375px — hero stacks (cover first, then text), button row wraps,
  outcome grid → 1 col, module rows keep number + title + chevron with duration moving
  under the title if needed, sticky bar stacks label over the button or the button
  shrinks to an icon+short label; **no horizontal scroll** anywhere.
- Reuse `text-display-*`, `text-h*`, `text-body*`, `font-display`, `primary-*`,
  `neutral-*`, radius/shadow tokens. Add no colors, no fonts.

## Security considerations

- All content reads are server-side via `getCourseBySlug` / `getCourseSlugs`
  (`server-only`, token stays on the server). Nothing sensitive reaches the client
  component — only display strings/numbers as props.
- No auth gating (browsing is public per AGENTS.md §7). No writes, no progress
  persistence, no MCP/LLM, no PostHog in this task. No new env vars.
- `videoUrl` and video/transcript documents are **not** touched here.
- External image URLs are the Sanity CDN via `urlFor`; no user-supplied HTML/markdown is
  rendered (Portable Text `notes` belong to the lesson page, not this one).

## Acceptance criteria

- `/courses/nextjs-app-router-in-depth` renders: breadcrumb, hero (cover/fallback, title,
  summary, real meta values from seed, POPULAR pill since it's `popular`), "What you'll
  learn" with the 4 seeded outcomes and their icons, "Course Content" with 4 numbered
  modules showing real titles/summaries and derived `Module N` numbering, each expandable
  to its 3 lessons with `Lesson N.M` labels and durations, and the sticky progress bar.
- Values are **derived from seed**, not the mockup: module count = 4, duration =
  `math::sum` formatted, student count formatted `NNk`, level capitalized.
- Expand/collapse works; "Show all" toggle is absent with 4 modules (verify logic with a
  temporary >5 case or code review).
- Unknown slug → `notFound()` (404).
- Desktop matches `vertex.cours.png` (layout order, spacing, serif headings, amber
  accents, card styling). Mobile (375px): stacks cleanly, no horizontal scroll.
- No new npm packages. Only `CourseContent.tsx` is `"use client"`.
- `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.

## Checks to run (from repo root / `web` workspace)

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. `npm run dev` → visit `/courses/nextjs-app-router-in-depth` and 2–3 other seeded
   slugs; eyeball against `vertex.cours.png`; visit a bogus slug for the 404.

## Manual test steps

1. `npm run dev`.
2. Open `http://localhost:3000/courses/nextjs-app-router-in-depth`.
3. Breadcrumb reads `All Courses › Next.js App Router in Depth`; "All Courses" links to
   `/courses`.
4. Hero: cover image (or monogram fallback) on the left; "POPULAR" pill; large serif
   title; summary; meta row shows level (capitalized), total duration `Xh Ym`,
   `4 modules`, student count like `18.2k`; gold "Continue Learning →" and outline
   "Bookmark" buttons. "Continue Learning" points at the first lesson slug.
5. "What you'll learn": four cards, each with a lucide icon, serif title, muted copy.
6. "Course Content": right-side summary `4 modules · <duration>`; four numbered rows;
   click a row → expands to 3 lessons with `Lesson 1.1 … 1.3` labels, durations, and a
   "Free preview" badge where `freePreview` is true; click again → collapses.
7. Sticky bar stays pinned at the bottom on scroll: "Your Progress", `NN% complete`
   (placeholder), amber glow, "Continue Learning →" on the right.
8. Open two more slugs (`python-for-data-work`, `practical-web-security`) — all render,
   non-popular ones hide the pill.
9. Open `/courses/does-not-exist` → 404.
10. Resize to 375px: hero stacks, outcome grid is 1 col, nothing scrolls sideways.
11. Run the four checks; all pass.

## Needs your attention

- **Home page wiring (decision 14)**: OK to convert `app/page.tsx`'s "All Courses"
  section to real `getCourses()` data and link each card to `/courses/<slug>` so the new
  page is reachable from the UI? Or leave the home page untouched in this task?
- **Progress bar**: rendered as presentational with a hard-coded `percent` placeholder
  (no learner-progress feature exists yet) — acceptable, or omit the sticky bar until
  progress is built?
- `/courses` (catalog) and `/lessons/[slug]` routes don't exist yet, so the breadcrumb
  and "Continue Learning" / lesson links are dead for now — consistent with the home
  page's existing `/courses` link. Confirm that's fine for this task.
