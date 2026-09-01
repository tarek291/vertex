"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Bell, ChevronLeft, ChevronRight, Triangle } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

export function Navbar() {
  return (
    <nav className="border-b border-neutral-600 px-8 py-4">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Triangle
              size={18}
              strokeWidth={0}
              fill="currentColor"
              className="text-primary-500"
            />
            <span className="text-h3 font-display">Vertex</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              aria-current="page"
              className="text-body text-primary-300"
            >
              Courses
            </Link>
            <Link
              href="#"
              className="text-body text-neutral-200 hover:text-primary-300"
            >
              My Learning
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="text-neutral-200 hover:text-primary-300"
          >
            <Bell size={20} strokeWidth={2} />
          </button>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="text-body text-neutral-200 hover:text-primary-300"
                onClick={() => posthog.capture("sign_in_clicked", { source: "navbar" })}
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-md bg-primary-500 px-4 py-2 text-body font-medium text-neutral-900 hover:bg-primary-400"
                onClick={() => posthog.capture("sign_up_clicked", { source: "navbar" })}
              >
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9 border border-primary-500",
                },
              }}
            />
          </Show>
        </div>
      </div>
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
