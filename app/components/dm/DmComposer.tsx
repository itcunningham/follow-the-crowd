"use client";

import { useRef, useState } from "react";
import {
  DM_FILE_INPUT_ACCEPT,
  DM_PHOTO_INPUT_ACCEPT,
  validateDmAttachmentFile,
} from "@/lib/dmAttachments";
import { DM_COMPOSER_EMOJIS } from "@/lib/dmReactions";

function IconButton({
  label,
  disabled,
  onClick,
  children,
  className = "",
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ftc-border bg-ftc-surface/70 text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary/90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function DmComposer({
  value,
  onChange,
  onSend,
  onPhotoSelected,
  onFileSelected,
  onAttachmentError,
  sending,
  uploading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onPhotoSelected: (file: File) => void;
  onFileSelected: (file: File) => void;
  onAttachmentError?: (message: string) => void;
  sending: boolean;
  uploading: boolean;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const busy = sending || uploading;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  }

  function appendEmoji(emoji: string) {
    onChange(`${value}${emoji}`);
    setEmojiOpen(false);
  }

  function handleAttachmentSelected(file: File, onSelected: (file: File) => void) {
    const validation = validateDmAttachmentFile(file);

    if (!validation.ok) {
      onAttachmentError?.(validation.error);
      return;
    }

    onSelected(file);
  }

  const attachmentButtons = (
    <>
      <IconButton
        label="Add photo"
        disabled={busy}
        onClick={() => photoInputRef.current?.click()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="11" r="1.5" fill="currentColor" />
          <path d="m9 16 3-3 2 2 3-4 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </IconButton>

      <IconButton
        label="Attach file (PDF, DOC, CSV, ZIP, MP3, WAV, and more)"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M8 12.5 14.5 6a3.5 3.5 0 1 1 5 5L10 20.5a5 5 0 1 1-7-7l8.5-8.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>

      <IconButton
        label="Add emoji"
        disabled={busy}
        onClick={() => setEmojiOpen((open) => !open)}
        className={emojiOpen ? "border-ftc-primary/30 text-ftc-primary/90" : ""}
      >
        <span className="text-lg leading-none">😊</span>
      </IconButton>
    </>
  );

  return (
    <div className="shrink-0 border-t border-ftc-border bg-ftc-bg px-3 py-3 sm:px-4 sm:py-4">
      {emojiOpen ? (
        <div className="mb-2 rounded-2xl border border-ftc-border bg-ftc-bg-elevated/90 p-2">
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
            {DM_COMPOSER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => appendEmoji(emoji)}
                className="flex h-9 items-center justify-center rounded-lg text-lg transition hover:bg-ftc-surface"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex min-w-0 items-end gap-2">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={busy}
            className="min-h-[44px] min-w-0 flex-1 rounded-full border border-ftc-border bg-ftc-surface/80 px-4 py-2.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-ftc-primary/45 focus:ring-2 focus:ring-ftc-primary/15 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={busy || !value.trim()}
            className="min-h-[44px] shrink-0 rounded-full border border-ftc-primary/40 bg-ftc-primary/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-primary/80 shadow-ftc-glow transition hover:border-ftc-primary/50 hover:bg-ftc-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "..." : "Send"}
          </button>
        </div>

        <div className="flex items-center gap-1.5">{attachmentButtons}</div>
      </div>

      <div className="hidden min-w-0 items-end gap-2 sm:flex">
        {attachmentButtons}

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={busy}
          className="min-h-[44px] min-w-0 flex-1 rounded-full border border-ftc-border bg-ftc-surface/80 px-4 py-2.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-ftc-primary/45 focus:ring-2 focus:ring-ftc-primary/15 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="min-h-[44px] shrink-0 rounded-full border border-ftc-primary/40 bg-ftc-primary/10 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-primary/80 shadow-ftc-glow transition hover:border-ftc-primary/50 hover:bg-ftc-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "..." : "Send"}
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept={DM_PHOTO_INPUT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            handleAttachmentSelected(file, onPhotoSelected);
          }
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={DM_FILE_INPUT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            handleAttachmentSelected(file, onFileSelected);
          }
        }}
      />
    </div>
  );
}
