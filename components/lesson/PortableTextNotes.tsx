import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";

/**
 * Hand-styled Portable Text renderer for lesson `notes`. The repo has no
 * Tailwind typography plugin, so block styling is explicit and matches the
 * design tokens used elsewhere. No `dangerouslySetInnerHTML`.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="text-body-lg leading-7 text-neutral-200 [&:not(:first-child)]:mt-4">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h3 className="text-h2 font-display mt-10 text-neutral-0">{children}</h3>
    ),
    h3: ({ children }) => (
      <h4 className="text-h3 mt-8 text-neutral-0">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-4 border-l-2 border-primary-500 pl-4 text-body-lg text-neutral-300 italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 pl-6 text-body-lg text-neutral-200 marker:text-primary-300">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 pl-6 text-body-lg text-neutral-200 marker:text-neutral-400">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-7">{children}</li>,
    number: ({ children }) => <li className="leading-7">{children}</li>,
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-neutral-0">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded-xs bg-neutral-700 px-1.5 py-0.5 font-mono text-[0.9em] text-primary-200">
        {children}
      </code>
    ),
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noreferrer"
        className="text-primary-300 underline underline-offset-2 hover:text-primary-200"
      >
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }) => {
      const url: string | undefined = value?.asset?.url;
      if (!url) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={value?.alt || ""}
          className="mt-6 w-full rounded-lg border border-neutral-600"
        />
      );
    },
  },
};

export function PortableTextNotes({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={components} />;
}
