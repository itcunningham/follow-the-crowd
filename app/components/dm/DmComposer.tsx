"use client";

import { useRef, useState } from "react";
import {
  DM_FILE_INPUT_ACCEPT,
  DM_PHOTO_INPUT_ACCEPT,
  validateDmAttachmentFile,
} from "@/lib/dmAttachments";
import { DM_COMPOSER_EMOJIS } from "@/lib/dmReactions";

function ComposerIconButton({
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
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="m4 12 16-8-4 8 4 8-16-8 4-2-4-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
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

  return (
    <div className="shrink-0 border-t border-ftc-border-subtle bg-ftc-bg px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      {emojiOpen ? (
        <div className="mb-2 rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated p-2">
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

      <div className="flex min-w-0 items-end gap-2">
        <ComposerIconButton
          label="Add photo"
          disabled={busy}
          onClick={() => photoInputRef.current?.click()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="11" r="1.5" fill="currentColor" />
            <path d="m9 16 3-3 2 2 3-4 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </ComposerIconButton>

        <ComposerIconButton
          label="Attach file"
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
        </ComposerIconButton>

        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={busy}
            className="ftc-input h-11 w-full rounded-full py-0 pl-4 pr-11 disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="Add emoji"
            disabled={busy}
            onClick={() => setEmojiOpen((open) => !open)}
            className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg transition disabled:opacity-40 ${
              emojiOpen ? "text-ftc-primary" : "text-ftc-text-muted hover:text-ftc-text-secondary"
            }`}
          >
            😊
          </button>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={busy || !value.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <span className="text-xs font-bold">…</span> : <SendIcon />}
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
