import {
  getDjPlannerAvailabilityBadgeClass,
  type DjPlannerAvailabilityHint,
} from "@/lib/djAvailability";

export default function DjBookingAvailabilityBadge({
  hint,
}: {
  hint: DjPlannerAvailabilityHint;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getDjPlannerAvailabilityBadgeClass(hint.status)}`}
    >
      {hint.label}
    </span>
  );
}
