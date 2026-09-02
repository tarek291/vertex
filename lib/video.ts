// Pure helpers for turning a stored lesson `videoUrl` into an on-site provider
// embed. No DOM, no server-only — imported by the client VideoPlayer. Supported
// providers per AGENTS §9: YouTube, Vimeo, Bunny. Playback always stays on the
// lesson page; a result may pass a start-seconds seek target.

export type VideoProvider = "youtube" | "vimeo" | "bunny";

export type ParsedVideo = {
  provider: VideoProvider | null;
  /** Provider-native id (YouTube/Vimeo) or `<library>/<guid>` for Bunny. */
  id: string | null;
  /** Poster/thumbnail URL when the provider exposes a stable one. */
  thumbnailUrl: string | null;
  /** Embed URL that autoplays from `startSeconds` (only used after a user gesture). */
  embedUrl: (startSeconds: number) => string | null;
};

const NObC = "www.youtube-nocookie.com";

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.slice(1) || null;
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const m = url.pathname.match(/^\/(?:embed|v|shorts)\/([^/?]+)/);
    if (m) return m[1];
  }
  return null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "vimeo.com") {
    const m = url.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  }
  if (host === "player.vimeo.com") {
    const m = url.pathname.match(/\/video\/(\d+)/);
    return m ? m[1] : null;
  }
  return null;
}

function bunnyId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "iframe.mediadelivery.net") return null;
  const m = url.pathname.match(/\/(?:embed|play)\/([^/]+)\/([^/?]+)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

const EMPTY: ParsedVideo = {
  provider: null,
  id: null,
  thumbnailUrl: null,
  embedUrl: () => null,
};

/** Parse a stored `videoUrl` into provider embed/thumbnail helpers. */
export function parseVideoUrl(rawUrl: string | null | undefined): ParsedVideo {
  if (!rawUrl) return EMPTY;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return EMPTY;
  }

  const yt = youtubeId(url);
  if (yt) {
    return {
      provider: "youtube",
      id: yt,
      thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      embedUrl: (startSeconds) => {
        const start = normalizeStart(startSeconds);
        const params = new URLSearchParams({
          rel: "0",
          modestbranding: "1",
          autoplay: "1",
          enablejsapi: "1",
          playsinline: "1",
        });
        if (start > 0) params.set("start", String(start));
        return `https://${NObC}/embed/${yt}?${params.toString()}`;
      },
    };
  }

  const vim = vimeoId(url);
  if (vim) {
    return {
      provider: "vimeo",
      id: vim,
      thumbnailUrl: null,
      embedUrl: (startSeconds) => {
        const start = normalizeStart(startSeconds);
        const base = `https://player.vimeo.com/video/${vim}?autoplay=1`;
        return start > 0 ? `${base}#t=${start}s` : base;
      },
    };
  }

  const bun = bunnyId(url);
  if (bun) {
    return {
      provider: "bunny",
      id: bun,
      thumbnailUrl: null,
      embedUrl: (startSeconds) => {
        const start = normalizeStart(startSeconds);
        const params = new URLSearchParams({ autoplay: "true" });
        if (start > 0) params.set("t", String(start));
        return `https://iframe.mediadelivery.net/embed/${bun}?${params.toString()}`;
      },
    };
  }

  return EMPTY;
}

/** Clamp an incoming `?start=` value to a non-negative integer number of seconds. */
export function normalizeStart(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}
