export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-08-31'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
)

/**
 * Server-only read token for the private dataset.
 * Never expose this to the browser — no `NEXT_PUBLIC_` prefix, and it is only
 * read in server modules (`sanity/lib/live.ts`, `sanity/lib/client.ts`,
 * `sanity/lib/api.ts`). Undefined is allowed so local dev against a public
 * dataset still works.
 */
export const readToken = process.env.SANITY_API_READ_TOKEN

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }

  return v
}
