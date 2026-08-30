import { ChevronLeft, ChevronRight, Triangle } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="flex items-center gap-8 border-b border-neutral-600 px-8 py-4">
      <div className="flex items-center gap-2">
        <Triangle
          size={18}
          strokeWidth={0}
          fill="currentColor"
          className="text-primary-500"
        />
        <span className="text-h3 font-display">Vertex</span>
      </div>
      <Link href="#" className="text-body text-neutral-100 hover:text-primary-300">
        Courses
      </Link>
      <Link href="#" className="text-body text-neutral-100 hover:text-primary-300">
        My Learning
      </Link>
    </nav>
  );
}

export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-2 text-small text-neutral-300">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-2">
          {i > 0 && <ChevronRight size={12} strokeWidth={2} />}
          <span
            className={i === items.length - 1 ? "text-neutral-0" : ""}
          >
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Pagination({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pages: (number | "...")[] = [1, 2, 3, "...", total];
  return (
    <div className="flex items-center gap-2">
      <button
        className="flex h-9 w-9 items-center justify-center rounded-sm text-neutral-300 hover:text-neutral-0 disabled:opacity-40"
        disabled={current === 1}
      >
        <ChevronLeft size={16} strokeWidth={2} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-neutral-300">
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`flex h-9 w-9 items-center justify-center rounded-sm text-sm ${
              p === current
                ? "border border-primary-500 text-primary-300"
                : "text-neutral-200 hover:text-neutral-0"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        className="flex h-9 w-9 items-center justify-center rounded-sm text-neutral-300 hover:text-neutral-0 disabled:opacity-40"
        disabled={current === total}
      >
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
