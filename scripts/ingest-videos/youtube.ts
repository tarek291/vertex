// YouTube transcript + section-marker fetch via youtubei.js (InnerTube).
//
// No API key. This is an unofficial client — the accessors below target the
// installed youtubei.js major and may need revisiting if it changes. All
// provider-specific extraction is isolated in this file.

import { Innertube, YTNodes } from "youtubei.js";

import type { CaptionSegment, SectionMarker, YouTubeFetch } from "./types";

let clientPromise: Promise<Innertube> | null = null;

function client(): Promise<Innertube> {
  if (!clientPromise) {
    clientPromise = Innertube.create({ retrieve_player: false, generate_session_locally: true });
  }
  return clientPromise;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMissingTranscript(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /transcript/i.test(message) || /not available/i.test(message) || /disabled/i.test(message);
}

type TranscriptNode = YTNodes.TranscriptSegment | YTNodes.TranscriptSectionHeader;

function readTranscript(nodes: unknown[]): { segments: CaptionSegment[]; markers: SectionMarker[] } {
  const segments: CaptionSegment[] = [];
  const markers: SectionMarker[] = [];

  for (const node of nodes as TranscriptNode[]) {
    if (node.is(YTNodes.TranscriptSegment)) {
      const startMs = Number(node.start_ms);
      const text = node.snippet?.toString() ?? "";
      if (Number.isFinite(startMs) && text.trim()) {
        segments.push({ startSeconds: startMs / 1000, text });
      }
    } else if (node.is(YTNodes.TranscriptSectionHeader)) {
      const startMs = Number(node.start_ms);
      const label = node.snippet?.toString() ?? "";
      if (Number.isFinite(startMs) && label.trim()) {
        markers.push({ startSeconds: startMs / 1000, label });
      }
    }
  }
  return { segments, markers };
}

/**
 * Fetch one video's metadata, caption cues and any transcript section markers.
 * Retries transient failures; a video with no transcript resolves with an empty
 * `segments` array rather than throwing.
 */
export async function fetchYouTube(videoId: string, retries = 2): Promise<YouTubeFetch> {
  const yt = await client();
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const info = await yt.getInfo(videoId);
      const title = info.basic_info.title ?? null;
      const durationSeconds =
        typeof info.basic_info.duration === "number" ? info.basic_info.duration : null;

      let segments: CaptionSegment[] = [];
      let nativeChapters: SectionMarker[] | null = null;

      try {
        const transcript = await info.getTranscript();
        const initial = transcript.transcript.content?.body?.initial_segments ?? [];
        const { segments: segs, markers } = readTranscript(initial as unknown[]);
        segments = segs;
        nativeChapters = markers.length > 0 ? markers : null;
      } catch (err) {
        if (!isMissingTranscript(err)) throw err;
      }

      return { title, durationSeconds, segments, nativeChapters };
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(500 * (attempt + 1) * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
