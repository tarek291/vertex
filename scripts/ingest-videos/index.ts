// Offline video ingestion pipeline (AGENTS §5, §8-§9).
//
// Reads the unique lesson video URLs from Sanity, fetches each YouTube video's
// transcript + section markers via youtubei.js, merges the captions into short
// timestamped chunks, resolves a table of contents (provider chapters, else
// synthesised), and writes `video` documents as NDJSON for `sanity dataset
// import`. It never runs in the request path.
//
//   npm run ingest:videos -- [--out <path>] [--only <id,id>] [--limit <n>]
//                            [--dry-run] [--strict] [--delay <ms>]

import { buildEmptyDoc, buildVideoDoc, writeNdjson } from "./ndjson";
import { resolveSources } from "./sources";
import type { IngestOutcome, VideoDoc } from "./types";
import { fetchYouTube } from "./youtube";

type Options = {
  out: string;
  only: Set<string> | null;
  limit: number | null;
  dryRun: boolean;
  strict: boolean;
  delayMs: number;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    out: "./video-documents.ndjson",
    only: null,
    limit: null,
    dryRun: false,
    strict: false,
    delayMs: 400,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[(i += 1)];
    if (arg === "--out") opts.out = next();
    else if (arg === "--only") opts.only = new Set(next().split(",").map((s) => s.trim()).filter(Boolean));
    else if (arg === "--limit") opts.limit = Math.max(0, Number.parseInt(next(), 10) || 0);
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--strict") opts.strict = true;
    else if (arg === "--delay") opts.delayMs = Math.max(0, Number.parseInt(next(), 10) || 0);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertAscending(doc: VideoDoc): void {
  let last = -1;
  for (const chunk of doc.chunks) {
    if (chunk.startSeconds <= last) {
      throw new Error(`${doc._id}: chunk startSeconds not strictly ascending at ${chunk.startSeconds}`);
    }
    last = chunk.startSeconds;
  }
  if (doc.chapters.length > 0 && doc.chapters[0].startSeconds !== 0) {
    throw new Error(`${doc._id}: first chapter does not start at 0`);
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const ingestedAt = new Date().toISOString();

  const { videos, skipped } = await resolveSources();
  let queue = opts.only ? videos.filter((v) => opts.only?.has(v.videoId)) : videos;
  if (opts.limit !== null) queue = queue.slice(0, opts.limit);

  process.stderr.write(
    `Ingesting ${queue.length} video(s)` +
      (skipped.length ? ` — skipping ${skipped.length} non-YouTube/unrecognised URL(s)` : "") +
      (opts.dryRun ? " [dry run]" : "") +
      "\n",
  );

  const docs: VideoDoc[] = [];
  const outcomes: IngestOutcome[] = [];

  for (let i = 0; i < queue.length; i += 1) {
    const source = queue[i];
    const tag = `[${i + 1}/${queue.length}] ${source.videoId}`;
    try {
      const fetched = await fetchYouTube(source.videoId);
      const doc = buildVideoDoc(source, fetched, ingestedAt);
      assertAscending(doc);
      docs.push(doc);
      const status = doc.chunks.length === 0 ? "no-transcript" : "ok";
      outcomes.push({
        videoId: source.videoId,
        chaptersSource: doc.chaptersSource,
        chapterCount: doc.chapters.length,
        chunkCount: doc.chunks.length,
        status,
      });
      process.stderr.write(
        `${tag}: ${doc.chunks.length} chunks, ${doc.chapters.length} chapters (${doc.chaptersSource})\n`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      docs.push(buildEmptyDoc(source, ingestedAt));
      outcomes.push({
        videoId: source.videoId,
        chaptersSource: "none",
        chapterCount: 0,
        chunkCount: 0,
        status: "failed",
        error: message,
      });
      process.stderr.write(`${tag}: FAILED — ${message}\n`);
    }
    if (opts.delayMs > 0 && i < queue.length - 1) await sleep(opts.delayMs);
  }

  const failed = outcomes.filter((o) => o.status === "failed");
  const noTranscript = outcomes.filter((o) => o.status === "no-transcript");
  const native = outcomes.filter((o) => o.chaptersSource === "youtube").length;
  const synthesized = outcomes.filter((o) => o.chaptersSource === "synthesized").length;

  process.stderr.write(
    `\nSummary: built ${docs.length} · provider-chapters ${native} · synthesized ${synthesized} · ` +
      `no-transcript ${noTranscript.length} · failed ${failed.length} · skipped ${skipped.length}\n`,
  );
  for (const s of skipped) process.stderr.write(`  skipped: ${s.url} (${s.reason})\n`);
  for (const f of failed) process.stderr.write(`  failed:  ${f.videoId} — ${f.error}\n`);

  if (opts.dryRun) {
    process.stderr.write("\nDry run — no file written.\n");
  } else {
    writeNdjson(opts.out, docs);
    process.stderr.write(`\nWrote ${docs.length} document(s) to ${opts.out}\n`);
  }

  if (opts.strict && failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
