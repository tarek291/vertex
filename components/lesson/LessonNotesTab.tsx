import { NotebookPen } from "lucide-react";

/**
 * Presentational-only Notes tab (AGENTS §7 — no backend). Personal note-taking
 * is not wired; this is an empty state, not an input.
 */
export function LessonNotesTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-600 bg-neutral-800/40 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-600 text-neutral-300">
        <NotebookPen size={20} strokeWidth={2} />
      </span>
      <p className="mt-4 text-h3 text-neutral-0">Note-taking is coming soon</p>
      <p className="mt-1 max-w-sm text-body text-neutral-300">
        You&rsquo;ll be able to jot down and revisit your own notes for this lesson here.
      </p>
    </div>
  );
}
