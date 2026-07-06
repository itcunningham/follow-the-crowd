"use client";

import { BookingRateField } from "@/app/components/BookingRateField";
import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import type { BookingRateMode } from "@/lib/bookingRequests";

export type DjSendOffer = {
  rateMode: BookingRateMode;
  fee: string;
};

export const DEFAULT_DJ_SEND_OFFER: DjSendOffer = {
  rateMode: "fixed",
  fee: "",
};

export function formatDjSendOfferSummary(offer: DjSendOffer): string {
  if (offer.rateMode === "open") {
    const digits = normalizeStoredRate(offer.fee);

    return digits
      ? `Open to offers · suggested ${formatRateDisplay(offer.fee)}`
      : "Open to offers";
  }

  const digits = normalizeStoredRate(offer.fee);

  return digits ? `Fixed offer · ${formatRateDisplay(offer.fee)}` : "Fixed offer · amount required";
}

type EventDjSendOfferControlsProps = {
  offer: DjSendOffer;
  onChange: (offer: DjSendOffer) => void;
  disabled?: boolean;
};

export default function EventDjSendOfferControls({
  offer,
  onChange,
  disabled = false,
}: EventDjSendOfferControlsProps) {
  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      <div className="flex gap-1">
        {(
          [
            { value: "fixed" as const, label: "Fixed offer" },
            { value: "open" as const, label: "Open to offers" },
          ] as const
        ).map((option) => {
          const selected = offer.rateMode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange({ ...offer, rateMode: option.value })}
              className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-ftc-primary bg-ftc-bg-elevated text-ftc-text"
                  : "border-ftc-border-subtle bg-ftc-surface text-ftc-text-muted hover:border-ftc-border-strong"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <BookingRateField
        label={offer.rateMode === "open" ? "Suggested rate (optional)" : "Offer amount"}
        value={offer.fee}
        onChange={(fee) => onChange({ ...offer, fee })}
        required={offer.rateMode === "fixed"}
      />
    </div>
  );
}
