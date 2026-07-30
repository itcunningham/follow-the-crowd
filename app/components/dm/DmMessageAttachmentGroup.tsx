"use client";

import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import { isDmImageAttachment, type DmMessageAttachment } from "@/lib/dmAttachments";

function resolveImageGridColumnsClass(count: number): string {
  return count === 2 ? "grid-cols-2" : "grid-cols-3";
}

function handleImageContextMenu(
  event: React.MouseEvent<HTMLElement>,
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void,
) {
  event.preventDefault();
  onContextMenu?.(event);
}

/**
 * Renders a message's attachments. A single attachment preserves the
 * existing `DmMessageAttachmentView` layout untouched. Two or more images
 * render as one compact, square-cell grid (bounded height regardless of
 * count) instead of a tall vertical stack; tapping a cell preserves the
 * existing open-in-new-tab image viewing behaviour.
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

  return (
    <div className="space-y-2">
      {imageAttachments.length > 0 ? (
        <div
          className={`grid ${resolveImageGridColumnsClass(imageAttachments.length)} gap-0.5 overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 sm:max-w-[min(100%,18rem)]`}
        >
          {imageAttachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              aria-label="Open image"
              className="ftc-dm-message-image-open block aspect-square w-full overflow-hidden"
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
            </button>
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
