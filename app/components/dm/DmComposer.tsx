"use client";

import { useRef } from "react";
import ChatSendIcon from "@/app/components/chat/ChatSendIcon";
import {
  DM_PHOTO_INPUT_ACCEPT,
  validateDmAttachmentFile,
} from "@/lib/dmAttachments";

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
  return <ChatSendIcon />;
}

export default function DmComposer({
  value,
  onChange,
  onSend,
  onPhotoSelected,
  onAttachmentError,
  sending,
  uploading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onPhotoSelected: (file: File) => void;
  onAttachmentError?: (message: string) => void;
  sending: boolean;
  uploading: boolean;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const busy = sending || uploading;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
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

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={busy}
          className="ftc-input h-11 min-w-0 flex-1 rounded-full px-4 py-0 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={busy || !value.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:bg-ftc-primary-dim disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
}
