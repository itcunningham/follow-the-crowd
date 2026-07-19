"use client";

import { Suspense, type ReactNode } from "react";
import {
  GigsWorkspaceChromeProvider,
  GigsWorkspaceSecondaryBand,
  GigsWorkspaceSecondaryBandFallback,
} from "@/app/components/bookings/GigsWorkspaceChrome";

function BookingsRouteChromeSuspenseFallback() {
  return <GigsWorkspaceSecondaryBandFallback />;
}

export function BookingsRouteChrome({ children }: { children: ReactNode }) {
  return (
    <GigsWorkspaceChromeProvider>
      <Suspense fallback={<BookingsRouteChromeSuspenseFallback />}>
        <GigsWorkspaceSecondaryBand />
      </Suspense>
      {children}
    </GigsWorkspaceChromeProvider>
  );
}
