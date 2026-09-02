# `lib/analytics`

Product-analytics event taxonomy + capture helpers for Vertex. One place to add
or change a PostHog event so names and property shapes stay consistent.

## Files

| file | runtime | use from |
|---|---|---|
| `events.ts` | pure (no SDK import) | anywhere — holds `ANALYTICS_EVENTS`, `AnalyticsEventProperties`, `clampQuery`, `urlHost` |
| `client.ts` | browser (`posthog-js`) | `"use client"` components — `import {analytics} from "@/lib/analytics/client"` |
| `server.ts` | `server-only` (`posthog-node`) | route handlers / Server Actions — `import {trackServer} from "@/lib/analytics/server"` |

## Rules

- `snake_case`, `object_action`, past tense.
- Capture in the event handler where the action happens — **never** in a
  `useEffect` reacting to state. The one `useEffect` capture is `lesson_viewed`
  (funnel-top "viewed" event on mount).
- Pageviews are autocaptured (`$pageview`) — do not add them.
- No PII in properties. The Clerk user id is the PostHog `distinct_id` (set once
  in `components/PostHogIdentify.tsx`). The only free-text property is a search
  `query`, and `client.ts` runs it through `clampQuery` before send.

## Adding an event

1. Add the name to `ANALYTICS_EVENTS` in `events.ts`.
2. Add its property type to `AnalyticsEventProperties`.
3. Add a named helper to `analytics` in `client.ts` (and/or a `trackServer`
   call site).

## Search wiring (TODO — `search-results-page` / `intelligent-search-mcp-plumbing`)

The `search_*` events are defined but have **no call sites** yet.

- **Server route** (`app/api/search/route.ts`, when built) is the authoritative
  source of `search_performed`:

  ```ts
  import {trackServer, distinctIdFromRequest} from '@/lib/analytics/server'
  // ...after the MCP + LLM call resolves:
  await trackServer({
    distinctId: distinctIdFromRequest(request, userId /* Clerk, if any */),
    event: 'search_performed',
    properties: {
      query: clampQuery(query),
      query_length: clampQuery(query).length,
      result_count: response.resultCount,
      course_count: response.courseCount,
      sort: response.sort,
      had_results: response.resultCount > 0,
      mcp_ok: true,
      llm_model: MODEL_ID,
    },
  })
  ```

  The browser fetch to this route should send an `X-POSTHOG-DISTINCT-ID` header
  (`posthog.get_distinct_id()`) so anonymous learners still correlate.

- **Results UI** (`"use client"`) uses `analytics.searchResultOpened(...)`,
  `analytics.searchResultsSorted(...)`, and — only if the server event is not
  yet live — `analytics.searchPerformed(...)` / `analytics.searchNoResults(...)`.
  If both client and server `search_performed` fire, keep the server one.

## Not covered yet

- **Watch depth for Vimeo / Bunny.** `video_watch_progressed` and the
  `lesson_completed` heuristic rely on the YouTube IFrame API. Vimeo/Bunny render
  a bare `<iframe>`; wiring their player SDKs is future work.
- **Authoritative `lesson_completed`.** Fires client-side at ≥90% watched
  (`trigger: "video_watched"`). When the learner-progress server route exists it
  should also `trackServer({event: 'lesson_completed', ...})` on the real write.
