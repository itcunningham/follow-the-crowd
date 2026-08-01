"use client";

import { useState } from "react";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import DmImageLightbox from "@/app/components/dm/DmImageLightbox";
import DmImageGalleryOverview from "@/app/components/dm/DmImageGalleryOverview";
import { isDmImageAttachment, type DmMessageAttachment } from "@/lib/dmAttachments";
import {
  DM_GALLERY_OVERVIEW_MIN_IMAGES,
  DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS,
  resolveImageGridCellClass,
  resolveVisibleGridImages,
} from "@/lib/dm/dmImageLayout";

/**
 * Which media overlay is currently open for this message's images, if any.
 * 1-4 images skip straight to "lightbox" on tap (existing behaviour); 5+
 * images go through "overview" first (Instagram-style browse-then-pick) —
 * see `openFromGrid` below. Closing the lightbox returns to "overview" only
 * when an overview exists in this message's flow, never the other way.
 */
type DmImageGroupView =
  | { mode: "closed" }
  | { mode: "overview" }
  | { mode: "lightbox"; index: number };

function handleImageContextMenu(
  event: React.MouseEvent<HTMLElement>,
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void,
) {
  event.preventDefault();
  onContextMenu?.(event);
}

function ImageGridCell({
  attachment,
  className,
  overlayCount,
  onOpen,
  onContextMenu,
}: {
  attachment: DmMessageAttachment;
  className: string;
  overlayCount?: number;
  onOpen: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Open image"
      className={`ftc-dm-message-image-open relative block w-full overflow-hidden ${className}`}
      onClick={onOpen}
      onContextMenu={(event) => handleImageContextMenu(event, onContextMenu)}
      onDragStart={(event) => event.preventDefault()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.file_url}
        alt={attachment.file_name}
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
        loading="lazy"
      />
      {overlayCount ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-semibold text-white">
          +{overlayCount}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Renders a message's attachments. A single attachment preserves the
 * existing `DmMessageAttachmentView` layout untouched. Two or more images
 * render as one balanced grid — equal 2-column for 2, large-top/two-bottom
 * for 3, 2x2 for 4, and a 2x2 grid with a "+N" overlay on the last cell for
 * 5+ — sharing the same max bubble width as single images, with a fixed
 * (not max-) width so the grid gets a real, predictable footprint the
 * surrounding message row can align to the sender's side. The whole grid is
 * one border/rounded-corner frame and behaves as a single message; tapping
 * any cell on a 2-4 image message opens the lightbox directly on that image
 * (including ones hidden behind the "+N" tile); tapping any cell on a 5+
 * image message opens the Instagram-style Gallery Overview first instead —
 * browsing a large group by jumping straight into one photo loses context.
 */
export default function DmMessageAttachmentGroup({
  attachments,
  isOwnMessage,
  onContextMenu,
}: {
  attachments: DmMessageAttachment[];
  isOwnMessage: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const [view, setView] = useState<DmImageGroupView>({ mode: "closed" });

  if (attachments.length <= 1) {
    return (
      <>
        {attachments.map((attachment) => (
          <DmMessageAttachmentView
            key={attachment.id}
            attachment={attachment}
            isOwnMessage={isOwnMessage}
            onContextMenu={onContextMenu}
          />
        ))}
      </>
    );
  }

  const imageAttachments = attachments.filter((attachment) =>
    isDmImageAttachment(attachment.file_type),
  );
  const fileAttachments = attachments.filter(
    (attachment) => !isDmImageAttachment(attachment.file_type),
  );
  const { visible: visibleImages, hiddenCount: hiddenImageCount } =
    resolveVisibleGridImages(imageAttachments);
  const hasGalleryOverview = imageAttachments.length >= DM_GALLERY_OVERVIEW_MIN_IMAGES;
  const lightboxImages = imageAttachments.map((attachment) => ({
    url: attachment.file_url,
    name: attachment.file_name,
  }));

  function openFromGrid(index: number) {
    setView(hasGalleryOverview ? { mode: "overview" } : { mode: "lightbox", index });
  }

  function closeLightbox() {
    setView(hasGalleryOverview ? { mode: "overview" } : { mode: "closed" });
  }

  return (
    <div className="space-y-2">
      {visibleImages.length > 0 ? (
        <div
          className={`grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 ${DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS}`}
        >
          {visibleImages.map((attachment, index) => {
            const isOverlayTile = hiddenImageCount > 0 && index === visibleImages.length - 1;

            return (
              <ImageGridCell
                key={attachment.id}
                attachment={attachment}
                className={resolveImageGridCellClass(imageAttachments.length, index)}
                overlayCount={isOverlayTile ? hiddenImageCount : undefined}
                onOpen={() => openFromGrid(isOverlayTile ? visibleImages.length : index)}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </div>
      ) : null}
      {fileAttachments.map((attachment) => (
        <DmMessageAttachmentView
          key={attachment.id}
          attachment={attachment}
          isOwnMessage={isOwnMessage}
          onContextMenu={onContextMenu}
        />
      ))}
      {view.mode === "overview" ? (
        <DmImageGalleryOverview
          images={lightboxImages}
          onSelect={(index) => setView({ mode: "lightbox", index })}
          onClose={() => setView({ mode: "closed" })}
        />
      ) : null}
      {view.mode === "lightbox" ? (
        <DmImageLightbox images={lightboxImages} initialIndex={view.index} onClose={closeLightbox} />
      ) : null}
    </div>
  );
}
