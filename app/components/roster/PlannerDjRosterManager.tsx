"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import { PlannerEmptyPanel, PlannerSectionLabel } from "@/app/components/planner/PlannerUi";
import {
  addDjToRosterByUsername,
  removeDjFromRoster,
} from "@/lib/plannerDjRoster";
import { filterBookableDjsBySearchQuery } from "@/lib/user/filterBookableDjs";
import { getCurrentUserId, listRosterDjs, type UserProfile } from "@/lib/user/currentUser";

/**
 * Roster management, rendered identically on the permanent My DJs page and in
 * the sheet opened from event creation.
 *
 * One component rather than two so the two surfaces cannot drift — the sheet
 * exists only because navigating away from a half-typed event would lose the
 * draft, not because the management UI should differ there.
 */
export default function PlannerDjRosterManager({
  onRosterChanged,
  listMaxHeightClass,
}: {
  /** Fires after any add or remove, so an event draft can refresh its picker. */
  onRosterChanged?: () => void;
  /**
   * Caps the roster list when rendered inside a sheet. BookingSheetDialog scrolls
   * the whole dialog including its footer, so an uncapped list pushes Done out of
   * reach on a phone. The permanent page leaves this unset and flows naturally.
   */
  listMaxHeightClass?: string;
}) {
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [addFailed, setAddFailed] = useState(false);

  const [djPendingRemoval, setDjPendingRemoval] = useState<UserProfile | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    try {
      setDjs(await listRosterDjs());
    } catch (loadError) {
      console.error("Failed to load DJ roster:", loadError);
      setDjs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const filteredDjs = useMemo(
    () => filterBookableDjsBySearchQuery(djs, searchQuery),
    [djs, searchQuery],
  );

  const handleAdd = useCallback(async () => {
    if (adding || !username.trim()) {
      return;
    }

    setAdding(true);
    setAddFeedback(null);

    try {
      const plannerId = await getCurrentUserId();
      const result = await addDjToRosterByUsername(plannerId, username);

      if (!result.ok) {
        setAddFailed(true);
        setAddFeedback(result.message);
        return;
      }

      setAddFailed(false);
      setAddFeedback(`${result.displayName || "DJ"} added to your roster`);
      setUsername("");
      await loadRoster();
      onRosterChanged?.();
    } catch (error) {
      console.error("Failed to add DJ to roster:", error);
      setAddFailed(true);
      setAddFeedback("Could not add that DJ. Please try again.");
    } finally {
      setAdding(false);
    }
  }, [adding, username, loadRoster, onRosterChanged]);

  const handleConfirmRemove = useCallback(async () => {
    if (!djPendingRemoval || removing) {
      return;
    }

    setRemoving(true);
    setRemoveError(null);

    try {
      const plannerId = await getCurrentUserId();
      const result = await removeDjFromRoster(plannerId, djPendingRemoval.user_id);

      if (!result.ok) {
        // The DJ stays listed. Hiding a row whose delete failed would report a
        // change that did not happen.
        setRemoveError(result.message);
        return;
      }

      setDjPendingRemoval(null);
      await loadRoster();
      onRosterChanged?.();
    } catch (error) {
      console.error("Failed to remove DJ from roster:", error);
      setRemoveError("Could not remove that DJ. Please try again.");
    } finally {
      setRemoving(false);
    }
  }, [djPendingRemoval, removing, loadRoster, onRosterChanged]);

  const pendingName = djPendingRemoval?.display_name?.trim() || "this DJ";

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <PlannerSectionLabel>Add DJ</PlannerSectionLabel>
        <div className="flex gap-2">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">DJ username</span>
            <input
              type="text"
              value={username}
              disabled={adding}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAdd();
                }
              }}
              placeholder="DJ username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={64}
              className="ftc-input h-11 w-full rounded-full px-4 py-0 text-[15px] placeholder:text-ftc-text-muted"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || !username.trim()}
            aria-disabled={adding || !username.trim()}
            className="ftc-btn-primary h-11 shrink-0 rounded-full px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "Adding" : "Add DJ"}
          </button>
        </div>
        <p className="px-1 text-xs text-ftc-text-muted">Enter their exact FTC username</p>
        {addFeedback ? (
          <p
            role="status"
            className={`px-1 text-xs ${addFailed ? "text-red-400" : "text-ftc-primary"}`}
          >
            {addFeedback}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <PlannerSectionLabel>Your DJs</PlannerSectionLabel>

        {djs.length > 0 ? (
          <label className="relative block">
            <span className="sr-only">Search DJs</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search DJs"
              className="ftc-input h-11 w-full rounded-full px-4 py-0 text-[15px] placeholder:text-ftc-text-muted"
            />
          </label>
        ) : null}

        {loading ? (
          <p className="text-sm text-ftc-text-muted">Loading your DJs</p>
        ) : djs.length === 0 ? (
          <PlannerEmptyPanel message="Your DJ roster is empty. Add DJs by their FTC username to build your roster" />
        ) : filteredDjs.length === 0 ? (
          <PlannerEmptyPanel message="No DJs match that search" />
        ) : (
          <ul
            className={`space-y-2 ${listMaxHeightClass ?? ""}`.trim()}
          >
            {filteredDjs.map((dj) => {
              const displayName = dj.display_name?.trim() || "DJ";
              return (
                <li key={dj.user_id} className="flex items-center gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-surface p-2.5">
                  <ProfileAvatar name={displayName} avatarUrl={dj.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-snug text-ftc-text">
                      {displayName}
                    </p>
                    {dj.genre?.trim() ? (
                      <p className="mt-0.5 truncate text-xs leading-snug text-ftc-text-muted">
                        {dj.genre.trim()}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveError(null);
                      setDjPendingRemoval(dj);
                    }}
                    aria-label={`Remove ${displayName} from your roster`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ftc-text-muted transition hover:text-ftc-text motion-reduce:transition-none"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-[18px] w-[18px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {removeError ? (
          <p role="alert" className="px-1 text-xs text-red-400">
            {removeError}
          </p>
        ) : null}
      </section>

      {djPendingRemoval ? (
        <BookingSheetDialog
          open
          title={`Remove ${pendingName} from your roster?`}
          titleId="remove-dj-from-roster-title"
          description={`${pendingName} will no longer appear in Invite DJs. Past bookings and chats won't be affected`}
          loading={removing}
          overlayClassName="z-[80]"
          onBackdropClick={() => {
            setDjPendingRemoval(null);
            setRemoveError(null);
          }}
          footer={
            <>
              <BookingSheetSecondaryButton
                disabled={removing}
                onClick={() => {
                  // Cancel closes and does nothing else. No delete is issued.
                  setDjPendingRemoval(null);
                  setRemoveError(null);
                }}
              >
                Cancel
              </BookingSheetSecondaryButton>
              <BookingSheetDangerButton disabled={removing} onClick={handleConfirmRemove}>
                {removing ? "Removing" : "Remove"}
              </BookingSheetDangerButton>
            </>
          }
        />
      ) : null}
    </div>
  );
}
