# Implementation Prompt: Intelligent Search — MCP connection + plumbing

## Goal

Stand up the **server-side foundation** for Vertex intelligent search: a Sanity Context
MCP connection, the `/initial-context` fetch + cache, the env wiring, and a typed
result contract (Zod schema + inferred types) that the later LLM call and the results
page will both build on. Plus one diagnostic route so the plumbing is verifiable now.

**Explicitly out of scope for this task** (deferred by the user):

- The LLM call itself — no provider dependency (`@ai-sdk/openai` / `@ai-sdk/anthropic`),
  no `streamText` / structured-output call, no system prompt content, no API key.
- The `/search` results page and any UI — the user will supply a desktop design image
  first (AGENTS §3).
- Video-moment results — lesson results only for now (no `video` docs, no transcripts,
  no invented timestamps). The contract still *defines* the video-result shape so the
  ingestion task later only has to populate it.
- Any Sanity schema change, `sanity.agentContext` document creation, `dial-your-context`
  / `shape-your-agent` work, Conversation Insights.

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — §5 boundaries (search API is a **server route** that
  connects to the Sanity Context MCP, injects schema + system prompt, calls the LLM,
  streams results; browser holds no token, never calls the MCP/LLM), §6 tech stack
  (Vercel AI SDK + **OpenAI** provider, Zod for structured output, `react-markdown`
  only for the reply), §7 (search is result cards not a chatbox; grounded — never
  invent a course/lesson/price/duration/timestamp; video intelligence lives in `video`
  docs and is an internal lookup), §10 (the Context document carries content scope +
  query instructions; editable without code; reaches the agent next request, but the
  inline system prompt needs a server restart), §11 (full results page: count "found
  28 results across 8 courses", sort control defaulting to most-relevant, two result
  kinds), §12 (MCP only serves a dataset with a **deployed Studio**; cache the initial
  context; never return whole transcripts; private dataset — token stays server-side;
  escape backticks in a template-literal system prompt), §13 checks, §14 keep it small.
- `agent/skills/create-agent-with-sanity-context/SKILL.md` — MCP URL forms (base
  `https://api.sanity.io/v2026-03-03/context/mcp/:projectId/:dataset`, document form
  adds `/:slug`), auth is `Authorization: Bearer <Sanity API read token>` (Viewer role
  covers MCP reads), `/initial-context` HTTP endpoint (append to the MCP URL path
  *before* any query params) — fetch once, cache, inject into the system prompt, and
  exclude the `initial_context` tool from the tools handed to the LLM. Base URL works
  with no Context document.
- `agent/skills/create-agent-with-sanity-context/references/nextjs-agent.md` and
  `.../ecommerce/app/src/app/api/chat/route.ts` — reference `createMCPClient({ transport:
  { type: 'http', url, headers: { Authorization } } })`, the `initialContextUrl()`
  trailing-slash handling, the module-level `cachedInitialContext` + `cacheTimestamp`
  + `CACHE_TTL_MS` pattern, always `mcpClient.close()` in `onFinish`/`catch`.
- `.../ecommerce/app/package.json` — working versions: `@ai-sdk/mcp ^1.0.41`,
  `ai ^6`, `zod ^4`, `server-only ^0.0.1`. Confirm current with `npm info <pkg> version`
  at implementation time and pin what installs.

## Code inspected

- `sanity/env.ts` — exports `projectId` (`idij6qfk` via `NEXT_PUBLIC_SANITY_PROJECT_ID`),
  `dataset` (`production`), `apiVersion` (`2026-08-31`), `readToken`
  (`SANITY_API_READ_TOKEN`, server-only, `undefined` allowed). Reuse these; do not
  re-read `process.env` for values it already exposes.
- `sanity/lib/client.ts` / `sanity/lib/api.ts` — established server-only data layer
  pattern: `import 'server-only'` at the top, `react/cache`-wrapped fns, token only in
  server bundles, `perspective: 'published'`, `stega: false`. New search server modules
  follow the same conventions and file style (2-space indent, single quotes, no
  semicolons — match `sanity/**`; note `components/**` uses semicolons + double quotes,
  so keep search server code in the `sanity/**`/`lib/**` style).
- `lib/video.ts` — existing pure helper style in `lib/` (JSDoc header explaining the
  boundary, small focused exports). `lib/posthog-server.ts` — existing server-only
  module in `lib/`. New search modules live under `lib/search/`.
- `sanity.types.ts` — TypeGen output; `LESSON_BY_SLUG_QUERY_RESULT`,
  `COURSE_BY_SLUG_QUERY_RESULT` etc. exist. No `video` or `agentContext` type. The
  contract in this task is hand-written Zod (not TypeGen) because it describes the
  **LLM's structured output**, not a GROQ projection.
- `studio/schemaTypes/index.ts`, `studio/structure.ts`, `studio/sanity.config.ts` —
  no `sanity.agentContext` schema, no `@sanity/context` plugin. Seed (`seed.ndjson`)
  has course/lesson/instructor/category/module/etc. only — no `video`, no
  `agentContext`. So this task uses the **base MCP URL** (no `/:slug`).
- `.env.example` — canonical committed list (AGENTS §12). Currently has the Sanity
  web/server/Studio blocks, Clerk, (no PostHog block — `.env.local` has PostHog vars
  the example is missing, pre-existing gap, left as-is). `.env.local` has real
  `NEXT_PUBLIC_SANITY_PROJECT_ID=idij6qfk`, `SANITY_API_READ_TOKEN=sk...`.
- `app/` route layout — App Router, route handlers as `app/**/route.ts`. `next.config.ts`
  rewrites `/ingest/*` to PostHog; `/api/*` is free. `tsconfig.json` path alias `@/*` →
  repo root; `agent/` and `.agents/` are `exclude`d from the web tsconfig.
- `package.json` — no `ai`, `@ai-sdk/*`, or `zod` today. `next 16.3.3`, `react 19.2.8`.

## Decisions & assumptions

1. **New module dir `lib/search/`**, three files, all server-only except the contract:
   - `lib/search/contract.ts` — Zod schemas + inferred types. **No `server-only`** (the
     results page will import the types). Runtime-pure; safe on the client.
   - `lib/search/mcp.ts` — `import 'server-only'`. MCP client factory + initial-context
     fetch/cache. Never imported by a client component.
   - `lib/search/env.ts` — `import 'server-only'`. Small assertions for the search-only
     env vars, mirroring `sanity/env.ts`'s `assertValue` style. Exports
     `searchMcpUrl()` (throws if unset) and re-exports `readToken` from `sanity/env`.
2. **Env vars** (server-only, no `NEXT_PUBLIC_` prefix):
   - `SANITY_CONTEXT_MCP_URL` — the MCP endpoint. For this task, the **base URL**:
     `https://api.sanity.io/v2026-03-03/context/mcp/idij6qfk/production`. When a
     `sanity.agentContext` document exists later, this becomes the document URL with a
     trailing `/<slug>`. Added to **`.env.example`** (canonical) with an explanatory
     comment and a blank value, and to **`.env.local`** with the base URL filled in so
     the diagnostic route works immediately.
   - Auth reuses the existing **`SANITY_API_READ_TOKEN`** (Viewer role covers MCP reads
     per the skill) — no new token var.
   - **No LLM key var in this task.** A commented `# --- Intelligent search (LLM) ---`
     placeholder block is added to `.env.example` noting the provider/key are TBD, so
     the next task has an anchor. No secret values.
3. **`createSearchMcpClient()`** in `lib/search/mcp.ts`:
   - `return createMCPClient({ transport: { type: 'http', url: searchMcpUrl(), headers:
     { Authorization: \`Bearer ${readToken}\` } } })` — throws a clear error if
     `readToken` is undefined.
   - Returns the client; **the caller must `await client.close()`** (documented in
     JSDoc). No global singleton — MCP clients are per-request in the reference.
4. **`fetchInitialContext(): Promise<string | null>`** — module-level cache exactly like
   the reference: `let cachedInitialContext`, `let cacheTimestamp`, `const CACHE_TTL_MS
   = 5 * 60 * 1000`. `initialContextUrl(mcpUrl)` inserts `/initial-context` into the
   **path** (before `?query`), collapsing a trailing slash. On a non-OK response, keep
   the stale value (or `null`) and don't throw — the LLM can still call the
   `initial_context` tool as a fallback. Same `Authorization: Bearer <readToken>` header.
5. **Result contract** (`lib/search/contract.ts`) — Zod v4, `z.object`, exported both as
   schemas (for the later `generateObject`/`Output.object` validation) and as
   `z.infer` types:
   - `lessonResultSchema`: `kind: z.literal('lesson')`, `lessonId`, `lessonSlug`,
     `lessonTitle`, `courseId`, `courseTitle`, `courseSlug`, `moduleLabel` (e.g.
     `"Module 5"` — nullable), `lessonLabel` (e.g. `"Lesson 5.1"` — nullable),
     `keyPoints: z.array(z.string())`, `description: z.string()` (short, grounded).
   - `videoResultSchema` (defined, **not produced** this task): `kind:
     z.literal('video')`, same course/lesson/module identity fields, plus
     `thumbnailUrl: z.string().nullable()`, `clipLengthSeconds: z.number().nullable()`,
     `matchedSeconds: z.number().int().nonnegative()`, `description: z.string()`.
   - `searchResultSchema = z.discriminatedUnion('kind', [lessonResultSchema,
     videoResultSchema])`.
   - `searchSortSchema = z.enum(['relevance', 'course', 'duration'])` — default
     `'relevance'` (AGENTS §11 "sort control that defaults to most relevant"; the extra
     values are placeholders the UI task can trim/rename against the real design).
   - `searchResponseSchema`: `{ query: z.string(), sort: searchSortSchema,
     resultCount: z.number().int().nonnegative(), courseCount: z.number().int()
     .nonnegative(), results: z.array(searchResultSchema) }`. `resultCount` /
     `courseCount` back the "found 28 results across 8 courses" line.
   - Exported types: `LessonResult`, `VideoResult`, `SearchResult`, `SearchSort`,
     `SearchResponse`. A `const EMPTY_SEARCH_RESPONSE` helper for the empty state.
   - Header comment: these describe the **LLM's structured output**, are hand-maintained
     (not TypeGen), and must stay in sync with the system prompt written in the LLM task.
6. **Diagnostic route `app/api/search/health/route.ts`** — `GET`, server-only, no auth
   gate (read-only, no secrets in the response). Creates the MCP client, calls
   `await client.tools()` (returns tool names), calls `fetchInitialContext()`, always
   `await client.close()` in a `finally`. Responds
   `{ ok: boolean, mcpUrlConfigured: boolean, tools: string[], hasInitialContext:
   boolean, initialContextChars: number, error?: string }` with status `200` on success,
   `500` on failure (message only, no stack, no token). `export const runtime =
   'nodejs'` (MCP client + Node fetch). This is the "verify against the live MCP
   endpoint" check from AGENTS §13 and is the only way to exercise the plumbing before
   the LLM task. It can stay as a lightweight health check or be removed later — call
   it out in the report.
7. **No `/api/search` POST handler in this task.** Adding an empty/stub route invites a
   half-built contract; the LLM task adds it whole.
8. **Dependencies**: `npm install @ai-sdk/mcp zod` (+ `ai` only if it is a required peer
   of `@ai-sdk/mcp` at the installed version — check `npm info @ai-sdk/mcp peerDependencies`).
   `server-only` is already resolvable via `next`. Pin whatever npm writes; report the
   exact versions. If `@ai-sdk/mcp` pulls a large `ai` graph as a hard peer, prefer the
   `ai` package's own `experimental_createMCPClient` (from `ai`) instead and note the
   swap — the connection shape is identical.
9. **Studio deploy is a precondition, not this task's work.** The MCP endpoint only
   serves a dataset with a deployed Studio (AGENTS §12). If `npm run -w studio deploy`
   hasn't been run, the diagnostic route will surface the failure clearly
   (`ok:false`) rather than the build breaking. Flagged in the report.

## Files to touch

**New**

- `lib/search/contract.ts` — Zod schemas + inferred types for the structured search
  response (lesson result now, video result defined for later). Not server-only.
- `lib/search/env.ts` — server-only; `searchMcpUrl()` assertion + `readToken` re-export.
- `lib/search/mcp.ts` — server-only; `createSearchMcpClient()`, `fetchInitialContext()`,
  `initialContextUrl()`, module-level cache.
- `app/api/search/health/route.ts` — server-only `GET` diagnostic; MCP `tools()` +
  initial-context probe; always closes the client.

**Modified**

- `.env.example` — add a `# --- Sanity Context MCP (server only) ---` block with
  `SANITY_CONTEXT_MCP_URL=` + comment, and a commented `# --- Intelligent search (LLM) ---`
  placeholder noting provider/key are added in the follow-up task.
- `.env.local` — add `SANITY_CONTEXT_MCP_URL=https://api.sanity.io/v2026-03-03/context/mcp/idij6qfk/production`
  so the diagnostic route runs locally. (Git-ignored; not committed.)
- `package.json` / `package-lock.json` — add `@ai-sdk/mcp`, `zod` (and `ai` iff a
  required peer). Web workspace only; `studio/` untouched.

**Unchanged** (relied on): everything under `sanity/`, `studio/`, `components/`, all
existing routes and pages.

## Requirements

- No token or MCP/LLM access reaches the browser: `lib/search/mcp.ts` and
  `lib/search/env.ts` start with `import 'server-only'`; only `lib/search/contract.ts`
  (runtime-pure types) is client-safe. The diagnostic route is a server route.
- `SANITY_CONTEXT_MCP_URL` is read only in server modules, never `NEXT_PUBLIC_`.
- `fetchInitialContext()` caches at module scope with a 5-minute TTL and never throws
  on a bad response (returns `null` / stale).
- Every code path that creates an MCP client closes it (`finally` / `catch`).
- The contract validates a hand-authored sample `SearchResponse` (one lesson result)
  in a quick inline check during dev; `EMPTY_SEARCH_RESPONSE` parses clean.
- New server code matches the `sanity/**` style (2-space, single quotes, no semicolons);
  `contract.ts` too. No `any`. `npx tsc --noEmit` and `npm run lint` clean.
- `npm run build` succeeds (a route handler was added).

## Security considerations

- Private dataset: the MCP Bearer token is the existing server-only
  `SANITY_API_READ_TOKEN`, referenced only inside `import 'server-only'` modules and
  the server route. It is never returned in the diagnostic response, logged, or
  interpolated into anything client-reachable.
- The diagnostic route returns only: a boolean, tool-name strings, and character
  counts. No schema dump, no document content, no transcript, no env values, no error
  stacks (message string only). It is read-only (`GET`), performs no writes, and takes
  no user input, so it needs no auth gate — but note it does make an outbound
  authenticated request per call, so if abuse is a concern the follow-up task can move
  it behind Clerk or a dev-only guard.
- `initialContextUrl()` manipulates only the URL *path* of the operator-configured
  `SANITY_CONTEXT_MCP_URL`; no user input flows into it.
- No `text::semanticSimilarity()` and no GROQ is issued in this task (plumbing only),
  so no injection surface yet; the LLM task owns query-construction safety.
- Never return a whole transcript / `chunks` array anywhere (AGENTS §12) — not
  applicable yet, but the contract deliberately has no field that would carry one.

## Acceptance criteria

1. `lib/search/contract.ts` exports `searchResponseSchema`, `searchResultSchema`,
   `lessonResultSchema`, `videoResultSchema`, `searchSortSchema`, the inferred types,
   and `EMPTY_SEARCH_RESPONSE`; `searchResponseSchema.parse(EMPTY_SEARCH_RESPONSE)`
   succeeds; a sample one-lesson-result object parses.
2. `lib/search/mcp.ts` and `lib/search/env.ts` both begin with `import 'server-only'`.
   Importing either from a client component fails the build (verify once, then revert
   the test import).
3. `createSearchMcpClient()` throws a clear error when `SANITY_CONTEXT_MCP_URL` or the
   read token is missing; otherwise returns a client whose `.tools()` resolves.
4. `fetchInitialContext()` returns a non-empty string on the first call with a valid
   deployed-Studio endpoint, returns the cached value on an immediate second call
   (no second network round-trip within the TTL), and returns `null` (no throw) when
   the endpoint 4xx/5xxs.
5. `GET /api/search/health` with `SANITY_CONTEXT_MCP_URL` set and Studio deployed
   returns `200` `{ ok: true, mcpUrlConfigured: true, tools: [...>=1], hasInitialContext:
   true, initialContextChars: >0 }`; with the var unset returns `{ ok:false,
   mcpUrlConfigured:false }` and does not crash the server.
6. `.env.example` lists `SANITY_CONTEXT_MCP_URL` with a comment; the LLM placeholder
   block is present and commented.
7. `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass. Report real output +
   the exact installed dependency versions.

## Checks to run (report real output)

- `npm install …` — capture the resolved versions written to `package.json`.
- `npx tsc --noEmit` (web root)
- `npm run lint` (web root)
- `npm run build` (a route handler was added)
- `npm run dev`, then `curl -s localhost:3000/api/search/health` — paste the JSON.
- No Studio steps in this task, **but** note whether `studio` has been deployed (the
  diagnostic route's `ok` field is the tell). If it fails with a schema/Studio error,
  report that as the blocker, not as a code bug.

## Manual test steps

1. `npm run dev`.
2. `curl -s localhost:3000/api/search/health | jq` → expect `ok:true`, a non-empty
   `tools` array (e.g. `groq_query`, `schema_explorer`), `hasInitialContext:true`,
   `initialContextChars > 0`.
3. `curl -s localhost:3000/api/search/health` again immediately → same payload,
   returned fast (initial context served from cache — add a temporary `console.time`
   around the fetch to confirm no second round-trip within 5 min, then remove it).
4. Comment out `SANITY_CONTEXT_MCP_URL` in `.env.local`, restart dev, hit the route →
   `{ ok:false, mcpUrlConfigured:false }`, HTTP 500, server still running. Restore it.
5. Temporarily point `SANITY_CONTEXT_MCP_URL` at a bad path → `ok:false` with a short
   `error` string, no token in the response, no stack. Restore.
6. Add `import '@/lib/search/mcp'` to a client component → `npm run build` fails with
   the `server-only` error. Revert.

## Needs your attention

- **Deployed Studio is a precondition.** The Sanity Context MCP only serves a dataset
  with a deployed Studio application (AGENTS §12) — a schema-only deploy is not enough.
  I can't verify this from here (the Sanity MCP connector isn't authorized in this
  session). If `GET /api/search/health` returns `ok:false` with a schema/Studio error,
  run `npm run -w studio deploy` (and `deploy:schema`) and re-check.
- **Base MCP URL, no Context document.** There's no `sanity.agentContext` schema or
  document yet, so this uses the base URL (no `/:slug`). Creating that document —
  content scope filter + query instructions, via `dial-your-context` — and shaping the
  system prompt via `shape-your-agent` is part of the follow-up LLM task.
- **LLM provider + key deferred** per your call. AGENTS §6 says OpenAI; no key is in
  `.env.local`. The follow-up task picks the provider, adds `@ai-sdk/openai` (or
  `@ai-sdk/anthropic`), the key, the system prompt, the `POST /api/search` route, and
  the structured-output call that fills `searchResponseSchema`.
- **Results page deferred** pending your desktop design image (AGENTS §3). The contract
  here is what it will render.
- **Video-moment results are contract-only.** Lesson results are all that will be
  produced until the video transcript/chapter ingestion task builds `video` documents.
  No timestamps are invented.
- **Diagnostic route** `app/api/search/health` is a dev aid. Keep it (handy for
  debugging the MCP link) or delete it once the real route lands — your call.
