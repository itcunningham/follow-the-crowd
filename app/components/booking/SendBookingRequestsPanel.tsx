"use client";

import { useCallback, useState } from "react";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import EventBookingDuplicateBadge from "@/app/components/EventBookingDuplicateBadge";
import EventDjSendOfferControls, {
  createDefaultDjSendOffer,
  type DjSendOffer,
} from "@/app/components/booking/EventDjSendOfferControls";
import { PlannerEmptyPanel, PlannerSectionLabel } from "@/app/components/planner/PlannerUi";
import { EVENT_DETAIL_BTN_PRIMARY_WIDE } from "@/app/components/event-detail/eventDetailUi";
import type { SendBookingRequestsDraft } from "@/app/components/booking/useSendBookingRequestsDraft";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import {
  addDjToRosterByUsername,
  removeDjFromRoster,
  ROSTER_SCOPING_ENABLED,
} from "@/lib/plannerDjRoster";
import { getCurrentUserId } from "@/lib/user/currentUser";
import type { EventBookingDuplicateStatus } from "@/lib/bookingRequests";
import type { DjPlannerAvailabilityHint } from "@/lib/djAvailability";

/** Create-event invite DJ search (client-only). */
export const MAX_BOOKING_DJ_SEARCH_QUERY_LENGTH = 30;

/**
 * Shared moderate, non-viewport-height cap for the scrollable DJ results list in the
 * invite-DJs workflow. A taller viewport-scaling height here previously trapped touch-scroll
 * inside the list; this value is the single source of truth so every surface that renders
 * this workflow (this panel, or a duplicated inline implementation) stays in sync.
 */
export const DJ_INVITE_LIST_MAX_HEIGHT_CLASS = "max-h-80 sm:max-h-[420px]";

type SendBookingRequestsPanelProps = {
  draft: SendBookingRequestsDraft;
  disabled?: boolean;
  sending?: boolean;
  showSendButton?: boolean;
  onSend?: () => void;
  introText?: string;
  errorMessage?: string | null;
  embedded?: boolean;
  listMaxHeightClass?: string;
  sendButtonLabelMode?: "send" | "confirm";
};

function InviteDjSearchField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Search name or genre</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ftc-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search name or genre"
        maxLength={MAX_BOOKING_DJ_SEARCH_QUERY_LENGTH}
        className="ftc-input h-11 w-full rounded-full py-0 pl-11 pr-4 text-[15px] placeholder:text-ftc-text-muted"
      />
    </label>
  );
}

/**
 * Exact-username add. Renders only while roster scoping is on, so with the flag
 * off this component is unreachable and the picker is unchanged.
 *
 * There is no result list and no suggestion dropdown on purpose: a planner can
 * only add a DJ whose username they already know, which is what keeps this a
 * private roster rather than a global directory behind a text field.
 */
function AddDjByUsernameField({
  disabled,
  onAdded,
}: {
  disabled: boolean;
  onAdded: () => Promise<void> | void;
}) {
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const handleAdd = useCallback(async () => {
    if (adding || !username.trim()) {
      return;
    }

    setAdding(true);
    setFeedback(null);

    try {
      const plannerId = await getCurrentUserId();
      const result = await addDjToRosterByUsername(plannerId, username);

      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }

      setFailed(false);
      setFeedback(`${result.displayName || "DJ"} added to your roster.`);
      setUsername("");
      await onAdded();
    } catch (addError) {
      console.error("Failed to add DJ to roster:", addError);
      setFailed(true);
      setFeedback("Could not add that DJ. Please try again.");
    } finally {
      setAdding(false);
    }
  }, [adding, username, onAdded]);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Add a DJ by username</span>
          <input
            type="text"
            value={username}
            disabled={disabled || adding}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="Add a DJ by @username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={64}
            className="ftc-input h-11 w-full rounded-full py-0 pl-4 pr-4 text-[15px] placeholder:text-ftc-text-muted"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={disabled || adding || !username.trim()}
          aria-disabled={disabled || adding || !username.trim()}
          className="ftc-btn-primary h-11 shrink-0 rounded-full px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? "Adding" : "Add DJ"}
        </button>
      </div>
      {feedback ? (
        <p
          role="status"
          className={`px-1 text-xs ${failed ? "text-red-400" : "text-ftc-text-muted"}`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Removing a DJ is destructive to the roster but to nothing else, and the
 * confirmation says so explicitly. A planner who fears losing a booking history
 * will not use the control, and a stale roster is worse than an accurate one.
 */
function RemoveDjFromRosterDialog({
  dj,
  loading,
  onCancel,
  onConfirm,
}: {
  dj: { user_id: string; display_name?: string | null } | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!dj) {
    return null;
  }

  const displayName = dj.display_name?.trim() || "this DJ";

  return (
    <BookingSheetDialog
      open
      title={`Remove ${displayName} from your roster?`}
      titleId="remove-dj-from-roster-title"
      description={`${displayName} will no longer appear in Invite DJs. Past bookings and chats won't be affected.`}
      loading={loading}
      overlayClassName="z-[70]"
      onBackdropClick={onCancel}
      footer={
        <>
          <BookingSheetSecondaryButton disabled={loading} onClick={onCancel}>
            Cancel
          </BookingSheetSecondaryButton>
          <BookingSheetDangerButton disabled={loading} onClick={onConfirm}>
            {loading ? "Removing" : "Remove"}
          </BookingSheetDangerButton>
        </>
      }
    />
  );
}

function InviteDjAvatar({
  name,
  avatarUrl,
  selected,
}: {
  name: string;
  avatarUrl?: string | null;
  selected: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <ProfileAvatar name={name} avatarUrl={avatarUrl} size="sm" />
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ftc-surface bg-ftc-primary text-[9px] font-bold leading-none text-ftc-bg"
        >
          ✓
        </span>
      ) : null}
    </div>
  );
}

export type DjInviteSelectionRowDj = {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  genre?: string | null;
};

type DjInviteSelectionRowProps = {
  dj: DjInviteSelectionRowDj;
  selected: boolean;
  disabled?: boolean;
  isDuplicateBlocked?: boolean;
  duplicateStatus?: EventBookingDuplicateStatus;
  availabilityHint?: DjPlannerAvailabilityHint;
  offer: DjSendOffer;
  onToggle: () => void;
  onOfferChange: (offer: DjSendOffer) => void;
  /** Roster mode only. Omitted, no remove control renders and the row is unchanged. */
  onRemove?: () => void;
};

/**
 * Single DJ card in the invite-DJs workflow: avatar with selected checkmark badge, name/genre,
 * compact duplicate/availability badges (an "unknown" availability status is never shown - not
 * useful information), and inline Fixed Offer / Ask for Rate controls when selected. Shared by
 * every surface that renders this workflow (Events Create Event, Event Plans' Use Plan) so they
 * can't visually drift apart again.
 */
export function DjInviteSelectionRow({
  dj,
  selected,
  disabled = false,
  isDuplicateBlocked = false,
  duplicateStatus,
  availabilityHint,
  offer,
  onToggle,
  onOfferChange,
  onRemove,
}: DjInviteSelectionRowProps) {
  const displayName = dj.display_name?.trim() || "DJ";
  const showAvailabilityBadge =
    availabilityHint !== undefined && availabilityHint.status !== "unknown";

  return (
    <li>
      {/* Flex row rather than an X inside the select button: nesting a button
          inside a button is invalid, and a click on the inner one would also
          toggle selection. */}
      <div className="flex items-start gap-1.5">
      <button
        type="button"
        disabled={disabled || isDuplicateBlocked}
        aria-pressed={selected}
        aria-label={`${selected ? "Deselect" : "Select"} ${displayName}`}
        onClick={onToggle}
        className={`ftc-option-card flex w-full min-w-0 flex-1 items-start gap-3 p-2.5 transition duration-150 ease-out disabled:cursor-not-allowed motion-reduce:transition-none ${
          selected
            ? "ftc-option-card-selected bg-[var(--ftc-color-primary-subtle)]"
            : isDuplicateBlocked
              ? "opacity-70"
              : ""
        }`}
      >
        <InviteDjAvatar name={displayName} avatarUrl={dj.avatar_url} selected={selected} />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold leading-snug text-ftc-text">{displayName}</p>
          {dj.genre?.trim() ? (
            <p
              className="mt-0.5 truncate text-xs leading-snug text-ftc-text-muted"
              title={dj.genre.trim()}
            >
              {dj.genre.trim()}
            </p>
          ) : null}
          {duplicateStatus || showAvailabilityBadge ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {duplicateStatus ? (
                <EventBookingDuplicateBadge status={duplicateStatus} variant="compact" />
              ) : null}
              {showAvailabilityBadge ? (
                <DjBookingAvailabilityBadge hint={availabilityHint!} variant="compact" />
              ) : null}
            </div>
          ) : null}
        </div>
      </button>
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Remove ${displayName} from your roster`}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ftc-text-muted transition hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
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
      ) : null}
      </div>
      {selected ? (
        <div className="mt-2 rounded-xl bg-ftc-bg-elevated/70 p-3">
          <EventDjSendOfferControls offer={offer} disabled={disabled} onChange={onOfferChange} />
        </div>
      ) : null}
    </li>
  );
}

export type SendBookingRequestsSummaryItem = {
  djId: string;
  name: string;
  summary: string;
};

/**
 * "Summary" card listing each sendable DJ and their rate summary, plus the invalid-fixed-offer
 * warning. Shared by every surface that renders the invite-DJs workflow (this panel, and Event
 * Plans' Use Plan step in `bookings/page.tsx`) so copy and styling can't drift apart again -
 * they did once, and a copy fix landed here while the other implementation kept the old wording.
 */
export function SendBookingRequestsSummary({
  items,
  hasInvalidFixedOffers,
}: {
  items: readonly SendBookingRequestsSummaryItem[];
  hasInvalidFixedOffers: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-ftc-bg-elevated/70 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Summary
      </p>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li
            key={item.djId}
            className="flex items-start justify-between gap-3 text-sm leading-snug"
          >
            <span className="min-w-0 truncate font-medium text-ftc-text">{item.name}</span>
            <span className="shrink-0 text-right text-ftc-text-secondary">{item.summary}</span>
          </li>
        ))}
      </ul>
      {hasInvalidFixedOffers ? (
        <p className="mt-2.5 text-xs leading-relaxed text-[var(--ftc-color-warning)]">
          Enter a whole-dollar amount for each fixed offer before sending
        </p>
      ) : null}
    </div>
  );
}

/**
 * Send/confirm button label for the invite-DJs workflow. Takes plain counts rather than a
 * `SendBookingRequestsDraft` so surfaces holding their own local selection state (Event Plans'
 * Use Plan step) share this one state machine instead of re-deriving it.
 */
export function resolveSendButtonLabel({
  selectedCount,
  sendableCount,
  sending,
  mode = "confirm",
}: {
  selectedCount: number;
  sendableCount: number;
  sending: boolean;
  mode?: "send" | "confirm";
}): string {
  const isConfirmMode = mode === "confirm";

  if (sending) {
    return isConfirmMode ? "Confirming" : "Sending";
  }

  if (selectedCount === 0) {
    return "No DJs selected";
  }

  if (sendableCount === 0) {
    return isConfirmMode ? "No new DJs to confirm" : "No new DJs to send";
  }

  if (isConfirmMode) {
    return "Send Requests";
  }

  return sendableCount === 1 ? "Send invitation" : `Send ${sendableCount} invitations`;
}

export default function SendBookingRequestsPanel({
  draft,
  disabled = false,
  sending = false,
  showSendButton = false,
  onSend,
  introText,
  errorMessage = null,
  embedded = false,
  listMaxHeightClass = "max-h-80",
  sendButtonLabelMode = "confirm",
}: SendBookingRequestsPanelProps) {
  const sendableCount = draft.sendableSelectedDjIds.length;
  const sendButtonLabel = resolveSendButtonLabel({
    selectedCount: draft.selectedDjIds.length,
    sendableCount,
    sending,
    mode: sendButtonLabelMode,
  });
  const trimmedError = errorMessage?.trim() || null;

  const [djPendingRemoval, setDjPendingRemoval] = useState<DjInviteSelectionRowDj | null>(
    null,
  );
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

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
        // The DJ stays visible. Hiding a row whose delete failed would tell the
        // planner the roster changed when it did not.
        setRemoveError(result.message);
        return;
      }

      setDjPendingRemoval(null);
      await draft.reloadDjs();
    } catch (error) {
      console.error("Failed to remove DJ from roster:", error);
      setRemoveError("Could not remove that DJ. Please try again.");
    } finally {
      setRemoving(false);
    }
  }, [djPendingRemoval, removing, draft]);

  return (
    <div className={embedded ? "space-y-4 border-t border-ftc-border-subtle pt-4" : "space-y-4"}>
      {embedded ? (
        <div>
          <PlannerSectionLabel>Invite DJs (optional)</PlannerSectionLabel>
          <p className="mt-1 text-sm text-ftc-text-muted">
            {introText ??
              "Select DJs you'd like to invite after this event is created"}
          </p>
        </div>
      ) : introText ? (
        <p className="text-sm leading-relaxed text-ftc-text-secondary">{introText}</p>
      ) : null}

      {ROSTER_SCOPING_ENABLED ? (
        <AddDjByUsernameField
          disabled={disabled || sending}
          onAdded={draft.reloadDjs}
        />
      ) : null}

      <InviteDjSearchField
        value={draft.searchQuery}
        disabled={disabled || sending}
        onChange={draft.setSearchQuery}
      />

      {draft.loadingDjs ? (
        <p className="text-sm text-ftc-text-muted">Loading DJs</p>
      ) : ROSTER_SCOPING_ENABLED && draft.djs.length === 0 ? (
        // An empty roster and a search that matched nothing are different
        // problems, and showing "No available DJs" for the first is a dead end.
        // This branch is the only one that tells the planner what to do next.
        <PlannerEmptyPanel message="Your DJ roster is empty. Add a DJ by their FTC username to start sending bookings." />
      ) : draft.filteredDjs.length === 0 ? (
        <PlannerEmptyPanel message="No available DJs to invite" />
      ) : (
        <ul className={`${listMaxHeightClass} space-y-2.5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y`}>
          {draft.filteredDjs.map((dj) => {
            const selected = draft.selectedDjIds.includes(dj.user_id);
            const availabilityHint = draft.djAvailabilityHints.get(dj.user_id);
            const duplicateStatus = draft.eventBookingDuplicates.get(dj.user_id);
            const offer = draft.djOffers[dj.user_id] ?? createDefaultDjSendOffer();

            return (
              <DjInviteSelectionRow
                key={dj.user_id}
                dj={dj}
                selected={selected}
                disabled={disabled || sending}
                isDuplicateBlocked={Boolean(duplicateStatus)}
                duplicateStatus={duplicateStatus}
                availabilityHint={availabilityHint}
                offer={offer}
                onToggle={() => draft.toggleDjSelection(dj.user_id)}
                onOfferChange={(nextOffer) => draft.updateDjOffer(dj.user_id, nextOffer)}
                onRemove={
                  ROSTER_SCOPING_ENABLED
                    ? () => {
                        setRemoveError(null);
                        setDjPendingRemoval(dj);
                      }
                    : undefined
                }
              />
            );
          })}
        </ul>
      )}

      {draft.allSelectedAreDuplicates ? (
        <p className="text-xs leading-relaxed text-ftc-text-muted">
          Selected DJs already have a request for this event.
        </p>
      ) : null}

      <SendBookingRequestsSummary
        items={draft.sendOfferSummary}
        hasInvalidFixedOffers={draft.hasInvalidFixedOffers}
      />

      {trimmedError ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--ftc-color-danger)]/40 bg-[var(--ftc-color-danger)]/10 px-3.5 py-3 text-sm leading-relaxed text-[var(--ftc-color-danger)]"
        >
          {trimmedError}
        </p>
      ) : null}

      {showSendButton ? (
        <button
          type="button"
          onClick={onSend}
          disabled={
            disabled ||
            sending ||
            sendableCount === 0 ||
            draft.hasInvalidFixedOffers
          }
          className={EVENT_DETAIL_BTN_PRIMARY_WIDE}
        >
          {sendButtonLabel}
        </button>
      ) : null}

      {removeError ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--ftc-color-danger)]/40 bg-[var(--ftc-color-danger)]/10 px-3.5 py-3 text-sm leading-relaxed text-[var(--ftc-color-danger)]"
        >
          {removeError}
        </p>
      ) : null}

      <RemoveDjFromRosterDialog
        dj={djPendingRemoval}
        loading={removing}
        onCancel={() => {
          // Cancel closes and does nothing else. No delete is issued.
          setDjPendingRemoval(null);
          setRemoveError(null);
        }}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
