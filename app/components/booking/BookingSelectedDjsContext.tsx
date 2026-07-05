"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import type { UserProfile } from "@/lib/user/currentUser";

export default function BookingSelectedDjsContext({
  selectedDjs,
}: {
  selectedDjs: UserProfile[];
}) {
  const djNames = selectedDjs
    .map((dj) => dj.display_name?.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Sending to {selectedDjs.length} DJ{selectedDjs.length === 1 ? "" : "s"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {selectedDjs.slice(0, 4).map((dj) => (
          <ProfileAvatar
            key={dj.user_id}
            name={dj.display_name ?? "DJ"}
            avatarUrl={dj.avatar_url}
            size="sm"
          />
        ))}
        {selectedDjs.length > 4 ? (
          <span className="rounded-full border border-ftc-border-subtle bg-ftc-surface px-2 py-1 text-[10px] font-semibold text-ftc-text-muted">
            +{selectedDjs.length - 4}
          </span>
        ) : null}
      </div>
      {djNames ? (
        <p className="mt-2 text-sm text-ftc-text-secondary">{djNames}</p>
      ) : null}
      <p className="mt-2 text-xs text-ftc-text-muted">
        Each DJ receives a separate private message.
      </p>
    </div>
  );
}
