import {NextResponse} from 'next/server'

import {isSearchMcpConfigured} from '@/lib/search/env'
import {createSearchMcpClient, fetchInitialContext} from '@/lib/search/mcp'

/**
 * Diagnostic for the Sanity Context MCP link — the only way to exercise the
 * search plumbing before the LLM task lands (AGENTS §13 "verify against the
 * live MCP endpoint").
 *
 * Read-only, no secrets in the response (a boolean, tool-name strings, and
 * character counts). `ok:false` with a schema/Studio error means the Studio
 * app is not deployed yet (AGENTS §12), not a code bug.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isSearchMcpConfigured()) {
    return NextResponse.json(
      {ok: false, mcpUrlConfigured: false, tools: [], hasInitialContext: false},
      {status: 500},
    )
  }

  let client: Awaited<ReturnType<typeof createSearchMcpClient>> | null = null
  try {
    client = await createSearchMcpClient()
    const tools = Object.keys(await client.tools())
    const initialContext = await fetchInitialContext()

    return NextResponse.json({
      ok: true,
      mcpUrlConfigured: true,
      tools,
      hasInitialContext: Boolean(initialContext),
      initialContextChars: initialContext?.length ?? 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mcpUrlConfigured: true,
        tools: [],
        hasInitialContext: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500},
    )
  } finally {
    await client?.close()
  }
}
