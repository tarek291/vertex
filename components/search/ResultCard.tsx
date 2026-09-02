"use client";

import {
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Folder,
  Play,
} from "lucide-react";
import Link from "next/link";
import { formatClock } from "@/components/course/courseFormat";
import { Badge } from "@/components/ui/Badge";
import { analytics } from "@/lib/analytics/client";
import type { SearchResult } from "@/lib/search/contract";

/**
 * One search result. `lesson` cards are produced today; `video` cards are built
 * but dormant until the video-ingestion task populates `video` documents
 * (AGENTS §7, §11) — no timestamp is ever synthesised here.
 */
export function ResultCard({
  result,
  position,
  query,
  sort,
}: {
  result: SearchResult;
  position: number;
  query: string;
  sort: string;
}) {
  const href =
    result.kind === "video"
      ? `/lessons/${result.lessonSlug}?start=${result.matchedSeconds}`
      : `/lessons/${result.lessonSlug}`;

  const onOpen = () => {
    analytics.searchResultOpened({
      result_kind: result.kind,
      result_position: position,
      course_slug: result.courseSlug || null,
      lesson_slug: result.lessonSlug,
      lesson_label: result.lessonLabel,
      ...(result.kind === "video"
        ? { matched_seconds: result.matchedSeconds }
        : {}),
      query,
      sort,
    });
  };

  return (
    <Link
      href={href}
      onClick={onOpen}
      className="group grid gap-5 rounded-xl border border-neutral-600 bg-neutral-800/40 p-5 transition-colors hover:border-neutral-500 lg:grid-cols-[320px_1fr]"
    >
      {result.kind === "video" ? (
        <VideoMedia result={result} />
      ) : (
        <LessonPanel result={result} />
      )}

      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-small font-semibold text-neutral-0">
              {(result.courseTitle || "?").charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-body text-neutral-200">
              {result.courseTitle || "Course"}
            </span>
          </div>
          <Badge variant={result.kind === "video" ? "resultVideo" : "resultLesson"}>
            {result.kind === "video" ? "Video" : "Lesson"}
          </Badge>
        </div>

        <h3 className="font-display mt-2 text-h2 text-neutral-0">
          {result.lessonTitle}
        </h3>

        {result.description && (
          <p className="mt-2 line-clamp-2 text-body text-neutral-300">
            {result.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-small text-neutral-400">
          <span className="flex items-center gap-2">
            {result.kind === "video" ? (
              <>
                <FileText size={14} strokeWidth={2} />
                {result.lessonLabel ?? result.lessonTitle}
                {result.courseTitle && (
                  <>
                    <span aria-hidden>•</span>
                    <Folder size={14} strokeWidth={2} />
                    {result.courseTitle}
                  </>
                )}
              </>
            ) : (
              result.moduleLabel && <span>{result.moduleLabel}</span>
            )}
          </span>

          <span className="flex items-center gap-1.5 text-primary-300">
            {result.kind === "video" ? (
              <>
                <Clock size={14} strokeWidth={2} />
                Watch from {formatClock(result.matchedSeconds)}
              </>
            ) : (
              <>
                View lesson
                <ExternalLink size={13} strokeWidth={2} />
              </>
            )}
            <ChevronRight
              size={14}
              strokeWidth={2}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function LessonPanel({
  result,
}: {
  result: Extract<SearchResult, { kind: "lesson" }>;
}) {
  const points = result.keyPoints.slice(0, 4);
  return (
    <div className="relative flex flex-col rounded-lg border border-neutral-700 bg-neutral-900/60 p-4">
      <FileText size={16} strokeWidth={2} className="mb-3 text-neutral-400" />
      {points.length > 0 ? (
        <ul className="space-y-1.5 text-body text-neutral-200">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="text-neutral-500">
                •
              </span>
              <span className="line-clamp-1">{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-neutral-400">Lesson notes</p>
      )}
      <CheckCircle2
        size={18}
        strokeWidth={2}
        className="absolute bottom-3 right-3 text-neutral-600"
      />
    </div>
  );
}

function VideoMedia({
  result,
}: {
  result: Extract<SearchResult, { kind: "video" }>;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
      {result.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover opacity-80"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-0/90 text-neutral-900">
          <Play size={20} strokeWidth={2} className="ml-0.5" fill="currentColor" />
        </span>
      </span>
      {result.clipLengthSeconds != null && (
        <span className="absolute bottom-2 right-2 rounded bg-neutral-900/80 px-2 py-0.5 text-small text-neutral-100">
          {formatClock(result.clipLengthSeconds)}
        </span>
      )}
    </div>
  );
}
