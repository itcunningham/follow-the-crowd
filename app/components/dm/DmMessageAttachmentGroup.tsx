"use client";

import { useState } from "react";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import DmImageLightbox from "@/app/components/dm/DmImageLightbox";
import DmImageGalleryOverview from "@/app/components/dm/DmImageGalleryOverview";
import { isDmImageAttachment, type DmMessageAttachment } from "@/lib/dmAttachments";
import {
  DM_GALLERY_OVERVIEW_MIN_IMAGES,
  DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS,
  DM_IMAGE_GRID_CELL_MAX_HEIGHT_CLASS,
  DM_IMAGE_GRID_CELL_MAX_WIDTH_CLASS,
  resolveVisibleGridImages,
} from "@/lib/dm/dmImageLayout";
import {
  getDmImageReservedSize,
  getKnownDmImageAspectRatio,
  recordDmImageAspectRatio,
} from "@/lib/dm/dmImageAttachmentDimensions";

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
  overlayCount,
  onOpen,
  onContextMenu,
}: {
  attachment: DmMessageAttachment;
  overlayCount?: number;
  onOpen: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const knownAspectRatio = getKnownDmImageAspectRatio(attachment.id);
  // max-w-36 = 144px. Reserved only until this image decodes for the first
  // time; see getDmImageReservedSize for why a zero-area lazy image never
  // loads at all.
  const reserved = getDmImageReservedSize(attachment.id, 144);

  return (
    <button
      type="button"
      aria-label="Open image"
      className="ftc-dm-message-image-open relative block shrink-0 overflow-hidden rounded-lg"
      onClick={onOpen}
      onContextMenu={(event) => handleImageContextMenu(event, onContextMenu)}
      onDragStart={(event) => event.preventDefault()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.file_url}
        alt={attachment.file_name}
        draggable={false}
        width={reserved.width}
        height={reserved.height}
        className={`pointer-events-none h-auto ${DM_IMAGE_GRID_CELL_MAX_HEIGHT_CLASS} ${DM_IMAGE_GRID_CELL_MAX_WIDTH_CLASS}`}
        style={knownAspectRatio ? { aspectRatio: knownAspectRatio } : undefined}
        loading="lazy"
        onLoad={(event) => {
          const image = event.currentTarget;
          recordDmImageAspectRatio(attachment.id, image.naturalWidth, image.naturalHeight);
        }}
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
 * render as a wrapping tile group, each tile kept at its own source aspect
 * ratio (no cropping) and capped to roughly half the shared bubble width so
 * pairs sit side by side, sharing the same max bubble width as single
 * images, with a fixed (not max-) width so the group gets a real,
 * predictable footprint the surrounding message row can align to the
 * sender's side. The whole group is one border/rounded-corner frame and
 * behaves as a single message; tapping any tile on a 2-4 image message opens
 * the lightbox directly on that image (including ones hidden behind the
 * "+N" tile); tapping any tile on a 5+ image message opens the
 * Instagram-style Gallery Overview first instead — browsing a large group by
 * jumping straight into one photo loses context.
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
          className={`flex flex-wrap items-start gap-1 overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 p-1 ${DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS}`}
        >
          {visibleImages.map((attachment, index) => {
            const isOverlayTile = hiddenImageCount > 0 && index === visibleImages.length - 1;

            return (
              <ImageGridCell
                key={attachment.id}
                attachment={attachment}
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
