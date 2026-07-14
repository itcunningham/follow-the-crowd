"use client";

import type { ReactNode } from "react";
import type { BookingFocusPhase } from "@/lib/chatBookingFocusHighlight";

type BookingCardFocusRingProps = {
  phase: BookingFocusPhase;
  roundedClassName?: string;
  children: ReactNode;
};

export default function BookingCardFocusRing({
  phase,
  roundedClassName = "rounded-2xl",
  children,
}: BookingCardFocusRingProps) {
  return (
    <div className={`relative ${roundedClassName}`}>
      {children}
      {phase ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-10 box-border border-2 border-[var(--ftc-color-primary)] transition-opacity duration-1000 ease-out ${roundedClassName} ${
            phase === "active" ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </div>
  );
}
