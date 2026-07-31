"use client";

import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import { isDmImageAttachment, type DmMessageAttachment } from "@/lib/dmAttachments";
import {
  DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS,
  resolveImageGridCellClass,
  resolveVisibleGridImages,
} from "@/lib/dm/dmImageLayout";

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
  onContextMenu,
}: {
  attachment: DmMessageAttachment;
  className: string;
  overlayCount?: number;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Open image"
      className={`ftc-dm-message-image-open relative block w-full overflow-hidden ${className}`}
      onClick={() => {
        window.open(attachment.file_url, "_blank", "noopener,noreferrer");
      }}
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
 * 5+ — sharing the same max bubble width as single images. The whole grid is
 * one border/rounded-corner frame and behaves as a single message; tapping
 * any cell preserves the existing open-in-new-tab image viewing behaviour.
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

  return (
    <div className="space-y-2">
      {visibleImages.length > 0 ? (
        <div
          className={`grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 ${DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS}`}
        >
          {visibleImages.map((attachment, index) => (
            <ImageGridCell
              key={attachment.id}
              attachment={attachment}
              className={resolveImageGridCellClass(imageAttachments.length, index)}
              overlayCount={
                hiddenImageCount > 0 && index === visibleImages.length - 1
                  ? hiddenImageCount
                  : undefined
              }
              onContextMenu={onContextMenu}
            />
          ))}
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
    </div>
  );
}
