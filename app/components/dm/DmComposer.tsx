"use client";

import { useRef, type RefObject } from "react";
import ChatSendIcon from "@/app/components/chat/ChatSendIcon";
import ComposerMessageField from "@/app/components/chat/ComposerMessageField";
import {
  DM_MAX_PHOTOS_PER_MESSAGE,
  DM_PHOTO_INPUT_ACCEPT,
  validateDmAttachmentFile,
} from "@/lib/dmAttachments";
import type { PendingComposerAttachment } from "@/lib/dm/composerPendingAttachment";
import { handleComposerNewlineKeyDown } from "@/lib/dm/composerNewlineKeydown";
import { useComposerTextareaAutogrow } from "@/lib/dm/useComposerTextareaAutogrow";

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

function SendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <ChatSendIcon className={className} />;
}

export default function DmComposer({
  value,
  onChange,
  onSend,
  inputRef,
  composerRootRef,
  onInputBlurWhileBusy,
  pendingPhotos,
  onStagePhotos,
  onRemovePendingPhoto,
  onAttachmentError,
  sending,
  uploading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  composerRootRef?: RefObject<HTMLDivElement | null>;
  onInputBlurWhileBusy?: () => void;
  pendingPhotos: PendingComposerAttachment[];
  onStagePhotos: (files: File[]) => void;
  onRemovePendingPhoto: (index: number) => void;
  onAttachmentError?: (message: string) => void;
  sending: boolean;
  uploading: boolean;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { textareaRef: messageInputRef } = useComposerTextareaAutogrow(value, inputRef);
  const busy = sending || uploading;
  const hasPendingPhotos = pendingPhotos.length > 0;
  const canSend = Boolean(value.trim()) || hasPendingPhotos;

  function handleInputBlur() {
    if (busy) {
      onInputBlurWhileBusy?.();
    }
  }

  function handlePhotosSelected(files: File[]) {
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateDmAttachmentFile(file);

      if (!validation.ok) {
        onAttachmentError?.(validation.error);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onStagePhotos(validFiles);
    }
  }

  return (
    <div
      ref={composerRootRef}
      data-chat-composer
      className="dm-composer shrink-0 border-t border-ftc-border-subtle bg-ftc-bg px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      {hasPendingPhotos ? (
        <div
          className="mb-2 flex items-start gap-2 overflow-x-auto pb-1"
          data-testid="dm-composer-pending-photos"
        >
          {pendingPhotos.map((photo, index) => (
            <div
              key={photo.previewUrl}
              className="dm-composer-pending-photo-selected relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl"
              data-testid="dm-composer-pending-photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={`Selected photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove selected photo ${index + 1}`}
                disabled={busy}
                onClick={() => onRemovePendingPhoto(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ftc-bg/90 text-xs leading-none text-ftc-text-secondary shadow transition hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex min-w-0 items-end gap-2">
        <ComposerIconButton
          label="Add photo"
          disabled={busy || pendingPhotos.length >= DM_MAX_PHOTOS_PER_MESSAGE}
          onClick={() => photoInputRef.current?.click()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="11" r="1.5" fill="currentColor" />
            <path d="m9 16 3-3 2 2 3-4 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </ComposerIconButton>

        <ComposerMessageField
          textareaRef={messageInputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleComposerNewlineKeyDown}
          onBlur={handleInputBlur}
          placeholder="Message"
        />

        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onClick={onSend}
          disabled={busy || !canSend}
          aria-label="Send message"
          aria-busy={busy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:bg-ftc-primary-dim disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
        >
          <SendIcon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" />
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept={DM_PHOTO_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";

          if (files.length > 0) {
            handlePhotosSelected(files);
          }
        }}
      />
    </div>
  );
}
