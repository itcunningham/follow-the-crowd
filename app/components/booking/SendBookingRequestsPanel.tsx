"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import EventBookingDuplicateBadge from "@/app/components/EventBookingDuplicateBadge";
import EventDjSendOfferControls from "@/app/components/booking/EventDjSendOfferControls";
import { PlannerEmptyPanel, PlannerSectionLabel } from "@/app/components/planner/PlannerUi";
import { EVENT_DETAIL_BTN_PRIMARY_WIDE } from "@/app/components/event-detail/eventDetailUi";
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
      <span className="sr-only">Search DJs by name or genre</span>
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
        placeholder="Search DJs by name or genre"
        className="ftc-input h-11 w-full rounded-full py-0 pl-11 pr-4 text-[15px] placeholder:text-ftc-text-muted"
      />
    </label>
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

function resolveSendButtonLabel(
  draft: SendBookingRequestsDraft,
  sending: boolean,
  sendButtonLabelMode: "send" | "confirm",
): string {
  const selectedCount = draft.selectedDjIds.length;
  const sendableCount = draft.sendableSelectedDjIds.length;
  const isConfirmMode = sendButtonLabelMode === "confirm";

  if (sending) {
    return isConfirmMode ? "Confirming..." : "Sending...";
  }

  if (selectedCount === 0) {
    return "No DJs selected";
  }

  if (sendableCount === 0) {
    return isConfirmMode ? "No new DJs to confirm" : "No new DJs to send";
  }

  if (isConfirmMode) {
    return `Confirm ${sendableCount} DJ${sendableCount === 1 ? "" : "s"}`;
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
  embedded = false,
  listMaxHeightClass = "max-h-80",
  sendButtonLabelMode = "confirm",
}: SendBookingRequestsPanelProps) {
  const sendableCount = draft.sendableSelectedDjIds.length;
  const sendButtonLabel = resolveSendButtonLabel(draft, sending, sendButtonLabelMode);

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
        <p className="text-sm leading-relaxed text-ftc-text-secondary">{introText}</p>
      ) : null}

      <InviteDjSearchField
        value={draft.searchQuery}
        disabled={disabled || sending}
        onChange={draft.setSearchQuery}
      />

      {draft.loadingDjs ? (
        <p className="text-sm text-ftc-text-muted">Loading DJs...</p>
      ) : draft.filteredDjs.length === 0 ? (
        <PlannerEmptyPanel message="No available DJs to invite." />
      ) : (
        <ul className={`${listMaxHeightClass} space-y-2.5 overflow-y-auto`}>
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
                  aria-pressed={selected}
                  aria-label={`${selected ? "Deselect" : "Select"} ${displayName}`}
                  onClick={() => draft.toggleDjSelection(dj.user_id)}
                  className={`ftc-option-card flex w-full items-start gap-3 p-2.5 transition duration-150 ease-out disabled:cursor-not-allowed motion-reduce:transition-none ${
                    selected
                      ? "ftc-option-card-selected bg-[var(--ftc-color-primary-subtle)]"
                      : isDuplicateBlocked
                        ? "opacity-70"
                        : ""
                  }`}
                >
                  <InviteDjAvatar
                    name={displayName}
                    avatarUrl={dj.avatar_url}
                    selected={selected}
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold leading-snug text-ftc-text">{displayName}</p>
                    {dj.genre?.trim() ? (
                      <p className="mt-0.5 text-xs leading-snug text-ftc-text-muted">
                        {dj.genre}
                      </p>
                    ) : null}
                    {duplicateStatus || availabilityHint ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {duplicateStatus ? (
                          <EventBookingDuplicateBadge status={duplicateStatus} variant="compact" />
                        ) : null}
                        {availabilityHint ? (
                          <DjBookingAvailabilityBadge hint={availabilityHint} variant="compact" />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
                {selected ? (
                  <div className="mt-2 rounded-xl bg-ftc-bg-elevated/70 p-3">
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
        <p className="text-xs leading-relaxed text-ftc-text-muted">
          Selected DJs already have a request for this event.
        </p>
      ) : null}

      {draft.sendOfferSummary.length > 0 ? (
        <div className="rounded-xl bg-ftc-bg-elevated/70 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
            Send summary
          </p>
          <ul className="mt-2.5 space-y-2">
            {draft.sendOfferSummary.map((item) => (
              <li
                key={item.djId}
                className="flex items-start justify-between gap-3 text-sm leading-snug"
              >
                <span className="min-w-0 truncate font-medium text-ftc-text">{item.name}</span>
                <span className="shrink-0 text-right text-ftc-text-secondary">
                  {item.summary}
                </span>
              </li>
            ))}
          </ul>
          {draft.hasInvalidFixedOffers ? (
            <p className="mt-2.5 text-xs leading-relaxed text-[var(--ftc-color-warning)]">
              Enter a whole-dollar amount for each fixed offer before sending
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
            sendableCount === 0 ||
            draft.hasInvalidFixedOffers
          }
          className={EVENT_DETAIL_BTN_PRIMARY_WIDE}
        >
          {sendButtonLabel}
        </button>
      ) : null}
    </div>
  );
}
