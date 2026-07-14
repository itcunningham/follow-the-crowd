"use client";

import type { ReactNode } from "react";

export default function EventDetailHeroImage({
  src,
  alt,
  badge,
}: {
  src: string;
  alt: string;
  badge?: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex w-full flex-col items-center">
      <div className="ftc-event-detail-flyer-hero mx-auto max-w-full">
        <img src={src} alt={alt} decoding="async" className="ftc-event-detail-flyer-hero__image" />
      </div>
      {badge ? (
        <div className="relative z-10 -mt-3 flex justify-center px-2 sm:-mt-3.5">{badge}</div>
      ) : null}
    </div>
  );
}
