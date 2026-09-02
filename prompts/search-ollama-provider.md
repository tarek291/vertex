# Implementation prompt: swap the search LLM provider to local Ollama

## Goal

`app/api/search/route.ts` currently calls OpenAI (`openai(MODEL)` from
`@ai-sdk/openai`) for the two LLM steps (tool-loop `generateText` + fallback
`generateObject`). Point both at a **local Ollama** server instead, with no
OpenAI API key required. Everything else — the Sanity Context MCP tool loop,
`Output.object` / `generateObject` structured parsing, Zod validation,
`hydrateLessons`, the `SearchResponse` shape — stays byte-for-byte the same.

## Skills / docs read

- `AGENTS.md` §5, §6, §11, §12, §13 — server-only LLM, keep boundaries, run checks.
- `claude-api` skill — trigger says **SKIP** when Ollama is the named provider, so not used.
- Inspected: `app/api/search/route.ts`, `app/api/search/health/route.ts`,
  `lib/search/{env,mcp,prompt,contract,hydrate}.ts`, `.env.example`, `package.json`.
- Verified against the installed `@ai-sdk/openai@4.0.55` in `node_modules`:
  - It exports `createOpenAI` (a configurable provider factory).
  - A bare `openai('model')` / `provider('model')` call returns an
    **OpenAI Responses API** model (`_OpenAIResponsesBatchLanguageModel`).
    Ollama's OpenAI-compatible surface only implements `/v1/chat/completions`,
    **not** `/v1/responses`. So the Ollama provider must be created with
    `.chat(MODEL)`.

## Decision: reuse `@ai-sdk/openai`, no new dependency

Ollama serves an OpenAI-compatible API at `http://localhost:11434/v1`. Rather
than add the community `ollama-ai-provider` package (extra dep, its own version
matrix, another thing to keep in sync with `ai@7`), configure the existing
`@ai-sdk/openai` provider to point there:

```ts
import {createOpenAI} from '@ai-sdk/openai'

const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.OLLAMA_API_KEY || 'ollama', // Ollama ignores it; SDK requires a non-empty string
})

const model = ollama.chat(MODEL) // .chat → /v1/chat/completions (Ollama has no /v1/responses)
```

If the user prefers the dedicated package, that is a one-line swap later; this
keeps the change minimal and dependency-free.

## Model default

`MODEL` becomes `process.env.OLLAMA_MODEL || 'qwen2.5-coder'` — a tool-calling
capable local model. (`qwen2.5-coder` supports the OpenAI tools API through
Ollama; the operator can override with `OLLAMA_MODEL`, e.g. `llama3.1` or
`qwen2.5-coder:14b`.)

## Files to touch

1. **`app/api/search/route.ts`**
   - Replace `import {openai} from '@ai-sdk/openai'` with
     `import {createOpenAI} from '@ai-sdk/openai'`.
   - Add the `ollama` provider (module scope) as above.
   - `const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder'`.
   - Both `generateText({model: openai(MODEL)…})` and
     `generateObject({model: openai(MODEL)…})` → `model: ollama.chat(MODEL)`.
   - **Delete** the `if (!process.env.OPENAI_API_KEY) { … }` guard block
     (lines ~62-64) entirely. No replacement key check — a local server needs no
     secret; a connection failure surfaces through the existing `catch`.
   - Update the file's top doc comment: "an OpenAI model" → "a local Ollama model".
   - Leave `isSearchMcpConfigured()` check, `MAX_STEPS`, request Zod schema,
     tool wiring, hydration, response assembly untouched.

2. **`.env.example`**
   - Replace the `OPENAI_API_KEY` / `OPENAI_MODEL` block (lines ~27-32) with an
     Ollama block:
     ```
     # --- Intelligent search: LLM (server only, local Ollama) ---
     # The /api/search route talks to a local Ollama server over its
     # OpenAI-compatible API (Vercel AI SDK + @ai-sdk/openai provider).
     # No API key needed. Start Ollama and `ollama pull qwen2.5-coder` first.
     OLLAMA_BASE_URL=http://localhost:11434/v1
     # Optional; the SDK needs a non-empty string but Ollama ignores it.
     OLLAMA_API_KEY=ollama
     # Optional model override. Defaults to qwen2.5-coder.
     OLLAMA_MODEL=
     ```

3. **No change** to `lib/search/*`, the health route, `package.json`,
   `middleware.ts`, or any client code.

## Out of scope

- No new npm dependency (unless the user picks `ollama-ai-provider`).
- No change to the system prompt, the contract schema, or ranking logic.
- No streaming change — still returns the whole `SearchResponse` JSON.
- Not touching the video/transcript path (still not implemented).

## Security considerations

- LLM call stays server-only (`runtime = 'nodejs'`, route handler). Browser still
  only POSTs to `/api/search`; it never sees `OLLAMA_BASE_URL` or reaches the
  model (AGENTS §5).
- `OLLAMA_*` vars are un-prefixed (no `NEXT_PUBLIC_`) so they stay server-side.
- Removing the `OPENAI_API_KEY` gate removes a secret from the deployment —
  net reduction in secret surface. The MCP read token (`SANITY_API_READ_TOKEN`)
  is unaffected and still server-only.
- `baseURL` points at loopback; no third-party egress for the LLM step.

## Acceptance criteria

- `app/api/search/route.ts` imports no `openai` singleton and has no reference to
  `OPENAI_API_KEY` or `OPENAI_MODEL`.
- Both LLM calls run through `ollama.chat(MODEL)` with
  `MODEL` defaulting to `qwen2.5-coder`.
- With Ollama **not** running, `POST /api/search` returns a 500 with an error
  message (via the existing `catch`), not an unhandled crash.
- With Ollama running + a model pulled + MCP configured, `POST /api/search`
  `{ "query": "data fetching" }` returns a valid `SearchResponse`
  (`searchResponseSchema.parse` passes).
- `.env.example` no longer mentions `OPENAI_*` and documents `OLLAMA_*`.

## Checks to run (from repo root = web workspace)

1. `npx tsc --noEmit` (type check) — must pass.
2. `npm run lint` — must pass.
3. `npm run build` — server route changed, must compile.
4. Dev-server smoke (manual test steps below).

## Manual test steps

1. `ollama serve` (or the desktop app) running; `ollama pull qwen2.5-coder`.
2. In `.env.local` set `OLLAMA_BASE_URL=http://localhost:11434/v1` (and
   `SANITY_CONTEXT_MCP_URL` + `SANITY_API_READ_TOKEN` as before).
3. `npm run dev`.
4. `GET http://localhost:3000/api/search/health` → `ok: true`, lists MCP tools
   (unchanged — proves MCP still wired).
5. `curl -X POST http://localhost:3000/api/search -H 'content-type: application/json' -d '{"query":"caching"}'`
   → JSON with `query`, `sort`, `resultCount`, `courseCount`, `results[]`.
6. Stop Ollama, repeat step 5 → HTTP 500 `{"error": "..."}`, dev server stays up.
7. `git grep -n OPENAI` → only hits are in `prompts/` history + skill docs, none
   in `app/`, `lib/`, or `.env.example`.
