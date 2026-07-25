"use client";

import { useEffect, useRef } from "react";
import { DM_QUICK_REACTIONS, summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

const PICKER_CLASS =
  "absolute z-[60] flex max-w-[min(calc(100vw-2rem),20rem)] shrink-0 items-center gap-1 rounded-full border border-ftc-border-strong bg-ftc-bg-elevated/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm";

function getPickerPositionClass(isOwnMessage: boolean) {
  return isOwnMessage
    ? "bottom-full right-0 mb-2 max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2 sm:top-1/2 sm:right-full sm:mr-2 sm:mb-0 sm:-translate-y-1/2 sm:translate-x-0"
    : "bottom-full left-0 mb-2 max-sm:left-1/2 max-sm:-translate-x-1/2 sm:top-1/2 sm:left-full sm:ml-2 sm:mb-0 sm:-translate-y-1/2 sm:translate-x-0";
}

export function DmReactionPicker({
  show,
  reacting,
  isOwnMessage,
  onToggleReaction,
  onClosePicker,
}: {
  show: boolean;
  reacting: boolean;
  isOwnMessage: boolean;
  onToggleReaction: (emoji: string) => void;
  onClosePicker: () => void;
}) {
  const firstReactionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!show) {
      return;
    }

    firstReactionRef.current?.focus();
  }, [show]);

  useEffect(() => {
    if (!show) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClosePicker();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClosePicker, show]);

  if (!show) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close reaction picker"
        className="fixed inset-0 z-[55]"
        onClick={onClosePicker}
      />
      <div
        role="toolbar"
        aria-label="React to message"
        className={`${PICKER_CLASS} ${getPickerPositionClass(isOwnMessage)}`}
      >
        {DM_QUICK_REACTIONS.map((emoji, index) => (
          <button
            key={emoji}
            ref={index === 0 ? firstReactionRef : undefined}
            type="button"
            disabled={reacting}
            aria-label={`React with ${emoji}`}
            onClick={() => onToggleReaction(emoji)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition hover:bg-ftc-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 disabled:opacity-50"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}

export default function DmMessageReactions({
  reactions,
  currentUserId,
  reacting,
  isOwnMessage = false,
  onToggleReaction,
  onOpenPicker,
}: {
  reactions: DmMessageReaction[];
  currentUserId: string | null;
  reacting: boolean;
  isOwnMessage?: boolean;
  onToggleReaction: (emoji: string) => void;
  onOpenPicker: () => void;
}) {
  const summaries = summarizeDmReactions(reactions, currentUserId);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-1 flex max-w-full flex-wrap items-center gap-1 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {summaries.map((summary) => (
        <button
          key={summary.emoji}
          type="button"
          disabled={reacting}
          aria-label={`React with ${summary.emoji}`}
          onClick={() => onToggleReaction(summary.emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition disabled:opacity-50 ${
            summary.reactedByCurrentUser
              ? "border-0 bg-ftc-primary text-ftc-bg"
              : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text hover:border-ftc-border-strong"
          }`}
        >
          <span>{summary.emoji}</span>
          {summary.count > 1 ? (
            <span className="text-[10px] font-semibold text-ftc-text-secondary">{summary.count}</span>
          ) : null}
        </button>
      ))}
      <button
        type="button"
        aria-label="Add reaction"
        disabled={reacting}
        onClick={onOpenPicker}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-ftc-border bg-ftc-bg-elevated/70 text-xs text-ftc-text-secondary opacity-0 transition hover:border-ftc-border-strong hover:text-ftc-text focus-visible:opacity-100 disabled:opacity-50 sm:group-hover/message:opacity-100"
      >
        +
      </button>
    </div>
  );
}
