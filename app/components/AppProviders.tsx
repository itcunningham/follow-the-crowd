"use client";

import { PlannerTitleFeedbackProvider } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import ServiceWorkerProvider from "@/app/components/ServiceWorkerProvider";
import type { ReactNode } from "react";

/** App-wide client providers mounted from the root layout. */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ServiceWorkerProvider>
      <PlannerTitleFeedbackProvider>{children}</PlannerTitleFeedbackProvider>
    </ServiceWorkerProvider>
  );
}
