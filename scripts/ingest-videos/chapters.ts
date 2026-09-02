// Resolve a video's table of contents.
//
// Strategy (AGENTS §7): use the provider's own chapter markers when present;
// otherwise synthesise coarse markers from the transcript so search still has a
// chapters-first target; otherwise leave it empty and let transcript-chunk
// matching be the only fallback.

import { stableKey } from "./id";
import type { ChaptersSource, SectionMarker, VideoChapter, VideoChunk } from "./types";

const MIN_SECTIONS = 4;
const MAX_SECTIONS = 12;
const LABEL_WORDS = 8;
const LABEL_MAX_CHARS = 60;

function toLabel(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  let label = words.slice(0, LABEL_WORDS).join(" ");
  label = label.replace(/[.,;:!?-]+$/, "").trim();
  if (!label) return "Untitled section";
  label = label.charAt(0).toUpperCase() + label.slice(1);
  const truncated = words.length > LABEL_WORDS || label.length > LABEL_MAX_CHARS;
  if (label.length > LABEL_MAX_CHARS) label = label.slice(0, LABEL_MAX_CHARS).trimEnd();
  return truncated ? `${label}…` : label;
}

function normaliseMarkers(markers: SectionMarker[]): VideoChapter[] {
  const sorted = markers
    .map((m) => ({ startSeconds: Math.max(0, Math.floor(m.startSeconds)), label: m.label.replace(/\s+/g, " ").trim() }))
    .filter((m) => m.label.length > 0)
    .sort((a, b) => a.startSeconds - b.startSeconds);

  const deduped: { startSeconds: number; label: string }[] = [];
  for (const m of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.startSeconds === m.startSeconds) continue;
    deduped.push(m);
  }
  if (deduped.length > 0 && deduped[0].startSeconds > 0) {
    deduped.unshift({ startSeconds: 0, label: "Introduction" });
  }
  return deduped.map((m, i) => ({
    _key: stableKey("chapter", m.startSeconds, i),
    _type: "videoChapter",
    startSeconds: m.startSeconds,
    label: m.label,
  }));
}

/** Split the transcript into N even-ish sections and label each from its text. */
function synthesise(chunks: VideoChunk[], durationSeconds: number | null): VideoChapter[] {
  if (chunks.length < MIN_SECTIONS) return [];

  const span = durationSeconds ?? chunks[chunks.length - 1].startSeconds;
  const target = Math.min(MAX_SECTIONS, Math.max(MIN_SECTIONS, Math.round(span / 120)));
  const perSection = Math.ceil(chunks.length / target);

  const chapters: VideoChapter[] = [];
  for (let i = 0; i < chunks.length; i += perSection) {
    const section = chunks.slice(i, i + perSection);
    if (section.length === 0) continue;
    const startSeconds = chapters.length === 0 ? 0 : section[0].startSeconds;
    chapters.push({
      _key: stableKey("chapter", startSeconds, chapters.length),
      _type: "videoChapter",
      startSeconds,
      label: toLabel(section[0].text),
    });
  }
  return chapters;
}

export function resolveChapters(
  nativeChapters: SectionMarker[] | null,
  chunks: VideoChunk[],
  durationSeconds: number | null,
): { chapters: VideoChapter[]; source: ChaptersSource } {
  if (nativeChapters && nativeChapters.length > 0) {
    const chapters = normaliseMarkers(nativeChapters);
    if (chapters.length > 0) return { chapters, source: "youtube" };
  }
  const synthesised = synthesise(chunks, durationSeconds);
  if (synthesised.length > 0) return { chapters: synthesised, source: "synthesized" };
  return { chapters: [], source: "none" };
}
