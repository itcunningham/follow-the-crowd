"use client";

import { useState } from "react";
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

const OFFER_TYPE_OPTIONS = [
  {
    value: "fixed" as const,
    label: "Fixed offer",
    help: "You set the exact amount. The DJ can accept or decline.",
  },
  {
    value: "open" as const,
    label: "Ask for rate",
    help: "The DJ sends their price before accepting. You can approve it or keep your original offer.",
  },
];

export function formatDjSendOfferSummary(offer: DjSendOffer): string {
  if (offer.rateMode === "open") {
    const digits = normalizeStoredRate(offer.fee);

    return digits
      ? `Ask for rate · suggested ${formatRateDisplay(offer.fee)}`
      : "Ask for rate";
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
  const [openHelp, setOpenHelp] = useState<BookingRateMode | null>(null);

  function handleOfferTypeChange(rateMode: BookingRateMode) {
    setOpenHelp(null);
    onChange({ ...offer, rateMode });
  }

  function toggleHelp(rateMode: BookingRateMode) {
    setOpenHelp((current) => (current === rateMode ? null : rateMode));
  }

  const activeHelp = OFFER_TYPE_OPTIONS.find((option) => option.value === openHelp);

  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      <div className="flex gap-1">
        {OFFER_TYPE_OPTIONS.map((option) => {
          const selected = offer.rateMode === option.value;

          return (
            <div
              key={option.value}
              className={`flex min-w-0 flex-1 items-center gap-1 rounded-lg border px-1.5 py-1 transition ${
                selected
                  ? "border-ftc-primary bg-ftc-bg-elevated"
                  : "border-ftc-border-subtle bg-ftc-surface"
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => handleOfferTypeChange(option.value)}
                className={`min-w-0 flex-1 px-1 py-0.5 text-left text-[11px] font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected ? "text-ftc-text" : "text-ftc-text-muted"
                }`}
              >
                {option.label}
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${option.label} help`}
                aria-expanded={openHelp === option.value}
                onClick={() => toggleHelp(option.value)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ftc-border-subtle bg-ftc-bg text-xs font-semibold text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                ?
              </button>
            </div>
          );
        })}
      </div>

      {activeHelp ? (
        <p className="rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs leading-relaxed text-ftc-text-muted">
          <span className="font-semibold text-ftc-text">{activeHelp.label}. </span>
          {activeHelp.help}
        </p>
      ) : null}

      <BookingRateField
        label={offer.rateMode === "open" ? "Suggested rate (optional)" : "Offer amount"}
        value={offer.fee}
        onChange={(fee) => onChange({ ...offer, fee })}
        required={offer.rateMode === "fixed"}
      />
    </div>
  );
}
