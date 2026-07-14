import { getFtcStatusBadgeSizeClass } from "@/lib/design/ftcStatusBadge";
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
  const sizeClassName = getFtcStatusBadgeSizeClass(variant);

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
