import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, readToken } from '../env'

/**
 * Tokenless client for build-time and statically-generatable reads
 * (e.g. `generateStaticParams`). Safe to import anywhere, but it cannot read a
 * private dataset — use `serverClient` or `sanityFetch` for content reads.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})

/**
 * Server-only client with the read token and no CDN, for fresh reads and
 * `generateStaticParams`. The token is only present in server bundles.
 */
export const serverClient = client.withConfig({
  useCdn: false,
  token: readToken,
})
