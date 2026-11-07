import { formatDateTime } from "@/lib/format";
import type { TimelineEvent } from "@/lib/types";
import { cn } from "@/lib/cn";

const ACTOR: Record<TimelineEvent["actor"], string> = {
  user: "You",
  buyer: "Buyer",
  provider: "Payment provider",
  system: "Bushustlers",
};

const dot = (action: string) => {
  if (action === "payment.confirmed" || action === "payment.resolved" || action.endsWith("delivered") || action === "settlement.settled") return "bg-success";
  if (action.includes("needs_review") || action.includes("flagged") || action.includes("failed")) return "bg-red-dot";
  if (action.includes("processing") || action.includes("awaiting")) return "bg-amber-dot";
  return "bg-subtle";
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {events.map((event, index) => (
        <li key={index} className="relative">
          <span className={cn("absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-paper", dot(event.action))} aria-hidden />
          <p className="text-sm font-medium text-ink">{event.label}</p>
          <p className="text-xs text-muted">
            {formatDateTime(event.createdAt)} · {ACTOR[event.actor]}
            {typeof event.metadata.note === "string" ? ` · “${event.metadata.note}”` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
