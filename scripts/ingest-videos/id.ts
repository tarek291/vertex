// Deterministic id / key helpers. Stable output across runs so a re-ingest
// produces a byte-identical NDJSON file and `--replace` imports are idempotent.

/**
 * Sanity document id for a video, derived from its provider-native id
 * (AGENTS §9). Any character outside Sanity's id-safe set is replaced with `-`.
 * YouTube's 11-char ids are already safe; this covers Bunny's `<lib>/<guid>`.
 */
export function videoDocId(nativeId: string): string {
  const safe = nativeId.replace(/[^A-Za-z0-9._-]/g, "-");
  return `video.${safe}`;
}

/** Deterministic array-member `_key` from a stable prefix, time and index. */
export function stableKey(prefix: string, startSeconds: number, index: number): string {
  return `${prefix}-${String(startSeconds).padStart(6, "0")}-${String(index).padStart(4, "0")}`;
}
