"use client";

import {
  formatBookingStatusLabel,
  getBookingStatusBadgeClass,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";

export default function BookingStatusBadge({
  status,
  variant = "default",
}: {
  status: BookingRequestStatus;
  variant?: "default" | "compact";
}) {
  const sizeClassName =
    variant === "compact"
      ? "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
      : "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide";

  return (
    <span
      className={`inline-flex shrink-0 ${sizeClassName} ${getBookingStatusBadgeClass(status)}`}
    >
      {formatBookingStatusLabel(status)}
    </span>
  );
}
