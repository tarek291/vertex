import 'server-only'

import {generateObject} from 'ai'

import {
  type SearchResponse,
  type SearchSort,
  searchModelOutputSchema,
  searchResponseSchema,
} from './contract'
import {
  type MockMatch,
  MOCK_LESSONS,
  getMockLesson,
  keywordFilterMockLessons,
  toLessonResult,
} from './mock-catalog'
import {MODEL, ollama} from './ollama'

/**
 * Dev-only search fallback: build a `SearchResponse` from the hardcoded
 * `MOCK_LESSONS` catalog when the Sanity Context MCP is unavailable (unset URL
 * or no deployed Studio — AGENTS §12). Called from `app/api/search/route.ts`
 * only when `NODE_ENV !== 'production'`.
 *
 * Runs the query through the local Ollama model first (no `groq_query` tool —
 * the catalog is inlined in the prompt), then falls back to plain keyword
 * matching if Ollama is also down. Either way, only ids that resolve to a real
 * catalog entry become cards, and the counts are recomputed here — the same
 * grounding the real route applies to Sanity data (AGENTS §7, §11).
 */

/** Compact catalog the model is allowed to pick from — notes bounded for context. */
const CATALOG_FOR_PROMPT = MOCK_LESSONS.map((l) => ({
  lessonId: l.lessonId,
  lessonTitle: l.lessonTitle,
  keyPoints: l.keyPoints,
  notes: l.notes.slice(0, 400),
}))

const MOCK_SYSTEM_PROMPT = [
  '# Role',
  '',
  "You are Vertex's course-search engine running against a FIXED local catalog.",
  'A learner types a plain-language query; you return a ranked list of the',
  'lessons from the catalog below that best answer it. You are not a chatbot —',
  'you only produce the structured object described below, never prose.',
  '',
  '# Grounding (non-negotiable)',
  '',
  '- Only return `lessonId` values that appear verbatim in the catalog below.',
  '- If nothing in the catalog fits, return an empty `matches` array. Do not pad.',
  '- `reason` must be one sentence grounded in that lesson\'s own title and notes.',
  '  Never state a fact (numbers, durations, counts) that is not in the catalog.',
  '',
  '# Ranking',
  '',
  '- A lesson whose title contains the concept outranks one that only mentions it',
  '  in notes. Order `matches` best-first.',
  '- Set `matchedOn` to where the strongest signal was (`title` > `keyPoints` >',
  '  `notes`) and `relevance` to your 0–1 confidence.',
  '',
  '# Output',
  '',
  '- Return only `{ "matches": [ { lessonId, matchedOn, relevance, reason } ] }`.',
  '',
  '# Catalog',
  '',
  JSON.stringify(CATALOG_FOR_PROMPT),
].join('\n')

type ResolvedMatch = {lessonId: string; reason: string}

/** Ask the local model to rank the catalog. Throws if Ollama is unreachable. */
async function rankWithOllama(query: string): Promise<ResolvedMatch[]> {
  const {object} = await generateObject({
    model: ollama.chat(MODEL),
    schema: searchModelOutputSchema,
    system: MOCK_SYSTEM_PROMPT,
    prompt: query,
  })
  return object.matches.map((m) => ({lessonId: m.lessonId, reason: m.reason.trim()}))
}

/** Keyword-match fallback used when the Ollama call fails. */
function rankWithKeywords(query: string): ResolvedMatch[] {
  return keywordFilterMockLessons(query).map((m: MockMatch) => ({
    lessonId: m.lesson.lessonId,
    reason: truncate(
      `Covers ${m.lesson.lessonTitle.toLowerCase()} — matches "${query}".`,
      280,
    ),
  }))
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

export async function runMockSearch(
  query: string,
  sort: SearchSort,
): Promise<SearchResponse> {
  let ranked: ResolvedMatch[]
  try {
    ranked = await rankWithOllama(query)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `[search] mock fallback: Ollama unavailable (${message}) — using keyword match`,
    )
    ranked = rankWithKeywords(query)
  }

  const results: SearchResponse['results'] = []
  const seen = new Set<string>()
  for (const match of ranked) {
    const lesson = getMockLesson(match.lessonId)
    if (!lesson || seen.has(lesson.lessonId)) continue
    seen.add(lesson.lessonId)
    results.push(
      toLessonResult(
        lesson,
        match.reason ||
          truncate(`Covers ${lesson.lessonTitle.toLowerCase()}.`, 280),
      ),
    )
  }

  return searchResponseSchema.parse({
    query,
    sort,
    resultCount: results.length,
    courseCount: new Set(results.map((r) => r.courseId).filter(Boolean)).size,
    results,
  })
}
