import { ChevronDown, Search } from "lucide-react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search
        size={18}
        strokeWidth={2}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300"
      />
      <input
        className={`h-12 w-full rounded-md border border-neutral-500 bg-neutral-800 pl-11 pr-4 text-sm text-neutral-0 placeholder:text-neutral-300 outline-none focus:border-primary-500 ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`h-12 w-full appearance-none rounded-md border border-neutral-500 bg-neutral-800 pl-4 pr-10 text-sm text-neutral-0 outline-none focus:border-primary-500 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={2}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300"
      />
    </div>
  );
}
