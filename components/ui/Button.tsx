import { ExternalLink } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  externalLink?: boolean;
  size?: "md" | "lg";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-500 text-neutral-900 hover:bg-primary-400 disabled:hover:bg-primary-500",
  secondary:
    "bg-transparent text-neutral-0 border border-neutral-500 hover:border-neutral-300 disabled:hover:border-neutral-500",
  tertiary:
    "bg-transparent text-neutral-0 hover:text-primary-300 disabled:hover:text-neutral-0",
  text: "bg-transparent text-primary-300 hover:text-primary-200 disabled:hover:text-primary-300",
};

export function Button({
  variant = "primary",
  icon,
  externalLink,
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const height = size === "lg" ? "h-12 px-6" : "h-12 px-4";
  return (
    <button
      className={`${base} ${variants[variant]} ${height} ${className}`}
      {...props}
    >
      {children}
      {icon}
      {externalLink && <ExternalLink size={14} strokeWidth={2} />}
    </button>
  );
}
