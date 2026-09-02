# Implementation Prompt: Lesson Page

## Goal

Build the lesson page at `app/lessons/[slug]/page.tsx`, reproducing `vertex.lassen.png`
exactly on desktop and degrading sensibly to tablet/mobile. The page is **read-only** and
wired to the seeded Sanity content through the existing server-only data layer
(`getLessonBySlug` + `getCourseBySlug`). The lesson video **plays on the page** via the
provider's own embed (YouTube for all seeded content). No new schema, no writes, no
client-side content fetching, no custom video player.

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — boundaries (§5: pages are read-only, analytics is browser-side
  with the public key), decisions already made (§7: playback stays on-site via a provider
  embed, **do not build a custom player**, a result links with a start-seconds query param
  and the embed starts at that second; progress surfaced as completion marks + resume;
  Notes tab is presentational only), tech stack (§6), UI rules (§3: reproduce the reference
  exactly, reuse existing components/Tailwind patterns, responsive down to mobile), checks
  (§13), "keep it small" (§14).
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` — dynamic
  segments, `params` is a `Promise`, `PageProps<'/lessons/[slug]'>`, `generateStaticParams`,
  `generateMetadata`; note that reading the `searchParams` prop opts the page into dynamic
  rendering — so the start-seconds param is read client-side instead (see Decisions).
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  — passing server-rendered nodes as props/children into client components.
- No Sanity/Clerk/PostHog/search skill work is in scope — the content model, queries and
  data layer already exist and are reused unchanged.

## Code inspected

- `app/courses/[slug]/page.tsx` — the sibling detail page. Establishes the conventions this
  page follows: `generateStaticParams` filtering nullable slugs, `generateMetadata`,
  `notFound()`, `<Navbar />`, breadcrumb markup (`max-w-[1100px] px-8`, `ChevronRight`
  separators, last crumb `text-neutral-0`), a hidden `*ViewTracker` client component for the
  PostHog page-view event, and a `PLACEHOLDER_PROGRESS_PERCENT = 35` constant for progress
  UI that has no backend yet. Its curriculum links point to `/lessons/${lesson.slug}`.
- `components/course/CourseContent.tsx` — client module accordion. Reuse its visual
  language for the lesson sidebar: numbered circles (`h-8 w-8 rounded-full border`),
  `ChevronDown` rotate-on-open, `formatHms` for module totals, `Badge variant="lesson"` for
  "Free preview", `posthog.capture("lesson_clicked", …)` on curriculum nav (reused here).
- `components/course/courseFormat.ts` — `formatHms` (`"1h 28m"`), `formatClock` (`"5:50"`),
  `formatCount` (`"3.4k"` — note the reference shows `3,426`, see Decisions), `capitalize`.
  Reused as-is; no changes.
- `components/course/CoursePageActions.tsx` — pattern for hidden mount-effect trackers
  (`CourseViewTracker`) and thin client click-wrappers around server-rendered nodes
  (`ContinueLearningLink`, `BookmarkButton`). Mirrored for the lesson page.
- `components/ui/Navigation.tsx` — `Navbar` (top bar matches the reference as-is; reused
  unchanged). `Breadcrumbs` exists but the course page inlines its own breadcrumb; this page
  does the same because crumbs mix links and plain text.
- `components/ui/Badge.tsx` — `video | lesson | popular` variants. Used for "Free preview".
- `sanity/queries/lessons.ts` / `sanity/lib/api.ts` — `getLessonBySlug(slug)` returns the
  full lesson (`title`, `videoUrl`, `duration`, `freePreview`, `studentCount`, `poster`,
  `keyPoints`, `proTip`, `notes` (Portable Text), `resources[]{type,title,description,url}`)
  plus a derived `course` object: `{ _id, title, slug, instructor, moduleTitle,
  moduleNumber, lessonNumber, label }` where `label` is e.g. `"5.1"`. `getLessonSlugs()`
  feeds `generateStaticParams`. `getCourseBySlug(course.slug)` returns the full curriculum
  (`modules[]{ _key, title, summary, lessons[]->{ _id, title, slug, duration, freePreview,
  keyPoints } }`) — used to render the sidebar without any query change.
- `sanity/queries/fragments.ts` — `imageFragment` shape (`asset->{ _id, url, metadata{ lqip,
  dimensions } }`, `alt`).
- `studio/schemaTypes/documents/lesson.ts` — schema field for the image is **`poster`**;
  `keyPoints` is `string[]`; `notes` is Portable Text (styles `normal/h2/h3/blockquote`,
  `bullet`/`number` lists, marks `strong/em/code` + `link` annotation with `href`);
  `proTip` is plain `text`; `resources[]` is `{ type: link|pdf|code|download|video, title,
  description, url }`.
- `seed.ndjson` — 120 lesson docs. **Every** lesson has `notes`, `keyPoints`, `resources`;
  only 34 have `proTip`. The image field in the seed is **`thumbnail`** (a YouTube
  `hqdefault.jpg` asset), **not `poster`** — so `getLessonBySlug().poster` is `null` for all
  seeded content (see Needs your attention). All `videoUrl`s are
  `https://www.youtube.com/watch?v=<id>`.
- `instrumentation-client.ts` / existing `posthog.capture` calls — snake_case event names,
  flat property bags, `source` discriminator where relevant. New events follow that style.
- `app/layout.tsx` — fonts, `bg-neutral-900 text-neutral-0`, `<SanityLive />`, Clerk
  provider already wired. No change.
- `app/globals.css` — design tokens (`primary-100..500`, `neutral-0..900`), radius/shadow
  scale, type utilities (`text-display-1/2`, `text-h1..3`, `text-body-lg/body/small`,
  `font-display`). Reuse; add none. No Tailwind typography plugin is installed — Portable
  Text is hand-styled (consistent with the rest of the repo).
- `package.json` — `@portabletext/react` is not a direct dependency but resolves at
  `6.2.0` (transitive via `sanity`). It will be added as an explicit dependency.

## Decisions & assumptions

1. **Route**: `app/lessons/[slug]/page.tsx` (matches the links already emitted by the course
   page and `CourseContent`). Static: `generateStaticParams` from `getLessonSlugs()`,
   `generateMetadata` from the lesson title/summary. `notFound()` when the lesson is missing.
2. **Two cached reads, no query changes**: server component calls `getLessonBySlug(slug)`,
   then `getCourseBySlug(lesson.course.slug)` for the sidebar curriculum. Both are
   `react/cache`-wrapped and server-only. Nothing in `sanity/` changes, so **no TypeGen
   run is needed**.
3. **Video playback — provider embed, click-to-load facade**:
   - New pure helper `lib/video.ts` (no `server-only`; used in a client component):
     `parseVideoUrl(url)` → `{ provider: "youtube" | "vimeo" | "bunny" | null, id,
     embedUrl(startSeconds), thumbnailUrl }`. Handles `youtube.com/watch?v=`,
     `youtu.be/`, `youtube.com/embed/`; `vimeo.com/<id>` / `player.vimeo.com/video/<id>`;
     Bunny `iframe.mediadelivery.net/embed/<lib>/<id>` and `.../play/<lib>/<id>`. Returns
     `provider: null` for anything else.
   - YouTube embed URL: `https://www.youtube-nocookie.com/embed/<id>?start=<n>&rel=0&
     modestbranding=1&autoplay=1&enablejsapi=1` (autoplay only after the user clicks the
     facade, so it is allowed). Vimeo: `#t=<n>s` + `autoplay=1`. Bunny: `?t=<n>&autoplay=true`.
   - `components/lesson/VideoPlayer.tsx` (client): renders a 16:9 rounded frame
     (`aspect-video rounded-xl border border-neutral-600 overflow-hidden bg-neutral-900`).
     Initial state = **facade**: poster image + centered play button, matching the reference's
     idle state. On click it swaps in the provider `<iframe>` (`allow="autoplay;
     encrypted-media; picture-in-picture; fullscreen"`, `allowFullScreen`,
     `title={lesson title}`). We do **not** render custom scrubber/among-controls chrome —
     the reference's control bar belongs to the provider player, and AGENTS §7 forbids a
     custom player.
   - Poster source: `poster?.asset?.url` if present (future-proof), else
     `parseVideoUrl(videoUrl).thumbnailUrl` (`https://i.ytimg.com/vi/<id>/hqdefault.jpg` for
     YouTube), else a neutral placeholder tile with the course initial (same fallback style
     as the course page cover).
4. **Start-seconds param read client-side**: `VideoPlayer` reads `?start=` (integer seconds,
   clamped `>= 0`) via `useSearchParams()`. This keeps the page statically renderable
   (reading the server `searchParams` prop would force dynamic rendering). Absent/invalid →
   `0`. This is the seek target used by search "watch from this moment" links (AGENTS §7).
5. **Analytics** (browser, public key — AGENTS §7 asks for lesson view, a video play, how
   far watched, lesson completed):
   - `lesson_viewed` — fired once on mount by a hidden `LessonViewTracker` client component
     (mirrors `CourseViewTracker`). Props: `lesson_title, lesson_slug, course_title,
     course_slug, lesson_label, free_preview`.
   - `video_played` — on facade click. Props: `lesson_slug, provider, start_seconds`.
   - `video_progress` — via the YouTube IFrame Player API (loaded lazily on first play,
     `https://www.youtube.com/iframe_api`). Poll `getCurrentTime()/getDuration()` on a 5s
     interval; emit once per crossed milestone `25 | 50 | 75`. Props: `lesson_slug,
     percent`. Non-YouTube providers get `video_played` only (no seeded content hits this).
   - `lesson_completed` — emitted once when playback passes 90%. Props: `lesson_slug,
     course_slug`.
   - `lesson_tab_changed` (`{ lesson_slug, tab }`), `lesson_resource_clicked`
     (`{ lesson_slug, resource_title, resource_type, url }`), `lesson_bookmark_clicked`
     (`{ lesson_slug }`). `lesson_clicked` (existing event) is reused for sidebar
     lesson navigation.
6. **Progress is presentational only** (no backend exists yet — same stance as the course
   page). The sidebar shows `PLACEHOLDER_PROGRESS_PERCENT = 35` ("35% complete") and derives
   per-lesson status from curriculum order relative to the current lesson: earlier lessons
   render as completed (check-circle), the current lesson as "Now playing" (play icon +
   `text-primary-300` label), later lessons as not-started (hollow circle). No resume
   affordance is wired beyond honoring an incoming `?start=`. Flagged below.
7. **Sidebar** (`components/lesson/LessonSidebar.tsx`, client — it has accordion state and a
   mobile collapse toggle):
   - Header: "← Back to course" link → `/courses/<course.slug>`; course title with a small
     `CourseIcon`-style initial tile; `PLACEHOLDER_PROGRESS_PERCENT` label + a thin
     `ProgressBar`.
   - "Module N of M" row with a chevron that collapses the whole list.
   - The current lesson's module renders expanded, its lessons listed with number, title,
     duration, and status icon; the active lesson also shows a "Now playing" sub-label and a
     filled play button on the right (per the reference). Other modules render as collapsed
     rows (number, title, duration, chevron) and expand on click.
   - Each lesson row is a `next/link` to `/lessons/<slug>` with `posthog.capture(
     "lesson_clicked", …)`.
   - Desktop: fixed-width column `lg:w-[320px]`, `lg:sticky lg:top-0 lg:h-screen
     overflow-y-auto`, its own right border. Below `lg`: the sidebar becomes a full-width
     collapsible panel above the main content, collapsed by default, toggled by a
     "Course content" button.
8. **Main column** (server-rendered, `max-w-[760px]` inside a `lg:` two-column grid):
   - Breadcrumb: `All Courses` (→ `/courses`) / `<course.title>` (→ `/courses/<slug>`) /
     `<course.moduleTitle>` (plain) / `<lesson.title>` (plain, `text-neutral-0`). Crumbs
     collapse to the last two on mobile.
   - `LESSON <label>` pill (bordered, uppercase, `text-primary-300`) — omitted when
     `course.label` is null. A bookmark icon button floats top-right (`lesson_bookmark_
     clicked`, presentational).
   - `<h1>` lesson title (`font-display`, same scale as the course H1 but capped smaller to
     match the reference — `text-[40px] md:text-5xl`).
   - Sub-line: the first sentence of the lesson (derived from the lesson summary if present,
     else the first `notes` block's plain text) — assumption: the reference's grey
     sub-paragraph is this lead-in.
   - Meta row: `Clock` + `formatHms(duration)`; `BarChart3` + `capitalize(course-level)`
     (the course `level` is fetched via `getCourseBySlug`); `Users` +
     `"<count> students"`. **Count formatting**: the reference prints a grouped integer
     (`3,426`), not the compact `3.4k` the course cards use — so use
     `Intl.NumberFormat("en-US").format(studentCount)` here. `lucide-react` icons, sizes
     match the course page (14px, `text-primary-300`).
   - `VideoPlayer`.
   - `components/lesson/LessonTabs.tsx` (client): "Lesson Content" / "Notes" underline tabs
     (`lesson_tab_changed`). Receives the two panels as **server-rendered `ReactNode`
     props** so the Portable Text renderer and its content stay out of the client bundle
     (same technique the course page uses to pass nodes into client wrappers).
     - **Lesson Content** panel (`components/lesson/LessonContent.tsx`, server):
       - "Overview" `<h2>` + `notes` rendered with `@portabletext/react` and a hand-styled
         `components` map (block `normal` → `text-body text-neutral-200`; `h2` →
         `text-h2 font-display mt-8`; `h3` → `text-h3 mt-6`; `blockquote` → left-border
         gold; `bullet`/`number` lists → spaced with markers; `strong/em/code`; `link`
         annotation → `<a target="_blank" rel="noreferrer" class="text-primary-300
         underline">` reading `value.href`; `image` type → `next/image`-free `<img>` with
         `alt`, matching the repo's existing eslint-disable pattern).
       - "In this lesson you will:" — `keyPoints` as a list, each with a
         `CheckCircle2` (`text-primary-300`) marker.
       - Pro Tip callout — only when `proTip` is set: `Lightbulb` icon, heading "Pro Tip",
         body = `proTip`; bordered box `border-primary-500/40 bg-primary-500/5`.
       - "Resources" — responsive grid (`sm:grid-cols-2 lg:grid-cols-3`) of cards: icon by
         `type` (`link`→`FileText`, `pdf`→`FileText`, `code`→`Code2`, `download`→`Download`,
         `video`→`PlayCircle`), title, description, and a CTA row with `ArrowRight`
         (`link/pdf`→"Read documentation", `video`→"Watch video", `code`→"View on GitHub",
         `download`→"Download"). Each is an `<a target="_blank" rel="noreferrer">` firing
         `lesson_resource_clicked`. The CTA-label/icon map lives in a client leaf so the
         capture handler can attach; the card shell is server-rendered.
     - **Notes** panel (`components/lesson/LessonNotesTab.tsx`): presentational empty state
       only (AGENTS §7) — a `NotebookPen` icon, "Note-taking is coming soon", one line of
       helper text. No input, no persistence.
9. **`course: null` guard**: if no course references the lesson, render the main column with
   a shortened breadcrumb (`All Courses / <lesson.title>`), no `LESSON x.y` pill, no meta
   `level`, and hide the sidebar (main column goes full width). `generateStaticParams` still
   includes every lesson slug.
10. **Not in scope**: real progress persistence / resume, the notifications bell, My
    Learning, search wiring, video transcript/chapter ingestion, Vimeo/Bunny ingestion,
    any schema or GROQ change.

## Files to touch

**New**

- `app/lessons/[slug]/page.tsx` — server page; static params + metadata; two cached reads;
  composes sidebar + main column.
- `components/lesson/LessonSidebar.tsx` — client; curriculum accordion, progress header,
  mobile collapse.
- `components/lesson/VideoPlayer.tsx` — client; facade → provider iframe, `?start=` via
  `useSearchParams`, YouTube IFrame API progress + completion, `video_*` events.
- `components/lesson/LessonTabs.tsx` — client; tab switch, `lesson_tab_changed`; renders
  `ReactNode` panel props.
- `components/lesson/LessonContent.tsx` — server; Overview + Portable Text + key points +
  pro tip + resources.
- `components/lesson/PortableTextNotes.tsx` — the `@portabletext/react` `components` map
  (server-safe module).
- `components/lesson/ResourceCard.tsx` — client leaf for the resource CTA + capture (card
  shell may stay in `LessonContent`; split only what needs the handler).
- `components/lesson/LessonNotesTab.tsx` — presentational empty state.
- `components/lesson/LessonViewTracker.tsx` — client; `lesson_viewed` on mount.
- `lib/video.ts` — `parseVideoUrl` + provider embed/thumbnail helpers (pure, unit-testable).

**Modified**

- `package.json` — add `"@portabletext/react": "^6.2.0"` to `dependencies`; run
  `npm install` to update the lockfile.

**Unchanged** (relied on): everything under `sanity/`, `studio/`, `components/course/*`,
`components/ui/*`, `app/layout.tsx`, `app/globals.css`.

## Requirements

- Pixel-faithful to `vertex.lassen.png` on desktop at the `max-w-[1100px]` content width:
  left curriculum sidebar, breadcrumb, lesson-number pill, serif H1, grey sub-line, meta
  row, video frame, tabs, Overview + "In this lesson you will" + Pro Tip + Resources.
- Video plays inline on the lesson page via the provider's embed; never navigates the
  learner to YouTube. Honors `?start=<seconds>` as the initial playback position.
- All content comes from the seeded Sanity data via the existing server-only data layer.
  No token or Sanity client reaches the browser. No client-side content fetching.
- Responsive: below `lg`, the sidebar collapses to a toggled panel and the layout is a
  single column; the video frame stays 16:9; breadcrumb trims to the last two crumbs;
  resource grid goes single-column. Desktop layout stays exactly as referenced.
- Analytics events listed in Decision 5 fire with the given names/props, browser-side only.
- `proTip`, `poster`, and `course` absence are all handled without layout breakage.
- New TypeScript is strict-clean; no `any`; component props typed off the generated
  `LESSON_BY_SLUG_QUERY_RESULT` / `COURSE_BY_SLUG_QUERY_RESULT` where applicable.

## Security considerations

- Read-only page on a private dataset: all reads stay in the `server-only` data layer; no
  `NEXT_PUBLIC_SANITY_*` token, no client `sanityFetch`. (AGENTS §5, §12.)
- The video `<iframe>` uses `youtube-nocookie.com`, a minimal `allow` list, and no
  `allow="camera; microphone"`. `sandbox` is intentionally omitted because the provider
  player needs script + same-origin-to-provider + fullscreen; `referrerPolicy=
  "strict-origin-when-cross-origin"`.
- All external links (`notes` link annotations, resources) render with
  `target="_blank" rel="noreferrer"`.
- `?start=` is parsed as a non-negative integer and only ever concatenated into the
  provider embed URL as a numeric value — no reflection into the DOM as text/HTML.
- Portable Text is rendered through `@portabletext/react` (no `dangerouslySetInnerHTML`);
  the `link` annotation href is constrained to the schema's `http/https/mailto` set at
  authoring time and still gets `rel="noreferrer"`.
- PostHog capture stays browser-side with the public project key; no PII beyond what the
  existing `PostHogIdentify` already sends.

## Acceptance criteria

1. `/lessons/<any-seeded-slug>` renders the full page with real course/module/lesson data
   and the derived `Lesson x.y` label.
2. Clicking the video poster loads the YouTube embed in-place and it starts playing; the
   learner is never sent off-site.
3. Visiting `/lessons/<slug>?start=120` starts the embed at 2:00.
4. The sidebar lists the owning course's modules; the current module is expanded with the
   active lesson marked "Now playing"; other modules expand/collapse on click; every lesson
   row links to its lesson page.
5. "Lesson Content" shows Overview (Portable Text), "In this lesson you will" (key points),
   Pro Tip (only when present), and Resources (correct icon + CTA per type, opening in a new
   tab). "Notes" shows the presentational empty state.
6. PostHog receives `lesson_viewed` on load, `video_played` on play, `video_progress` at
   25/50/75, and `lesson_completed` past 90% (verify in the PostHog live events view or the
   network tab against `/ingest`).
7. At `<lg` widths: single column, sidebar behind a "Course content" toggle, 16:9 video,
   trimmed breadcrumb, single-column resources. Desktop unchanged from the reference.
8. A lesson with no owning course still renders (no sidebar, short breadcrumb) and does not
   throw.
9. `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.

## Checks to run (report real output)

- `npx tsc --noEmit` (web root)
- `npm run lint` (web root)
- `npm run build` (routes + new server/client modules added)
- `npm run dev` and manually walk the test steps below
- No Studio steps — no schema/GROQ/TypeGen change in this task.

## Manual test steps

1. `npm run dev`; open `/courses/nextjs-app-router-in-depth`, click the first lesson in the
   first module → lands on `/lessons/<slug>`.
2. Confirm layout matches `vertex.lassen.png`: sidebar, breadcrumb, `LESSON x.y` pill, serif
   title, grey sub-line, meta row (duration / level / `3,426`-style student count), video
   frame, tabs, Overview + key points + (if present) Pro Tip + Resources.
3. Click the video poster → YouTube embed loads inline and plays; confirm no navigation away
   from `localhost`.
4. Open `/lessons/<same-slug>?start=90` → player starts at 1:30.
5. In the sidebar: current module is expanded, active lesson shows "Now playing"; expand
   another module; click a different lesson → navigates and the sidebar updates.
6. Switch to the "Notes" tab → presentational empty state; switch back.
7. Click a resource card → opens the URL in a new tab.
8. DevTools → Network, filter `/ingest`: see `lesson_viewed` on load, `video_played` on
   play; let the video run (or seek) and see `video_progress` (25/50/75) and
   `lesson_completed` past 90%.
9. Resize to ~375px wide: single column, "Course content" toggle reveals the sidebar, video
   stays 16:9, breadcrumb trimmed, resources single-column.
10. Visit a lesson slug with no course reference (if none exists in seed, temporarily point
    the query params at one) → renders without the sidebar and without throwing.

## Needs your attention

- **`poster` vs `thumbnail` schema/seed mismatch (pre-existing).** The `lesson` schema and
  all GROQ (`lessonCardFragment`, `LESSON_BY_SLUG_QUERY`) select `poster`, but every seeded
  lesson stores the image under `thumbnail`, so `poster` is always `null`. This task works
  around it by deriving the YouTube thumbnail from the video id. Proper fix (separate
  change): rename the schema field to `thumbnail` (or add it), update the two queries,
  re-run TypeGen, redeploy the Studio + schema. Want that folded in or tracked separately?
- **Progress is placeholder.** "35% complete" and the per-lesson completed/now-playing/
  not-started states are derived from curriculum order, not real learner progress, and there
  is no persisted resume position — consistent with the course page's current placeholder.
  Real progress needs the server-route + write-token feature (AGENTS §7) which is not in
  scope here.
- **Notes tab is an empty state** by design (AGENTS §7 lists it as presentational only).
- **Progress analytics for non-YouTube video** would need per-provider player APIs; all
  seeded videos are YouTube so only the YouTube IFrame API path is implemented.
