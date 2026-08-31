/**
 * Standalone Sanity Studio CLI config.
 * Run `sanity [command]` from inside this `studio/` folder.
 * https://www.sanity.io/docs/cli
 */
import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

if (!projectId) {
  throw new Error('Missing environment variable: SANITY_STUDIO_PROJECT_ID')
}
if (!dataset) {
  throw new Error('Missing environment variable: SANITY_STUDIO_DATASET')
}

export default defineCliConfig({
  api: {projectId, dataset},
  /**
   * Keep the deployed Studio patched without a redeploy.
   * https://www.sanity.io/docs/studio/latest-version-of-sanity
   */
  deployment: {autoUpdates: true},
  vite: {
    // Load env (`.env.local` etc.) from the repo root, not from `studio/`.
    envDir: '..',
  },
  /**
   * TypeGen: regenerate `../sanity.types.ts` from this schema + the app's GROQ queries.
   * Run `npm run typegen` after changing the schema or any query.
   */
  typegen: {
    enabled: true,
    path: '../{app,components,sanity}/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
  },
})
