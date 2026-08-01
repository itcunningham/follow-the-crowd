"use client";

/**
 * Shared close control for every DM fullscreen media overlay (the image
 * lightbox, the gallery overview) — always top-right, same size, spacing,
 * icon, and hit area everywhere, so there is exactly one close interaction
 * across every media screen instead of two independently-drifting copies.
 * 44x44 hit area meets the 44x44pt minimum touch target regardless of the
 * visible glyph size.
 */
export default function DmMediaViewerCloseButton({
  onClose,
  label,
}: {
  onClose: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-xl leading-none text-white"
    >
      ×
    </button>
  );
}
