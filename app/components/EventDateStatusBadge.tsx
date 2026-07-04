import {
  getEventDateDisplayBadgeClass,
  getEventDateDisplayLabel,
} from "@/lib/events";

export default function EventDateStatusBadge({ eventDate }: { eventDate: string }) {
  const label = getEventDateDisplayLabel(eventDate);

  if (!label) {
    return null;
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getEventDateDisplayBadgeClass(label)}`}
    >
      {label}
    </span>
  );
}
