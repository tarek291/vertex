import type { ReactNode } from "react";

type BadgeVariant = "video" | "lesson" | "popular";

const variants: Record<BadgeVariant, string> = {
  video: "bg-neutral-600 text-neutral-100 border border-neutral-500",
  lesson: "bg-neutral-500/60 text-neutral-100 border border-neutral-400",
  popular: "bg-primary-500 text-neutral-900",
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
