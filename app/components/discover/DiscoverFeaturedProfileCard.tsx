"use client";

import Link from "next/link";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { getRoleLabel, type UserProfile } from "@/lib/user/currentUser";

function FeaturedHero({ user }: { user: UserProfile }) {
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
    <div className="flex h-full w-full items-center justify-center bg-ftc-bg-elevated">
      <ProfileAvatar name={displayName} avatarUrl={null} size="xl" className="border-0" />
    </div>
  );
}

export default function DiscoverFeaturedProfileCard({
  user,
  messaging,
  onMessage,
}: {
  user: UserProfile;
  messaging: boolean;
  onMessage: () => void;
}) {
  const displayName = user.display_name ?? "Unknown";
  const genreLabel = user.genre?.trim() || getRoleLabel(user.role);
  const locationLabel = user.location?.trim() || "Melbourne, VIC";

  return (
    <article className="overflow-hidden rounded-2xl border border-ftc-border-subtle bg-ftc-surface">
      <Link href={`/profile/${user.user_id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-ftc-bg-elevated">
          <FeaturedHero user={user} />
          {genreLabel ? (
            <span className="absolute bottom-3 left-3 rounded-full border border-ftc-primary/30 bg-ftc-bg/80 px-2.5 py-1 text-[11px] font-semibold text-ftc-primary backdrop-blur-sm">
              {genreLabel}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-bold leading-tight text-ftc-text">{displayName}</h3>
          <div className="mt-2 space-y-1.5">
            {locationLabel ? (
              <p className="flex items-center gap-2 text-sm text-ftc-text-secondary">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-ftc-text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
                  <circle cx="12" cy="11" r="2.5" />
                </svg>
                <span className="truncate">{locationLabel}</span>
              </p>
            ) : null}
            <p className="text-sm text-ftc-text-secondary">{getRoleLabel(user.role)}</p>
          </div>
        </div>
      </Link>

      <div className="border-t border-ftc-border-subtle px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onMessage}
          disabled={messaging}
          className="ftc-btn-primary w-full px-4 py-2.5 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
        >
          {messaging ? "Opening..." : "Message"}
        </button>
      </div>
    </article>
  );
}
