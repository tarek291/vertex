# Implementation Prompt: Vertex Home Page

## Goal

Build the Vertex home (landing) page exactly as shown in `design/UI2.png`, replacing the
current design-system showcase that lives in `app/page.tsx`. Desktop must match the
reference pixel-for-pixel; the page must also degrade sensibly to tablet and mobile
(stack the course cards, keep the hero centered, keep type readable).

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — project rules, boundaries, "reproduce the reference exactly,
  do not restyle or improve, reuse existing components first".
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` — App
  Router page conventions (plain default-exported server component is correct here).
- No named skill applies (this is pure UI; Sanity / Clerk / PostHog / search are out of
  scope for this task).

## Code inspected

- `app/page.tsx` — currently the design-system showcase; will be replaced wholesale.
- `app/layout.tsx` — root layout already wires Playfair Display (`--font-playfair` /
  `font-display`) and Inter (`--font-inter`), `bg-neutral-900 text-neutral-0`,
  `min-h-full flex flex-col`. No change needed.
- `app/globals.css` — design tokens: `primary-100..500`, `neutral-0..900`, radius/shadow
  scale, and the type-scale utility classes (`text-display-1/2`, `text-h1..3`,
  `text-body-lg/body/small`, `font-display`). Reuse these; add none.
- `components/ui/Navigation.tsx` — `Navbar` exists but is missing the right-side actions
  (bell + avatar) and the active-link treatment shown in the reference.
- `components/ui/Button.tsx` — `Button` with `primary` variant is close to the "Explore
  Courses" CTA but the reference CTA has a gold gradient + shadow; will pass extra
  `className`. Supports `icon` prop for the trailing arrow.
- `components/ui/Card.tsx` — `CourseCard` exists but its layout (icon + title on one row,
  no divider) does not match the reference course card (large icon tile on top, serif
  title below, description, thin divider, then meta row with icons). Will reshape
  `CourseCard` to the reference; it is only consumed by the showcase page being removed.
- `components/ui/Input.tsx` — `TextInput` is the base for the hero search bar but the
  reference has an amber search icon, larger height, rounded-lg, and a `⌘K` key hint on
  the right. Will build the hero search as a tailored element (static, non-functional)
  rather than force props into `TextInput`.
- `components/ui/Badge.tsx` — not a match for the "INTELLIGENT LEARNING" pill (that is an
  amber-outlined rounded-full eyebrow, not a tag). Will build it inline in the page.

## Decisions & assumptions

1. **Replace** `app/page.tsx`. The design-system page has no route of its own and the
   task is "implement the vertex home page"; it is not preserved. (Confirm on approval.)
2. **Static content.** Sanity is not set up yet. The three course cards, hero copy, and
   footer line are hard-coded from the reference as a local `COURSES` constant + literal
   copy, with a `// TODO: source from Sanity` note. No data layer, no fetch.
3. **Non-functional interactive bits.** The search bar, `⌘K` hint, bell, and avatar are
   presentational only. "Explore Courses" and "View all courses" link to `/courses`
   (route not built yet — acceptable dead link for now). Nav links keep `href="#"` as they
   are elsewhere in the repo.
4. **Server component**, no `"use client"`. No new dependencies (`lucide-react` already
   present for all icons: `Bell`, `Search`, `ArrowRight`, `ArrowUpRight`/`SearchCheck`,
   `Sparkles`/`Star`, `BarChart2`, `Clock`, `FileText`, `Triangle`).
5. **Provider brand icons** (Next.js "N", Docker whale, "TS") are rendered as simple
   styled tiles (letter/monogram on a colored rounded square) — inline SVG for the Docker
   whale would be over-engineering; a `bg-[#0db7ed]` tile with a container glyph or the
   text "Docker" monogram is close enough to the reference at card size. Assumption:
   monogram tiles are acceptable stand-ins; flagged for user review.
6. **Decorative footer skyline**: reproduce with a pure-CSS gradient bar motif (a row of
   `div`s of varying heights with an amber vertical gradient + blur glow) rather than
   shipping an image asset. Assumption: CSS approximation is acceptable.
7. Avatar image: use a neutral placeholder (`bg-neutral-600` circle with a `User` glyph or
   initials) inside the amber ring — no real user system yet.

## Files to touch

- `app/page.tsx` — rewrite as the home page (hero + All Courses + footer strip).
- `components/ui/Navigation.tsx` — extend `Navbar`: add right-side bell + avatar,
  `active` treatment for "Courses", make it `justify-between` with a max-width inner
  container. Keep the existing `Breadcrumbs` / `Pagination` exports untouched.
- `components/ui/Card.tsx` — reshape `CourseCard` props + markup to the reference
  (props: `icon`/`brand`, `title`, `description`, `level`, `duration`, `modules`,
  optional `highlighted`). Keep `LessonVideoCard` / `LessonCard` / `ResourceCard`
  untouched.
- Possibly add `components/ui/CourseIcon.tsx` for the brand tiles (small, presentational).
- No changes to `app/layout.tsx`, `app/globals.css`, `package.json`.

## Requirements (from the reference)

**Navbar** (full-width, `border-b border-neutral-600`, inner content `max-w-6xl mx-auto`):
- Left: amber filled triangle mark + "Vertex" in `font-display`.
- Center/left group: "Courses" (active — amber `text-primary-300`) and "My Learning"
  (`text-neutral-200`).
- Right: `Bell` icon (`text-neutral-200`) and a 36–40px circular avatar with a
  `ring-1 ring-primary-500` / `border border-primary-500`.

**Hero** (centered column, `max-w-2xl` mx-auto, generous vertical padding, section ends
with `border-b border-neutral-600`):
- Small `Sparkles`/`Star` accent centered above the pill.
- Pill: uppercase `text-small` tracking-wide, `text-primary-300`, `border border-primary-500/60`,
  `rounded-full`, px-4 py-1 — text "INTELLIGENT LEARNING".
- Headline in `font-display`, ~`text-display-1` scale bumped up (≈56–64px desktop via
  responsive classes): "Search your learning in plain English." with "plain English."
  in `text-primary-400`/`primary-300`, rest `text-neutral-0`.
- Sub-copy: `text-body-lg text-neutral-200`, two lines, centered: "Vertex understands what
  you want to learn and finds the exact lessons across all your courses."
- CTA: `Button variant="primary"` with trailing `ArrowRight`, gold gradient
  (`bg-gradient-to-b from-primary-300 to-primary-500`) + `shadow-lg`, label "Explore Courses".
  A small circular `SearchCheck`/magnifier-plus icon floats to its left (decorative,
  `border border-primary-500/50 rounded-full`, `text-primary-300`).
- Search bar: full container width (~`max-w-2xl`), `h-14`, `rounded-lg`,
  `border border-neutral-600 bg-neutral-800/60`, amber `Search` icon left, placeholder
  "Ask anything about your learning…", right-aligned `⌘K` hint in a
  `border border-neutral-600 rounded-md px-2 py-1 text-small text-neutral-300` box.
  `readOnly`/non-submitting.

**All Courses** section (`max-w-6xl mx-auto`, top padding):
- Row: left `h2` "All Courses" in `font-display` `text-display-2`; right link
  "View all courses" + `ArrowRight`, `text-primary-300`.
- 3-column grid (`grid gap-6 md:grid-cols-3`, stacks to 1 col on mobile) of `CourseCard`:
  1. Next.js for Production — dark tile w/ white "N" — "Build scalable, high-performance
     web applications with Next.js." — Intermediate · 18h 24m · 12 modules — **highlighted**
     (subtle amber top border / `ring-1 ring-primary-500/40`).
  2. Docker Essentials — blue tile — "Containerize applications and streamline your
     development workflow." — Beginner · 10h 12m · 8 modules.
  3. TypeScript Deep Dive — blue "TS" tile — "Go beyond the basics and write safer, more
     expressive code." — Intermediate · 14h 36m · 10 modules.
- Card: `rounded-lg border border-neutral-600 bg-neutral-800/50 p-6`, icon tile ~56px
  top, `text-h2 font-display` title, `text-body text-neutral-200` description,
  `border-t border-neutral-600` divider, then meta row `text-small text-neutral-300`
  with `BarChart2` + level, `Clock` + duration, `FileText` + modules.

**Footer strip**:
- Centered: thin `border-neutral-600` rule left and right of a centered
  `Star`(amber) + "New courses and lessons added every week." (`text-neutral-200`).
- Below: decorative amber "skyline" bar motif — a row of vertical bars, varying heights,
  `bg-gradient-to-t from-primary-500/70 to-transparent`, with a soft blur glow,
  clipped by `overflow-hidden`. Purely decorative (`aria-hidden`).

## Security considerations

- None. No secrets, no tokens, no server data access, no auth, no user input handled.
  Everything is static presentational markup. No new env vars. Boundaries in AGENTS.md §5
  are untouched (no browser token, no MCP/LLM, no writes).

## Acceptance criteria

- `/` renders the home page matching `design/UI2.png` on desktop (≥1280px): navbar,
  hero, All Courses (3 cards), footer strip, in that order and layout.
- "plain English." is amber; rest of headline white; headline is Playfair.
- Course card meta rows show the exact level / duration / module values above.
- Page is responsive: at 375px the cards stack, nothing overflows horizontally, hero
  text scales down, `⌘K` hint may hide below `sm`.
- No `"use client"`, no new npm packages.
- `npx tsc --noEmit` passes; `npm run lint` passes; `npm run build` succeeds.
- Old design-system showcase content is gone from `app/page.tsx`.

## Checks to run (from `web` workspace root)

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. `npm run dev` → open http://localhost:3000 and eyeball against `design/UI2.png`.

## Manual test steps

1. `npm run dev`, open http://localhost:3000.
2. Confirm navbar: triangle + "Vertex", "Courses" amber-active, "My Learning" muted,
   bell icon, circular avatar with amber ring, bottom border.
3. Confirm hero: star accent, "INTELLIGENT LEARNING" amber pill, Playfair headline with
   "plain English." in amber, two-line sub-copy, gold "Explore Courses" button with
   arrow, small magnifier icon to its left, search bar with amber icon + placeholder +
   "⌘K" hint. Section has a bottom divider.
4. Confirm "All Courses": heading left, "View all courses →" right; three cards with
   correct icon tiles, titles, descriptions, and meta (Intermediate · 18h 24m · 12
   modules / Beginner · 10h 12m · 8 modules / Intermediate · 14h 36m · 10 modules);
   first card visibly highlighted.
5. Confirm footer strip: centered star + "New courses and lessons added every week."
   between two rules, decorative gold skyline glow beneath.
6. Resize to ~375px: cards stack to one column, no horizontal scrollbar, hero legible.
7. Run the four checks above; all pass.

## Needs your attention

- OK to **replace** the design-system showcase in `app/page.tsx` entirely? (Assumed yes.)
- Brand icons (Docker whale, Next.js "N", "TS") rendered as monogram/color tiles, not
  exact logos — acceptable?
- Footer "skyline" done as a CSS gradient-bar motif, not an exported image asset — OK?
