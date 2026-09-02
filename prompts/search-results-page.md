# Implementation Prompt: Intelligent Search — LLM route + results page

## Goal

Ship the Vertex **search experience** end to end, reproducing `UI.video.jpg` exactly on
desktop and degrading sensibly to mobile:

1. `POST /api/search` — a server route that connects to the Sanity Context MCP (base URL,
   already plumbed in `lib/search/`), injects an inline system prompt, calls an **OpenAI**
   model via the Vercel AI SDK, has the model find matching lessons with the MCP
   `groq_query` tool, then **hydrates every result from Sanity directly** (canonical
   title / slug / course / `Module X` · `Lesson X.Y` label / key points) so nothing on a
   card is model-invented. Returns the structured `SearchResponse` JSON.
2. `/search` — a page that renders the results UI: the search field (⌘K), a
   "`N` results" count, a "Most Relevant" sort control, and a ranked list of result
   cards. Two card kinds are designed; **only lesson results are produced this task**
   (no `video` documents exist yet — see Decisions 3 and "Needs your attention"). The
   VIDEO card is built but dormant.
3. Wire the existing home hero search box to navigate to `/search?q=…` so the feature has
   an entry point.

Per the user's answers to the clarifying questions:

- **LLM = OpenAI** (`@ai-sdk/openai`, `OPENAI_API_KEY`). The user adds the real key to
  `.env.local`; this task adds it to `.env.example` and reads it server-side only.
- **Lesson results now, video moments later.** The `videoResult` contract and the VIDEO
  card component are built but no video result is emitted until the ingestion task
  (`prompts/video-ingestion-pipeline.md`) has run.
- **Base MCP URL + inline system prompt only.** No `sanity.agentContext` schema or
  document this task; `SANITY_CONTEXT_MCP_URL` stays the base URL already in `.env.local`.
  All critical query/ranking rules (AGENTS §11) live in the inline system prompt.

**Explicitly out of scope:** `video` docs / transcript ingestion / any timestamped
"watch from N" result; the `sanity.agentContext` schema, document, `dial-your-context`,
`shape-your-agent`, Conversation Insights; semantic search (`text::semanticSimilarity()`
— embeddings are off, keyword match only); streaming the response (the card UI needs the
whole ranked set + counts at once, so a single JSON response is returned); real learner
progress / completion marks on cards; any Sanity schema, GROQ `defineQuery`, or TypeGen
change; My Learning; the notifications bell.

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — §2 loop (prompt + approval before code; close with the
  3-heading report), §3 UI (reproduce the reference exactly, reuse existing
  components/Tailwind, responsive down to mobile, no restyling beyond the reference),
  §5 boundaries (search API is a **server route** → Sanity Context MCP over server-side
  HTTP + inline system prompt + LLM, returns results; the browser holds no token, never
  calls the MCP/LLM; the search UI is a client component rendering that response;
  analytics is browser-side with the public key), §6 stack (Vercel AI SDK + **OpenAI**
  provider, Zod for structured output, `react-markdown` **only** for a reply — the card
  UI has no prose reply, so `react-markdown` is not needed), §7 (result cards not a
  chatbox; grounded — never invent a course/lesson/price/duration/timestamp; video
  intelligence is an internal lookup; playback stays on-site), §10 (Context document is
  optional — base URL works; inline system prompt needs a server restart to pick up
  changes), §11 (full results page: "found N results", sort control defaulting to most
  relevant, two result kinds, search both ways and merge, rank by specificity,
  token-based text match — wildcard + OR, never a whole phrase, match the plain-text
  projection of Portable Text, put the critical rules in the inline system prompt),
  §12 (MCP needs a **deployed Studio**; cache initial context, so prompt changes need a
  restart; never return a whole transcript/`chunks`; private dataset — read token stays
  server-side; escape backticks in a template-literal system prompt), §13 checks, §14
  keep it small.
- `agent/skills/create-agent-with-sanity-context/SKILL.md` + `references/nextjs-agent.md`
  + `references/ecommerce/app/src/app/api/chat/route.ts` — the reference pattern:
  `createMCPClient({ transport: { type: 'http', url, headers: { Authorization: 'Bearer …' }}})`,
  `Promise.all([createMCPClient(...), fetchInitialContext()])`, `const { initial_context:
  _omit, ...mcpTools } = await mcpClient.tools()` (exclude it — data is already in the
  prompt), always `mcpClient.close()` in `onFinish`/`catch`/`finally`, `stopWhen:
  stepCountIs(N)` for multi-step tool use, `groq_query` / `schema_explorer` tool names,
  base URL works with no Context document, always include `_id` in projections.
  Reference used `ai@6` + `@ai-sdk/mcp@1` + Anthropic; we use `ai@7` + `@ai-sdk/mcp@2`
  (already installed) + `@ai-sdk/openai@4`.
- `node_modules/next/dist/docs/` (App Router) — route handlers (`app/api/**/route.ts`,
  `export async function POST`, `export const runtime = 'nodejs'`,
  `export const dynamic = 'force-dynamic'`), reading `searchParams` in a page (it is a
  `Promise`; reading it opts the page into dynamic rendering — acceptable here, `/search`
  is inherently dynamic), `PageProps<'/search'>`, client/server boundaries (pass
  server-rendered nodes into client components as props). Re-read the relevant guide at
  implementation time before writing.
- No Sanity/Clerk/PostHog skill work — the content model, data layer, and PostHog wiring
  already exist and are reused unchanged.

## Code inspected

- `lib/search/contract.ts` — hand-authored Zod contract (not TypeGen). `lessonResultSchema`
  (`kind:'lesson'`, `lessonId/lessonSlug/lessonTitle`, `courseId/courseTitle/courseSlug`,
  `moduleLabel` e.g. `"Module 5"` nullable, `lessonLabel` e.g. `"Lesson 5.1"` nullable,
  `keyPoints: string[]`, `description: string`), `videoResultSchema` (`kind:'video'`,
  same identity + `thumbnailUrl`, `clipLengthSeconds`, `matchedSeconds`, `description`),
  `searchResultSchema` (discriminated union), `searchSortSchema =
  z.enum(['relevance','course','duration'])`, `searchResponseSchema` (`query`, `sort`,
  `resultCount`, `courseCount`, `results[]`), inferred types, `EMPTY_SEARCH_RESPONSE`.
  Header says it must stay in sync with the system prompt written "in the follow-up LLM
  task" — that is this task.
- `lib/search/env.ts` — `import 'server-only'`; `searchMcpUrl()` (throws if
  `SANITY_CONTEXT_MCP_URL` unset), `isSearchMcpConfigured()`, re-exports `readToken`.
- `lib/search/mcp.ts` — `import 'server-only'`; `createSearchMcpClient()` (HTTP transport,
  `Authorization: Bearer <readToken>`, caller must `close()`), `initialContextUrl()`,
  `fetchInitialContext(): Promise<string | null>` (module-level cache, 5-min TTL, never
  throws). Reused as-is.
- `app/api/search/health/route.ts` — existing diagnostic `GET`; shows the plumbing works
  and is the "verify against the live MCP endpoint" check (AGENTS §13). Left in place.
- `sanity/lib/api.ts` — `import 'server-only'`, `react/cache`-wrapped, `serverClient`
  (`perspective:'published'`, `stega:false`, token, no CDN). `getLessonBySlug` already
  computes the derived `Module X` / `Lesson X.Y` label from the owning course's
  `modules[]` order and a reverse reference — **the hydration query in this task reuses
  that exact derivation** (module index + 1, lesson index + 1).
- `sanity/queries/lessons.ts` — `LESSON_BY_SLUG_QUERY` shape: reverse reference
  `*[_type=="course" && references(^._id)][0]{ …, modules[]{ _key, title,
  "lessonIds": lessons[]._ref } }`. The hydration query mirrors this, keyed by a list of
  lesson `_id`s instead of a slug.
- `sanity/queries/fragments.ts` — `lessonCardFragment` selects `keyPoints` and (unused
  here) `poster`. `pt::text()` is the plain-text projection to use for notes.
- `components/ui/Input.tsx` — `TextInput` (search-icon input, `h-12 rounded-md border
  border-neutral-500 bg-neutral-800`, `focus:border-primary-500`) and `Select`
  (chevron, same field spec). The results page search field in the reference is taller
  with a primary-500 border and a ⌘K kbd — closer to `HeroSearch` in `app/page.tsx`
  (`h-14 rounded-lg`, `text-primary-400` icon, `⌘K` kbd) than to `TextInput`. Reuse
  `Select` for the sort control; model the search field on `HeroSearch`.
- `app/page.tsx` — `HeroSearch` is a `readOnly` input today. It becomes a small client
  component that pushes `/search?q=<value>` on Enter / submit.
- `components/ui/Navigation.tsx` — `Navbar` (reused unchanged), `Breadcrumbs`,
  `Pagination` (not used — §11 says do not cap/paginate results).
- `components/ui/Badge.tsx` — `video | lesson | popular` variants,
  `rounded-xs px-2 py-0.5 text-[11px] font-semibold uppercase`. The reference's
  `VIDEO` (amber/brown) and `LESSON` (violet) pills are close to but not exactly these
  two variants — see Decision 6.
- `components/ui/CourseIcon.tsx` — monogram tile (`h-14 w-14 rounded-md`). Reused at a
  smaller size for the course row on each card (the reference shows a ~20px brand glyph;
  approximate with the course-initial monogram, consistent with `CourseGrid`).
- `components/course/courseFormat.ts` — `formatClock` (`350` → `"5:50"`) for the video
  card's clip length, `formatHms`, `capitalize`. Reused as-is.
- `components/lesson/LessonViewTracker.tsx` / existing `posthog.capture` calls —
  snake_case event names, flat property bags, `source` discriminator. New search events
  follow this style. `instrumentation-client.ts` inits PostHog with `api_host:'/ingest'`.
- `app/globals.css` — tokens (`primary-100..500`, `neutral-0..900`), `--radius-*`,
  type utilities (`text-display-2`, `text-h1..3`, `text-body-lg/body/small`,
  `font-display`). No Tailwind typography plugin. Reuse; add none.
- `sanity.types.ts` — TypeGen output; no `video`/`agentContext` type. No change this task
  (the route's GROQ goes through the MCP and through an inline `serverClient.fetch`
  string, neither of which is a `defineQuery`, so TypeGen is not involved).
- `package.json` — `@ai-sdk/mcp@2.0.41` and `zod@^4.5.4` already present;
  `next 16.3.3`, `react 19.2.8`, Node 24 locally (engine needs ≥22). `ai`,
  `@ai-sdk/openai` are **not** installed. `@ai-sdk/mcp@2` depends on
  `@ai-sdk/provider@4` / `@ai-sdk/provider-utils@5`, which is the `ai@7` /
  `@ai-sdk/openai@4` generation. `npm info ai version` → `7.0.89`,
  `npm info @ai-sdk/openai version` → `4.0.55` at time of writing — confirm and pin at
  implementation time.

## Decisions & assumptions

1. **`POST /api/search`** (`app/api/search/route.ts`), `runtime = 'nodejs'`,
   `dynamic = 'force-dynamic'`, no auth gate (browsing is public, AGENTS §7; read-only).
   - Request body validated with a small Zod schema: `{ query: string (1–200 chars,
     trimmed), sort?: SearchSort }`. On invalid body → `400 { error }`. On missing
     `SANITY_CONTEXT_MCP_URL` or `OPENAI_API_KEY` or `readToken` → `500 { error }` with a
     short message (no secret, no stack), mirroring the health route.
   - `Promise.all([createSearchMcpClient(), fetchInitialContext()])`. `const {
     initial_context: _omit, ...mcpTools } = await mcpClient.tools()`.
   - `generateText` (AI SDK v7) — **not streamed**:
     `model: openai(process.env.OPENAI_MODEL ?? 'gpt-4.1-mini')`, `system:
     buildSearchSystemPrompt(initialContext)`, `prompt: <the user query>`, `tools:
     mcpTools`, `stopWhen: stepCountIs(8)`, `toolChoice: 'auto'`, and structured final
     output via `experimental_output: Output.object({ schema: searchModelOutputSchema })`
     (see Decision 2). Wrap in `try/finally` with `await mcpClient.close()`; also close
     on the error path. If `experimental_output` + MCP tools proves incompatible at the
     installed versions, fall back to: run `generateText` with tools to gather results,
     then a second `generateObject` call with no tools to coerce the final JSON — note
     which path was used in the report.
   - Model picks: default `gpt-4.1-mini` (fast, cheap, strong enough for
     query-writing + extraction), overridable with `OPENAI_MODEL`. Documented in
     `.env.example`.
2. **The model does NOT author card fields. It only selects lessons.** To keep every card
   grounded (AGENTS §7, §11), split the contract:
   - `searchModelOutputSchema` (new, in `lib/search/contract.ts`) — what the LLM returns:
     `{ matches: Array<{ lessonId: string, matchedOn: 'title' | 'notes' | 'keyPoints',
     relevance: number (0–1), reason: string (short, grounded, ≤ 240 chars) }> }`.
     Ordered best-first by the model. `reason` is the only free text the model produces
     and it becomes the card `description`; the system prompt forbids naming any fact
     (price, duration, counts, timestamps) not present in the queried data.
   - Server then **hydrates** every `lessonId` in one `serverClient.fetch` GROQ call
     (`lib/search/hydrate.ts`, `import 'server-only'`, `react/cache`): for each id →
     `lessonTitle`, `lessonSlug`, `keyPoints`, and via the reverse-reference the owning
     `courseId/courseTitle/courseSlug` + `moduleLabel` (`"Module " + (moduleIndex+1)`) +
     `lessonLabel` (`"Lesson " + (moduleIndex+1) + "." + (lessonIndex+1)`), using the
     same order math as `getLessonBySlug`. Ids the model returned that don't resolve to a
     real lesson are dropped (this is the anti-hallucination guard). Result order follows
     the model's `matches` order.
   - Final `SearchResponse` assembled server-side: `results` = hydrated lesson results
     (each `kind:'lesson'`, `description` = the model's `reason`, everything else from
     Sanity), `resultCount` = `results.length`, `courseCount` = distinct `courseId`
     count, `query`, `sort` (echoed; default `'relevance'`). Counts are **recomputed
     server-side**, never taken from the model.
3. **No video results emitted.** The system prompt tells the model the dataset has no
   video-moment index yet and to return lesson matches only. `videoResultSchema` and the
   VIDEO card component stay in the codebase, exercised by the ingestion follow-up. If
   `groq_query` happens to surface a `video` type (it won't — none exist), the hydrator
   ignores any non-`lesson` id.
4. **`/search` page** (`app/search/page.tsx`), server component:
   - `export const metadata` (`title: "Search | Vertex"`). Reads
     `searchParams` (`PageProps<'/search'>`, awaited) for `q` and `sort`.
   - Renders `<Navbar />` then `<SearchExperience initialQuery={q} initialSort={sort} />`
     (client). The page itself does **not** call the LLM route (keeps the server render
     cheap and matches §5 "the search UI is a client component that renders … from that
     response").
5. **`components/search/SearchExperience.tsx`** (client) — owns the whole interaction:
   - The search field (modeled on `HeroSearch`: `h-14 rounded-lg border`,
     `focus:border-primary-500`, search icon `text-primary-400`, `⌘K` kbd on `sm+`).
     A global `keydown` listener focuses it on `⌘K` / `Ctrl+K`. Submitting (Enter) or
     debounced typing (see below) updates the URL via
     `router.replace('/search?q=…&sort=…')` with `scroll:false` so the query is
     shareable / back-navigable.
   - Fetching: on mount with a non-empty `q`, and on every committed query/sort change,
     `POST /api/search` (`fetch`, `AbortController` to cancel the in-flight request).
     **Trigger on submit / Enter, not per keystroke** — the LLM call is too expensive to
     debounce-fire; a 400 ms debounce only applies to writing the query into the URL, not
     to calling the route. (If the reference implies live-as-you-type, still gate the
     network call behind Enter / an explicit search action — note in the report.)
   - States: idle (no query) → nothing but the field; loading → the count area shows a
     skeleton / "Searching…" and 3–4 skeleton cards; error → a short inline message with
     a retry button; empty (`resultCount === 0`) → the empty state (headline + "Browse
     the full catalog" link to `/courses`, per §11); success → count + sort + cards.
   - Count line: "`N` results" (`text-body` / `text-neutral-200`), left-aligned, matching
     the reference. (The contract also has `courseCount`; the reference screenshot only
     shows "28 results", so render just that. Keep `courseCount` in the payload for
     later.)
   - Sort control: reuse `Select` (`components/ui/Input.tsx`), top-right, options
     **Most Relevant** (`relevance`, default) / **Course A–Z** (`course`) /
     **Shortest first** (`duration`). `relevance` = server order as-is; `course` and
     `duration` re-sort the already-fetched `results` array **client-side** (no re-fetch)
     — `course` by `courseTitle` then `lessonLabel`, `duration` needs a lesson duration
     which the lesson result does not carry, so **either** add `durationSeconds` to
     `lessonResultSchema` + the hydrator **or** drop the `duration` option. Prefer adding
     `durationSeconds` (nullable) to the hydrator so all three sorts work and the video
     card can reuse it later. Selecting a sort also writes `?sort=` to the URL.
   - Analytics (browser, public key):
     - `search_performed` — after a successful response. Props: `query`, `result_count`,
       `course_count`, `sort`.
     - `search_result_clicked` — on a card click. Props: `kind` (`'lesson'`),
       `lesson_slug`, `course_slug`, `position` (1-based), `matched_on`.
     - `search_empty` — on a zero-result response. Props: `query`.
     Event names/shapes follow the existing snake_case + flat-bag convention.
6. **`components/search/ResultCard.tsx`** — renders one result, branching on `kind`.
   Layout from `UI.video.jpg` + the "Lesson Card" / "Video Card" cells in
   `design/UX.png`:
   - Shared shell: full-width rounded card (`rounded-lg border border-neutral-600
     bg-neutral-800/60`, generous padding, `hover:border-neutral-500`), a left media/þ
     column (~340px on `lg`, full-width stacked on mobile) and a right content column.
   - **Lesson card** (produced now): left column is a dark panel with the lesson's
     `keyPoints` as a bulleted list (matching the reference's "Fetching strategies /
     Caching techniques / Revalidation methods" panel) and a check glyph bottom-right;
     right column: course row (small `CourseIcon` monogram + `courseTitle`), a
     `LESSON` badge top-right, the `lessonTitle` in `font-display`, the `description`
     (2 lines, `text-neutral-200`), then a meta row — `moduleLabel` (e.g. "Module 5")
     — and a right-aligned "View lesson ⇱ ›" affordance. The whole card is a
     `next/link` to `/lessons/<lessonSlug>` firing `search_result_clicked`.
   - **Video card** (dormant — component built, not rendered until video docs exist):
     left column is a 16:9 thumbnail (`thumbnailUrl`) with a play glyph and the
     `formatClock(clipLengthSeconds)` chip; right column: course row, `VIDEO` badge,
     `lessonTitle`, `description`, meta row (`lessonLabel` + `courseTitle`), and a
     "Watch from `formatClock(matchedSeconds)` ›" affordance linking to
     `/lessons/<lessonSlug>?start=<matchedSeconds>` (the lesson page already honours
     `?start=`). No timestamp is ever synthesised.
   - Badges: `<Badge variant="lesson">LESSON</Badge>` / `<Badge variant="video">VIDEO</Badge>`.
     If the reference's amber `VIDEO` / violet `LESSON` colours are meaningfully off from
     the current `Badge` variants, add two variants (`resultVideo`, `resultLesson`) to
     `Badge.tsx` with the reference hex values rather than restyling inline. Decide by
     eye against the image; keep the change minimal.
7. **Home hero search → `/search`.** `HeroSearch` in `app/page.tsx` becomes a tiny client
   component (`components/search/HeroSearchField.tsx` or inline `"use client"` island):
   an uncontrolled input that on submit / Enter does `router.push('/search?q=' +
   encodeURIComponent(value))`. Keep the exact styling it has now. The `⌘K` affordance
   stays visual only on the home page (global ⌘K focus lives on `/search`).
8. **System prompt** (`lib/search/prompt.ts`, `buildSearchSystemPrompt(initialContext?:
   string | null): string`). A `const` template literal — **escape any backtick**
   (AGENTS §12). Contents, kept tight (§11 says put the critical rules here because the
   model follows the system prompt more reliably than an injected Context doc):
   - Role: you are Vertex's course-search engine. You turn a learner's plain-language
     query into a ranked list of matching **lessons**. You are not a chatbot; you output
     only the structured object.
   - Grounding: only select lessons the data actually returns. Never invent a lesson,
     course, id, price, duration, count, or timestamp. If nothing matches, return an
     empty `matches` array.
   - How to search (token-based, §11): break the query into keywords; wildcard each
     (`*term*`) and OR them; never match a whole phrase as one pattern. You cannot text
     match a Portable Text field directly — match `pt::text(notes)`. Search lesson
     `title`, `pt::text(notes)`, and `keyPoints[]`. Always project `_id`.
   - Ranking (§11): rank by specificity — a lesson whose `title` contains the exact
     concept beats a broad keyword hit in notes. Return **all** relevant lessons, best
     first, not a top handful.
   - Scope: the content types are `course`, `lesson`, `instructor`, `category`. There is
     **no** video-moment / transcript index available — do not attempt video results or
     timestamps; return lesson matches only.
   - Output: the `matches` array only (`lessonId`, `matchedOn`, `relevance`, `reason`).
     `reason` is one grounded sentence on why this lesson answers the query — no facts
     not present in the queried data.
   - `initialContext` (schema + tool overview from `/initial-context`) is appended under
     a "Data reference" heading when present, exactly like the reference `buildSystemPrompt`.
   - Example GROQ the model can adapt (as text in the prompt), e.g.
     `*[_type == "lesson" && (title match $kw || pt::text(notes) match $kw)]{ _id, title }`.
9. **Contract edits** (`lib/search/contract.ts`): add `searchModelOutputSchema` +
   inferred `SearchModelOutput`; add `durationSeconds: z.number().nullable()` to
   `lessonResultSchema` (and mirror on `videoResultSchema` if not already covered by
   `clipLengthSeconds`). Keep all existing exports. Update the header comment to note the
   split (model output vs. API response) and that the sync target is
   `lib/search/prompt.ts`.
10. **Dependencies**: `npm install ai @ai-sdk/openai` in the web workspace. `@ai-sdk/mcp`
    and `zod` already satisfy. Pin whatever npm resolves; report exact versions. If
    `ai@7` and `@ai-sdk/mcp@2.0.41` disagree on `@ai-sdk/provider*`, align to what
    `@ai-sdk/mcp` pins (it is already installed and working via the health route).
11. **Studio deploy precondition** (AGENTS §12) — unchanged from the plumbing task. The
    MCP only serves a dataset with a deployed Studio. Verified indirectly by
    `GET /api/search/health` returning `ok:true`. If it returns `ok:false` with a
    schema/Studio error, that is the blocker to flag, not a code bug.

## Files to touch

**New**

- `app/api/search/route.ts` — server `POST`; body validation; MCP + initial-context +
  OpenAI `generateText` with structured output; server-side hydration + count recompute;
  returns `SearchResponse` JSON; always closes the MCP client.
- `lib/search/prompt.ts` — `import 'server-only'`; `buildSearchSystemPrompt()`
  (backtick-safe template literal, embeds `initialContext`).
- `lib/search/hydrate.ts` — `import 'server-only'`; `hydrateLessonResults(ids: string[])`
  via `serverClient.fetch` + the `Module X` / `Lesson X.Y` derivation; `react/cache`.
- `app/search/page.tsx` — server; metadata; awaits `searchParams`; renders `Navbar` +
  `SearchExperience`.
- `components/search/SearchExperience.tsx` — client; field + ⌘K, fetch/abort, URL sync,
  loading/error/empty/success, count, sort (client re-sort), analytics.
- `components/search/ResultCard.tsx` — lesson card (live) + video card (dormant),
  branch on `kind`; `next/link`; click analytics.
- `components/search/SearchResultsSkeleton.tsx` — loading placeholder (small; may be
  folded into `SearchExperience`).
- `components/search/HeroSearchField.tsx` — client island for the home hero input →
  `/search?q=`.

**Modified**

- `lib/search/contract.ts` — add `searchModelOutputSchema` / `SearchModelOutput`; add
  `durationSeconds` to `lessonResultSchema`; header comment update. No breaking changes
  to existing exports.
- `app/page.tsx` — swap the inline `HeroSearch` markup to use `HeroSearchField` (same
  styling).
- `.env.example` — add an `# --- Intelligent search: LLM (OpenAI) ---` block:
  `OPENAI_API_KEY=` (+ "server only, never NEXT_PUBLIC_") and an optional
  `OPENAI_MODEL=` note (default `gpt-4.1-mini`). `SANITY_CONTEXT_MCP_URL` already listed.
- `.env.local` — **the user adds `OPENAI_API_KEY=…`** (git-ignored; they confirmed they
  will). This task does not write a secret.
- `package.json` / `package-lock.json` — add `ai`, `@ai-sdk/openai` (web workspace only;
  `studio/` untouched).
- `components/ui/Badge.tsx` — *only if* the reference badge colours require it: add
  `resultVideo` / `resultLesson` variants.

**Unchanged** (relied on): `lib/search/{contract(*edited),env,mcp}.ts`,
`app/api/search/health/route.ts`, everything under `sanity/`, `studio/`,
`components/lesson/*`, `components/course/*`, `components/ui/*` (except `Badge` maybe),
`app/layout.tsx`, `app/globals.css`, `instrumentation-client.ts`.

## Requirements

- No token, MCP access, or LLM key reaches the browser: `app/api/search/route.ts`,
  `lib/search/prompt.ts`, `lib/search/hydrate.ts` are server-only; the client component
  only ever `fetch`es `/api/search`. `OPENAI_API_KEY` / `SANITY_API_READ_TOKEN` /
  `SANITY_CONTEXT_MCP_URL` are read only in server modules, never `NEXT_PUBLIC_`.
- Every card field except `description` comes from Sanity via the hydrator. `description`
  is the model's one grounded sentence. No price/duration/count/timestamp is ever
  model-authored. `resultCount` / `courseCount` are recomputed server-side.
- Model-returned lesson ids that don't resolve to a real lesson are dropped silently.
- The MCP client is closed on every path (`finally` + error path).
- `/search` reproduces `UI.video.jpg` on desktop: search field with ⌘K, "N results"
  count, "Most Relevant" sort top-right, full-width ranked result cards with the
  left panel / right content split. Responsive: below `lg` the card stacks (media/panel
  on top, content below), the count + sort row wraps, the field stays full-width.
- Sort defaults to Most Relevant; `course` / `duration` re-sort client-side without a
  re-fetch; the choice is reflected in `?sort=`.
- Empty state points to `/courses`. Error state offers retry. Loading state shows
  skeletons, not a blank screen.
- Analytics events (`search_performed`, `search_result_clicked`, `search_empty`) fire
  browser-side with the listed props.
- Home hero search navigates to `/search?q=…` on Enter, styling unchanged.
- New TS is strict-clean, no `any`; card props typed off `lib/search/contract.ts`
  inferred types. `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- `react-markdown` is **not** added (no prose reply in this UI).

## Security considerations

- Private dataset + paid LLM: `SANITY_API_READ_TOKEN` (MCP bearer + hydrator client) and
  `OPENAI_API_KEY` live only in `import 'server-only'` modules and the route. Never in a
  response body, log line, or anything client-reachable. Error responses are a short
  message string only — no stack, no env, no token.
- The route takes free-text user input and hands it to an LLM that writes GROQ via the
  MCP. Mitigations: the query is length-capped (≤200 chars) and trimmed; it is passed as
  the `prompt`, never string-concatenated into a GROQ query in our code; the model's
  GROQ runs through the Context MCP against a **private, read-only** dataset (Viewer
  token — no write capability); the system prompt constrains scope to the four content
  types; the hydrator re-validates every returned id against real lessons, so a model
  that fabricates or is prompt-injected into returning junk ids produces an empty result,
  not bad data. No `text::semanticSimilarity()` (embeddings off).
- `generateText` step count is capped (`stepCountIs(8)`) so a misbehaving model can't
  loop tool calls unbounded. Consider a per-request timeout (AbortSignal) on the LLM
  call; at minimum the MCP client is always closed.
- No auth gate is added (browsing is public per AGENTS §7) — but the route makes an
  authenticated outbound MCP call and a paid LLM call per hit, so note in the report
  that a lightweight rate-limit or a Clerk gate is a reasonable follow-up if abuse is a
  concern.
- Result cards link only to internal `/lessons/<slug>` and `/courses` routes — no
  external URLs, no `dangerouslySetInnerHTML`, `description` rendered as plain text.
- Client → `/api/search` is same-origin `POST` with a JSON body; no cookies/secrets
  needed in the request.

## Acceptance criteria

1. `POST /api/search` with `{ "query": "data fetching" }` returns `200` and a body that
   `searchResponseSchema.parse()` accepts: `kind:'lesson'` results, `resultCount ===
   results.length`, `courseCount ===` distinct course count, `sort:'relevance'`.
2. Every returned result's `lessonSlug` resolves to a real lesson; `moduleLabel` /
   `lessonLabel` match that lesson's position in its owning course (spot-check two
   against `/courses/<slug>`).
3. A nonsense query (`"asldkfjqwpoei"`) returns `200 { resultCount: 0, results: [] }` and
   the page shows the empty state linking to `/courses`.
4. With `OPENAI_API_KEY` unset the route returns `500 { error }` with no secret/stack and
   the dev server stays up; with `SANITY_CONTEXT_MCP_URL` unset, likewise.
5. `/search?q=data%20fetching` renders the reference layout: field + ⌘K, "N results",
   "Most Relevant" select, ranked lesson cards with the left key-points panel and right
   content column. Matches `UI.video.jpg` on desktop.
6. `⌘K` (or `Ctrl+K`) focuses the search field on `/search`.
7. Switching the sort to "Course A–Z" / "Shortest first" reorders the visible cards with
   no network request and sets `?sort=`.
8. Home page: typing in the hero search and pressing Enter navigates to `/search?q=…`
   and results load.
9. Below `lg` width: cards stack (panel above content), count + sort row wraps, no
   horizontal scroll. Desktop unchanged from the reference.
10. PostHog receives `search_performed` (with `result_count`) after a search,
    `search_result_clicked` on a card click, `search_empty` on a zero-result query
    (verify against `/ingest` in the Network tab or PostHog live events).
11. The MCP client is closed after every request (no "MCP client leaked" warnings; the
    health route still returns `ok:true` afterwards).
12. `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass. Report real output and
    the exact installed `ai` / `@ai-sdk/openai` versions.

## Checks to run (report real output)

- `npm install ai @ai-sdk/openai` — capture resolved versions written to `package.json`.
- `npx tsc --noEmit` (web root)
- `npm run lint` (web root)
- `npm run build` (routes + server/client modules added)
- `npm run dev`, then:
  - `curl -s localhost:3000/api/search/health | jq` → confirm `ok:true` first (Studio
    deployed / MCP reachable). If `ok:false`, stop and report — that blocks the feature.
  - `curl -s -XPOST localhost:3000/api/search -H 'content-type: application/json' -d
    '{"query":"data fetching"}' | jq` → paste the JSON (trim `results` to 3).
  - `curl -s -XPOST … -d '{"query":"asldkfjqwpoei"}' | jq` → `resultCount:0`.
- Manual walk of the steps below.
- No Studio steps (no schema/GROQ/TypeGen change). Note whether `studio` is deployed
  (the health route's `ok` is the tell).

## Manual test steps

1. `npm run dev`. `GET /api/search/health` → `ok:true` (else fix Studio deploy first).
2. Open `/search` → just the search field, no results.
3. Type `data fetching`, press Enter → loading skeletons, then "N results" + ranked
   lesson cards. Compare side-by-side with `UI.video.jpg`: field, count, sort control,
   card left panel (key points) + right column (course row, LESSON badge, serif title,
   description, module label, "View lesson").
4. Click a card → lands on `/lessons/<slug>`; Network `/ingest` shows
   `search_result_clicked`.
5. Back to `/search`. Change sort to "Course A–Z" then "Shortest first" → cards reorder,
   no `/api/search` call, URL gains `?sort=`.
6. Search `asldkfjqwpoei` → empty state with "Browse the full catalog" → `/courses`.
7. Reload `/search?q=data%20fetching&sort=course` → same results, sorted by course, field
   pre-filled.
8. Press `⌘K` / `Ctrl+K` anywhere on the page → field focuses.
9. Home page → type in the hero search, Enter → `/search?q=…`, results load.
10. DevTools Network `/ingest`: `search_performed` after a search (has `result_count`,
    `course_count`, `sort`), `search_empty` for the nonsense query.
11. Resize to ~375px: cards stack, count+sort wrap, no horizontal scroll; desktop
    (~1440px) matches the reference.
12. Temporarily unset `OPENAI_API_KEY` in `.env.local`, restart, search → inline error +
    retry, dev server still up. Restore.

## Needs your attention

- **`OPENAI_API_KEY` is yours to add.** Put a real key in `.env.local` before testing
  end-to-end; `.env.example` gets the placeholder + the `OPENAI_MODEL` note (default
  `gpt-4.1-mini`). Until it's set, `/api/search` returns a 500 and the page shows the
  error state.
- **Deployed Studio is a precondition** (AGENTS §12). If `GET /api/search/health`
  returns `ok:false` with a schema/Studio error, run `npm run -w studio deploy` (+
  `deploy:schema`) and re-check — the search route can't work until the MCP serves the
  dataset. I can't verify this from here (the Sanity MCP connector isn't authorised in
  this session).
- **No video-moment results.** Per your call, the VIDEO card is built but never rendered
  until `prompts/video-ingestion-pipeline.md` runs and `video` documents exist. Only
  LESSON cards appear now. The reference's VIDEO cards will light up after that task with
  no further UI work.
- **No Context document.** All query/ranking rules live in the inline system prompt, so
  tuning search behaviour means editing `lib/search/prompt.ts` and **restarting the dev
  server** (initial context is cached). Adding a `sanity.agentContext` schema + document
  (via `dial-your-context`) is a clean follow-up that makes search tunable without a
  deploy.
- **Sort is client-side.** `course` / `duration` reorder the fetched set only; they don't
  re-query. If the design intends server-side re-ranking, that's a follow-up.
- **Cost / abuse.** Every search is one paid OpenAI call + one authenticated MCP call and
  the route is unauthenticated (public browsing). A rate-limit or Clerk gate is a
  reasonable follow-up if this goes anywhere public.
- **`generateText` + `experimental_output` with MCP tools** — if the installed AI SDK
  version doesn't support structured output alongside tool calls, I'll use the
  two-call fallback (tools to gather, then `generateObject` to shape) and note it.
- **Progress marks on cards.** The reference shows a check glyph on some lesson cards.
  That's rendered as static UI (no learner-progress backend exists yet), consistent with
  the course/lesson pages' placeholder stance.
