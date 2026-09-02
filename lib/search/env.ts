import 'server-only'

import {readToken} from '@/sanity/env'

/**
 * Server-only env for intelligent search. Mirrors `sanity/env.ts`.
 *
 * `SANITY_CONTEXT_MCP_URL` is the Sanity Context MCP endpoint. For now this is
 * the base URL (no `/:slug`); once a `sanity.agentContext` document exists it
 * becomes the document URL with a trailing slug. Server-only — never prefix
 * with `NEXT_PUBLIC_`.
 *
 * The MCP Bearer auth reuses the existing `SANITY_API_READ_TOKEN`
 * (`readToken`) — Viewer role covers MCP reads.
 */

/** The configured MCP endpoint. Throws if unset. */
export function searchMcpUrl(): string {
  const url = process.env.SANITY_CONTEXT_MCP_URL
  if (!url) {
    throw new Error('Missing environment variable: SANITY_CONTEXT_MCP_URL')
  }
  return url
}

/** Whether the MCP endpoint is configured, without throwing. */
export function isSearchMcpConfigured(): boolean {
  return Boolean(process.env.SANITY_CONTEXT_MCP_URL)
}

export {readToken}
