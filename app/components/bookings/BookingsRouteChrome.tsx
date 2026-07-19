"use client";

import { Suspense, type ReactNode } from "react";
import {
  GigsWorkspaceChromeProvider,
  GigsWorkspaceSecondaryBand,
} from "@/app/components/bookings/GigsWorkspaceChrome";

function GigsWorkspaceSecondaryBandFallback() {
  return <GigsWorkspaceSecondaryBand />;
}

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
