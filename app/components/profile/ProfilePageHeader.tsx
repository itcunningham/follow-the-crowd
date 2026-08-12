"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_PAGE_INSET_CLASS } from "@/app/components/layout/AppPageLayout";
import { PROFILE_SETUP_PATH, SETTINGS_PATH } from "@/lib/user/currentUser";
import HelpBetaSheet from "@/app/components/help/HelpBetaSheet";

const profileHeaderIconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text";

function ProfileBackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-label={label}
      className={`${profileHeaderIconButtonClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary`}
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
  );
}

export default function ProfilePageHeader({
  isOwnProfile,
  backHref,
  backLabel = "Back to chat",
}: {
  isOwnProfile: boolean;
  backHref?: string | null;
  backLabel?: string;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-ftc-border-subtle bg-ftc-bg/95 backdrop-blur-md md:top-12">
        <div className={`flex items-center justify-between gap-3 ${APP_PAGE_INSET_CLASS} py-2.5`}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {backHref ? <ProfileBackButton href={backHref} label={backLabel} /> : null}
            <span className="text-xs font-medium uppercase tracking-wide text-ftc-text-muted">
              Profile
            </span>
          </div>

          {isOwnProfile ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="Help"
                title="Help"
                className={profileHeaderIconButtonClass}
              >
                <span className="flex h-4 w-4 items-center justify-center text-xs font-bold">
                  ?
                </span>
              </button>

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
          ) : backHref ? null : (
            <span className="h-10 w-10 shrink-0" aria-hidden="true" />
          )}
        </div>
      </header>

      <HelpBetaSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
