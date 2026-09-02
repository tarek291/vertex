import {z} from 'zod'

/**
 * Structured contract for Vertex intelligent search.
 *
 * Two layers:
 *  - `searchModelOutputSchema` — what the LLM is allowed to return: a ranked
 *    list of lesson *references* (`lessonId`) plus a short grounded `reason`.
 *    The model never authors card identity/labels/counts. Kept in sync with
 *    `lib/search/prompt.ts`.
 *  - `searchResponseSchema` — the `/api/search` JSON the results page renders.
 *    Every field except `description` is hydrated from Sanity server-side
 *    (`lib/search/hydrate.ts`); `resultCount`/`courseCount` are recomputed
 *    server-side. Runtime-pure and client-safe.
 *
 * No field here can carry a whole transcript or `chunks` array (AGENTS §12).
 *
 * Scope today: only `lessonResult` is produced. `videoResult` is defined so the
 * video transcript/chapter ingestion task later only has to populate it — no
 * timestamps are invented in the meantime (AGENTS §7, §11).
 */

/** Course/module/lesson identity carried by every result card. */
const resultIdentity = {
  lessonId: z.string(),
  lessonSlug: z.string(),
  lessonTitle: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  courseSlug: z.string(),
  /** e.g. "Module 5" — null when no course references the lesson. */
  moduleLabel: z.string().nullable(),
  /** e.g. "Lesson 5.1" — null when no course references the lesson. */
  lessonLabel: z.string().nullable(),
}

/** A lesson matched on its own topic (title + notes). Opens the lesson page. */
export const lessonResultSchema = z.object({
  kind: z.literal('lesson'),
  ...resultIdentity,
  /** The lesson's key points, for the card's bullet list. */
  keyPoints: z.array(z.string()),
  /** Lesson length in seconds — backs the "Shortest first" sort. Nullable when
   * the lesson has no stored duration. */
  durationSeconds: z.number().nullable(),
  /** Short, grounded description — no invented facts. */
  description: z.string(),
})

/**
 * A lesson's video matched at a specific moment. Watches from `matchedSeconds`
 * on the lesson page. NOT produced until video ingestion exists.
 */
export const videoResultSchema = z.object({
  kind: z.literal('video'),
  ...resultIdentity,
  thumbnailUrl: z.string().nullable(),
  clipLengthSeconds: z.number().nullable(),
  matchedSeconds: z.number().int().nonnegative(),
  description: z.string(),
})

export const searchResultSchema = z.discriminatedUnion('kind', [
  lessonResultSchema,
  videoResultSchema,
])

/**
 * The LLM's structured output. It only *selects and ranks* lessons — it never
 * writes identity, labels, key points, or counts (those are hydrated from
 * Sanity server-side). `reason` is the one piece of free text it produces and
 * becomes the card `description`; the system prompt forbids naming any fact not
 * present in the queried data. `matches` is ordered best-first.
 */
export const searchModelMatchSchema = z.object({
  /** A real `lesson` document `_id` returned by a GROQ query via the MCP. */
  lessonId: z.string(),
  /** Where the strongest signal was. */
  matchedOn: z.enum(['title', 'notes', 'keyPoints']),
  /** Model's own confidence, 0–1. Used only as a tie-breaker; server order
   * follows array order. */
  relevance: z.number().min(0).max(1),
  /** One grounded sentence on why this lesson answers the query. */
  reason: z.string().max(280),
})

export const searchModelOutputSchema = z.object({
  matches: z.array(searchModelMatchSchema),
})

export type SearchModelMatch = z.infer<typeof searchModelMatchSchema>
export type SearchModelOutput = z.infer<typeof searchModelOutputSchema>

/** Sort control options; defaults to `relevance` (AGENTS §11). The extra values
 * are placeholders for the UI task to trim/rename against the real design. */
export const searchSortSchema = z.enum(['relevance', 'course', 'duration'])

export const searchResponseSchema = z.object({
  query: z.string(),
  sort: searchSortSchema,
  /** Backs "found 28 results…" */
  resultCount: z.number().int().nonnegative(),
  /** Backs "…across 8 courses" */
  courseCount: z.number().int().nonnegative(),
  results: z.array(searchResultSchema),
})

export type LessonResult = z.infer<typeof lessonResultSchema>
export type VideoResult = z.infer<typeof videoResultSchema>
export type SearchResult = z.infer<typeof searchResultSchema>
export type SearchSort = z.infer<typeof searchSortSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>

/** Empty-state payload for a query with no matches (AGENTS §11). */
export const EMPTY_SEARCH_RESPONSE: SearchResponse = {
  query: '',
  sort: 'relevance',
  resultCount: 0,
  courseCount: 0,
  results: [],
}
