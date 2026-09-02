// Assemble `video` documents and serialise them as NDJSON — one JSON object
// per line, the format `sanity dataset import` expects.

import { writeFileSync } from "node:fs";

import { resolveChapters } from "./chapters";
import { toChunks } from "./chunk";
import { videoDocId } from "./id";
import type { SectionMarker, VideoDoc, VideoSource, YouTubeFetch } from "./types";

export function buildVideoDoc(
  source: VideoSource,
  fetched: Pick<YouTubeFetch, "title" | "durationSeconds" | "segments" | "nativeChapters">,
  ingestedAt: string,
): VideoDoc {
  const chunks = toChunks(fetched.segments);
  const duration = fetched.durationSeconds ?? source.duration ?? null;
  const { chapters, source: chaptersSource } = resolveChapters(
    fetched.nativeChapters as SectionMarker[] | null,
    chunks,
    duration,
  );

  return {
    _id: videoDocId(source.videoId),
    _type: "video",
    videoId: source.videoId,
    provider: source.provider,
    url: source.url,
    title: fetched.title ?? source.title ?? null,
    duration,
    chaptersSource,
    chapters,
    chunks,
    ingestedAt,
  };
}

/** Build a doc for a video whose fetch failed — imported so it can be backfilled. */
export function buildEmptyDoc(source: VideoSource, ingestedAt: string): VideoDoc {
  return {
    _id: videoDocId(source.videoId),
    _type: "video",
    videoId: source.videoId,
    provider: source.provider,
    url: source.url,
    title: source.title ?? null,
    duration: source.duration ?? null,
    chaptersSource: "none",
    chapters: [],
    chunks: [],
    ingestedAt,
  };
}

export function writeNdjson(path: string, docs: VideoDoc[]): void {
  const body = docs.map((doc) => JSON.stringify(doc)).join("\n");
  writeFileSync(path, docs.length > 0 ? `${body}\n` : "", "utf8");
}
