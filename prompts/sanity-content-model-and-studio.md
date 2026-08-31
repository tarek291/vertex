# Implementation Prompt — Sanity Content Model, Standalone Studio, and Web Data Layer

## Goal

Stand up the content foundation for Vertex:

1. A **standalone Sanity Studio workspace** at `studio/` (its own package, config, and schema) — replacing the embedded Studio that was scaffolded at `app/studio/`.
2. The **content model** for the five content documents: `course`, `lesson`, `instructor`, `category`, plus the embedded `module` object and its supporting objects.
3. The **server-only read client + typed data layer** in the Next.js app (`sanity/`): a token-backed fetch helper, reusable GROQ fragments, `defineQuery` queries, and typed accessor functions the pages will call.
4. **TypeGen** wired so query types regenerate from the Studio.

Out of scope (explicitly deferred, per AGENTS.md "build nothing beyond that"): `video` documents + ingestion, `progress` records + write route, the `agentContext` search-config document, search API/UI, PostHog, and wiring `app/page.tsx` to real data.

## Skills read

- `sanity-best-practices` SKILL + `references/schema.md`, `references/groq.md`, `references/typegen.md`, `references/nextjs.md`.
- Next.js docs: `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` (Server Component data fetching, `React.cache`, parallel fetch).

## Code / config inspected

- `AGENTS.md` — sections 5 (two standalone workspaces, never embed Studio), 6 (no embedded Studio, no public dataset, no client-side token), 8 (the data model), 12 (private dataset, keep read token server-side, committed `.env.example`).
- `sanity.config.ts`, `sanity.cli.ts` (root) — embedded-Studio scaffold reading `NEXT_PUBLIC_SANITY_*`.
- `sanity/env.ts`, `sanity/lib/client.ts` (`useCdn: true`, no token), `sanity/lib/live.ts` (`defineLive`, no `serverToken`), `sanity/lib/image.ts`, `sanity/schemaTypes/index.ts` (empty `types: []`), `sanity/structure.ts` (default `documentTypeListItems()`).
- `app/studio/[[...tool]]/page.tsx` — `NextStudio` mount (to be removed).
- `app/layout.tsx` — `<ClerkProvider>`; **no `<SanityLive />`** rendered yet. `app/page.tsx` — hardcoded `COURSES` array with a `// TODO: source from Sanity` note.
- `package.json` — `next 16.3.3`, `react 19.2.8`, `next-sanity ^13.3.3`, `sanity ^5.31.2`, `@sanity/vision ^5.31.2`, `@sanity/image-url ^2.1.1`, `styled-components ^6.5.3`, `lucide-react`. `@sanity/icons` resolves to **3.8.0** (transitive).
- `next-sanity` peer deps: `sanity ^5.29 || ^6`, `styled-components ^6.1`, `@sanity/client ^7.26.2`, `react/react-dom ^19.2.3` — so `sanity` + `styled-components` must stay in the root `package.json` even after the Studio route is removed.
- `.env.local` — has `NEXT_PUBLIC_SANITY_PROJECT_ID="idij6qfk"`, `NEXT_PUBLIC_SANITY_DATASET="production"`, Clerk keys. **No `SANITY_API_READ_TOKEN`, no `SANITY_STUDIO_*`.** No trailing newline.
- `.gitignore` — ignores `.env*` globally (needs a `!.env.example` negation to commit the example).
- `proxy.ts` — Next 16 `clerkMiddleware` (Next 16 renamed `middleware` → `proxy`); unaffected.
- Reference implementation `agent/skills/create-agent-with-sanity-context/references/ecommerce/` — patterns for `studio/` layout, `sanity.cli.ts` (`vite.envDir`, `deployment.autoUpdates`), `schemaTypes/index.ts` (objects before documents), fragment files, `defineQuery` query modules, and a `server-only` client.
- Verified: `@sanity/icons@3.8.0` exposes **root named exports** (`import { BookIcon } from '@sanity/icons'`); subpath imports (`@sanity/icons/Book`) are NOT defined in this version. (The schema-skill note about subpath-only imports applies to `@sanity/icons` v5, which is not what's installed.)
- Verified: `server-only` resolves in this project.

## Decisions & assumptions

### Workspace layout (confirmed with user)
- Add a standalone `studio/` workspace. Keep the Next.js app at the repo root.
- Delete the embedded Studio: `app/studio/` route folder, root `sanity.config.ts`, root `sanity.cli.ts`.
- Move `sanity/schemaTypes/` and `sanity/structure.ts` into `studio/`. The app's `sanity/` folder keeps only the read/data layer (`env.ts`, `lib/`, `queries/`).
- Root `package.json`: remove only `@sanity/vision` (embedded-Studio-only). Keep `sanity`, `styled-components`, `next-sanity`, `@sanity/image-url` (all still needed by `next-sanity` / the image builder). Leaving `sanity` as a root dep is required by the `next-sanity` peer range; it is not an embedded Studio.
- Studio is a **separate npm workspace with its own `node_modules`** (own `package.json`, run `npm install` inside `studio/`). Not added to a root workspaces array (root has none); keep it that way to avoid hoisting churn.

### Env strategy
- Studio config reads `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`. `studio/sanity.cli.ts` sets `vite.envDir: '..'` so the Studio loads the repo-root `.env.local` (Vite loads `.env.local`).
- Add to root `.env.local` (local only, not committed): `SANITY_STUDIO_PROJECT_ID=idij6qfk`, `SANITY_STUDIO_DATASET=production`, and `SANITY_API_READ_TOKEN=` (user fills in).
- Create committed root `.env.example` as the canonical variable list (AGENTS.md §12). Add `!.env.example` to `.gitignore`.
- The web read layer uses `SANITY_API_READ_TOKEN` (server-only, **no** `NEXT_PUBLIC_` prefix). `NEXT_PUBLIC_SANITY_API_VERSION` stays optional (default already `2026-08-31` in `sanity/env.ts`).

### Content model (from AGENTS.md §8; everything not fixed there chosen sensibly)

Document types: `course`, `lesson`, `instructor`, `category`.
Embedded object types: `module`, `learningOutcome`, `resource`.

**`category`** (doc): `title` (string, req), `slug` (slug from title, req), `description` (text).

**`instructor`** (doc): `name` (string, req), `slug` (slug from name, req), `photo` (image, hotspot, `alt` field), `expertise` (array of string, `layout: 'tags'`), `bio` (Portable Text — `array` of `block`, plain styles + bold/italic + link annotation; no markdown per §7).

**`learningOutcome`** (object): `icon` (string — lucide-react icon name, e.g. `"Rocket"`; description explains it maps to a lucide icon), `title` (string, req), `description` (text, req).

**`resource`** (object): `type` (string, `list` radio: `link` / `pdf` / `code` / `download` / `video`, req), `title` (string, req), `description` (text), `url` (url, `uri({scheme:['http','https']})`, req).

**`module`** (object, used only inside `course.modules`): `title` (string, req), `summary` (text), `lessons` (array of `reference` → `lesson`, `validation: min(1)`). Preview shows title + lesson count. Module/lesson numbering (`Module 5`, `Lesson 5.1`) is derived on the frontend from array order — **not stored**.

**`course`** (doc):
- `title` (string, req), `slug` (slug from title, req)
- `summary` (text, req) — marketing blurb
- `coverImage` (image, hotspot, `alt` field)
- `level` (string, `list` radio: `Beginner` / `Intermediate` / `Advanced`, req)
- `price` (number, `min(0)`, req; `0` = free) — USD, display-only
- `popular` (boolean, `initialValue: false`) — the "optional popular flag" from §8; kept boolean because §8 names it a flag
- `studentCount` (number, `min(0)`, `initialValue: 0`) — display only
- `learningOutcomes` (array of `learningOutcome`) — the "what you'll learn" section
- `instructor` (reference → `instructor`, req)
- `category` (reference → `category`, req)
- `modules` (array of `module`, `validation: min(1)`, req)
- `preview`: title + instructor name + module count.

**`lesson`** (doc):
- `title` (string, req), `slug` (slug from title, req)
- `videoUrl` (url, req; description notes YouTube / Vimeo / Bunny embed URLs)
- `poster` (image, hotspot, `alt` field) — poster / thumbnail
- `duration` (number, `min(0)`, req) — **seconds**; frontend formats to `12m 30s` and sums for course totals
- `freePreview` (boolean, `initialValue: false`)
- `studentCount` (number, `min(0)`, `initialValue: 0`)
- `notes` (Portable Text — `array` of `block` + inline `image`; plain styles, bold/italic/code, bullet/number lists, link annotation) — the lesson notes body
- `keyPoints` (array of string) — the "in this lesson you will" list
- `proTip` (text, optional)
- `resources` (array of `resource`)
- `preview`: title + duration; media = poster.
- Parent course is **not** stored — resolved by reverse reference (`*[_type=="course" && references(^._id)]`) in queries.

Registration order in `studio/schemaTypes/index.ts`: objects (`learningOutcome`, `resource`, `module`) first, then documents (`category`, `instructor`, `lesson`, `course`).
Every type gets an `icon` from `@sanity/icons` (root import): `course` → `BookIcon`, `lesson` → `PlayIcon`, `instructor` → `UserIcon`, `category` → `TagIcon`, `module` → `StackIcon`, `learningOutcome` → `CheckmarkCircleIcon`, `resource` → `LinkIcon`.

### Studio config
- `studio/sanity.config.ts`: `defineConfig` with `projectId`/`dataset` from `SANITY_STUDIO_*` (throw if missing), `schema.types` from `./schemaTypes`, plugins `structureTool({structure})` + `visionTool()`. No `basePath`.
- `studio/structure.ts`: explicit list — "Courses", "Lessons", "Instructors", a divider, "Categories" — each `S.documentTypeListItem(...)` with its icon. (Small, readable; avoids leaking `module`/object types as top-level.)
- `studio/sanity.cli.ts`: `defineCliConfig` with `api.projectId/dataset` from `SANITY_STUDIO_*`, `deployment.autoUpdates: true`, `vite.envDir: '..'`, and `typegen` block (below).
- `studio/tsconfig.json`: standard Sanity Studio tsconfig (`target ESNext`, `moduleResolution bundler`, `jsx react-jsx`, `strict`).
- `studio/package.json` (`name: "vertex-studio"`, `private`): scripts `dev` (`sanity dev`), `build` (`sanity build`), `deploy` (`sanity deploy`), `deploy:schema`? use `sanity schema deploy`, `typegen` (`sanity schema extract && sanity typegen generate`), `check:types` (`tsc --noEmit`). Deps pinned to the app's versions: `sanity ^5.31.2`, `@sanity/vision ^5.31.2`, `@sanity/icons ^3.8.0`, `styled-components ^6.5.3`, `react 19.2.8`, `react-dom 19.2.8`. devDeps: `typescript ^5`, `@types/react ^19`, `@sanity/eslint-config-studio` + `eslint` (+ `studio/eslint.config.mjs`).
- `studio/.gitignore`: `node_modules`, `dist`, `.sanity`, `schema.json`.

### TypeGen
- Configured in `studio/sanity.cli.ts`:
  ```ts
  typegen: {
    enabled: true,
    path: '../{app,components,sanity}/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
  }
  ```
- `schema.json` lives in `studio/` (gitignored). `sanity.types.ts` is generated at repo root and **committed** (small team, immediate availability).
- Root `tsconfig.json` `include` already matches `**/*.ts`, so `sanity.types.ts` is picked up. No change needed.
- Queries use `defineQuery` from `next-sanity` and are typed via `defineLive`'s `sanityFetch` generic inference.

### Web read client + data layer (`sanity/`)
- `sanity/env.ts`: add `export const readToken = process.env.SANITY_API_READ_TOKEN` (no assert — allow tokenless local dev against a public dataset, but log a warning once if missing). Keep existing `projectId`/`dataset`/`apiVersion` asserts.
- `sanity/lib/client.ts`: keep a **tokenless** base `client` for build-time/static use; set `useCdn: true`. Add `export const serverClient = client.withConfig({ useCdn: false, token: readToken })` — used for `generateStaticParams` / fresh reads.
- `sanity/lib/live.ts`: pass `serverToken: readToken` and `client: client.withConfig({ apiVersion })` to `defineLive` (per `references/nextjs.md` §2). No `browserToken` (browser holds no token — AGENTS.md §12).
- `app/layout.tsx`: render `<SanityLive />` at the end of `<body>` (required for `defineLive`). Minimal edit, keep Clerk wrapper.
- `sanity/queries/fragments.ts`: `imageFragment` (`asset->{ _id, url, metadata{ lqip, dimensions } }, "alt": coalesce(alt, "")`), `instructorRefFragment`, `categoryRefFragment`, `lessonCardFragment`, `courseCardFragment`.
- `sanity/queries/courses.ts`:
  - `COURSES_QUERY` — all courses, `order(popular desc, _createdAt desc)`, card projection incl. `"lessonCount": count(modules[].lessons[])`, `"moduleCount": count(modules)`, `"totalDurationSeconds": math::sum(modules[].lessons[]->duration)`.
  - `COURSE_BY_SLUG_QUERY` (`$slug`) — full detail: all scalar fields, `coverImage{ ${imageFragment} }`, `instructor->{ ${instructorRefFragment}, "slug": slug.current }`, `category->{ ${categoryRefFragment} }`, `learningOutcomes[]{ _key, icon, title, description }`, `modules[]{ _key, title, summary, "lessons": lessons[]->{ ${lessonCardFragment} } }`.
  - `COURSE_SLUGS_QUERY` — `{ "slug": slug.current }` for `generateStaticParams`.
- `sanity/queries/lessons.ts`:
  - `LESSON_BY_SLUG_QUERY` (`$slug`) — full lesson incl. `notes`, `keyPoints`, `proTip`, `resources[]{ _key, type, title, description, url }`, `poster{ ${imageFragment} }`, and derived parent context:
    `"course": *[_type=="course" && references(^._id)][0]{ title, "slug": slug.current, "module": modules[lessons[]._ref match ^.^._id][0]{ title }, ... }` — resolve the owning course, the module that lists this lesson, and the lesson's 1-based index within that module for the `Lesson X.Y` label (compute index in the query with `... ` / array position, or return `modules` mapping and compute label on the frontend — pick the query-side approach: project `"moduleIndex"` and `"lessonIndex"`).
  - `LESSON_SLUGS_QUERY` — for `generateStaticParams`.
- `sanity/queries/instructors.ts`: `INSTRUCTORS_QUERY` (list), `INSTRUCTOR_BY_SLUG_QUERY` (`$slug`) with `"courses": *[_type=="course" && references(^._id)]{ ${courseCardFragment} }`.
- `sanity/queries/categories.ts`: `CATEGORIES_QUERY` (list, `order(title asc)`), `CATEGORY_BY_SLUG_QUERY` (`$slug`) with `"courses": *[_type=="course" && references(^._id)]{ ${courseCardFragment} }`.
- `sanity/queries/index.ts`: re-export all.
- `sanity/lib/api.ts` (`import 'server-only'` at top): typed async accessors wrapping `sanityFetch`, each wrapped in `React.cache`:
  `getCourses()`, `getCourseBySlug(slug)`, `getCourseSlugs()`, `getLessonBySlug(slug)`, `getLessonSlugs()`, `getInstructors()`, `getInstructorBySlug(slug)`, `getCategories()`, `getCategoryBySlug(slug)`.
  Each returns `data` from `sanityFetch({ query, params })`. `getCourseSlugs`/`getLessonSlugs` use `serverClient.fetch(..., {}, { perspective: 'published' })` with `stega: false`.

### Assumptions
- Dataset `production` on project `idij6qfk` already exists (env points at it). If it is currently a **public** dataset, the tokenless client still works; if private, the read token is mandatory. Either way we wire the token path.
- No content is imported by this task — the Studio will be empty until an author (or a later seed task) adds documents. Acceptance criteria that need documents are marked "when content exists".
- We do **not** add `@sanity/context` / the search-config document now (§12: plugin may lag the Studio's Sanity 5 major; also out of scope).

## Files to touch

**Create**
- `studio/package.json`, `studio/sanity.config.ts`, `studio/sanity.cli.ts`, `studio/tsconfig.json`, `studio/eslint.config.mjs`, `studio/.gitignore`
- `studio/structure.ts`
- `studio/schemaTypes/index.ts`
- `studio/schemaTypes/objects/module.ts`, `learningOutcome.ts`, `resource.ts`
- `studio/schemaTypes/documents/course.ts`, `lesson.ts`, `instructor.ts`, `category.ts`
- `sanity/queries/fragments.ts`, `courses.ts`, `lessons.ts`, `instructors.ts`, `categories.ts`, `index.ts`
- `sanity/lib/api.ts`
- `.env.example` (repo root, committed)
- `sanity.types.ts` (repo root, generated then committed)

**Modify**
- `sanity/env.ts` (add `readToken`)
- `sanity/lib/client.ts` (add `serverClient`)
- `sanity/lib/live.ts` (add `serverToken`, pinned `apiVersion`)
- `app/layout.tsx` (render `<SanityLive />`)
- `package.json` (remove `@sanity/vision`)
- `.gitignore` (add `!.env.example`)
- `.env.local` (local only — add `SANITY_STUDIO_*` + `SANITY_API_READ_TOKEN=`; not committed)
- `README.md` (short "Studio" section: `cd studio && npm install && npm run dev`)

**Delete**
- `app/studio/[[...tool]]/page.tsx` (+ the `app/studio/` folder)
- `sanity.config.ts` (root), `sanity.cli.ts` (root)
- `sanity/schemaTypes/` (moved into `studio/`), `sanity/structure.ts` (moved into `studio/`)

## Requirements

1. Studio runs standalone: `cd studio && npm install && npm run dev` serves the Studio on `localhost:3333` with all five document types creatable and every field behaving as specified.
2. No embedded Studio remains in the Next app; `next build` no longer compiles Sanity Studio.
3. Schema follows `references/schema.md`: `defineType` / `defineField` / `defineArrayMember` everywhere, icons on every type, `list` + `radio` for enums, validation rules as specified, previews on every document and on `module`.
4. All GROQ wrapped in `defineQuery`, projections everywhere (no bare `*[...]`), `_key` included in every array projection, references expanded with sub-projections, reverse references used for lesson→course and instructor/category→courses.
5. TypeGen: `cd studio && npm run typegen` regenerates `../sanity.types.ts` with `*_QUERY_RESULT` types for every query and no errors.
6. Data layer is server-only: `sanity/lib/api.ts` starts with `import 'server-only'`; the read token is never referenced with a `NEXT_PUBLIC_` prefix and never reaches a client component.
7. `<SanityLive />` is rendered in the root layout.
8. Type check and lint pass in both workspaces; `next build` succeeds.

## Security considerations

- **Private dataset / token**: `SANITY_API_READ_TOKEN` is server-only (no `NEXT_PUBLIC_`). Used by `defineLive` `serverToken` and `serverClient` only. `browserToken` is intentionally omitted so the browser never holds a token (AGENTS.md §5, §12).
- **`.env.example` contains no secrets** — keys with empty values only. Real values stay in `.env.local` (gitignored).
- **No write path** is introduced (no write token, no mutations) — progress writes are a later task.
- **Stega**: `generateStaticParams` accessors pass `stega: false` + `perspective: 'published'` so invisible chars never leak into params/URLs (`references/nextjs.md` §4).
- `visionTool` (raw GROQ console) ships only in the standalone Studio, which sits behind Sanity project auth — not in the public web app.
- Studio CLI `deployment.autoUpdates: true` keeps the Studio patched without redeploys.

## Acceptance criteria

- [ ] `studio/` installs and `npm run dev` opens a working Studio; creating a `course` lets you add `module`s, each referencing `lesson` documents; `instructor` and `category` reference pickers work.
- [ ] Root `sanity.config.ts`, `sanity.cli.ts`, and `app/studio/` are gone; `sanity/` in the app contains only `env.ts`, `lib/`, `queries/`.
- [ ] `cd studio && npm run check:types` and `npm run lint` pass; `npm run typegen` writes `../sanity.types.ts` cleanly.
- [ ] In the app: `npm run lint` (eslint) and `tsc --noEmit` pass; `npm run build` succeeds with no Studio in the bundle.
- [ ] `sanity.types.ts` contains `COURSES_QUERY_RESULT`, `COURSE_BY_SLUG_QUERY_RESULT`, `LESSON_BY_SLUG_QUERY_RESULT`, `INSTRUCTORS_QUERY_RESULT`, `INSTRUCTOR_BY_SLUG_QUERY_RESULT`, `CATEGORIES_QUERY_RESULT`, `CATEGORY_BY_SLUG_QUERY_RESULT`, and the `*_SLUGS_QUERY_RESULT` types.
- [ ] `sanity/lib/api.ts` accessors are typed (return types trace back to the generated `*_RESULT` types) and the module is `server-only`.
- [ ] `grep -r "NEXT_PUBLIC_SANITY_API_READ\|NEXT_PUBLIC.*TOKEN"` finds nothing; `SANITY_API_READ_TOKEN` appears only in server files + `.env.example`.
- [ ] With one seeded course + instructor + category + a couple of lessons (added manually in Studio), a scratch Server Component calling `getCourses()` / `getCourseBySlug()` / `getLessonBySlug()` returns the expected shape incl. derived counts, total duration, and the lesson's parent-course/module label. (Scratch file removed before finishing.)

## Checks to run

In the app (repo root):
```
npx tsc --noEmit
npm run lint
npm run build
```
In the Studio:
```
cd studio
npm install
npm run check:types
npm run lint
npm run typegen        # regenerates ../sanity.types.ts
npm run dev            # smoke-test the Studio UI, then stop
```
(Then re-run the app's `tsc --noEmit` / `build` so it sees the regenerated `sanity.types.ts`.)

## Manual test steps

1. `cd studio && npm install && npm run dev` → open `http://localhost:3333`. Confirm left pane shows Courses / Lessons / Instructors / Categories with icons.
2. Create a `category` ("Web Development"), an `instructor` ("Jane Doe" + photo + expertise tags + bio), and two `lesson` docs (title, a YouTube `videoUrl`, `duration` in seconds, some `notes`, 2–3 `keyPoints`, one `resource`).
3. Create a `course`: fill marketing fields, pick `level` via radio, set `price`, toggle `popular`, add 2 `learningOutcomes`, add one `module` with a title/summary and reference the two lessons. Confirm validation fires when `modules` or a module's `lessons` is empty, and when required scalars are blank. Confirm the `course` and `module` previews read sensibly.
4. In Vision, run `*[_type=="course"][0]{ title, "lessons": count(modules[].lessons[]) }` → returns the expected count.
5. Back at the repo root: add `SANITY_API_READ_TOKEN` to `.env.local` (Viewer token from Sanity Manage). Add a temporary `app/_scratch/page.tsx` Server Component that calls `getCourses()` and `getCourseBySlug("<slug>")` and `<pre>`-dumps the result. `npm run dev`, visit `/_scratch`, confirm the course, expanded instructor/category, `moduleCount`, `lessonCount`, `totalDurationSeconds`, and each module's expanded `lessons` are present. Delete `app/_scratch/`.
6. Add a temporary call to `getLessonBySlug("<lesson-slug>")` the same way; confirm `notes`/`resources` come back and the derived `course` + module label / `Lesson X.Y` indices are correct. Remove the scratch file.
7. `npm run build` at root → succeeds, and build output shows no `sanity`/Studio chunks for `/studio`.

## Needs your attention (to confirm before / during execution)

- **Read token**: you'll need to create a **Viewer** token in Sanity Manage (project `idij6qfk`) and put it in `.env.local` as `SANITY_API_READ_TOKEN` for the data layer to read a private dataset. I can't create it.
- **CORS**: for the app to talk to Sanity with credentials in the browser (Live), run `npx sanity cors add http://localhost:3000 --credentials` (needs your Sanity login). Add the production URL later.
- **Studio deploy** (`sanity deploy`) is required before the Context MCP will serve the dataset (AGENTS.md §12) — not needed for this task, flagged for the later search work.
