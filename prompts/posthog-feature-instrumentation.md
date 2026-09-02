# Implementation prompt — PostHog instrumentation for search, video & lesson features

## Goal

Add product-analytics coverage for the features built since the initial PostHog
setup (commit `27ac99b`, which only instrumented the course catalog/detail pages):

- **Search** — a search performed (with the query), and a search result opened
  (with the result type). The search route/UI do not exist yet, so these are
  **defined now in a shared analytics module and wired later** by the
  `search-results-page` / `intelligent-search-mcp-plumbing` prompts.
- **Video** — video played, watch depth (progress milestones), resume used.
- **Lessons** — lesson completed, plus the existing lesson-page interactions
  (view, tab change, resource click, bookmark, sidebar navigation) standardized.
- A few extra events with clear engagement/churn value (see §Events).

All new/standardized events follow PostHog's Next.js guidance: `snake_case`,
`object_action` past tense, capture in event handlers (never in a `useEffect`
reacting to state), server-side capture for server-side actions, and **no PII in
event properties** — the Clerk user id is the only identifier, carried as the
PostHog `distinct_id` via the existing `identify()` call.

## Skills / docs read

- `.claude/skills/integration-nextjs-app-router/` — `SKILL.md`, `COMMANDMENTS.md`,
  `1-begin.md`, `EXAMPLE.md`, `identify-users.md`. Key rules applied: init stays
  in `instrumentation-client.ts`; `posthog-js` is browser-only; `posthog-node`
  per-request client with `flushAt:1, flushInterval:0` and an awaited
  `flush()`/`shutdown()`; `enableExceptionAutocapture: true` on the node client;
  capture in handlers not effects; track actions not pageviews (autocapture
  handles `$pageview`); "viewed" funnel-top events are the allowed exception;
  never send emails/names/free user content in `capture()` properties.
- `AGENTS.md` §7 (analytics decisions), §5 (server/client boundary), §12 (private
  token, cached initial context ⇒ server restart).

## Code inspected

- `instrumentation-client.ts` — client init, `capture_exceptions: true`, EU host
  fallback. No change needed.
- `lib/posthog-server.ts` — `getPostHogClient(): PostHog | null`, singleton,
  `flushAt:1/flushInterval:0`. Missing `enableExceptionAutocapture`.
- `components/PostHogIdentify.tsx` — `identify(user.id, {email,name})` /
  `reset()`. This is the only place email/name may appear. No change.
- `components/lesson/VideoPlayer.tsx` — already fires `video_played`,
  `video_progress` (25/50/75, YouTube-only via IFrame API), `lesson_completed`
  (≥90% of a YouTube video). Vimeo/Bunny render a bare `<iframe>` with no
  progress signal.
- `components/lesson/LessonViewTracker.tsx` — `lesson_viewed` on mount.
- `components/lesson/{LessonTabs,ResourceCard,BookmarkLessonButton,LessonSidebar}.tsx`
  — `lesson_tab_changed`, `lesson_resource_clicked` (currently includes `url`),
  `lesson_bookmark_clicked`, `lesson_clicked` (sidebar).
- `components/lesson/LessonNotesTab.tsx` — presentational placeholder, skip.
- `lib/search/{contract,mcp,env}.ts` — search plumbing only. `contract.ts`
  exports `SearchResponse` (`query`, `sort`, `resultCount`, `courseCount`,
  `results[]` discriminated on `kind: 'lesson' | 'video'`).
- `app/api/search/health/route.ts` — only route under `app/api`. No search POST
  route, no progress route, no `middleware.ts` (Clerk middleware not set up yet).
- `app/page.tsx` — hero search `<input readOnly>`; search UI not built.
- `app/lessons/[slug]/page.tsx` — passes `courseSlug`, `lessonSlug`, `label`
  (e.g. "5.1") into the lesson components; `VideoPlayer` reads `?start=` seconds.
- `package.json` — scripts: `dev`, `build`, `lint` (`eslint`). No web typecheck
  script; use `npx tsc --noEmit`. Next `16.3.3`.

## Decisions & assumptions

1. **Central analytics module** `lib/analytics/` — single source of truth for
   event names + property shapes, so the search prompt and any future feature
   reuse it instead of hand-writing `posthog.capture("...")`.
   - `lib/analytics/events.ts` — pure, no imports. `ANALYTICS_EVENTS` const map
     of `snake_case` names + a `TS` type per event's properties + small shared
     helpers (`clampQuery(q)` → trims + caps at 200 chars). Client- and
     server-safe.
   - `lib/analytics/client.ts` — `import posthog from "posthog-js"`; typed
     `track(event, props)` wrapper (no-op unless `posthog.__loaded`) + named
     helpers (`trackVideoPlayed`, `trackSearchPerformed`, …). Imported only by
     client components.
   - `lib/analytics/server.ts` — `import "server-only"`; `trackServer({
     distinctId, event, properties })` using `getPostHogClient()` (returns early
     if `null`), then `await client.flush()`. For the future search route:
     accept a `distinctId` arg — prefer a forwarded `X-POSTHOG-DISTINCT-ID`
     header (so anonymous learners still correlate) and fall back to the Clerk
     `userId` when middleware/`auth()` exists.
2. **Refactor scope** = only the "since basic setup" surfaces:
   `components/lesson/*`. The committed course-page events
   (`CourseContent`, `CourseGrid`, `CoursePageActions`, `Navigation`,
   `ExploreCoursesButton`) are **left as-is** to avoid churn/scope creep; the
   naming drift there is noted for a later pass, not fixed here.
3. **Event renames** (lesson surfaces only), old ⇒ new:
   - `video_progress` ⇒ `video_watch_progressed`
   - `lesson_tab_changed` ⇒ `lesson_tab_selected`
   - keep `video_played`, `lesson_completed`, `lesson_viewed`,
     `lesson_resource_clicked`, `lesson_bookmark_clicked`, `lesson_clicked`.
   Renames are safe: these events only exist in uncommitted code, so there's no
   historical PostHog data to preserve.
4. **`resource_clicked` `url` property** — a resource URL is course content, not
   PII, but it's noisy and low-value. Replace `url` with `resource_url_host`
   (hostname only) to keep the "which docs do learners open" signal without full
   URLs.
5. **Watch depth** stays YouTube-only (IFrame API). Vimeo/Bunny need their
   player SDKs to emit progress — out of scope, called out in §Needs attention.
   Milestones stay `25/50/75`; completion at `≥90%`.
6. **`lesson_completed` trigger** — remains the client-side ≥90%-watched
   heuristic for now (`trigger: "video_watched"` property). The real
   completion write belongs in the not-yet-built progress server route; when
   that lands it should also `trackServer("lesson_completed", …)`. Documented,
   not built here.
7. **Search query as a property** — the user explicitly asked to capture the
   query. Queries are learning-topic strings, not personal data; still, they are
   free text, so: cap at 200 chars via `clampQuery`, also send `query_length`,
   and note in §Needs attention that the user may want PostHog's property
   filtering / "person properties" review on.
8. `person_profiles` / identify flow unchanged — `PostHogIdentify` already keeps
   email/name in person properties only.

## Files to touch

**New**
- `lib/analytics/events.ts`
- `lib/analytics/client.ts`
- `lib/analytics/server.ts`
- `lib/analytics/README.md` — short: naming rules, how to add an event, how the
  search route should call `trackServer` + forward `X-POSTHOG-DISTINCT-ID`.

**Edit**
- `lib/posthog-server.ts` — add `enableExceptionAutocapture: true`.
- `components/lesson/VideoPlayer.tsx` — use `lib/analytics/client`; add
  `video_resumed`; add props (`course_slug`, `lesson_label`, `resumed`,
  `provider`, `watched_seconds`, `duration_seconds`); rename progress event;
  add `video_play_failed` when `parsed.provider` is null.
- `components/lesson/LessonViewTracker.tsx` — route through `client.ts` (still a
  mount effect — funnel-top "viewed" exception, unchanged behavior).
- `components/lesson/LessonTabs.tsx` — renamed event via `client.ts`.
- `components/lesson/ResourceCard.tsx` — `resource_url_host` instead of `url`.
- `components/lesson/BookmarkLessonButton.tsx` — via `client.ts`.
- `components/lesson/LessonSidebar.tsx` — via `client.ts`.
- `app/lessons/[slug]/page.tsx` — pass `lessonLabel` / `courseSlug` into
  `VideoPlayer` if not already available for the new props.
- `.env.example` — no new vars; add a comment under the PostHog section noting
  server-side capture reuses `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` +
  `NEXT_PUBLIC_POSTHOG_HOST` (already read by `lib/posthog-server.ts`).

## Events (final taxonomy)

### Client — video (`components/lesson/VideoPlayer.tsx`)
| event | when | properties |
|---|---|---|
| `video_played` | user clicks play | `lesson_slug`, `course_slug`, `lesson_label`, `provider`, `start_seconds`, `resumed` (bool) |
| `video_resumed` | play begins with `start_seconds > 0` (deep-link/resume) | `lesson_slug`, `course_slug`, `start_seconds`, `source: "search_deep_link"` |
| `video_watch_progressed` | crossing 25 / 50 / 75 % (YouTube) | `lesson_slug`, `course_slug`, `percent`, `watched_seconds`, `duration_seconds` |
| `lesson_completed` | ≥90 % watched (YouTube) | `lesson_slug`, `course_slug`, `lesson_label`, `trigger: "video_watched"` |
| `video_play_failed` | no resolvable provider for the video URL | `lesson_slug`, `course_slug`, `reason: "unsupported_provider"` |

### Client — lesson page
| event | file | properties |
|---|---|---|
| `lesson_viewed` | `LessonViewTracker.tsx` | `lesson_slug`, `course_slug`, `lesson_label`, `free_preview` |
| `lesson_tab_selected` | `LessonTabs.tsx` | `lesson_slug`, `tab` |
| `lesson_resource_clicked` | `ResourceCard.tsx` | `lesson_slug`, `resource_title`, `resource_type`, `resource_url_host` |
| `lesson_bookmark_clicked` | `BookmarkLessonButton.tsx` | `lesson_slug` |
| `lesson_clicked` | `LessonSidebar.tsx` | `lesson_slug`, `module_number`, `source: "lesson_sidebar"` |

### Client — search (defined in `lib/analytics/`, wired by the search prompt)
| event | when | properties |
|---|---|---|
| `search_performed` | results returned for a submitted query | `query` (≤200), `query_length`, `result_count`, `course_count`, `sort`, `duration_ms`, `had_results` |
| `search_results_sorted` | sort control changed | `query`, `sort` |
| `search_result_opened` | a result card's action clicked | `result_kind: "video" \| "lesson"`, `result_position`, `course_slug`, `lesson_slug`, `lesson_label`, `matched_seconds` (video only), `query`, `sort` |
| `search_no_results` | empty state shown | `query`, `query_length` |

### Server — search route (defined in `lib/analytics/server.ts`, wired by the search prompt)
| event | where | properties | id |
|---|---|---|---|
| `search_performed` | `app/api/search/route.ts` (future) | same as client minus `duration_ms` unless measured server-side; add `mcp_ok` (bool), `llm_model` | `X-POSTHOG-DISTINCT-ID` header ?? Clerk `userId` |

> The server `search_performed` is the authoritative one (search resolution is
> server-side). If both fire during bring-up, keep the server one and drop the
> client copy — decision for the search prompt, noted here so it isn't missed.

## Security / privacy

- No emails, names, or free-form user text beyond the capped search `query` in
  any `capture()` / `trackServer()` call. Reviewer must grep the diff for
  `email`, `fullName`, `primaryEmailAddress` — none outside `PostHogIdentify`.
- `distinct_id` is the Clerk user id (already set by `identify()`); server
  helper never invents identity — caller passes it.
- `lib/analytics/server.ts` is `import "server-only"`; `posthog-node` never
  reaches the browser bundle. `posthog-js` never imported server-side.
- Read token / MCP URL untouched; no new env vars; `.env.example` stays the
  canonical list.
- Missing PostHog config stays a no-op in prod and the existing loud dev error
  is unchanged.

## Acceptance criteria

1. `lib/analytics/{events,client,server}.ts` exist; every event name/props table
   above is represented in `ANALYTICS_EVENTS` with a matching TS property type.
2. All `components/lesson/*` captures go through `lib/analytics/client`; no bare
   `posthog.capture("…")` string literals remain in those files.
3. `video_resumed` fires exactly once when the player starts from `?start=` > 0,
   in addition to `video_played`.
4. `video_watch_progressed` fires at most once per milestone; `lesson_completed`
   at most once per mount (existing `useRef` guards kept).
5. Renamed events (`video_watch_progressed`, `lesson_tab_selected`) — no
   references to the old names remain (`grep -r video_progress lesson_tab_changed`).
6. `lib/posthog-server.ts` passes `enableExceptionAutocapture: true`.
7. Search + server event helpers are exported and typed but have **no call
   sites** yet (search UI/route not built); `README.md` documents how the search
   prompt wires them.
8. No PII beyond `distinct_id` / capped `query` anywhere in the diff.
9. `npx tsc --noEmit` and `npm run lint` clean; `npm run build` succeeds.

## Checks to run (report real output)

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run dev`, then manual test steps below.

## Manual test steps

1. `npm run dev`, open a lesson with a **YouTube** video, DevTools → Network,
   filter `i` / `/ingest`, and enable `?__posthog_debug=true`.
2. Click play → see `video_played` (`resumed:false`) in the console/Network.
3. Let it run → `video_watch_progressed` at ~25/50/75 with `watched_seconds` &
   `duration_seconds`; near the end `lesson_completed` (`trigger:"video_watched"`).
4. Open the same lesson with `?start=120` → click play → both `video_played`
   (`resumed:true`, `start_seconds:120`) and `video_resumed` fire once each.
5. Open a lesson whose `videoUrl` is empty/unsupported → `video_play_failed`.
6. Switch the Content/Notes tab → `lesson_tab_selected`. Click a resource →
   `lesson_resource_clicked` with `resource_url_host` (host only, no full URL).
   Click bookmark → `lesson_bookmark_clicked`. Click a sidebar lesson →
   `lesson_clicked`.
7. Confirm no event payload contains an email or name (search the Network
   request bodies for `@`).
8. PostHog → Activity: events arrive under the signed-in user's `distinct_id`
   (Clerk id) when logged in, anonymous id when logged out.

## Report back

Close with `What I did` / `Test` / `Needs your attention` (Vimeo/Bunny watch
depth gap; search events defined-but-unwired; search `query` free-text privacy
note; optional later pass to align the committed course-page event names).
