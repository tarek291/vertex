import { BarChart2, Clock, ExternalLink, FileText, PlayCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./Badge";

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-500 bg-neutral-800 p-4 shadow-sm">
      {children}
    </div>
  );
}

export function CourseCard({
  icon,
  title,
  description,
  level,
  duration,
  modules,
  highlighted = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-neutral-800/50 p-6 shadow-sm ${
        highlighted
          ? "border-primary-500/50 ring-1 ring-primary-500/30"
          : "border-neutral-600"
      }`}
    >
      {icon}
      <h3 className="text-h2 font-display mt-5">{title}</h3>
      <p className="text-body text-neutral-200 mt-2">{description}</p>
      <div className="mt-6 border-t border-neutral-600 pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-neutral-300">
          <span className="inline-flex items-center gap-1.5">
            <BarChart2 size={14} strokeWidth={2} className="text-primary-300" />
            {level}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} strokeWidth={2} className="text-primary-300" />
            {duration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} strokeWidth={2} className="text-primary-300" />
            {modules}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LessonVideoCard({
  title,
  description,
  lessonMeta,
  watchLabel,
}: {
  title: string;
  description: string;
  lessonMeta: string;
  watchLabel: string;
}) {
  return (
    <CardShell>
      <Badge variant="video">Video</Badge>
      <h3 className="text-h3 mt-3">{title}</h3>
      <p className="text-body text-neutral-200 mt-1">{description}</p>
      <div className="mt-4 flex items-center justify-between text-small text-neutral-300">
        <span>{lessonMeta}</span>
        <span className="inline-flex items-center gap-1 text-primary-300">
          <PlayCircle size={14} strokeWidth={2} />
          {watchLabel}
        </span>
      </div>
    </CardShell>
  );
}

export function LessonCard({
  title,
  description,
  moduleMeta,
}: {
  title: string;
  description: string;
  moduleMeta: string;
}) {
  return (
    <CardShell>
      <Badge variant="lesson">Lesson</Badge>
      <h3 className="text-h3 mt-3">{title}</h3>
      <p className="text-body text-neutral-200 mt-1">{description}</p>
      <div className="mt-4 flex items-center justify-between text-small text-neutral-300">
        <span>{moduleMeta}</span>
        <a
          href="#"
          className="inline-flex items-center gap-1 text-primary-300 hover:text-primary-200"
        >
          View lesson
          <ExternalLink size={12} strokeWidth={2} />
        </a>
      </div>
    </CardShell>
  );
}

export function ResourceCard({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <CardShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3">{title}</h3>
          <p className="text-body text-neutral-200 mt-1">{description}</p>
          <span className="mt-3 block text-small text-neutral-300">
            {meta}
          </span>
        </div>
        <ExternalLink
          size={18}
          strokeWidth={2}
          className="shrink-0 text-neutral-300"
        />
      </div>
    </CardShell>
  );
}
