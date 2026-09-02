"use client";

import {
  ArrowRight,
  Code2,
  Download,
  FileText,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { analytics, urlHost } from "@/lib/analytics/client";

type ResourceType = "code" | "download" | "link" | "pdf" | "video";

const ICONS: Record<ResourceType, LucideIcon> = {
  link: FileText,
  pdf: FileText,
  code: Code2,
  download: Download,
  video: PlayCircle,
};

const CTA: Record<ResourceType, string> = {
  link: "Read documentation",
  pdf: "Read documentation",
  code: "View on GitHub",
  download: "Download",
  video: "Watch video",
};

export function ResourceCard({
  type,
  title,
  description,
  url,
  lessonSlug,
}: {
  type: ResourceType | null;
  title: string;
  description: string | null;
  url: string;
  lessonSlug: string;
}) {
  const key: ResourceType = type ?? "link";
  const Icon = ICONS[key];

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        analytics.lessonResourceClicked({
          lesson_slug: lessonSlug,
          resource_title: title,
          resource_type: key,
          resource_url_host: urlHost(url),
        })
      }
      className="flex flex-col rounded-lg border border-neutral-600 bg-neutral-800/50 p-5 transition-colors hover:border-neutral-400"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary-500/40 text-primary-300">
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="mt-4 block text-h3 text-neutral-0">{title}</span>
      {description && (
        <span className="mt-1 block text-body text-neutral-300">{description}</span>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 text-body font-medium text-primary-300">
        {CTA[key]}
        <ArrowRight size={14} strokeWidth={2} />
      </span>
    </a>
  );
}
