"use client";

import { useState } from "react";
import { BookingRateField } from "@/app/components/BookingRateField";
import {
  InlineOptionHelpButton,
  InlineOptionHelpPanel,
} from "@/app/components/booking/InlineOptionHelp";
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

export function createDefaultDjSendOffer(): DjSendOffer {
  return { rateMode: "fixed", fee: "" };
}

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
                  : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong hover:bg-ftc-bg-elevated focus-within:border-ftc-border-strong focus-within:bg-ftc-bg-elevated active:bg-ftc-bg-surface-raised"
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => handleOfferTypeChange(option.value)}
                className={`min-w-0 flex-1 rounded-md px-1 py-0.5 text-left text-[11px] font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected ? "text-ftc-text" : "text-ftc-text-muted hover:text-ftc-text-secondary"
                }`}
              >
                {option.label}
              </button>
              <InlineOptionHelpButton
                label={option.label}
                open={openHelp === option.value}
                onToggle={() => toggleHelp(option.value)}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>

      {activeHelp ? (
        <InlineOptionHelpPanel label={activeHelp.label} help={activeHelp.help} />
      ) : null}

      <BookingRateField
        label={offer.rateMode === "open" ? "Optional" : ""}
        value={offer.fee}
        onChange={(fee) => onChange({ ...offer, fee })}
        required={offer.rateMode === "fixed"}
      />
    </div>
  );
}
