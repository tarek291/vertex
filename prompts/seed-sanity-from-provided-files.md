# Seed Sanity from provided seed.ndjson (+ videos.json noted)

## Goal

Populate the `production` dataset of Sanity project `idij6qfk` with the pre-authored
content in `seed.ndjson`, using the Sanity CLI import. Verify document counts after.
Do not generate new content. Do not modify `seed.ndjson` or `videos.json`.

## Skills / docs read

- `AGENTS.md` sections 5, 8, 9, 13 (workspace split, data model, ingestion, checks).
- No skill was named by the user. `sanity-migration` skimmed mentally — not needed:
  this is a plain first-party NDJSON import, not a cross-CMS migration.

## Code / config inspected

- `studio/sanity.cli.ts`, `studio/sanity.config.ts` — standalone Studio, workspace
  `vertex`, project/dataset from `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`,
  loaded from repo-root `.env.local` via `dotenv-cli` in the npm scripts.
- `studio/schemaTypes/**` — documents: `category`, `instructor`, `lesson`, `course`;
  objects: `learningOutcome`, `module`, `resource`. No `video` document type exists.
- `.env.local` — `SANITY_STUDIO_PROJECT_ID=idij6qfk`, `SANITY_STUDIO_DATASET=production`.
- `sanity debug` — CLI authenticated as administrator on `idij6qfk` / `production`.
- Current dataset is **empty** (0 course / lesson / instructor / category).
- `seed.ndjson` — 141 documents: 6 `category`, 5 `instructor`, 10 `course`, 120 `lesson`.
  - 135 image references use the `_sanityAsset: "image@<url>"` NDJSON convention;
    asset hosts: `randomuser.me`, `i.ytimg.com`, `picsum.photos`. `sanity dataset
    import` resolves and uploads these.
  - Deterministic IDs (`category.web-development`, `lesson.<slug>`, etc.) — re-import
    is safe/idempotent with `--replace`.
- `videos.json` — a JSON **object** keyed by lesson slug -> `{ id, title, channel,
  duration, query }` YouTube metadata. Not NDJSON, no `_type`. Every lesson's
  `videoUrl` already contains the matching YouTube id, so it duplicates nothing in
  the content seed.

## Decisions / assumptions

- **Import `seed.ndjson` only.** (User chose this.) `videos.json` is not importable
  via the CLI and there is no schema type to hold it; it is input for the later
  video-ingestion pipeline (chapters/chunks -> `video` docs, AGENTS.md 8-9). Leave it
  untouched.
- Run the import from `studio/` using the project's own local Sanity CLI and
  `dotenv-cli`, matching the existing npm-script pattern, so project/dataset come
  from `.env.local` (no hardcoding).
- Use `sanity dataset import ../seed.ndjson production --replace`. `--replace` (not
  `--missing`) so a re-run refreshes existing docs; dataset is currently empty so
  first run is a clean insert either way.
- Do **not** pass `--allow-failing-assets`; if an asset URL fails we want to see it.
- `seed.ndjson` is not modified. Note: lesson docs carry a `thumbnail` image field
  while the schema names it `poster` — imported as-is (stored as an unknown field);
  flagged for the user, not fixed here.

## Files to touch

- None in the repo. This is a data operation against the hosted dataset.
- Temporary: none committed.

## Requirements

- All 141 documents from `seed.ndjson` present in `production`.
- Referenced image assets uploaded (course cover images, instructor photos, lesson
  thumbnails).
- References resolve (course -> instructor/category, module.lessons -> lesson).
- `seed.ndjson` and `videos.json` unchanged (verify with `git status` — both are
  currently untracked and must stay byte-identical).

## Security considerations

- Uses the already-authenticated local CLI session (administrator). No token is
  printed, written to the repo, or added to env.
- No secrets added or echoed. `.env.local` stays untouched.
- Import pulls remote images from third-party hosts (randomuser.me, i.ytimg.com,
  picsum.photos) — expected and required by the seed.

## Acceptance criteria

- `sanity dataset import` reports 141 documents imported, 0 failed, and a non-zero
  asset count with 0 asset failures.
- Post-import GROQ count:
  `{"category":6,"instructor":5,"course":10,"lesson":120}` and total docs = 141.
- Spot check: one course resolves its instructor name and its modules' lesson titles.
- `git status --porcelain seed.ndjson videos.json` prints nothing (unmodified).

## Checks to run

- `git status` before and after (files unchanged; no repo files changed).
- The import command's own summary output.
- GROQ count query via `sanity documents query`.
- One GROQ spot-check joining a course to its instructor and module lessons.
- Not applicable: web type-check/lint/build (no code changed). Studio deploy is a
  separate task, not required to seed.

## Manual test steps

1. From `studio/`, run:
   `./node_modules/.bin/dotenv -e ../.env.local -- npx --no-install sanity dataset import ../seed.ndjson production --replace`
2. Confirm the summary: `Documents: 141`, `Failed: 0`, assets uploaded with 0 failures.
3. Run the count query:
   `./node_modules/.bin/dotenv -e ../.env.local -- npx --no-install sanity documents query '{"category":count(*[_type=="category"]),"instructor":count(*[_type=="instructor"]),"course":count(*[_type=="course"]),"lesson":count(*[_type=="lesson"]),"total":count(*[!(_id in path("**")) == false] )}'`
   (or a simpler total: `count(*[!(_id in path("drafts.**"))])`).
4. Spot-check query:
   `*[_type=="course"][0]{title, "instructor": instructor->name, "modules": modules[]{title, "lessons": lessons[]->title}}`
5. `git status --porcelain seed.ndjson videos.json` -> empty.
6. Optionally open the deployed/local Studio and confirm Courses, Lessons,
   Instructors, Categories lists are populated.
