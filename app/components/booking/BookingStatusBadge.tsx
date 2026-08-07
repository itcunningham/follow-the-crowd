"use client";

import {
  formatBookingStatusLabel,
  getBookingStatusBadgeClass,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { getFtcStatusBadgeSizeClass } from "@/lib/design/ftcStatusBadge";

export default function BookingStatusBadge({
  status,
  variant = "default",
}: {
  status: BookingRequestStatus;
  variant?: "default" | "compact";
}) {
  const sizeClassName = getFtcStatusBadgeSizeClass(variant);

  return (
    <span className={`${sizeClassName} ${getBookingStatusBadgeClass(status)}`}>
      {formatBookingStatusLabel(status)}
    </span>
  );
}
