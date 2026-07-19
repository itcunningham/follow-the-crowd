"use client";

import { Suspense, type ReactNode } from "react";
import {
  GigsWorkspaceChromeProvider,
  GigsWorkspaceSecondaryBand,
  GigsWorkspaceSecondaryBandFallback,
} from "@/app/components/bookings/GigsWorkspaceChrome";

export function BookingsRouteChrome({ children }: { children: ReactNode }) {
  return (
    <GigsWorkspaceChromeProvider>
      <Suspense fallback={<GigsWorkspaceSecondaryBandFallback />}>
        <GigsWorkspaceSecondaryBand />
      </Suspense>
      {children}
    </GigsWorkspaceChromeProvider>
  );
}
