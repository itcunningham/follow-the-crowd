"use client";

import type { ReactNode } from "react";

/** Shared crop behaviour for every event cover image in FTC. */
export const EVENT_COVER_IMAGE_MEDIA_CLASS = "h-full w-full object-cover object-center";

export function EventCoverImageMedia({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={EVENT_COVER_IMAGE_MEDIA_CLASS}
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
  badge,
}: {
  src: string;
  alt: string;
  variant?: "hero" | "edit";
  badge?: ReactNode;
}) {
  return (
    <EventCoverImageFrame variant={variant} className={badge ? "relative" : undefined}>
      <EventCoverImageMedia src={src} alt={alt} />
      {badge ? <div className="absolute bottom-3 left-3 z-10">{badge}</div> : null}
    </EventCoverImageFrame>
  );
}
