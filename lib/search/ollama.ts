import 'server-only'

import {createOpenAI} from '@ai-sdk/openai'

/**
 * Shared local-Ollama client for the intelligent-search route.
 *
 * Ollama exposes an OpenAI-compatible API (AGENTS §6 — Vercel AI SDK). No API
 * key: Ollama ignores it, but the SDK requires a non-empty string. Call
 * `ollama.chat(MODEL)` (targets `/v1/chat/completions`) — Ollama has no
 * `/v1/responses` endpoint, which a bare `openai(MODEL)` call would use.
 *
 * Lives in its own module so both `app/api/search/route.ts` (MCP happy path) and
 * `lib/search/mock.ts` (dev-only mock fallback) share one definition.
 */

export const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.OLLAMA_API_KEY || 'ollama',
})

export const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder'
export const MAX_STEPS = 8
