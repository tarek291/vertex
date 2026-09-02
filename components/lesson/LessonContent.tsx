import type { PortableTextBlock } from "@portabletext/react";
import { CheckCircle2, Lightbulb } from "lucide-react";
import type { LESSON_BY_SLUG_QUERY_RESULT } from "@/sanity.types";
import { PortableTextNotes } from "./PortableTextNotes";
import { ResourceCard } from "./ResourceCard";

type Lesson = NonNullable<LESSON_BY_SLUG_QUERY_RESULT>;

/**
 * The "Lesson Content" tab panel: Overview (Portable Text notes), the
 * "In this lesson you will" key points, an optional Pro Tip, and Resources.
 * Server-rendered and handed to the client tab switcher as a node.
 */
export function LessonContent({
  notes,
  keyPoints,
  proTip,
  resources,
  lessonSlug,
}: {
  notes: Lesson["notes"];
  keyPoints: Lesson["keyPoints"];
  proTip: Lesson["proTip"];
  resources: Lesson["resources"];
  lessonSlug: string;
}) {
  const blocks = (notes ?? []) as PortableTextBlock[];
  const points = keyPoints ?? [];
  const links = (resources ?? []).filter(
    (r): r is NonNullable<Lesson["resources"]>[number] & { url: string } =>
      Boolean(r.url),
  );

  return (
    <div className="pt-8">
      {blocks.length > 0 && (
        <section>
          <h2 className="text-display-2 font-display text-neutral-0">Overview</h2>
          <div className="mt-4">
            <PortableTextNotes value={blocks} />
          </div>
        </section>
      )}

      {points.length > 0 && (
        <section className="mt-12">
          <h2 className="text-h1 font-display text-neutral-0">
            In this lesson you will:
          </h2>
          <ul className="mt-5 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-primary-300"
                />
                <span className="text-body-lg text-neutral-200">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {proTip && (
        <section className="mt-12">
          <div className="rounded-lg border border-primary-500/40 bg-primary-500/5 p-6">
            <div className="flex items-center gap-2 text-primary-300">
              <Lightbulb size={18} strokeWidth={2} />
              <span className="text-h3 font-medium">Pro Tip</span>
            </div>
            <p className="mt-2 text-body-lg text-neutral-200">{proTip}</p>
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section className="mt-12">
          <h2 className="text-display-2 font-display text-neutral-0">Resources</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((resource) => (
              <ResourceCard
                key={resource._key}
                type={resource.type}
                title={resource.title ?? "Resource"}
                description={resource.description}
                url={resource.url}
                lessonSlug={lessonSlug}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
