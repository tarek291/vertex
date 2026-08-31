// Querying with "sanityFetch" keeps content automatically updated.
// "<SanityLive />" must be rendered in the root layout — see app/layout.tsx.
// https://github.com/sanity-io/next-sanity#live-content-api
import { defineLive } from 'next-sanity/live'

import { apiVersion, readToken } from '../env'
import { client } from './client'

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion }),
  // Server-only: used for reads during SSR / RSC. The browser never gets a token.
  serverToken: readToken,
})
