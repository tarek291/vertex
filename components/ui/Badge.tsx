import type { ReactNode } from "react";

type BadgeVariant =
  | "video"
  | "lesson"
  | "popular"
  | "resultVideo"
  | "resultLesson";

const variants: Record<BadgeVariant, string> = {
  video: "bg-neutral-600 text-neutral-100 border border-neutral-500",
  lesson: "bg-neutral-500/60 text-neutral-100 border border-neutral-400",
  popular: "bg-primary-500 text-neutral-900",
  // Search result kind pills (see UI.video.jpg): amber for video moments,
  // violet for lesson matches.
  resultVideo:
    "bg-primary-500/15 text-primary-300 border border-primary-500/30",
  resultLesson:
    "bg-[#8a8adf]/15 text-[#b4b4ec] border border-[#8a8adf]/30",
};

export function Badge({
  variant = "lesson",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
