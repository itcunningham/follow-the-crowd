"use client";

import {
  formatBookingStatusLabel,
  getBookingStatusBadgeClass,
  getBookingCancelledDmBadgeClass,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { getFtcStatusBadgeSizeClass } from "@/lib/design/ftcStatusBadge";

export default function BookingStatusBadge({
  status,
  variant = "default",
  isDmContext = false,
}: {
  status: BookingRequestStatus;
  variant?: "default" | "compact";
  isDmContext?: boolean;
}) {
  const sizeClassName = getFtcStatusBadgeSizeClass(variant);
  const badgeClass = isDmContext && status === "cancelled"
    ? getBookingCancelledDmBadgeClass()
    : getBookingStatusBadgeClass(status);

  return (
    <span className={`${sizeClassName} ${badgeClass}`}>
      {formatBookingStatusLabel(status)}
    </span>
  );
}
