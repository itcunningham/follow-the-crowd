"use client";

import {
  formatBookingStatusLabel,
  getBookingStatusBadgeClass,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";

export default function BookingStatusBadge({ status }: { status: BookingRequestStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getBookingStatusBadgeClass(status)}`}
    >
      {formatBookingStatusLabel(status)}
    </span>
  );
}
