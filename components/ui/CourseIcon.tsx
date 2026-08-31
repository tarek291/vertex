import type { ReactNode } from "react";

type CourseIconProps = {
  /** Short monogram shown on the tile, e.g. "N" or "TS". */
  label: ReactNode;
  /** Tailwind classes for the tile background + text color. */
  className?: string;
};

/**
 * Presentational brand tile for a course. Provider logos (Next.js, Docker, TS)
 * are approximated as coloured monogram tiles at card size.
 */
export function CourseIcon({ label, className = "" }: CourseIconProps) {
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-h2 font-semibold ${className}`}
    >
      {label}
    </div>
  );
}
