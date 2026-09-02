/**
 * Vertex product-analytics event taxonomy — the single source of truth for
 * PostHog event names and their property shapes.
 *
 * Pure module: no `posthog-js` / `posthog-node` import, so it is safe to pull
 * into a client component, a server route, or a Node script. The client helper
 * (`./client`) and the server helper (`./server`) both type their `capture`
 * calls against `AnalyticsEventProperties` here.
 *
 * Naming rules (PostHog Next.js guidance):
 *  - `snake_case`, `object_action`, past tense (`video_played`, not `playVideo`).
 *  - Track user actions, not pageviews — `$pageview` is autocaptured. The only
 *    exception is a funnel-top "viewed" event (`lesson_viewed`).
 *  - Never put PII in properties: no emails, names, or free-form user content.
 *    The Clerk user id is the PostHog `distinct_id` (set in `PostHogIdentify`)
 *    and is the only identifier we attach. The single tolerated free-text
 *    property is a search `query`, capped by {@link clampQuery}.
 */

export const ANALYTICS_EVENTS = {
  // --- video (components/lesson/VideoPlayer.tsx) ---
  VIDEO_PLAYED: 'video_played',
  VIDEO_RESUMED: 'video_resumed',
  VIDEO_WATCH_PROGRESSED: 'video_watch_progressed',
  VIDEO_PLAY_FAILED: 'video_play_failed',
  LESSON_COMPLETED: 'lesson_completed',

  // --- lesson page ---
  LESSON_VIEWED: 'lesson_viewed',
  LESSON_TAB_SELECTED: 'lesson_tab_selected',
  LESSON_RESOURCE_CLICKED: 'lesson_resource_clicked',
  LESSON_BOOKMARK_CLICKED: 'lesson_bookmark_clicked',
  LESSON_CLICKED: 'lesson_clicked',

  // --- search (defined now; wired by the search-results-page prompt) ---
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULTS_SORTED: 'search_results_sorted',
  SEARCH_RESULT_OPENED: 'search_result_opened',
  SEARCH_NO_RESULTS: 'search_no_results',
} as const

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

type VideoProvider = 'youtube' | 'vimeo' | 'bunny' | null

/** Property shape for every analytics event. Keep in sync with the prompt's
 *  taxonomy table. `null` is allowed where a field is genuinely unknown. */
export interface AnalyticsEventProperties {
  video_played: {
    lesson_slug: string
    course_slug: string | null
    lesson_label: string | null
    provider: VideoProvider
    start_seconds: number
    resumed: boolean
  }
  video_resumed: {
    lesson_slug: string
    course_slug: string | null
    start_seconds: number
    source: 'search_deep_link'
  }
  video_watch_progressed: {
    lesson_slug: string
    course_slug: string | null
    percent: 25 | 50 | 75
    watched_seconds: number
    duration_seconds: number
  }
  video_play_failed: {
    lesson_slug: string
    course_slug: string | null
    reason: 'unsupported_provider'
  }
  lesson_completed: {
    lesson_slug: string
    course_slug: string | null
    lesson_label: string | null
    trigger: 'video_watched'
  }

  lesson_viewed: {
    lesson_slug: string
    course_slug: string | null
    lesson_label: string | null
    free_preview: boolean
  }
  lesson_tab_selected: {
    lesson_slug: string
    tab: 'content' | 'notes'
  }
  lesson_resource_clicked: {
    lesson_slug: string
    resource_title: string
    resource_type: 'code' | 'download' | 'link' | 'pdf' | 'video'
    resource_url_host: string | null
  }
  lesson_bookmark_clicked: {
    lesson_slug: string
  }
  lesson_clicked: {
    lesson_slug: string | null
    module_number: number
    source: 'lesson_sidebar'
  }

  search_performed: {
    query: string
    query_length: number
    result_count: number
    course_count: number
    sort: string
    /** Client-measured round trip; omit server-side unless measured there. */
    duration_ms?: number
    had_results: boolean
    /** Server-side only: whether the Context MCP call succeeded. */
    mcp_ok?: boolean
    /** Server-side only: the LLM model id used for this search. */
    llm_model?: string
  }
  search_results_sorted: {
    query: string
    sort: string
  }
  search_result_opened: {
    result_kind: 'video' | 'lesson'
    /** 1-based rank in the currently sorted list. */
    result_position: number
    course_slug: string | null
    lesson_slug: string
    lesson_label: string | null
    /** Video results only — the deep-link second. */
    matched_seconds?: number
    query: string
    sort: string
  }
  search_no_results: {
    query: string
    query_length: number
  }
}

/** Longest search query we send to PostHog as a property. */
export const MAX_QUERY_PROPERTY_LENGTH = 200

/**
 * Normalize a raw search query for use as an event property: collapse
 * whitespace and cap the length so a pasted essay never lands in analytics.
 */
export function clampQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_PROPERTY_LENGTH)
}

/** Hostname of a URL, or `null` if it will not parse. Keeps resource-link
 *  analytics ("which docs do learners open") without storing full URLs. */
export function urlHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}
