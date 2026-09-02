# Implementation Prompt: Search route — local mock fallback when the Sanity MCP is unavailable

## Goal

Let `POST /api/search` keep working in local dev **before the Sanity Studio is deployed**,
so the search UI and the local Ollama integration can be exercised now.

Today the route returns `500 { error }` (and the plumbing upstream can surface a Sanity
`4xx`) whenever `SANITY_CONTEXT_MCP_URL` is unset or the Context MCP call fails because no
Studio app is deployed (AGENTS §12: "The Context MCP only serves a dataset that has a
deployed Studio application"). We add a **dev-only** fallback: on MCP failure the route
serves results built from a small hardcoded catalog, still running the query through the
local Ollama model, and degrading to plain keyword matching if Ollama is also down.

Per the user's answers to the clarifying questions:

- **Fallback mode = "Ollama over a mock catalog."** Skip only the MCP. Feed a small
  hardcoded lesson/course catalog to the Ollama model inline (no `groq_query` tool), let
  it rank/filter, then build cards from that mock data. If the Ollama call itself throws,
  fall back to plain keyword filtering over the same catalog.
- **Activation = "Dev only, automatic."** The fallback triggers on any MCP failure when
  `process.env.NODE_ENV !== 'production'`. In production the route is unchanged — a real
  MCP outage still returns the `500`, never masked by mock data.

**Explicitly out of scope:** any Sanity schema / GROQ / TypeGen change; the
`sanity.agentContext` document; touching `lib/search/{mcp,env,prompt}.ts`,
`lib/search/hydrate.ts`, or `app/api/search/health/route.ts`; the search UI components
(`components/search/*`) and `app/search/page.tsx` — they already render whatever
`SearchResponse` the route returns, so no client change is needed; changing the
production code path; adding a new runtime dependency; wiring real progress marks.

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — §2 loop (prompt + approval before code; close with the
  3-heading report), §5 boundaries (search API is a server route; the browser only
  `fetch`es `/api/search` and never holds a token or calls the MCP/LLM — the fallback
  stays entirely server-side and changes nothing the browser sees except the result
  payload), §7 (results are grounded card data, never invented — the mock path still only
  emits ids that resolve to a real catalog entry, same anti-hallucination guard as
  hydration), §11 (`SearchResponse` shape: `query`, `sort`, `resultCount`, `courseCount`,
  ranked `results[]`, empty state when nothing matches; token-based match — wildcard +
  OR, never a whole phrase), §12 (MCP needs a deployed Studio; this prompt exists
  precisely because that precondition is not met yet; keep the read token server-side;
  escape backticks in a template-literal prompt string), §13 checks (type check, lint,
  build when server code changes), §14 keep it small.
- `node_modules/next/dist/docs/` (App Router) — route handlers: `export async function
  POST`, `NextResponse.json(body, { headers })`, `export const runtime = 'nodejs'`,
  `export const dynamic = 'force-dynamic'`. Re-read the routing/route-handler guide at
  implementation time before editing.
- `prompts/search-results-page.md` — the task that built this route and the contract
  split (model selects lesson ids + a grounded `reason`; the server owns every other card
  field and recomputes counts). The fallback mirrors that split against a local catalog
  instead of Sanity.
- No Sanity/Clerk/PostHog skill work — no schema, data layer, or analytics change.

## Code inspected

- `app/api/search/route.ts` — current flow: Zod-validate `{ query (1–200, trimmed),
  sort? }` → `if (!isSearchMcpConfigured()) return err(…, 500)` → `Promise.all([
  createSearchMcpClient(), fetchInitialContext()])` → `generateText` (Ollama via
  `ollama.chat(MODEL)`, `@ai-sdk/openai`'s `createOpenAI` pointed at
  `OLLAMA_BASE_URL`) with the MCP tools + `Output.object({ schema:
  searchModelOutputSchema })`, `stopWhen: stepCountIs(8)` → optional `generateObject`
  coercion → `hydrateLessons(ids)` → assemble `SearchResponse` → `searchResponseSchema
  .parse` → `NextResponse.json`. `catch` → `err(message, 500)`; `finally` → `await
  mcpClient?.close()`. `err(message, status)` = `NextResponse.json({ error }, { status })`.
  `MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder'`.
- `lib/search/contract.ts` — hand-authored Zod (not TypeGen). `lessonResultSchema`
  (`kind:'lesson'`, `lessonId/lessonSlug/lessonTitle`, `courseId/courseTitle/courseSlug`,
  `moduleLabel` nullable e.g. `"Module 5"`, `lessonLabel` nullable e.g. `"Lesson 5.1"`,
  `keyPoints: string[]`, `durationSeconds: number | null`, `description: string`).
  `searchModelMatchSchema` = `{ lessonId, matchedOn: 'title' | 'notes' | 'keyPoints',
  relevance: 0–1, reason: string ≤ 280 }`. `searchModelOutputSchema = { matches: [...] }`.
  `searchSortSchema = z.enum(['relevance','course','duration'])`. `searchResponseSchema`
  = `{ query, sort, resultCount, courseCount, results: SearchResult[] }`.
  `EMPTY_SEARCH_RESPONSE`. Zod `.parse` strips unknown keys (doesn't throw on extras).
- `lib/search/hydrate.ts` — `HydratedLesson = Omit<LessonResult, 'kind' | 'description'>`.
  `deriveLabels` builds `Module {m+1}` / `Lesson {m+1}.{n+1}` from array order. The mock
  catalog stores these labels literally (no derivation needed).
- `lib/search/mcp.ts` — `createSearchMcpClient()` throws if `SANITY_CONTEXT_MCP_URL` or
  `readToken` missing; `fetchInitialContext()` returns `null` (never throws) when the URL
  is unset. So an unset URL currently makes the route `500` at the
  `isSearchMcpConfigured()` guard; a set-but-broken URL throws inside the `try`.
- `lib/search/env.ts` — `isSearchMcpConfigured()` = `Boolean(process.env
  .SANITY_CONTEXT_MCP_URL)`.
- `components/search/SearchExperience.tsx` — client; `POST /api/search`, renders
  loading / error / empty / success purely from the `SearchResponse` body and the HTTP
  status. It does not read response headers — a debug header is safe and invisible to it.
- `.env.example` — has the `# --- Sanity Context MCP: intelligent search ---` block
  (`SANITY_CONTEXT_MCP_URL=`) and the `# --- Intelligent search: LLM (local Ollama) ---`
  block (`OLLAMA_BASE_URL`, `OLLAMA_API_KEY`, `OLLAMA_MODEL`).

## Decisions & assumptions

1. **New `lib/search/mock-catalog.ts`** (`import 'server-only'`):
   - `type MockLesson = HydratedLesson & { notes: string }` — every field a lesson card
     needs (`lessonId`, `lessonSlug`, `lessonTitle`, `courseId`, `courseTitle`,
     `courseSlug`, `moduleLabel`, `lessonLabel`, `keyPoints`, `durationSeconds`) plus a
     plain-text `notes` blob used only for matching (never returned).
   - `export const MOCK_LESSONS: MockLesson[]` — **6–8** lessons across **2** courses,
     coherent top-to-bottom (AGENTS §7): e.g. a "Next.js App Router in Practice" course
     (data fetching, caching & revalidation, server vs. client components, dynamic
     routing, streaming & Suspense) and a "TypeScript for React Developers" course
     (types vs. interfaces, generics, narrowing, utility types). Ids are stable slugs
     like `mock-lesson-data-fetching`; `courseSlug` like `mock-nextjs-app-router`;
     `moduleLabel`/`lessonLabel` written literally and consistently
     (`"Module 1"` / `"Lesson 1.2"`). Durations 240–900s.
   - `export function keywordFilterMockLessons(query: string): Array<{ lesson: MockLesson;
     matchedOn: 'title' | 'keyPoints' | 'notes'; relevance: number }>` — tokenize the
     query on non-alphanumerics, lowercase, drop tokens < 2 chars; a lesson matches if
     any token is a substring of `lessonTitle`, any `keyPoints` entry, or `notes`
     (token-based, never the whole phrase — AGENTS §11). `matchedOn` / `relevance` by
     the strongest hit (`title` 0.9 → `keyPoints` 0.6 → `notes` 0.4), scaled slightly by
     how many distinct tokens hit. Sorted best-first. Empty query or no hits → `[]`.
   - `export function toLessonResult(lesson: MockLesson, description: string):
     LessonResult` — spreads the card fields, sets `kind: 'lesson'`, drops `notes`, uses
     the given `description`.
2. **New `lib/search/mock.ts`** (`import 'server-only'`) — `export async function
   runMockSearch(query: string, sort: SearchSort): Promise<SearchResponse>`:
   - **Ollama path first.** Build a compact system prompt (plain string, concatenation —
     no template literal, nothing to escape, AGENTS §12) that: states it is Vertex's
     course-search engine running against a *fixed local catalog*; embeds the catalog as
     a JSON array of `{ lessonId, lessonTitle, keyPoints, notes }` (notes truncated to
     ~400 chars each to bound the context); instructs it to return
     `searchModelOutputSchema` (`{ matches: [{ lessonId, matchedOn, relevance, reason }]}`)
     selecting **only** ids present in the catalog, best-first, empty when nothing fits,
     `reason` one grounded sentence from that lesson's own title/notes. Call
     `generateObject({ model: ollama.chat(MODEL), schema: searchModelOutputSchema, system,
     prompt: query })` — reuse the exact `ollama` client + `MODEL` construction from
     `route.ts` (extract both into `lib/search/ollama.ts` so the route and the mock share
     one definition — see Decision 5).
   - **Keyword fallback.** If `generateObject` throws (Ollama down / model missing /
     invalid JSON), call `keywordFilterMockLessons(query)` and synthesise each `reason`
     from the lesson (`"Covers " + lessonTitle.toLowerCase() + " — matches \"" + query +
     "\"."`, ≤ 280 chars).
   - **Resolve + ground.** Map every match id back to `MOCK_LESSONS` (a `Map` by
     `lessonId`); drop ids not in the catalog and de-dupe — same guard hydration applies
     to Sanity ids. Preserve match order for `sort === 'relevance'`.
   - **Assemble.** `results = resolved.map(r => toLessonResult(r.lesson, r.reason))`;
     `resultCount = results.length`; `courseCount = new Set(results.map(r =>
     r.courseId)).size`; return `searchResponseSchema.parse({ query, sort, resultCount,
     courseCount, results })`. No client-side sort here (the UI already re-sorts
     `course`/`duration`); `sort` is echoed through unchanged, matching the real path.
   - Never throws for a normal query: worst case both paths yield `[]` →
     `resultCount: 0`, which the UI renders as its empty state.
3. **`app/api/search/route.ts` edits** — minimal, production path untouched:
   - Add `const mockFallbackAllowed = process.env.NODE_ENV !== 'production'` (module
     const) and `import { runMockSearch } from '@/lib/search/mock'`.
   - Replace the `if (!isSearchMcpConfigured())` body: if `mockFallbackAllowed`,
     `console.warn('[search] SANITY_CONTEXT_MCP_URL unset — serving local mock results')`
     then `return mockJson(await runMockSearch(query, sort))`; else the existing
     `err('Search is not configured (SANITY_CONTEXT_MCP_URL).', 500)`.
   - In the `catch (error)` block: if `mockFallbackAllowed`, `console.warn('[search] MCP
     unavailable (' + message + ') — serving local mock results')` then `return mockJson(
     await runMockSearch(query, sort))`; else the existing `err(message, 500)`. Wrap the
     `runMockSearch` call so that if it *also* throws, we still `return err(message, 500)`
     (defence in depth — shouldn't happen per Decision 2).
   - `finally { await mcpClient?.close() }` stays exactly as-is (safe when the client was
     never created).
   - `mockJson(body)` helper = `NextResponse.json(body, { headers: {
     'x-vertex-search-source': 'mock' } })` — a debug marker so `curl -i` / DevTools shows
     the mock path fired. The real path keeps returning a plain `NextResponse.json(body)`
     (implicitly `x-vertex-search-source` absent); optionally set it to `'mcp'` there for
     symmetry. Header only — the `SearchResponse` schema is not widened.
4. **No new env var.** "Dev only, automatic" means `NODE_ENV` is the whole switch. Add a
   short note to `.env.example` under the MCP block: in local dev, if
   `SANITY_CONTEXT_MCP_URL` is unset or the MCP call fails (e.g. Studio not deployed),
   `/api/search` serves results from a small built-in mock catalog so the UI/Ollama can
   be tested; this never happens when `NODE_ENV=production`. Also document the
   `x-vertex-search-source: mock` response header there or in the route's top comment.
5. **New `lib/search/ollama.ts`** (`import 'server-only'`) — lift the `ollama` client
   (`createOpenAI({ baseURL: OLLAMA_BASE_URL || 'http://localhost:11434/v1', apiKey:
   OLLAMA_API_KEY || 'ollama' })`) and `MODEL` / `MAX_STEPS` consts out of `route.ts`
   verbatim and export them, so `route.ts` and `lib/search/mock.ts` use one definition.
   `route.ts` imports them instead of declaring them. Pure refactor, no behaviour change.
6. **Catalog realism.** The mock lessons don't need to match the Sanity seed data
   one-for-one (the whole point is that Sanity/Studio isn't reachable), but they should
   look plausible so screenshots of `/search` are meaningful. Keep copy short and
   generic; no real people as instructors (course-level only, no instructor field on the
   card anyway).

## Files to touch

**New**

- `lib/search/mock-catalog.ts` — `import 'server-only'`; `MockLesson` type,
  `MOCK_LESSONS`, `keywordFilterMockLessons`, `toLessonResult`.
- `lib/search/mock.ts` — `import 'server-only'`; `runMockSearch(query, sort)` — Ollama
  over the catalog with a keyword fallback; grounds + assembles a `SearchResponse`.
- `lib/search/ollama.ts` — `import 'server-only'`; shared `ollama` client + `MODEL` /
  `MAX_STEPS` consts (moved from `route.ts`).

**Modified**

- `app/api/search/route.ts` — import the shared Ollama client; `mockFallbackAllowed`
  const; mock fallback on the "not configured" guard and in `catch`; `mockJson` header
  helper; top comment notes the dev-only fallback. No change to validation, the MCP/LLM
  happy path, or the `finally`.
- `.env.example` — note the dev-only mock fallback + the `x-vertex-search-source` header
  under the existing MCP block. No new variable.

**Unchanged** (relied on): `lib/search/{contract,env,mcp,prompt,hydrate}.ts`,
`app/api/search/health/route.ts`, `components/search/*`, `app/search/page.tsx`,
everything under `sanity/` and `studio/`.

## Requirements

- Production path byte-for-byte equivalent in behaviour: when `NODE_ENV === 'production'`,
  an unset URL still returns `500 { error: 'Search is not configured…' }` and an MCP
  throw still returns `500 { error: message }`. The mock branch is unreachable there.
- No secret or token reaches the browser: all three new modules are `import 'server-only'`;
  the client still only `fetch`es `/api/search`. The mock path makes no network call
  except to local Ollama.
- Grounding holds on the mock path: only `lessonId`s present in `MOCK_LESSONS` become
  cards; unknown/duplicate ids are dropped; `resultCount` / `courseCount` are recomputed
  from `results`, never taken from the model.
- Token-based matching only in `keywordFilterMockLessons` — per-token substring, never
  the whole query as one pattern (AGENTS §11).
- `runMockSearch` never throws for a valid `{ query, sort }`; a total miss yields
  `resultCount: 0` → the UI's existing empty state.
- The MCP client is still closed on every path (`finally` untouched).
- New TS is strict-clean, no `any`; card objects typed off `lib/search/contract.ts`
  inferred types (`LessonResult`, `SearchResponse`, `SearchSort`). `npx tsc --noEmit`,
  `npm run lint`, `npm run build` pass.
- No new dependency; `@ai-sdk/openai` + `ai` (`generateObject`) are already installed.

## Security considerations

- The fallback is gated on `NODE_ENV !== 'production'`, so it cannot mask a real MCP
  outage or serve fabricated catalog data to real users in a deployed environment.
- Free-text query still goes only to a local model as the `prompt` (never concatenated
  into a query string); the mock catalog is a hardcoded in-process constant, so there is
  no datastore to inject into on this path.
- Same anti-hallucination guard as the real route: the model can only *select* from a
  fixed id set; anything it invents is dropped.
- `console.warn` on fallback logs only a short reason string — no token, no env dump, no
  stack. Error responses in production are unchanged (short message only).
- The `x-vertex-search-source` header exposes only which code path ran (`mock` vs.
  absent/`mcp`) — no sensitive value.

## Acceptance criteria

1. Dev, `SANITY_CONTEXT_MCP_URL` unset: `POST /api/search` `{ "query": "data fetching" }`
   → `200`, body passes `searchResponseSchema.parse`, `kind:'lesson'` results from the
   mock catalog, `resultCount === results.length`, `courseCount ===` distinct course
   count, response header `x-vertex-search-source: mock`.
2. Dev, `SANITY_CONTEXT_MCP_URL` set to a bogus URL (simulating no deployed Studio): same
   as (1) — the `catch` path serves the mock instead of a `500`.
3. Dev, Ollama stopped (or `OLLAMA_BASE_URL` bogus) **and** MCP unavailable: still `200`
   with mock results via the keyword-filter fallback; server stays up; a `console.warn`
   notes the fallback.
4. Dev, nonsense query `"asldkfjqwpoei"` with MCP unavailable → `200 { resultCount: 0,
   results: [] }`; `/search` shows the empty state linking to `/courses`.
5. `NODE_ENV=production` build/run, `SANITY_CONTEXT_MCP_URL` unset → `POST /api/search`
   returns `500 { error }` (no mock, no `x-vertex-search-source: mock`).
6. Happy path unaffected: with a working MCP + Ollama, the route behaves exactly as
   before (no `x-vertex-search-source: mock` header; results hydrated from Sanity).
7. `/search?q=data%20fetching` in dev with MCP unavailable renders the normal results UI
   (count, sort control, lesson cards) off the mock data; sort re-order and card links
   work; card links point at `/lessons/<mock-slug>` (page will 404 since the lesson isn't
   in Sanity — acceptable and called out in "Needs your attention").
8. `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass; report real output.

## Checks to run (report real output)

- `npx tsc --noEmit` (web root)
- `npm run lint` (web root)
- `npm run build` (server route changed)
- `npm run dev`, then with `SANITY_CONTEXT_MCP_URL` unset in `.env.local`:
  - `curl -s -i -XPOST localhost:3000/api/search -H 'content-type: application/json' -d
    '{"query":"data fetching"}'` → `200`, `x-vertex-search-source: mock`, paste the JSON
    (trim `results` to 3).
  - `curl -s -XPOST … -d '{"query":"asldkfjqwpoei"}' | jq '.resultCount'` → `0`.
  - Stop Ollama, repeat the first curl → still `200` with mock results (keyword path).
- Set `SANITY_CONTEXT_MCP_URL` to a bogus value, `curl` again → `200` mock (catch path).
- `NEXT` production sanity: `NODE_ENV=production node …` or `npm run build && npm start`
  with the URL unset → `curl` returns `500 { error }`, no mock header.
- No Studio steps (no schema/GROQ/TypeGen change).

## Manual test steps

1. In `.env.local` comment out `SANITY_CONTEXT_MCP_URL`. `npm run dev`.
2. Open `/search`, type `data fetching`, Enter → loading, then "N results" + lesson cards
   from the mock catalog. Console shows the `[search] … serving local mock results` warn.
3. DevTools Network → the `/api/search` response has header `x-vertex-search-source: mock`.
4. Change sort to "Course A–Z" / "Shortest first" → cards reorder, no new request.
5. Search `asldkfjqwpoei` → empty state with "Browse the full catalog" → `/courses`.
6. Stop the Ollama server, search `caching` again → still returns cards (keyword
   fallback); console warn still present.
7. Restore Ollama. Set `SANITY_CONTEXT_MCP_URL` to `https://example.invalid/mcp`, restart,
   search → still `200` mock results (the MCP throw is caught).
8. Restore the real `SANITY_CONTEXT_MCP_URL` (once Studio is deployed) → results come from
   Sanity again, no `x-vertex-search-source: mock` header, behaviour identical to before.
9. `npm run build` → passes.

## Follow-up: mock lesson links (implemented)

Clicking a mock result card navigates to `/lessons/<mock-slug>`, which has no Sanity
document. Rather than 404, `app/lessons/[slug]/page.tsx` now renders a **dev-only**
placeholder (`components/lesson/MockLessonPlaceholder.tsx`) when
`getMockLessonBySlug(slug)` (new, in `lib/search/mock-catalog.ts`) matches and
`NODE_ENV !== 'production'`. Real unknown slugs still 404; production is unchanged.

## Needs your attention

- **Mock lessons don't exist in Sanity.** A clicked mock card shows a clearly-labelled
  placeholder page (dev only), not the real lesson experience. It disappears once real
  content is seeded and the Studio is deployed.
- **Deploy the Studio to remove the fallback.** Once `npm run -w studio deploy` is done
  and `GET /api/search/health` returns `ok:true`, set the real `SANITY_CONTEXT_MCP_URL`
  and the route uses live data automatically — no code change, the mock path just stops
  being hit.
- **Dev-only by design.** The fallback is off when `NODE_ENV=production`; a real MCP
  outage in a deployed environment still surfaces as a `500`. If you later want it in a
  preview/staging deploy, that's a one-line change (swap the `NODE_ENV` check for an env
  flag) — say the word.
- **Catalog is hardcoded.** Editing the mock results means editing
  `lib/search/mock-catalog.ts`. Kept to ~7 lessons / 2 courses; tell me if you want it
  bigger or themed differently.
