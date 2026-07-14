import {
  getEventCancelledBadgeClass,
  getEventDateDisplayBadgeClass,
  getEventDateDisplayLabel,
  isEventCancelled,
  type EventStatus,
} from "@/lib/events";

export default function EventDateStatusBadge({
  eventDate,
  setTime = "",
  status,
  variant = "default",
}: {
  eventDate: string;
  setTime?: string;
  status?: EventStatus;
  variant?: "default" | "compact";
}) {
  const sizeClassName =
    variant === "compact"
      ? "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
      : "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide";

  if (status && isEventCancelled({ status })) {
    return (
      <span className={`${sizeClassName} ${getEventCancelledBadgeClass()}`}>
        Cancelled
      </span>
    );
  }

  const label = getEventDateDisplayLabel(eventDate, setTime);

  if (!label) {
    return null;
  }

  return (
    <span className={`${sizeClassName} ${getEventDateDisplayBadgeClass(label)}`}>
      {label}
    </span>
  );
}
