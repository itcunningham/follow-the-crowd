"use client";

import Link from "next/link";
import { type UserProfile } from "@/lib/user/currentUser";

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

function ListThumbnail({ user }: { user: UserProfile }) {
  const displayName = user.display_name ?? "Unknown";

  if (user.avatar_url?.trim()) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-ftc-bg-elevated text-sm font-bold uppercase tracking-wide text-ftc-primary">
      {getInitials(displayName)}
    </div>
  );
}

export default function DiscoverProfileListRow({ user }: { user: UserProfile }) {
  const displayName = user.display_name ?? "Unknown";
  const venueLine = user.location?.trim() || "Melbourne, VIC";
  const dateLine = user.genre?.trim() || "In the scene";

  return (
    <li>
      <Link
        href={`/profile/${user.user_id}`}
        className="flex items-center gap-3 rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-3 transition hover:border-ftc-border-strong"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ftc-bg-elevated">
          <ListThumbnail user={user} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-ftc-text">{displayName}</p>
          <p className="mt-0.5 truncate text-sm text-ftc-text-secondary">{venueLine}</p>
          <p className="truncate text-sm text-ftc-text-muted">{dateLine}</p>
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-ftc-text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
