"use client";

import { useCallback, useState, type ReactNode, type SyntheticEvent } from "react";

type FlyerAspectTier = "portrait" | "square" | "landscape";

const PORTRAIT_MAX_RATIO = 0.92;
const SQUARE_MAX_RATIO = 1.08;
const PORTRAIT_WIDTH_MIN = 0.7;
const PORTRAIT_WIDTH_MAX = 0.8;
const HERO_CONTAINER_ASPECT = 16 / 9;

function classifyFlyerAspectRatio(width: number, height: number): FlyerAspectTier {
  if (width <= 0 || height <= 0) {
    return "landscape";
  }

  const ratio = width / height;
  if (ratio < PORTRAIT_MAX_RATIO) {
    return "portrait";
  }
  if (ratio <= SQUARE_MAX_RATIO) {
    return "square";
  }
  return "landscape";
}

/** Portrait slot width (70–80% of hero) when the flyer is height-filling inside the landscape frame. */
function portraitHeroSlotWidthRatio(imageAspect: number): number {
  const heightFillWidth = imageAspect / HERO_CONTAINER_ASPECT;
  return Math.min(PORTRAIT_WIDTH_MAX, Math.max(PORTRAIT_WIDTH_MIN, heightFillWidth));
}

export default function EventDetailHeroImage({
  src,
  alt,
  badge,
}: {
  src: string;
  alt: string;
  badge?: ReactNode;
}) {
  const [tier, setTier] = useState<FlyerAspectTier | null>(null);
  const [portraitWidthRatio, setPortraitWidthRatio] = useState(0.75);

  const handleImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const classified = classifyFlyerAspectRatio(naturalWidth, naturalHeight);
    setTier(classified);

    if (classified === "portrait") {
      setPortraitWidthRatio(portraitHeroSlotWidthRatio(naturalWidth / naturalHeight));
    }
  }, []);

  const isPortrait = tier === "portrait";
  const slotWidth = isPortrait ? `${portraitWidthRatio * 100}%` : "100%";
  const imageFitClass = isPortrait ? "object-contain" : "object-cover";
  const imageReadyClass =
    tier === null
      ? "opacity-0"
      : "opacity-100 transition-opacity duration-150 motion-reduce:transition-none";

  const frameClassName = `ftc-event-image-frame ftc-event-image-frame--hero ftc-event-detail-hero-image${
    badge ? " relative" : ""
  }`;

  return (
    <div className={frameClassName}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-full overflow-hidden" style={{ width: slotWidth }}>
          <img
            src={src}
            alt={alt}
            decoding="async"
            onLoad={handleImageLoad}
            className={`h-full w-full object-center ${imageFitClass} ${imageReadyClass}`}
          />
        </div>
      </div>
      {badge ? <div className="absolute bottom-3 left-3 z-10">{badge}</div> : null}
    </div>
  );
}
