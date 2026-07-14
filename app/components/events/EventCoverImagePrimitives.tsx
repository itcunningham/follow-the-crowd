"use client";

import type { ReactNode } from "react";

/** Shared sizing for event cover images; pair with a fit class (`object-cover` or `object-contain`). */
export const EVENT_COVER_IMAGE_MEDIA_CLASS = "h-full w-full object-center";

export type EventCoverImageFit = "cover" | "contain";

const EVENT_COVER_IMAGE_FIT_CLASS: Record<EventCoverImageFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
};

export function EventCoverImageMedia({
  src,
  alt,
  fit = "cover",
}: {
  src: string;
  alt: string;
  fit?: EventCoverImageFit;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${EVENT_COVER_IMAGE_MEDIA_CLASS} ${EVENT_COVER_IMAGE_FIT_CLASS[fit]}`}
      decoding="async"
    />
  );
}

export function EventCoverImageFrame({
  variant = "hero",
  children,
  className = "",
}: {
  variant?: "hero" | "edit" | "thumb";
  children: ReactNode;
  className?: string;
}) {
  const variantClass =
    variant === "hero"
      ? "ftc-event-image-frame--hero"
      : variant === "edit"
        ? "ftc-event-image-frame--edit"
        : "ftc-event-image-frame--thumb";

  return <div className={`ftc-event-image-frame ${variantClass} ${className}`.trim()}>{children}</div>;
}

export function EventCoverImageHeroPreview({
  src,
  alt,
  variant = "hero",
  fit = "cover",
  badge,
}: {
  src: string;
  alt: string;
  variant?: "hero" | "edit";
  fit?: EventCoverImageFit;
  badge?: ReactNode;
}) {
  return (
    <EventCoverImageFrame variant={variant} className={badge ? "relative" : undefined}>
      <EventCoverImageMedia src={src} alt={alt} fit={fit} />
      {badge ? <div className="absolute bottom-3 left-3 z-10">{badge}</div> : null}
    </EventCoverImageFrame>
  );
}
