// Merge short caption cues into timestamped transcript chunks.
//
// Provider caption cues are tiny (a few words, 1-5s each). Search needs pieces
// that are individually meaningful but still small enough that a handful can be
// returned per video without overflowing the model's context (AGENTS §12).

import { stableKey } from "./id";
import type { CaptionSegment, VideoChunk } from "./types";

const TARGET_SPAN_SECONDS = 18;
const TARGET_CHARS = 240;
const HARD_MAX_CHARS = 500;

const SENTENCE_END = /[.!?]["')\]]?\s*$/;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function capLength(text: string): string {
  if (text.length <= HARD_MAX_CHARS) return text;
  return `${text.slice(0, HARD_MAX_CHARS - 1).trimEnd()}…`;
}

/**
 * Greedily accumulate cues into a chunk, flushing when it reaches the target
 * span or size — preferring to break just after sentence-ending punctuation.
 * `startSeconds` is strictly ascending (collisions are bumped by 1s).
 */
export function toChunks(segments: CaptionSegment[]): VideoChunk[] {
  const cues = segments
    .map((s) => ({ startSeconds: Math.max(0, Math.floor(s.startSeconds)), text: collapseWhitespace(s.text) }))
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.startSeconds - b.startSeconds);

  const chunks: VideoChunk[] = [];
  let bucket: string[] = [];
  let bucketStart = 0;
  let lastStart = -1;

  const flush = () => {
    const text = collapseWhitespace(bucket.join(" "));
    bucket = [];
    if (!text) return;
    const start = bucketStart <= lastStart ? lastStart + 1 : bucketStart;
    lastStart = start;
    chunks.push({
      _key: stableKey("chunk", start, chunks.length),
      _type: "videoChunk",
      startSeconds: start,
      text: capLength(text),
    });
  };

  for (const cue of cues) {
    if (bucket.length === 0) bucketStart = cue.startSeconds;
    bucket.push(cue.text);

    const joined = bucket.join(" ");
    const span = cue.startSeconds - bucketStart;
    const bigEnough = joined.length >= TARGET_CHARS || span >= TARGET_SPAN_SECONDS;
    const tooBig = joined.length >= HARD_MAX_CHARS;

    if ((bigEnough && SENTENCE_END.test(cue.text)) || tooBig) flush();
  }
  flush();

  return chunks;
}
