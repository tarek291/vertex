import { BarChart2, Clock, ExternalLink, PlayCircle } from "lucide-react";
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
  initial,
  title,
  description,
  level,
  duration,
  modules,
}: {
  initial: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
}) {
  return (
    <CardShell>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-neutral-600 text-h3 font-semibold">
          {initial}
        </div>
        <div className="min-w-0">
          <h3 className="text-h3 truncate">{title}</h3>
          <p className="text-body text-neutral-200 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-small text-neutral-300">
        <span className="inline-flex items-center gap-1">
          <BarChart2 size={14} strokeWidth={2} />
          {level}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={14} strokeWidth={2} />
          {duration}
        </span>
        <span>{modules}</span>
      </div>
    </CardShell>
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
