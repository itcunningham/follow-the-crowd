"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import EventBookingDuplicateBadge from "@/app/components/EventBookingDuplicateBadge";
import EventDjSendOfferControls from "@/app/components/booking/EventDjSendOfferControls";
import { PlannerEmptyPanel, PlannerSectionLabel } from "@/app/components/planner/PlannerUi";
import type { SendBookingRequestsDraft } from "@/app/components/booking/useSendBookingRequestsDraft";

type SendBookingRequestsPanelProps = {
  draft: SendBookingRequestsDraft;
  disabled?: boolean;
  sending?: boolean;
  showSendButton?: boolean;
  onSend?: () => void;
  introText?: string;
  embedded?: boolean;
  listMaxHeightClass?: string;
};

export default function SendBookingRequestsPanel({
  draft,
  disabled = false,
  sending = false,
  showSendButton = false,
  onSend,
  introText,
  embedded = false,
  listMaxHeightClass = "max-h-80",
}: SendBookingRequestsPanelProps) {
  const sendButtonLabel = sending
    ? "Sending..."
    : draft.sendableSelectedDjIds.length === 0
      ? "No new DJs to send"
      : `Send to ${draft.sendableSelectedDjIds.length} DJ${draft.sendableSelectedDjIds.length === 1 ? "" : "s"}`;

  return (
    <div className={embedded ? "space-y-4 border-t border-ftc-border-subtle pt-4" : "space-y-4"}>
      {embedded ? (
        <div>
          <PlannerSectionLabel>Invite DJs (optional)</PlannerSectionLabel>
          <p className="mt-1 text-sm text-ftc-text-muted">
            {introText ??
              "Select DJs you'd like to invite after this event is created."}
          </p>
        </div>
      ) : introText ? (
        <p className="text-sm text-ftc-text-secondary">{introText}</p>
      ) : null}

      <input
        type="search"
        value={draft.searchQuery}
        disabled={disabled || sending}
        onChange={(event) => draft.setSearchQuery(event.target.value)}
        placeholder="Search DJs by name or genre"
        className={`ftc-input px-3.5 py-2.5 ${embedded ? "" : "mt-4"}`}
      />

      {draft.loadingDjs ? (
        <p className="text-sm text-ftc-text-muted">Loading DJs...</p>
      ) : draft.filteredDjs.length === 0 ? (
        <PlannerEmptyPanel message="No available DJs to invite." />
      ) : (
        <ul className={`${listMaxHeightClass} space-y-2 overflow-y-auto`}>
          {draft.filteredDjs.map((dj) => {
            const selected = draft.selectedDjIds.includes(dj.user_id);
            const displayName = dj.display_name?.trim() || "DJ";
            const availabilityHint = draft.djAvailabilityHints.get(dj.user_id);
            const duplicateStatus = draft.eventBookingDuplicates.get(dj.user_id);
            const isDuplicateBlocked = Boolean(duplicateStatus);
            const offer = draft.djOffers[dj.user_id] ?? {
              rateMode: "fixed" as const,
              fee: "",
            };

            return (
              <li key={dj.user_id}>
                <button
                  type="button"
                  disabled={disabled || sending || isDuplicateBlocked}
                  onClick={() => draft.toggleDjSelection(dj.user_id)}
                  className={`ftc-option-card flex w-full items-center gap-3 px-3 py-3 disabled:cursor-not-allowed ${
                    selected
                      ? "ftc-option-card-selected"
                      : isDuplicateBlocked
                        ? "opacity-70"
                        : ""
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-0 bg-ftc-primary text-ftc-bg"
                        : "border-ftc-border-subtle bg-ftc-bg-input text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <ProfileAvatar name={displayName} avatarUrl={dj.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ftc-text">{displayName}</p>
                      {duplicateStatus ? (
                        <EventBookingDuplicateBadge status={duplicateStatus} />
                      ) : null}
                      {availabilityHint ? (
                        <DjBookingAvailabilityBadge hint={availabilityHint} />
                      ) : null}
                    </div>
                    {dj.genre?.trim() ? (
                      <p className="text-sm text-ftc-text-muted">{dj.genre}</p>
                    ) : null}
                  </div>
                </button>
                {selected ? (
                  <div className="mt-2 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
                    <EventDjSendOfferControls
                      offer={offer}
                      disabled={disabled || sending}
                      onChange={(nextOffer) => draft.updateDjOffer(dj.user_id, nextOffer)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {draft.allSelectedAreDuplicates ? (
        <p className="text-xs text-ftc-text-muted">
          Selected DJs already have a request for this event.
        </p>
      ) : null}

      {draft.sendOfferSummary.length > 0 ? (
        <div className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
            Send summary
          </p>
          <ul className="mt-3 space-y-2">
            {draft.sendOfferSummary.map((item) => (
              <li
                key={item.djId}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-ftc-text">{item.name}</span>
                <span className="shrink-0 text-right text-ftc-text-secondary">
                  {item.summary}
                </span>
              </li>
            ))}
          </ul>
          {draft.hasInvalidFixedOffers ? (
            <p className="mt-3 text-xs text-[var(--ftc-color-warning)]">
              Enter a positive whole-dollar amount for each fixed offer before sending
            </p>
          ) : null}
        </div>
      ) : null}

      {showSendButton ? (
        <button
          type="button"
          onClick={onSend}
          disabled={
            disabled ||
            sending ||
            draft.sendableSelectedDjIds.length === 0 ||
            draft.hasInvalidFixedOffers
          }
          className="w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendButtonLabel}
        </button>
      ) : null}
    </div>
  );
}
