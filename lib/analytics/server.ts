import 'server-only'

import {getPostHogClient} from '@/lib/posthog-server'

import {
  clampQuery,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from './events'

/**
 * Server-side analytics. Use this from route handlers / Server Actions for
 * actions that resolve on the server (the search route is the first caller —
 * wired by the `intelligent-search-mcp-plumbing` prompt).
 *
 * `server-only`: `posthog-node` must never reach the browser bundle.
 *
 * Identity: this helper never invents a `distinct_id`. The caller passes one —
 * prefer an `X-POSTHOG-DISTINCT-ID` header forwarded by the browser fetch (so
 * anonymous learners still correlate with their client-side events), and fall
 * back to the Clerk `userId` when a signed-in session is available.
 */

export function distinctIdFromRequest(
  request: Request,
  fallbackUserId?: string | null,
): string | undefined {
  return (
    request.headers.get('x-posthog-distinct-id') ??
    fallbackUserId ??
    undefined
  )
}

interface TrackServerArgs<E extends AnalyticsEventName> {
  distinctId: string | undefined
  event: E
  properties: E extends keyof AnalyticsEventProperties
    ? AnalyticsEventProperties[E]
    : Record<string, unknown>
}

/**
 * Capture one server-side event and flush before the (short-lived) handler
 * returns. No-op when PostHog is unconfigured or no `distinctId` is known.
 */
export async function trackServer<E extends AnalyticsEventName>({
  distinctId,
  event,
  properties,
}: TrackServerArgs<E>): Promise<void> {
  if (!distinctId) return
  const client = getPostHogClient()
  if (!client) return

  client.capture({distinctId, event, properties})
  await client.flush()
}

export {clampQuery}
