import {
  getDjPlannerAvailabilityBadgeClass,
  type DjPlannerAvailabilityHint,
} from "@/lib/djAvailability";

export default function DjBookingAvailabilityBadge({
  hint,
  variant = "default",
}: {
  hint: DjPlannerAvailabilityHint;
  variant?: "default" | "compact";
}) {
  const sizeClassName =
    variant === "compact"
      ? "px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
      : "px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full ${sizeClassName} ${getDjPlannerAvailabilityBadgeClass(hint.status)}`}
    >
      {hint.label}
    </span>
  );
}
