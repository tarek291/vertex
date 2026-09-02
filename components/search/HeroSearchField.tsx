"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Home-page hero search field. Purely an entry point — it navigates to
 * `/search?q=…`, where the real search experience runs. Styling matches the
 * former static `HeroSearch`.
 */
export function HeroSearchField() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <form onSubmit={submit} className="relative w-full max-w-2xl">
      <Search
        size={20}
        strokeWidth={2}
        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-primary-400"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask anything about your learning…"
        aria-label="Search your learning"
        className="h-14 w-full rounded-lg border border-neutral-600 bg-neutral-800/60 pl-14 pr-20 text-body-lg text-neutral-0 placeholder:text-neutral-300 outline-none focus:border-primary-500"
      />
      <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-neutral-600 px-2 py-1 text-small text-neutral-300 sm:block">
        ⌘K
      </kbd>
    </form>
  );
}
