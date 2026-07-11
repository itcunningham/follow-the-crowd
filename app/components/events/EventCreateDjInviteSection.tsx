"use client";

import { useEffect, useMemo, useState } from "react";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { PlannerSectionLabel } from "@/app/components/planner/PlannerUi";
import { filterBookableDjsBySearchQuery } from "@/lib/user/filterBookableDjs";
import { getRoleLabel, listBookableDjs, type UserProfile } from "@/lib/user/currentUser";

type EventCreateDjInviteSectionProps = {
  selectedDjIds: string[];
  onSelectedDjIdsChange: (ids: string[]) => void;
  onBookableDjsLoaded?: (djs: UserProfile[]) => void;
  disabled?: boolean;
};

export default function EventCreateDjInviteSection({
  selectedDjIds,
  onSelectedDjIdsChange,
  onBookableDjsLoaded,
  disabled = false,
}: EventCreateDjInviteSectionProps) {
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [loadingDjs, setLoadingDjs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoadingDjs(true);
    setLoadError(null);

    void listBookableDjs()
      .then((bookableDjs) => {
        if (cancelled) {
          return;
        }

        setDjs(bookableDjs);
        onBookableDjsLoaded?.(bookableDjs);
      })
      .catch((error) => {
        console.error("Failed to load bookable DJs for event create:", error);

        if (!cancelled) {
          setDjs([]);
          setLoadError("Could not load DJs right now.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDjs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onBookableDjsLoaded]);

  const selectedDjIdSet = useMemo(() => new Set(selectedDjIds), [selectedDjIds]);

  const selectedDjs = useMemo(
    () =>
      selectedDjIds
        .map((djId) => djs.find((dj) => dj.user_id === djId))
        .filter((dj): dj is UserProfile => Boolean(dj)),
    [djs, selectedDjIds],
  );

  const filteredAvailableDjs = useMemo(() => {
    const availableDjs = djs.filter((dj) => !selectedDjIdSet.has(dj.user_id));
    return filterBookableDjsBySearchQuery(availableDjs, searchQuery);
  }, [djs, searchQuery, selectedDjIdSet]);

  function addDj(userId: string) {
    if (disabled || selectedDjIdSet.has(userId)) {
      return;
    }

    onSelectedDjIdsChange([...selectedDjIds, userId]);
  }

  function removeDj(userId: string) {
    if (disabled) {
      return;
    }

    onSelectedDjIdsChange(selectedDjIds.filter((id) => id !== userId));
  }

  return (
    <div className="space-y-3 border-t border-ftc-border-subtle pt-4">
      <div>
        <PlannerSectionLabel>Invite DJs (optional)</PlannerSectionLabel>
        <p className="mt-1 text-sm text-ftc-text-muted">
          Select DJs you&apos;d like to invite after this event is created.
        </p>
      </div>

      {selectedDjs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedDjs.map((dj) => {
            const displayName = dj.display_name?.trim() || "DJ";

            return (
              <span
                key={dj.user_id}
                className="inline-flex items-center gap-2 rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated py-1 pl-1 pr-2"
              >
                <ProfileAvatar name={displayName} avatarUrl={dj.avatar_url} size="sm" />
                <span className="max-w-[9rem] truncate text-sm font-medium text-ftc-text">
                  {displayName}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${displayName}`}
                  disabled={disabled}
                  onClick={() => removeDj(dj.user_id)}
                  className="rounded-full px-1 text-sm leading-none text-ftc-text-muted transition hover:text-ftc-text disabled:opacity-50"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
          Search DJs
        </span>
        <input
          type="search"
          value={searchQuery}
          disabled={disabled}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name..."
          className="ftc-input px-3.5 py-2.5"
        />
      </label>

      {loadError ? <p className="text-sm text-ftc-text-muted">{loadError}</p> : null}

      {loadingDjs ? (
        <p className="text-sm text-ftc-text-muted">Loading DJs...</p>
      ) : filteredAvailableDjs.length === 0 ? (
        <p className="text-sm text-ftc-text-muted">
          {searchQuery.trim() ? "No DJs match your search." : "No more DJs to add."}
        </p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {filteredAvailableDjs.map((dj) => {
            const displayName = dj.display_name?.trim() || "DJ";

            return (
              <li key={dj.user_id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => addDj(dj.user_id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-surface px-3 py-2.5 text-left transition hover:border-ftc-border-strong disabled:opacity-50"
                >
                  <ProfileAvatar name={displayName} avatarUrl={dj.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ftc-text">{displayName}</p>
                    <p className="truncate text-xs text-ftc-text-muted">
                      {[dj.genre, dj.location].filter(Boolean).join(" · ") || getRoleLabel(dj.role)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
                    Add
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
