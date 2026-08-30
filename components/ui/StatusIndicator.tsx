import { CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";

type Status = "in-progress" | "completed" | "now-playing" | "locked";

const statusMap: Record<
  Status,
  { icon: typeof Clock; label: string; className: string }
> = {
  "in-progress": {
    icon: Clock,
    label: "In Progress",
    className: "text-primary-300",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-green-400",
  },
  "now-playing": {
    icon: PlayCircle,
    label: "Now Playing",
    className: "text-primary-300",
  },
  locked: {
    icon: Lock,
    label: "Locked",
    className: "text-neutral-300",
  },
};

export function StatusIndicator({ status }: { status: Status }) {
  const { icon: Icon, label, className } = statusMap[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <Icon size={16} strokeWidth={2} />
      {label}
    </span>
  );
}
