import {Output, type ToolSet, generateObject, generateText, stepCountIs} from 'ai'
import {NextResponse} from 'next/server'
import {z} from 'zod'

import {
  type SearchResponse,
  type SearchSort,
  searchModelOutputSchema,
  searchResponseSchema,
  searchSortSchema,
} from '@/lib/search/contract'
import {isSearchMcpConfigured} from '@/lib/search/env'
import {hydrateLessons} from '@/lib/search/hydrate'
import {createSearchMcpClient, fetchInitialContext} from '@/lib/search/mcp'
import {runMockSearch} from '@/lib/search/mock'
import {MAX_STEPS, MODEL, ollama} from '@/lib/search/ollama'
import {buildSearchSystemPrompt} from '@/lib/search/prompt'

/**
 * Intelligent search (AGENTS §5, §11). Server route: connect to the Sanity
 * Context MCP over server-side HTTP, inject the inline system prompt, let a
 * local Ollama model find matching lessons with the `groq_query` tool, then
 * hydrate every result from Sanity directly so nothing on a card is
 * model-invented.
 *
 * Returns the structured `SearchResponse` JSON (not streamed — the card UI
 * needs the whole ranked set + counts at once). The browser never talks to the
 * MCP or the LLM; it only POSTs here.
 *
 * Dev-only fallback: when `NODE_ENV !== 'production'` and the Context MCP is
 * unavailable (unset `SANITY_CONTEXT_MCP_URL`, or the call throws because no
 * Studio is deployed — AGENTS §12), the route serves results from a hardcoded
 * local catalog (`lib/search/mock.ts`) with the header `x-vertex-search-source:
 * mock` instead of a 500, so the search UI + Ollama can be tested before the
 * Studio is live. In production this path is unreachable — a real MCP outage
 * still returns a 500.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The MCP is optional only in local dev — never mask a real outage in prod. */
const mockFallbackAllowed = process.env.NODE_ENV !== 'production'

const requestSchema = z.object({
  query: z.string().trim().min(1).max(200),
  sort: searchSortSchema.optional(),
})

function err(message: string, status: number) {
  return NextResponse.json({error: message}, {status})
}

/** `SearchResponse` from the dev-only local mock catalog, tagged for debugging. */
function mockJson(body: SearchResponse) {
  return NextResponse.json(body, {headers: {'x-vertex-search-source': 'mock'}})
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON body.', 400)
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return err('A `query` string (1–200 chars) is required.', 400)
  }
  const query = parsed.data.query
  const sort: SearchSort = parsed.data.sort ?? 'relevance'

  if (!isSearchMcpConfigured()) {
    if (mockFallbackAllowed) {
      console.warn(
        '[search] SANITY_CONTEXT_MCP_URL unset — serving local mock results',
      )
      return mockJson(await runMockSearch(query, sort))
    }
    return err('Search is not configured (SANITY_CONTEXT_MCP_URL).', 500)
  }

  let mcpClient: Awaited<ReturnType<typeof createSearchMcpClient>> | null = null
  try {
    const [client, initialContext] = await Promise.all([
      createSearchMcpClient(),
      fetchInitialContext(),
    ])
    mcpClient = client

    // The initial context is already in the system prompt — drop the tool.
    // `@ai-sdk/mcp` and `ai` ship slightly different `provider-utils` builds, so
    // the tool map needs a cast to line up with `ToolSet`.
    const rawTools = await mcpClient.tools()
    delete (rawTools as Record<string, unknown>).initial_context
    const mcpTools = rawTools as unknown as ToolSet

    const system = buildSearchSystemPrompt(initialContext)

    const result = await generateText({
      model: ollama.chat(MODEL),
      system,
      prompt: query,
      tools: mcpTools,
      stopWhen: stepCountIs(MAX_STEPS),
      output: Output.object({schema: searchModelOutputSchema}),
    })

    let modelOutput = result.output
    if (!modelOutput) {
      // Fallback: coerce whatever the model gathered into the schema.
      const coerced = await generateObject({
        model: ollama.chat(MODEL),
        schema: searchModelOutputSchema,
        system:
          'Return the lessons discussed as structured JSON. Use only real lesson ids already mentioned; if there are none, return an empty `matches` array.',
        prompt: result.text || query,
      })
      modelOutput = coerced.object
    }

    const matches = modelOutput?.matches ?? []
    const hydrated = await hydrateLessons(matches.map((m) => m.lessonId))

    const results: SearchResponse['results'] = []
    const seen = new Set<string>()
    for (const match of matches) {
      const lesson = hydrated.get(match.lessonId)
      if (!lesson || seen.has(lesson.lessonId)) continue
      seen.add(lesson.lessonId)
      results.push({
        kind: 'lesson',
        ...lesson,
        description: match.reason.trim(),
      })
    }

    const response: SearchResponse = searchResponseSchema.parse({
      query,
      sort,
      resultCount: results.length,
      courseCount: new Set(
        results.map((r) => r.courseId).filter(Boolean),
      ).size,
      results,
    })

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed.'
    if (mockFallbackAllowed) {
      console.warn(
        `[search] MCP unavailable (${message}) — serving local mock results`,
      )
      try {
        return mockJson(await runMockSearch(query, sort))
      } catch {
        // Mock path itself failed — fall through to the error response.
      }
    }
    return err(message, 500)
  } finally {
    await mcpClient?.close()
  }
}
