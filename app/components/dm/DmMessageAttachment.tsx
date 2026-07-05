"use client";

import {
  formatDmAttachmentSize,
  isDmImageAttachment,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 shrink-0 text-blue-300"
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

export default function DmMessageAttachmentView({
  attachment,
  isOwnMessage,
}: {
  attachment: DmMessageAttachment;
  isOwnMessage: boolean;
}) {
  if (isDmImageAttachment(attachment.file_type)) {
    return (
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40"
        onContextMenu={(event) => event.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          draggable={false}
          className="max-h-72 w-full max-w-full object-cover select-none [-webkit-touch-callout:none] sm:max-w-[min(100%,18rem)]"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.file_name}
      className={`flex max-w-full items-center gap-3 rounded-2xl border px-3 py-2.5 transition hover:border-blue-500/35 ${
        isOwnMessage
          ? "border-blue-500/25 bg-blue-950/20"
          : "border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/70"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80">
        <FileIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{attachment.file_name}</p>
        <p className="text-[11px] text-zinc-500">
          {formatDmAttachmentSize(attachment.file_size) || "Attachment"}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
        Open
      </span>
    </a>
  );
}
