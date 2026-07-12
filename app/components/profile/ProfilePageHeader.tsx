"use client";

import Link from "next/link";
import { APP_PAGE_INSET_CLASS } from "@/app/components/layout/AppPageLayout";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { resolveProfileBackNavigation } from "@/lib/profileNavigation";
import { PROFILE_SETUP_PATH, SETTINGS_PATH } from "@/lib/user/currentUser";

const profileHeaderIconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text";

export default function ProfilePageHeader({
  isOwnProfile,
  returnTo = null,
}: {
  isOwnProfile: boolean;
  returnTo?: string | null;
}) {
  const guardProfile = useGuardProfile();
  const role = guardProfile?.role ?? readCachedNavRole();
  const { href: backHref, label: backLabel } = resolveProfileBackNavigation(returnTo, role);

  return (
    <header className="sticky top-0 z-10 border-b border-ftc-border-subtle bg-ftc-bg/95 backdrop-blur-md md:top-12">
      <div className={`flex items-center justify-between gap-3 ${APP_PAGE_INSET_CLASS} py-2.5`}>
        <Link
          href={backHref}
          aria-label={backLabel}
          className={profileHeaderIconButtonClass}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        {isOwnProfile ? (
          <div className="flex items-center gap-2">
            <Link
              href={SETTINGS_PATH}
              aria-label="Settings"
              title="Settings"
              className={profileHeaderIconButtonClass}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </Link>
            <Link
              href={PROFILE_SETUP_PATH}
              aria-label="Edit profile"
              title="Edit profile"
              className={profileHeaderIconButtonClass}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-12.5z" />
              </svg>
            </Link>
          </div>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wide text-ftc-text-muted">
            Profile
          </span>
        )}
      </div>
    </header>
  );
}
