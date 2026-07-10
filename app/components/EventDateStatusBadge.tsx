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
}: {
  eventDate: string;
  setTime?: string;
  status?: EventStatus;
}) {
  if (status && isEventCancelled({ status })) {
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getEventCancelledBadgeClass()}`}
      >
        Cancelled
      </span>
    );
  }

  const label = getEventDateDisplayLabel(eventDate, setTime);

  if (!label) {
    return null;
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getEventDateDisplayBadgeClass(label)}`}
    >
      {label}
    </span>
  );
}
