"use client";

import { useRef, type RefObject } from "react";
import ChatSendIcon from "@/app/components/chat/ChatSendIcon";
import ComposerIconButton from "@/app/components/chat/ComposerIconButton";
import ComposerMessageField from "@/app/components/chat/ComposerMessageField";
import {
  DM_MAX_PHOTOS_PER_MESSAGE,
  DM_PHOTO_INPUT_ACCEPT,
  validateDmAttachmentFile,
} from "@/lib/dmAttachments";
import type { PendingComposerAttachment } from "@/lib/dm/composerPendingAttachment";
import { handleComposerNewlineKeyDown } from "@/lib/dm/composerNewlineKeydown";
import { useComposerTextareaAutogrow } from "@/lib/dm/useComposerTextareaAutogrow";

export default function GroupChatComposer({
  value,
  onChange,
  onSend,
  sending,
  inputRef,
  composerRootRef,
  onInputBlurWhileBusy,
  pendingPhotos,
  onStagePhotos,
  onRemovePendingPhoto,
  onAttachmentError,
  uploading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  composerRootRef?: RefObject<HTMLDivElement | null>;
  onInputBlurWhileBusy?: () => void;
  pendingPhotos: PendingComposerAttachment[];
  onStagePhotos: (files: File[]) => void;
  onRemovePendingPhoto: (index: number) => void;
  onAttachmentError?: (message: string) => void;
  uploading: boolean;
}) {
  const { textareaRef } = useComposerTextareaAutogrow(value, inputRef);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const busy = sending || uploading;
  const hasPendingPhotos = pendingPhotos.length > 0;
  const canSend = Boolean(value.trim()) || hasPendingPhotos;

  /**
   * A blur that lands mid-send is the user deliberately dismissing the
   * keyboard (tapping the list, scrolling away, hitting Done) — the page
   * uses it to cancel the pending post-send refocus, so an intentional
   * dismissal is never undone. Identical to DmComposer.
   */
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
      className="ftc-chat-composer shrink-0 mt-1.5 border-t border-ftc-border-subtle bg-ftc-bg px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      {hasPendingPhotos ? (
        <div
          className="mb-2 flex items-start gap-2 overflow-x-auto pb-1"
          data-testid="group-chat-composer-pending-photos"
        >
          {pendingPhotos.map((photo, index) => (
            <div
              key={photo.previewUrl}
              className="dm-composer-pending-photo-selected relative h-[3.75rem] w-[3.75rem] shrink-0 overflow-hidden rounded-xl"
              data-testid="group-chat-composer-pending-photo"
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
                className="absolute right-0.5 top-0.5 flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-ftc-bg text-xs leading-none text-ftc-text shadow transition disabled:cursor-not-allowed disabled:opacity-40"
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
          className="mb-0.5"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="11" r="1.5" fill="currentColor" />
            <path d="m9 16 3-3 2 2 3-4 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </ComposerIconButton>

        {/* Deliberately NOT `disabled={busy}` — matching DmComposer. A
            disabled form control cannot hold focus, so the browser blurs it
            synchronously the moment `sending` flips true, which closed the
            iOS keyboard on every send. The duplicate-send guard lives in the
            page's `sending || uploading` early-return and the Send button's
            own disabled state, so nothing is lost by keeping the field
            enabled — and typing the next message while the previous one is
            still in flight is what mature messaging apps do. */}
        <ComposerMessageField
          textareaRef={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleComposerNewlineKeyDown}
          onBlur={handleInputBlur}
          placeholder="Message"
        />
        <button
          type="button"
          onPointerDown={(event) => {
            // Same as DmComposer: keeps the textarea focused (and the
            // mobile keyboard open) through the tap, instead of the button
            // stealing focus a frame before onClick fires.
            event.preventDefault();
          }}
          onClick={onSend}
          disabled={busy || !canSend}
          aria-label="Send message"
          aria-busy={busy}
          className="flex h-9 w-9 shrink-0 mb-1 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:bg-ftc-primary-dim disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10 sm:mb-0.5"
        >
          <ChatSendIcon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" />
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
