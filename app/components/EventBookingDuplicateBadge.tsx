import {
  getEventBookingDuplicateBadgeClass,
  getEventBookingDuplicateLabel,
  type EventBookingDuplicateStatus,
} from "@/lib/bookingRequests";

export default function EventBookingDuplicateBadge({
  status,
}: {
  status: EventBookingDuplicateStatus;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEventBookingDuplicateBadgeClass(status)}`}
    >
      {getEventBookingDuplicateLabel(status)}
    </span>
  );
}
