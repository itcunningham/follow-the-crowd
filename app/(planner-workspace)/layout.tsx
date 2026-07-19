import { PlannerWorkspaceRouteLayout } from "@/app/components/planner/PlannerWorkspaceLayout";

export const dynamic = "force-dynamic";

export default function PlannerWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <PlannerWorkspaceRouteLayout>{children}</PlannerWorkspaceRouteLayout>;
}
