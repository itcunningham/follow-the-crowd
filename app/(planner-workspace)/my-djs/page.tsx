"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { PlannerWorkspacePage } from "@/app/components/planner/PlannerWorkspaceLayout";
import PlannerDjRosterManager from "@/app/components/roster/PlannerDjRosterManager";
import {
  canManageEvents,
  getCurrentUserProfile,
  getDefaultRouteForRole,
  SETTINGS_PATH,
  type UserRole,
} from "@/lib/user/currentUser";

/**
 * The permanent home for roster management.
 *
 * Deliberately not a workspace sub-nav tab. Measured at 390px, a fifth tab
 * pushes the row to 108px of overflow and leaves Calendar clipped by 92px for
 * a dual-role account — an existing tab would effectively disappear to make
 * room for this one. It is reached from the Events header action instead.
 */
export default function MyDjsPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Same guard as booking-plans: hiding the entry point is not access control,
  // so the route refuses a DJ that reaches it by URL.
  useEffect(() => {
    let cancelled = false;

    getCurrentUserProfile()
      .then((profile) => {
        if (cancelled) {
          return;
        }

        const userRole = profile?.role ?? null;
        setRole(userRole);

        if (!canManageEvents(userRole)) {
          router.replace(getDefaultRouteForRole(userRole));
          return;
        }

        setCheckingAccess(false);
      })
      .catch((error) => {
        console.error("Failed to resolve role for My DJs:", error);
        if (!cancelled) {
          setCheckingAccess(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <OnboardingGuard>
      <PlannerWorkspacePage title="My DJs" initialRole={role} includeChrome={false}>
        <div className="space-y-4 pb-6">
          {/* Reached from Settings, not Events — the same back-link treatment
              Settings itself uses, so this reads as a sibling screen rather
              than a child of the Events area. */}
          <Link
            href={SETTINGS_PATH}
            className="inline-block text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-primary"
          >
            ← Settings
          </Link>

          {checkingAccess ? (
            <p className="text-sm text-ftc-text-muted">Loading your DJs</p>
          ) : (
            <PlannerDjRosterManager />
          )}
        </div>
      </PlannerWorkspacePage>
    </OnboardingGuard>
  );
}
