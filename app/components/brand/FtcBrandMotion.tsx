"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type FtcBrandMotionVariant = "hero" | "ambient" | "splash";

export type FtcBrandMotionProps = {
  variant?: FtcBrandMotionVariant;
  className?: string;
  videoSrc?: string;
  videoType?: "video/webm" | "video/mp4";
  posterSrc?: string;
  posterAlt?: string;
};

const VARIANT_CLASS: Record<FtcBrandMotionVariant, string> = {
  hero: "ftc-brand-motion--hero h-[220px] w-[220px] sm:h-[280px] sm:w-[280px] lg:h-[320px] lg:w-[320px]",
  ambient:
    "ftc-brand-motion--ambient h-[140px] w-[140px] sm:h-[180px] sm:w-[180px] opacity-40 sm:opacity-50",
  splash: "ftc-brand-motion--splash h-[112px] w-[112px] sm:h-[128px] sm:w-[128px]",
};

const DEMO_TILES = [
  { initials: "FTC", label: "Main room", colour: "sky" as const },
  { initials: "YE", label: "Late set", colour: "violet" as const },
  { initials: "AA", label: "Floor", colour: "teal" as const },
];

const TILE_COLOUR_CLASS: Record<(typeof DEMO_TILES)[number]["colour"], string> = {
  sky: "border-ftc-primary/35 bg-[var(--ftc-color-primary-subtle)] text-ftc-primary",
  violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  teal: "border-teal-400/30 bg-teal-500/10 text-teal-200",
};

function useBrandMotionEnabled(variant: FtcBrandMotionVariant) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrowViewport = window.matchMedia("(max-width: 640px)").matches;
    const allowMotion =
      !reducedMotion && !(narrowViewport && (variant === "hero" || variant === "ambient"));

    setEnabled(allowMotion);
  }, [variant]);

  return enabled;
}

function FtcBrandTileStack({
  variant,
  animate,
}: {
  variant: FtcBrandMotionVariant;
  animate: boolean;
}) {
  return (
    <div
      className={`ftc-brand-tiles ${animate ? "ftc-brand-tiles--animate" : ""} ${
        variant === "hero" ? "ftc-brand-tiles--hero" : ""
      }`}
    >
      {DEMO_TILES.map((tile, index) => (
        <div
          key={tile.initials}
          className={`ftc-brand-tile ftc-brand-tile--${index + 1} ${TILE_COLOUR_CLASS[tile.colour]}`}
        >
          <span className="ftc-brand-tile__initials">{tile.initials}</span>
          <span className="ftc-brand-tile__label">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FtcBrandMotion({
  variant = "hero",
  className = "",
  videoSrc,
  videoType = "video/webm",
  posterSrc,
  posterAlt = "",
}: FtcBrandMotionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const motionEnabled = useBrandMotionEnabled(variant);
  const shouldAnimate = motionEnabled && isVisible;
  const showVideo = Boolean(videoSrc) && motionEnabled && isVisible;

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "48px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none relative select-none ${VARIANT_CLASS[variant]} ${className}`}
    >
      {showVideo ? (
        <video
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={posterSrc}
          onCanPlay={() => setVideoReady(true)}
        >
          <source src={videoSrc} type={videoType} />
        </video>
      ) : null}

      {posterSrc && !showVideo ? (
        <Image
          src={posterSrc}
          alt=""
          aria-hidden
          fill
          sizes="(max-width: 640px) 140px, 320px"
          className="object-contain"
          priority={variant === "hero"}
        />
      ) : null}

      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          showVideo && videoReady ? "opacity-0" : "opacity-100"
        }`}
      >
        <FtcBrandTileStack variant={variant} animate={shouldAnimate} />
      </div>
    </div>
  );
}

export function FtcBrandMotionPlaceholder({
  variant = "hero",
  className = "",
}: {
  variant?: FtcBrandMotionVariant;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative select-none ${VARIANT_CLASS[variant]} ${className}`}
    >
      <FtcBrandTileStack variant={variant} animate={false} />
    </div>
  );
}
