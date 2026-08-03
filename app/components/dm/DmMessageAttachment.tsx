"use client";

import {
  formatDmAttachmentSize,
  isDmImageAttachment,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";
import {
  getDmImageReservedSize,
  getKnownDmImageAspectRatio,
  recordDmImageAspectRatio,
} from "@/lib/dm/dmImageAttachmentDimensions";
import {
  DM_IMAGE_BUBBLE_MAX_HEIGHT_CLASS,
  DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS,
} from "@/lib/dm/dmImageLayout";

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 shrink-0 text-ftc-primary"
    >
      <path
        d="M8 3h6l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function handleImageContextMenu(
  event: React.MouseEvent<HTMLElement>,
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void,
) {
  event.preventDefault();
  onContextMenu?.(event);
}

export default function DmMessageAttachmentView({
  attachment,
  isOwnMessage,
  onContextMenu,
}: {
  attachment: DmMessageAttachment;
  isOwnMessage: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  if (isDmImageAttachment(attachment.file_type)) {
    const knownAspectRatio = getKnownDmImageAspectRatio(attachment.id);
    // 18rem = 288px, matching DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS.
    const reserved = getDmImageReservedSize(attachment.id, 288);

    return (
      <button
        type="button"
        aria-label="Open image"
        className="ftc-dm-message-image-open block w-fit max-w-full overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40"
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
          width={reserved.width}
          height={reserved.height}
          className={`pointer-events-none h-auto ${DM_IMAGE_BUBBLE_MAX_HEIGHT_CLASS} ${DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS}`}
          style={knownAspectRatio ? { aspectRatio: knownAspectRatio } : undefined}
          loading="lazy"
          onLoad={(event) => {
            const image = event.currentTarget;
            recordDmImageAspectRatio(attachment.id, image.naturalWidth, image.naturalHeight);
          }}
        />
      </button>
    );
  }

  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.file_name}
      onContextMenu={onContextMenu}
      className={`flex max-w-full items-center gap-3 rounded-2xl border px-3 py-2.5 transition hover:border-ftc-primary/30 ${
        isOwnMessage
          ? "border-ftc-primary/20 bg-ftc-primary/8"
          : "border-ftc-border bg-ftc-bg-elevated/50 hover:bg-ftc-surface/70"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border bg-ftc-surface/80">
        <FileIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ftc-text">{attachment.file_name}</p>
        <p className="text-[11px] text-ftc-text-muted">
          {formatDmAttachmentSize(attachment.file_size) || "Attachment"}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
        Open
      </span>
    </a>
  );
}
