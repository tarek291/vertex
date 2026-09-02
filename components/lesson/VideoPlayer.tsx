"use client";

import { Play } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics/client";
import { normalizeStart, parseVideoUrl } from "@/lib/video";

/* Minimal YouTube IFrame Player API surface we depend on. */
type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};
type YTPlayerCtor = new (
  el: HTMLElement,
  opts: {
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: { onReady?: () => void };
  },
) => YTPlayer;
declare global {
  interface Window {
    YT?: { Player: YTPlayerCtor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PROGRESS_MILESTONES = [25, 50, 75] as const;
const COMPLETE_AT = 90;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

export function VideoPlayer({
  videoUrl,
  title,
  posterUrl,
  courseInitial,
  courseSlug,
  lessonSlug,
  lessonLabel,
}: {
  videoUrl: string | null;
  title: string;
  posterUrl: string | null;
  courseInitial: string;
  courseSlug: string | null;
  lessonSlug: string;
  lessonLabel: string | null;
}) {
  const searchParams = useSearchParams();
  const startSeconds = normalizeStart(searchParams.get("start"));

  const parsed = parseVideoUrl(videoUrl);
  const [playing, setPlaying] = useState(false);

  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const firedMilestones = useRef<Set<number>>(new Set());
  const firedComplete = useRef(false);

  const emitProgress = useCallback(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    const duration = player.getDuration();
    if (!duration) return;
    const watched = player.getCurrentTime();
    const percent = (watched / duration) * 100;

    for (const milestone of PROGRESS_MILESTONES) {
      if (percent >= milestone && !firedMilestones.current.has(milestone)) {
        firedMilestones.current.add(milestone);
        analytics.videoWatchProgressed({
          lesson_slug: lessonSlug,
          course_slug: courseSlug,
          percent: milestone,
          watched_seconds: Math.round(watched),
          duration_seconds: Math.round(duration),
        });
      }
    }
    if (percent >= COMPLETE_AT && !firedComplete.current) {
      firedComplete.current = true;
      analytics.lessonCompleted({
        lesson_slug: lessonSlug,
        course_slug: courseSlug,
        lesson_label: lessonLabel,
        trigger: "video_watched",
      });
    }
  }, [courseSlug, lessonSlug, lessonLabel]);

  // One-shot: the video URL has no provider we can embed/seek.
  useEffect(() => {
    if (parsed.provider) return;
    analytics.videoPlayFailed({
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      reason: "unsupported_provider",
    });
  }, [parsed.provider, lessonSlug, courseSlug]);

  // YouTube: build the player through the IFrame API so we can read progress.
  useEffect(() => {
    if (!playing || parsed.provider !== "youtube" || !parsed.id) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !ytHostRef.current || !window.YT?.Player) return;
      ytPlayerRef.current = new window.YT.Player(ytHostRef.current, {
        videoId: parsed.id!,
        playerVars: {
          autoplay: 1,
          start: startSeconds,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
      });
      interval = setInterval(emitProgress, 5000);
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
    };
  }, [playing, parsed.provider, parsed.id, startSeconds, emitProgress]);

  const handlePlay = () => {
    setPlaying(true);
    const resumed = startSeconds > 0;
    analytics.videoPlayed({
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      lesson_label: lessonLabel,
      provider: parsed.provider,
      start_seconds: startSeconds,
      resumed,
    });
    if (resumed) {
      analytics.videoResumed({
        lesson_slug: lessonSlug,
        course_slug: courseSlug,
        start_seconds: startSeconds,
        source: "search_deep_link",
      });
    }
  };

  const frame =
    "relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-600 bg-neutral-900 shadow-lg";

  if (!parsed.provider) {
    return (
      <div className={`${frame} flex items-center justify-center`}>
        <p className="text-body text-neutral-300">Video unavailable.</p>
      </div>
    );
  }

  if (!playing) {
    return (
      <div className={frame}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={title}
            className="h-full w-full object-cover opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <span className="font-display text-[96px] font-semibold text-neutral-0">
              {courseInitial}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play: ${title}`}
          className="absolute inset-0 flex items-center justify-center bg-neutral-900/30 transition-colors hover:bg-neutral-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-primary-300 to-primary-500 text-neutral-900 shadow-lg">
            <Play size={26} strokeWidth={2} className="ml-1" fill="currentColor" />
          </span>
        </button>
      </div>
    );
  }

  if (parsed.provider === "youtube") {
    // The IFrame API replaces this div with its own <iframe>.
    return (
      <div className={frame}>
        <div ref={ytHostRef} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={frame}>
      <iframe
        src={parsed.embedUrl(startSeconds) ?? undefined}
        title={title}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
