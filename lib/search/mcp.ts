import 'server-only'

import {createMCPClient} from '@ai-sdk/mcp'

import {readToken, searchMcpUrl} from './env'

/**
 * Sanity Context MCP plumbing for intelligent search.
 *
 * The browser never touches this — pages call a server route, the route talks
 * to the MCP over server-side HTTP with the private read token (AGENTS §5, §12).
 * MCP clients are per-request: the caller MUST `await client.close()`.
 */

export type SearchMcpClient = Awaited<ReturnType<typeof createMCPClient>>

function authHeader(): string {
  if (!readToken) {
    throw new Error('Missing environment variable: SANITY_API_READ_TOKEN')
  }
  return `Bearer ${readToken}`
}

/**
 * Open an HTTP MCP connection to the Sanity Context endpoint. Throws if
 * `SANITY_CONTEXT_MCP_URL` or the read token is missing. The caller owns the
 * lifecycle — always `await client.close()` in a `finally`.
 */
export async function createSearchMcpClient(): Promise<SearchMcpClient> {
  return createMCPClient({
    transport: {
      type: 'http',
      url: searchMcpUrl(),
      headers: {Authorization: authHeader()},
    },
  })
}

/** Insert `/initial-context` into the MCP URL path, before any query string. */
export function initialContextUrl(mcpUrl: string): string {
  const url = new URL(mcpUrl)
  url.pathname = `${url.pathname.replace(/\/$/, '')}/initial-context`
  return url.toString()
}

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedInitialContext: string | null = null
let cacheTimestamp = 0

/**
 * Fetch the compressed schema/tool overview once and cache it at module scope
 * with a 5-minute TTL. Injected into the search system prompt so the LLM skips
 * a first-message tool call and prompt caching stays stable (AGENTS §12).
 *
 * Never throws on a bad response — returns the stale value or `null`, and the
 * LLM can still call the `initial_context` tool as a fallback.
 */
export async function fetchInitialContext(): Promise<string | null> {
  if (!process.env.SANITY_CONTEXT_MCP_URL) return null

  const isStale = Date.now() - cacheTimestamp > CACHE_TTL_MS
  const refresh = isStale
    ? fetch(initialContextUrl(searchMcpUrl()), {
        headers: {Authorization: authHeader()},
      })
        .then(async (res) => {
          if (res.ok) {
            cachedInitialContext = await res.text()
            cacheTimestamp = Date.now()
          }
        })
        .catch(() => {})
    : null

  if (!cachedInitialContext) await refresh

  return cachedInitialContext
}
