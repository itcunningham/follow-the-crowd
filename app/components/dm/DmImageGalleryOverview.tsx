"use client";

import { useEffect, useState } from "react";
import DmMediaViewerCloseButton from "@/app/components/dm/DmMediaViewerCloseButton";
import { useDmMediaViewerDismiss } from "@/lib/dm/useDmMediaViewerDismiss";

const VIEWER_TRANSITION_MS = 220;

type GalleryImage = {
  url: string;
  name: string;
};

/**
 * Instagram-style overview shown before the single-image lightbox for 5+
 * image DM messages — browsing a large group by immediately jumping into
 * one photo loses context, so this shows every photo (upload order
 * preserved) in a responsive grid first. Tapping a thumbnail opens the
 * existing `DmImageLightbox` on that photo; closing the lightbox returns
 * here rather than to the chat (that return routing lives in the parent,
 * `DmMessageAttachmentGroup`, which owns which overlay is open).
 */
export default function DmImageGalleryOverview({
  images,
  onSelect,
  onClose,
}: {
  images: GalleryImage[];
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  function requestClose() {
    setVisible(false);
    window.setTimeout(onClose, VIEWER_TRANSITION_MS);
  }

  useDmMediaViewerDismiss(requestClose);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${images.length} photos`}
    >
      <div
        className={`absolute inset-0 bg-black/90 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={requestClose}
      />

      <div
        className={`relative flex min-h-0 flex-1 flex-col transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between p-4 text-white">
          <span className="text-sm font-medium">
            {images.length} {images.length === 1 ? "Photo" : "Photos"}
          </span>
          <DmMediaViewerCloseButton onClose={requestClose} label="Close gallery" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-4">
          <div className="grid grid-cols-3 gap-1">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                aria-label={`Open photo ${index + 1}`}
                onClick={() => onSelect(index)}
                className="relative block aspect-square overflow-hidden rounded-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.name}
                  draggable={false}
                  loading="lazy"
                  className="pointer-events-none h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
