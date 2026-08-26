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
  // max-w-full is load-bearing, not cosmetic. The bubble column this sits in
  // is `flex flex-col items-start`, so a child is sized to fit-content and is
  // NOT clamped to the column's width. The booking card inside is
  // `w-full max-w-xs` -- a fixed 20rem/320px -- so without a cap here this
  // wrapper takes 320px inside a ~271px column and pushes the chat's scroll
  // width past the viewport, making the whole conversation pan sideways.
  // It stayed hidden because the incoming row starts at x=64: 64 + 320 = 384,
  // which still fits a 390px viewport and only overflows below it.
  return (
    <div className={`relative max-w-full ${roundedClassName}`}>
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
