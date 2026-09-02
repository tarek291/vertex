// Shared types for the offline video ingestion pipeline. Hand-written (not
// TypeGen) — these describe the intermediate shapes and the `video` document
// the pipeline emits as NDJSON, not a GROQ projection.

export type Provider = "youtube" | "vimeo" | "bunny";

/** A single caption cue as fetched from the provider. */
export type CaptionSegment = {
  startSeconds: number;
  text: string;
};

/** A provider-native section marker, when the transcript exposes one. */
export type SectionMarker = {
  startSeconds: number;
  label: string;
};

export type VideoChunk = {
  _key: string;
  _type: "videoChunk";
  startSeconds: number;
  text: string;
};

export type VideoChapter = {
  _key: string;
  _type: "videoChapter";
  startSeconds: number;
  label: string;
};

export type ChaptersSource = "youtube" | "synthesized" | "none";

/** One `video` document, ready to serialise as an NDJSON line. */
export type VideoDoc = {
  _id: string;
  _type: "video";
  videoId: string;
  provider: Provider;
  url: string;
  title: string | null;
  duration: number | null;
  chaptersSource: ChaptersSource;
  chapters: VideoChapter[];
  chunks: VideoChunk[];
  ingestedAt: string;
};

/** One unique video to ingest, resolved from the seeded lessons. */
export type VideoSource = {
  provider: Provider;
  videoId: string;
  url: string;
  /** Enrichment from `videos.json`, used only when the provider omits it. */
  title: string | null;
  duration: number | null;
};

/** What `fetchYouTube` returns for one video. */
export type YouTubeFetch = {
  title: string | null;
  durationSeconds: number | null;
  segments: CaptionSegment[];
  nativeChapters: SectionMarker[] | null;
};

export type IngestOutcome = {
  videoId: string;
  chaptersSource: ChaptersSource;
  chapterCount: number;
  chunkCount: number;
  status: "ok" | "no-transcript" | "failed";
  error?: string;
};
