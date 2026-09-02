# Implementation Prompt: Offline Video Ingestion Pipeline

## Goal

Build the **offline tooling** that turns each unique lesson video into a Sanity `video`
document holding a **timestamped transcript** (`chunks[]`) and a **table of contents**
(`chapters[]`), per AGENTS §8–§9. Scope:

1. Add the `video` document schema to the Studio workspace (it does not exist yet).
2. Build a Node/TypeScript pipeline in the **web** workspace (`scripts/ingest-videos/`)
   that: reads the unique `videoUrl` set from the seeded lessons in Sanity, fetches each
   YouTube video's caption track + native chapters via `youtubei.js` (InnerTube, no API
   key), merges captions into short timestamped chunks, uses native chapters when present
   and **synthesizes** chapters from the transcript when absent, and writes a
   `video-documents.ndjson` file.
3. Import that NDJSON into the `production` dataset with `sanity dataset import`, matching
   the existing seed workflow.
4. Run TypeGen and deploy the Studio + schema.

**Explicitly out of scope:**

- Any search wiring, GROQ query, or `sanity/lib/api.ts` read helper for `video` docs —
  the search task owns reading them (they are an internal lookup, AGENTS §7).
- Vimeo and Bunny ingestion — no seeded lesson uses them; the pipeline detects and
  **skips + reports** any non-YouTube URL (AGENTS §9: a provider is not "supported"
  until both ingestion and playback exist).
- The `sanity.agentContext` / Context document, `dial-your-context`, `shape-your-agent`.
- Any change to lesson/course schema, the lesson page, or `lib/video.ts` runtime
  behaviour (it is imported read-only for provider/id parsing).
- Real progress persistence, My Learning, notifications.

## Skills / docs read

- `AGENTS.md` / `CLAUDE.md` — §2 loop (prompt + approval before code), §5 (the video
  pipeline is **offline tooling inside the web workspace**, never in the request path;
  Studio holds schema + authoring only; the read token stays server-side), §7 (video
  intelligence lives in dedicated `video` docs, one per unique video URL; each holds a
  ToC + the transcript split into timestamped pieces; timestamps resolve chapters-first
  then transcript; treat these docs as an internal lookup, never a user-facing result),
  §8 (the `video` doc shape: `id`, `url`, `chapters[]{ startSeconds, label }`,
  `chunks[]{ startSeconds, text }`; never keep a whole transcript in one field a query
  would return wholesale), §9 (build offline, key by an id derived from the video URL
  stripping datastore-illegal id chars, store many short timestamped chunks, store the
  source's chapter markers as the ToC, keep whole transcripts out of the request path),
  §12 (never return a whole transcript/`chunks` array to the model — the schema
  deliberately has no field that holds one; private dataset — token server-only), §13
  (checks: web type-check/lint/build; Studio deploy + schema deploy + import), §14 (keep
  it small, reuse config, don't hardcode).
- `~/.claude/skills/sanity-best-practices/SKILL.md` — video guidance (store only an
  embed URL for YouTube/Vimeo, which the project already does); "let Sanity generate
  `_id`" is the global default **but AGENTS §9 explicitly overrides it here** (key by an
  id derived from the video URL), and the existing seed already uses deterministic ids
  (`lesson.<slug>`), so `video.<videoId>` is consistent with the project.
- `~/.claude/skills/sanity-migration/SKILL.md` (skimmed) — not a cross-CMS migration;
  the relevant pattern is "generate NDJSON, import with the CLI", which the seed task
  (`prompts/seed-sanity-from-provided-files.md`) already established for this repo.

## Code / config inspected

- `studio/schemaTypes/index.ts` — registers objects then documents
  (`category, instructor, lesson, course`). No `video` type. New doc is registered here.
- `studio/schemaTypes/documents/lesson.ts`, `.../instructor.ts`, `.../objects/resource.ts`
  — house style: `defineType`/`defineField`/`defineArrayMember`, 2-space, single quotes,
  no semicolons, `@sanity/icons`, `groups`, `validation: (rule) => …`, a `preview` with
  `prepare`. The new `video.ts` matches this exactly.
- `studio/structure.ts` — explicit `S.documentTypeListItem(...)` list. Add a `video`
  item under a divider ("Videos"). Showing it in Studio is fine — §7's "internal lookup,
  never shown to the user" is about *search results*, not the authoring UI.
- `studio/sanity.cli.ts` — `deployment.autoUpdates: true`, `vite.envDir: '..'`, TypeGen
  enabled: `schema: 'schema.json'`, `path: '../{app,components,sanity}/**/*.{ts,tsx}'`,
  `generates: '../sanity.types.ts'`. Note the TypeGen query glob does **not** include
  `scripts/**` — intentional; the pipeline uses hand-written types, not TypeGen result
  types, and adds no `defineQuery`.
- `studio/package.json` — scripts wrap `sanity` in `dotenv -e ../.env.local -e ../.env`;
  `deploy`, `deploy:schema`, `typegen` (= `typegen:extract` + `typegen:generate`),
  `check:types`, `lint`. `@sanity/client` resolves at `7.26.2` in `studio/node_modules`.
- `prompts/seed-sanity-from-provided-files.md` — the established import workflow:
  `sanity dataset import ../<file>.ndjson production --replace` run from `studio/` via the
  local CLI + `dotenv-cli`; `--replace` is idempotent with deterministic ids; the CLI is
  already authenticated as admin on `idij6qfk` / `production` (no token needed for import).
- `sanity/env.ts` — exports `projectId` (`idij6qfk`), `dataset` (`production`),
  `apiVersion` (`2026-08-31`), `readToken` (`SANITY_API_READ_TOKEN`, server-only,
  `undefined` allowed). The pipeline reuses these to read lesson `videoUrl`s.
- `sanity/lib/client.ts` — `serverClient = client.withConfig({ useCdn: false, token:
  readToken })`. The pipeline builds its **own** small `@sanity/client` instance from
  `sanity/env.ts` values (it is a standalone Node process, not a Next server module — it
  must not `import 'server-only'`), read-only, `perspective: 'published'`.
- `lib/video.ts` — `parseVideoUrl(url) → { provider, id, thumbnailUrl, embedUrl() }`.
  Pure, no `server-only`, already handles YouTube/Vimeo/Bunny id extraction. The pipeline
  **reuses `parseVideoUrl`** for provider detection + native id, so URL parsing lives in
  one place. `normalizeStart` is also reused for clamping seconds.
- `videos.json` (repo root) — a JSON **object** keyed by lesson slug →
  `{ id, title, channel, duration, query }`. 120 entries, 120 unique YouTube ids, exact
  1:1 with the 120 seeded lessons (verified: every lesson's `videoUrl` contains the
  matching id; no orphans either way). `duration` 187–2156 s. Used **only** to enrich
  `title` / `duration` when InnerTube omits them — not the primary input.
- `seed.ndjson` — 120 `lesson` docs, every `videoUrl` is
  `https://www.youtube.com/watch?v=<id>` (0 non-YouTube).
- `.env.local` — has real `NEXT_PUBLIC_SANITY_PROJECT_ID=idij6qfk`,
  `NEXT_PUBLIC_SANITY_DATASET=production`, `SANITY_API_READ_TOKEN=sk…`. Also already has
  `SANITY_CONTEXT_MCP_URL` (from the plumbing task).
- `.env.example` — canonical committed list. No write token; none is added (import uses
  CLI auth).
- `tsconfig.json` (web) — `include: ["**/*.ts", …]`, so `scripts/**` would be
  type-checked by `next build`. To keep the build clean and independent of
  `youtubei.js`'s type surface, `scripts` is added to `exclude` and gets its own
  `scripts/tsconfig.json` + a `check:types:ingest` npm script (see Decisions).
- `eslint.config.mjs` (web) — `eslint-config-next`; ignores `.next`, `studio/**`,
  `agent/**`, `.agents/**`, `sanity.types.ts`. `scripts/**` **is** linted — code must be
  lint-clean.
- `node` v24.15.0; `tsx` present at `node_modules/.bin/tsx` (transitive) — added as an
  explicit `devDependency` so the npm script does not depend on a transitive bin.
- Network: `https://www.youtube.com` reachable (200). The legacy
  `video.google.com/timedtext` endpoint is dead (empty response) — hence `youtubei.js`.

## Decisions & assumptions

### A. `video` schema — `studio/schemaTypes/documents/video.ts`

`defineType({ name: 'video', type: 'document', icon: <e.g. `DocumentVideoIcon` from
@sanity/icons> })` with a single implicit group (small doc). Fields:

| field | type | notes |
|---|---|---|
| `videoId` | `string`, required, `readOnly` | provider-native id (YouTube 11-char id; Bunny `<lib>/<guid>` later). The doc `_id` is `video.<sanitized videoId>`. |
| `provider` | `string`, required, `list: ['youtube','vimeo','bunny']`, `readOnly` | from `parseVideoUrl`. Only `youtube` is produced now. |
| `url` | `url`, required, `readOnly` | canonical source URL (`https://www.youtube.com/watch?v=<id>`). |
| `title` | `string` | for Studio readability; from InnerTube, fallback `videos.json`. |
| `duration` | `number`, `min(0)` | seconds; from InnerTube, fallback `videos.json`. Optional. |
| `chaptersSource` | `string`, `list: ['youtube','synthesized','none']`, `readOnly` | provenance of `chapters[]`. |
| `chapters` | `array` of inline `object { startSeconds: number (required, min 0), label: string (required) }` | the ToC. Sorted ascending; first entry `startSeconds: 0`. `options: { sortable: false }`. Each member needs a `_key`. |
| `chunks` | `array` of inline `object { startSeconds: number (required, min 0), text: string (required) }` | the transcript in short timestamped pieces. Ascending. Each needs a `_key`. `readOnly` (machine-authored, can be long). |
| `ingestedAt` | `datetime`, `readOnly` | pipeline run timestamp. |

- Inline the two array-member object shapes directly in `video.ts` (do **not** add
  registered object types) — they are used nowhere else, mirroring how small shapes stay
  local. Give each a `name` (`videoChapter`, `videoChunk`) so TypeGen emits clean nested
  types.
- `preview`: `select: { title: 'title', subtitle: 'videoId' }`, `prepare` showing the
  chapter/chunk counts, e.g. `subtitle: '<n> chapters · <m> chunks'`.
- No field holds the whole transcript as one string (AGENTS §8/§12). `chunks[]` is the
  only transcript storage.
- Register in `studio/schemaTypes/index.ts` (documents section) and add
  `S.documentTypeListItem('video').title('Videos')` under a new `S.divider()` in
  `studio/structure.ts`.

### B. Pipeline layout — `scripts/ingest-videos/` (web workspace)

Per AGENTS §5 the video pipeline is offline tooling **inside web**. Plain `.ts` run with
`tsx`, ESM, no React, no `server-only`.

- `scripts/ingest-videos/index.ts` — CLI entry / orchestrator. Flags:
  `--out <path>` (default `./video-documents.ndjson`), `--only <id,id>` (restrict to
  given video ids), `--limit <n>`, `--dry-run` (fetch + build, print summary, write
  nothing), `--strict` (exit non-zero if any video fails), `--delay <ms>` (default 400).
- `scripts/ingest-videos/sources.ts` — reads the unique video set. GROQ via a local
  read-only `@sanity/client` (built from `sanity/env.ts` values +
  `SANITY_API_READ_TOKEN`): `*[_type == "lesson" && defined(videoUrl)]{ "slug":
  slug.current, videoUrl }`. Dedupe by `parseVideoUrl(videoUrl).id`. Build an
  `id → { title, duration }` enrichment map from `videos.json` (keyed by slug → match to
  the lesson slug). Non-YouTube or unparseable URLs are collected into a `skipped` list,
  not fetched.
- `scripts/ingest-videos/youtube.ts` — `fetchYouTube(videoId)` using `youtubei.js`
  (`Innertube.create(...)`, a module-level singleton). Returns
  `{ title, durationSeconds, segments: { startSeconds, text }[], nativeChapters:
  { startSeconds, label }[] | null }`:
  - **Transcript**: `yt.getInfo(videoId)` → transcript data → the segment list, each
    with a start time (ms) and text. Normalize to `{ startSeconds: floor(ms/1000), text:
    text.trim() }`, drop empties, sort ascending. Resolve the exact `youtubei.js` call
    against the **installed version's** types/README at implementation time (the transcript
    accessor has moved across versions); keep the provider-specific extraction isolated
    in this file.
  - **Native chapters**: read InnerTube chapter markers if exposed by the installed
    version; else `null`. Normalize to `{ startSeconds, label: label.trim() }`, sort,
    ensure a leading `startSeconds: 0` entry (synthesize a `"Introduction"` if the first
    native marker is > 0).
  - Retry transient failures twice with backoff (~500 ms, ~1500 ms). A video with **no
    caption track** is not an error — return `segments: []`.
- `scripts/ingest-videos/chunk.ts` — `toChunks(segments)`: greedily merge consecutive
  caption segments into chunks targeting **~18 s** span **or ~240 chars**, whichever hits
  first, preferring to break after sentence-ending punctuation. Each chunk:
  `{ startSeconds: floor(first segment start), text: joined, collapsed whitespace }`.
  Guards: never emit a chunk > ~500 chars; ascending, de-duplicated `startSeconds`
  (bump by 1 s on collision). Returns `[]` for `[]` input.
- `scripts/ingest-videos/chapters.ts` — `resolveChapters(nativeChapters, chunks,
  durationSeconds)`:
  - If `nativeChapters` non-empty → return them as-is (`chaptersSource: 'youtube'`).
  - Else if `chunks` non-empty → **synthesize**: split the timeline into
    `clamp(round(duration / 120), 4, 12)` sections by cumulative chunk time; each
    chapter `startSeconds` = its section's first chunk start (first = 0); `label` = the
    first ~8 words of that section's leading chunk text, trimmed, sentence-cased, capped
    ~60 chars, with a trailing `…` if truncated. `chaptersSource: 'synthesized'`.
  - Else → `[]`, `chaptersSource: 'none'`.
- `scripts/ingest-videos/id.ts` — `videoDocId(nativeId)` → `video.` + `nativeId` with any
  char outside `[A-Za-z0-9._-]` replaced by `-` (YouTube ids are already safe; this
  covers Bunny's `<lib>/<guid>` later). `stableKey(prefix, startSeconds, index)` →
  deterministic `_key` (e.g. `` `${prefix}-${startSeconds}-${index}` ``) so re-runs
  produce byte-identical arrays.
- `scripts/ingest-videos/ndjson.ts` — `toVideoDoc(...)` assembles the document object
  (`_id`, `_type: 'video'`, `videoId`, `provider`, `url`, `title`, `duration`,
  `chaptersSource`, `chapters` (with `_key`, `_type: 'videoChapter'`), `chunks` (with
  `_key`, `_type: 'videoChunk'`), `ingestedAt`); `writeNdjson(path, docs)` — one JSON
  object per line, `\n`-terminated, UTF-8.

### C. Resilience / idempotency

- Sequential fetch with `--delay` (default 400 ms) between videos to stay under
  InnerTube rate limits; per-video retry as above.
- A failed video (fetch error after retries) still yields a doc with `chunks: []`,
  `chapters: []`, `chaptersSource: 'none'`, plus an entry in the run's `failures[]`.
  Exit code 0 unless `--strict`.
- Deterministic `_id` + deterministic `_key`s + `--replace` on import ⇒ safe, repeatable
  re-runs; a later re-run backfills videos that had no captions the first time.
- End-of-run summary to stderr: `built N`, `youtube-chapters X`, `synthesized Y`,
  `no-transcript Z`, `skipped (non-youtube) S`, and the `failures` list.

### D. Dependencies & scripts (web `package.json`)

- `devDependencies`: `youtubei.js` (pin the installed version), `tsx` (pin; promote the
  transitive one). `@sanity/client` is already resolvable in web `node_modules`
  (`7.26.2`); add it explicitly to `devDependencies` too since the pipeline imports it
  directly.
- `scripts`: `"ingest:videos": "tsx scripts/ingest-videos/index.ts"`,
  `"check:types:ingest": "tsc -p scripts/tsconfig.json"`.
- `scripts/tsconfig.json`: `{ "extends": "../tsconfig.json", "compilerOptions": {
  "types": ["node"], "lib": ["ES2023"], "noEmit": true, "moduleResolution": "bundler" },
  "include": ["ingest-videos/**/*.ts"] }`.
- Root `tsconfig.json`: add `"scripts"` to `exclude` (keeps `next build` off the
  pipeline). `eslint.config.mjs` is left as-is — `scripts/**` stays linted.
- The NDJSON artifact (`video-documents.ndjson`) is **git-ignored** (regenerable, large,
  transcript text). Add `/video-documents.ndjson` to `.gitignore`. (`.env*` is already
  ignored; nothing else to add.)

### E. Import & deploy (run, then report real output)

From `studio/` (CLI already authed as admin; no token needed):

1. `npm run typegen` — picks up the new `video` schema → updates `../sanity.types.ts`
   and `schema.json`.
2. `npm run deploy` (Studio app — also unblocks the search MCP later) and
   `npm run deploy:schema`.
3. `./node_modules/.bin/dotenv -e ../.env.local -e ../.env -- npx --no-install sanity
   dataset import ../video-documents.ndjson production --replace`.

## Files to touch

**New**

- `studio/schemaTypes/documents/video.ts` — the `video` document type.
- `scripts/ingest-videos/index.ts` — CLI orchestrator.
- `scripts/ingest-videos/sources.ts` — unique-video set from Sanity + `videos.json`
  enrichment.
- `scripts/ingest-videos/youtube.ts` — `youtubei.js` transcript + native-chapter fetch.
- `scripts/ingest-videos/chunk.ts` — caption-segment → timestamped chunk merge.
- `scripts/ingest-videos/chapters.ts` — native-or-synthesized ToC.
- `scripts/ingest-videos/id.ts` — id sanitiser + stable `_key` helper.
- `scripts/ingest-videos/ndjson.ts` — doc assembly + NDJSON writer.
- `scripts/ingest-videos/types.ts` — shared hand-written types (`CaptionSegment`,
  `VideoChunk`, `VideoChapter`, `VideoDoc`, `IngestResult`).
- `scripts/tsconfig.json` — standalone type-check config for the pipeline.

**Modified**

- `studio/schemaTypes/index.ts` — register `video`.
- `studio/structure.ts` — add the `Videos` list item + a divider.
- `package.json` (web) — `youtubei.js`, `tsx`, `@sanity/client` devDeps;
  `ingest:videos` + `check:types:ingest` scripts.
- `package-lock.json` (web) — from `npm install`.
- `tsconfig.json` (web) — add `"scripts"` to `exclude`.
- `.gitignore` — add `/video-documents.ndjson`.
- `sanity.types.ts` — regenerated by `npm run typegen` (not hand-edited).
- `studio/schema.json` — regenerated by `npm run typegen`.

**Unchanged** (relied on): `lib/video.ts`, `sanity/env.ts`, `sanity/lib/*`, all
`app/**`, all `components/**`, `videos.json`, `seed.ndjson`, `.env.example`.

## Requirements

- One `video` document per **unique** lesson `videoUrl` (deduped by parsed provider id),
  `_id = video.<sanitized id>`, `provider: 'youtube'` for all seeded content.
- `chunks[]`: many short pieces (target ~18 s / ~240 chars, hard cap ~500 chars),
  ascending non-duplicate `startSeconds`, whitespace-collapsed text, first chunk near 0.
  No field anywhere holds the full transcript as one string.
- `chapters[]`: ascending, first `startSeconds: 0`; native YouTube chapters used verbatim
  when present (`chaptersSource: 'youtube'`), otherwise synthesized from the transcript
  (`chaptersSource: 'synthesized'`), otherwise `[]` (`chaptersSource: 'none'`).
- The pipeline never runs in the Next request path, never imports `server-only`, and is
  excluded from `next build`.
- Re-running the pipeline + `--replace` import is idempotent (stable `_id` and `_key`s).
- Non-YouTube / unparseable URLs are skipped and reported, never fetched, never written.
- `npx tsc --noEmit` (web), `npm run check:types:ingest`, `npm run lint` (web),
  `npm run build` (web), and `studio` `check:types` + `lint` all pass.
- `npm run typegen` in `studio/` succeeds and `sanity.types.ts` gains a `video` type.

## Security considerations

- **Read token**: the pipeline's `@sanity/client` uses `SANITY_API_READ_TOKEN` from the
  environment (loaded the same way the app does). It is read-only, never logged, never
  written to a file, never bundled into app code (the pipeline lives in `scripts/` and is
  imported by nothing in `app/`/`components/`). No `NEXT_PUBLIC_` exposure.
- **No write token added.** Import uses the already-authenticated Sanity CLI session, as
  the seed task did. `.env.example` is unchanged.
- **`youtubei.js`** is an unofficial InnerTube client — flagged below. It sends no
  credentials or cookies; requests hit YouTube anonymously. It is a `devDependency`, not
  shipped to the browser or the server runtime.
- **Untrusted input**: transcript text and chapter labels come from third-party videos.
  All are treated as plain text — `startSeconds` coerced to non-negative integers, labels
  trimmed + length-capped, text whitespace-collapsed; nothing is interpolated into HTML,
  a shell, or a GROQ string (the only GROQ is a static query with no interpolation).
- **Whole-transcript rule (AGENTS §12)**: enforced structurally — the schema has only
  `chunks[]`, no full-text field, so no query can return a transcript wholesale.
- NDJSON artifact is git-ignored so transcript dumps are not committed.

## Acceptance criteria

1. `studio/schemaTypes/documents/video.ts` exists, is registered, appears in the Studio
   structure, and `npm run -w? studio check:types` + `lint` pass. `npm run typegen`
   (from `studio/`) adds a `video` type to `sanity.types.ts`.
2. `npm run ingest:videos -- --limit 3 --dry-run` fetches 3 videos and prints a summary
   (built 3, per-source chapter provenance, 0 writes) with no file created.
3. `npm run ingest:videos` writes `video-documents.ndjson` with one line per unique
   seeded video (≤120; expected 120), each a valid `video` doc:
   - `_id` = `video.<id>`, `_type: 'video'`, `provider: 'youtube'`, `url` set.
   - `chunks[]` non-empty for videos that have captions; every `startSeconds` a
     non-negative int, strictly ascending; no chunk text > ~500 chars.
   - `chapters[]` first entry `startSeconds: 0`; `chaptersSource` ∈
     `{youtube, synthesized, none}` and consistent with `chapters[]` emptiness.
   - every `chapters[]`/`chunks[]` member has a `_key`.
4. Re-running `npm run ingest:videos` produces a byte-identical file (deterministic).
5. `sanity dataset import ../video-documents.ndjson production --replace` reports
   `Documents: <N>`, `Failed: 0`.
6. Post-import GROQ: `count(*[_type == "video"])` == N; a spot-checked doc
   (`*[_type=="video"][0]{ _id, chaptersSource, "chapters": count(chapters),
   "chunks": count(chunks), "firstChunk": chunks[0], "lastChunk": chunks[-1] }`) shows
   ordered chunks and a 0-based first chapter.
7. `npx tsc --noEmit` (web), `npm run check:types:ingest`, `npm run lint` (web),
   `npm run build` (web) all pass; `scripts/**` is absent from the build output.
8. `git status` shows `video-documents.ndjson` untracked-and-ignored; `videos.json` and
   `seed.ndjson` unmodified.

## Checks to run (report real output)

- `npm install` (web) — capture resolved `youtubei.js` / `tsx` / `@sanity/client`
  versions written to `package.json`.
- `npx tsc --noEmit` (web root)
- `npm run check:types:ingest` (web root)
- `npm run lint` (web root)
- `npm run build` (web root) — schema types changed; confirm `scripts/` not compiled.
- From `studio/`: `npm run check:types`, `npm run lint`, `npm run typegen`.
- `npm run ingest:videos -- --limit 3 --dry-run`, then the full `npm run ingest:videos`.
- From `studio/`: the `sanity dataset import … --replace` summary.
- Two GROQ checks via `npx --no-install sanity documents query` (count + spot-check).
- `npm run -w? studio deploy` and `deploy:schema` — report success (also the MCP
  precondition from AGENTS §12/§13).

## Manual test steps

1. `npm install` in the web root; confirm `youtubei.js`, `tsx`, `@sanity/client` land in
   `devDependencies`.
2. `npm run ingest:videos -- --only 9602Yzvd7ik --dry-run` → prints one built doc's
   summary (chapter source, chunk count, first/last chunk start), writes nothing.
3. `npm run ingest:videos` → `video-documents.ndjson` created with ~120 lines. Open it:
   pick a line, confirm short ascending `chunks`, a 0-based `chapters[0]`, `_key`s
   present, no full-transcript field.
4. `node -e` (or `jq`) over the file: assert every `chunk.startSeconds` ascending per
   doc and `max(text.length) <= 500`; assert `chaptersSource` matches `chapters` length.
5. Re-run `npm run ingest:videos`; `git diff --stat` / a hash compare → file unchanged.
6. From `studio/`: `npm run typegen` → `git diff sanity.types.ts` shows a new `video`
   type; `npm run check:types` + `lint` clean.
7. From `studio/`: `npm run deploy` + `npm run deploy:schema` → both succeed.
8. From `studio/`: run the import command → `Documents: 120`, `Failed: 0`.
9. GROQ: `count(*[_type=="video"])` → 120. Spot-check query (criterion 6) → ordered
   chunks, `chapters[0].startSeconds == 0`.
10. Open the deployed Studio → `Videos` list shows the docs with `"<n> chapters ·
    <m> chunks"` subtitles; a synthesized-chapter doc and a native-chapter doc both look
    sane.
11. Web: `npx tsc --noEmit`, `npm run check:types:ingest`, `npm run lint`,
    `npm run build` → all green; build log has no `scripts/` files.
12. `git status --porcelain videos.json seed.ndjson` → empty; `video-documents.ndjson`
    does not appear (ignored).

## Needs your attention

- **`youtubei.js` is an unofficial YouTube InnerTube client.** It has no API key and can
  break or get rate-limited when YouTube changes InnerTube; the exact transcript/chapter
  accessor may need adjusting to the installed version. Videos with **no caption track**
  ship as `video` docs with empty `chunks`/`chapters` (`chaptersSource: 'none'`) and are
  listed in the run summary — re-run later to backfill. If you would rather not depend on
  it, the fallbacks are yt-dlp (a system binary) or a committed transcript fixture.
- **Synthesized chapter labels are approximate** — derived from the first words of a
  transcript section, per your choice. Native YouTube chapters are used verbatim when the
  video has them (`chaptersSource` records which).
- **Studio deploy is part of this task** and is also the precondition for the search
  Context MCP (AGENTS §12). If `npm run deploy` fails (auth/network), the import and
  schema still work but the MCP stays unavailable until it succeeds.
- **YouTube-only.** All 120 seeded videos are YouTube. Vimeo/Bunny URLs would be skipped
  and reported; adding them later needs both an ingestion path and the existing playback
  path (AGENTS §9).
- **Import is a manual step** (`sanity dataset import`), matching the seed workflow — the
  pipeline only produces the NDJSON. Say if you want it wrapped in an npm script.
- **No read helper / GROQ for `video` docs** is added here; the search task will add
  read access (they are an internal lookup, AGENTS §7).
- **`videos.json`** is used only to fill missing `title`/`duration`; the primary input is
  the unique `videoUrl` set read from the seeded lessons in Sanity.
