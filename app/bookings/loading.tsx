"use client";

import { useState } from "react";
import { BookingsPageLoadingShell } from "@/app/components/skeleton/Skeleton";
import { isPlannerBookingsCreateChromeActive } from "@/lib/bookings/planDeepLink";

export default function BookingsLoading() {
  const [plannerBookingCreateOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return isPlannerBookingsCreateChromeActive({
      locationSearch: window.location.search,
    });
  });

  return <BookingsPageLoadingShell plannerBookingCreateOpen={plannerBookingCreateOpen} />;
}
