"use client";

import Link from "next/link";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { getDefaultRouteForRole, PROFILE_SETUP_PATH, SETTINGS_PATH } from "@/lib/user/currentUser";

export default function ProfilePageHeader({ isOwnProfile }: { isOwnProfile: boolean }) {
  const guardProfile = useGuardProfile();
  const backHref = getDefaultRouteForRole(guardProfile?.role ?? null);
  const backLabel =
    guardProfile?.role === "dj" ? "Back to Messages" : "Back to Home";

  return (
    <header className="sticky top-0 z-10 border-b border-ftc-border-subtle bg-ftc-bg/95 backdrop-blur-md md:top-12">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
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
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
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
              className="rounded-xl border border-ftc-border-subtle bg-ftc-surface px-3 py-2 text-xs font-semibold text-ftc-text transition hover:border-ftc-border-strong"
            >
              Edit profile
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
