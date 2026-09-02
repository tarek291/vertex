"use client";

import { Loader2, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Select } from "@/components/ui/Input";
import { analytics } from "@/lib/analytics/client";
import type {
  SearchResponse,
  SearchResult,
  SearchSort,
} from "@/lib/search/contract";
import { ResultCard } from "./ResultCard";

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "course", label: "Course A–Z" },
  { value: "duration", label: "Shortest first" },
];

type Status = "idle" | "loading" | "error" | "done";

function sortResults(results: SearchResult[], sort: SearchSort): SearchResult[] {
  if (sort === "relevance") return results;
  const copy = [...results];
  if (sort === "course") {
    copy.sort(
      (a, b) =>
        a.courseTitle.localeCompare(b.courseTitle) ||
        (a.lessonLabel ?? "").localeCompare(b.lessonLabel ?? "", undefined, {
          numeric: true,
        }),
    );
  } else {
    // Shortest first; unknown durations sink to the bottom.
    const key = (r: SearchResult) =>
      r.kind === "lesson" && r.durationSeconds != null
        ? r.durationSeconds
        : Number.POSITIVE_INFINITY;
    copy.sort((a, b) => key(a) - key(b));
  }
  return copy;
}

function buildUrl(query: string, sort: SearchSort): string {
  const params = new URLSearchParams({ q: query });
  if (sort !== "relevance") params.set("sort", sort);
  return `/search?${params.toString()}`;
}

export function SearchExperience({
  initialQuery = "",
  initialSort = "relevance",
}: {
  initialQuery?: string;
  initialSort?: SearchSort;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [input, setInput] = useState(initialQuery);
  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SearchSort>(initialSort);
  const [status, setStatus] = useState<Status>(
    initialQuery ? "loading" : "idle",
  );
  const [data, setData] = useState<SearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runSearch = useCallback((query: string, nextSort: SearchSort) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorMsg(null);
    setCommittedQuery(query);
    const startedAt = performance.now();

    fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, sort: nextSort }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Search failed.");
        return json as SearchResponse;
      })
      .then((json) => {
        setData(json);
        setStatus("done");
        analytics.searchPerformed({
          query,
          result_count: json.resultCount,
          course_count: json.courseCount,
          sort: nextSort,
          duration_ms: Math.round(performance.now() - startedAt),
          had_results: json.resultCount > 0,
        });
        if (json.resultCount === 0) analytics.searchNoResults({ query });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorMsg(
          error instanceof Error ? error.message : "Something went wrong.",
        );
        setStatus("error");
      });
  }, []);

  // Initial query from the URL — kick the fetch off after mount so the effect
  // body itself stays free of synchronous setState.
  useEffect(() => {
    if (!initialQuery) return;
    const id = setTimeout(() => runSearch(initialQuery, initialSort), 0);
    return () => clearTimeout(id);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⌘K / Ctrl+K focuses the field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || q === committedQuery) return;
    router.replace(buildUrl(q, sort), { scroll: false });
    runSearch(q, sort);
  };

  const onSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as SearchSort;
    setSort(next);
    if (committedQuery) {
      router.replace(buildUrl(committedQuery, next), { scroll: false });
      analytics.searchResultsSorted({ query: committedQuery, sort: next });
    }
  };

  const visibleResults = useMemo(
    () => (data ? sortResults(data.results, sort) : []),
    [data, sort],
  );

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-10 sm:px-8">
      <form onSubmit={submit} className="relative mx-auto max-w-3xl">
        <Search
          size={20}
          strokeWidth={2}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-primary-400"
        />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your learning…"
          aria-label="Search your learning"
          className="h-14 w-full rounded-lg border border-primary-500/70 bg-neutral-800/60 pl-14 pr-20 text-body-lg text-neutral-0 placeholder:text-neutral-300 outline-none focus:border-primary-500"
        />
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-neutral-600 px-2 py-1 text-small text-neutral-300 sm:block">
          ⌘K
        </kbd>
      </form>

      {status === "loading" && (
        <div className="mt-10">
          <div className="flex items-center gap-2 text-body text-neutral-300">
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            Searching…
          </div>
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-neutral-700 bg-neutral-800/40"
              />
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-10 rounded-xl border border-neutral-700 bg-neutral-800/40 p-6 text-center">
          <p className="text-body text-neutral-200">{errorMsg}</p>
          <button
            type="button"
            onClick={() => committedQuery && runSearch(committedQuery, sort)}
            className="mt-4 rounded-md bg-primary-500 px-4 py-2 text-body font-medium text-neutral-900 hover:bg-primary-400"
          >
            Try again
          </button>
        </div>
      )}

      {status === "done" && data && data.resultCount === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <SearchX size={28} strokeWidth={2} className="text-neutral-400" />
          <p className="mt-4 text-h3 text-neutral-100">No results found</p>
          <p className="mt-2 text-body text-neutral-300">
            Nothing matched “{committedQuery}”.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-flex items-center rounded-md border border-neutral-500 px-4 py-2 text-body text-neutral-100 hover:border-primary-500 hover:text-primary-300"
          >
            Browse the full catalog
          </Link>
        </div>
      )}

      {status === "done" && data && data.resultCount > 0 && (
        <>
          <div className="mt-10 flex items-center justify-between gap-4">
            <p className="text-body-lg text-neutral-200">
              {data.resultCount} {data.resultCount === 1 ? "result" : "results"}
            </p>
            <div className="w-52">
              <Select
                value={sort}
                onChange={onSortChange}
                aria-label="Sort results"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {visibleResults.map((result, i) => (
              <ResultCard
                key={`${result.lessonId}-${result.kind}`}
                result={result}
                position={i + 1}
                query={committedQuery}
                sort={sort}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
