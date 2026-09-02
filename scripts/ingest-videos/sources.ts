// Resolve the unique set of videos to ingest from the seeded lessons.
//
// Primary input: every lesson's `videoUrl` in Sanity, deduped by parsed
// provider id (AGENTS §7 — one video doc per unique video URL). `videos.json`
// (keyed by lesson slug) only fills in title/duration the provider may omit.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";

import { parseVideoUrl } from "../../lib/video";
import { apiVersion, dataset, projectId, readToken } from "../../sanity/env";
import type { Provider, VideoSource } from "./types";

type LessonRow = { slug: string | null; videoUrl: string | null };

type VideoMeta = { id: string; title: string; channel: string; duration: number; query: string };

const VIDEOS_JSON = fileURLToPath(new URL("../../videos.json", import.meta.url));

function loadVideosJson(): Record<string, VideoMeta> {
  try {
    return JSON.parse(readFileSync(VIDEOS_JSON, "utf8")) as Record<string, VideoMeta>;
  } catch {
    return {};
  }
}

export type ResolvedSources = {
  videos: VideoSource[];
  skipped: { url: string; reason: string }[];
};

export async function resolveSources(): Promise<ResolvedSources> {
  if (!readToken) {
    throw new Error("SANITY_API_READ_TOKEN is not set — cannot read lesson video URLs.");
  }

  const sanity = createClient({
    projectId,
    dataset,
    apiVersion,
    token: readToken,
    useCdn: false,
    perspective: "published",
  });

  const rows = await sanity.fetch<LessonRow[]>(
    `*[_type == "lesson" && defined(videoUrl)]{ "slug": slug.current, videoUrl }`,
  );

  const meta = loadVideosJson();
  const bySlug = new Map<string, VideoMeta>(Object.entries(meta));

  const seen = new Set<string>();
  const videos: VideoSource[] = [];
  const skipped: { url: string; reason: string }[] = [];

  for (const row of rows) {
    const url = row.videoUrl?.trim();
    if (!url) continue;

    const parsed = parseVideoUrl(url);
    if (!parsed.provider || !parsed.id) {
      skipped.push({ url, reason: "unrecognised provider / URL" });
      continue;
    }
    if (parsed.provider !== "youtube") {
      skipped.push({ url, reason: `${parsed.provider} ingestion not implemented` });
      continue;
    }

    const key = `${parsed.provider}:${parsed.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const enrich = row.slug ? bySlug.get(row.slug) : undefined;
    videos.push({
      provider: parsed.provider as Provider,
      videoId: parsed.id,
      url,
      title: enrich?.title ?? null,
      duration: typeof enrich?.duration === "number" ? enrich.duration : null,
    });
  }

  return { videos, skipped };
}
