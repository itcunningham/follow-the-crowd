"use client";

import { DM_QUICK_REACTIONS, summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

const PICKER_CLASS =
  "absolute z-[60] flex max-w-[min(calc(100vw-2rem),20rem)] shrink-0 items-center gap-1 rounded-full border border-ftc-border-strong bg-ftc-bg-elevated/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm";

export default function DmMessageReactions({
  reactions,
  currentUserId,
  showPicker,
  reacting,
  prominentActions = false,
  isOwnMessage = false,
  onToggleReaction,
  onOpenPicker,
  onClosePicker,
}: {
  reactions: DmMessageReaction[];
  currentUserId: string | null;
  showPicker: boolean;
  reacting: boolean;
  prominentActions?: boolean;
  isOwnMessage?: boolean;
  onToggleReaction: (emoji: string) => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
}) {
  const summaries = summarizeDmReactions(reactions, currentUserId);
  const showIdleReactButton = summaries.length === 0 && !showPicker;
  const columnAlignmentClass = isOwnMessage ? "items-end" : "items-start";
  const pickerPositionClass = isOwnMessage
    ? "bottom-full right-0 mb-2 max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2 sm:top-1/2 sm:right-full sm:mr-2 sm:mb-0 sm:-translate-y-1/2 sm:translate-x-0"
    : "bottom-full left-0 mb-2 max-sm:left-1/2 max-sm:-translate-x-1/2 sm:top-1/2 sm:left-full sm:ml-2 sm:mb-0 sm:-translate-y-1/2 sm:translate-x-0";
  const idleReactVisibilityClass = prominentActions
    ? "opacity-100"
    : "opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100";

  return (
    <div className={`mt-1 flex max-w-full flex-col gap-1 ${columnAlignmentClass}`}>
      {summaries.length > 0 ? (
        <div
          className={`flex max-w-full flex-wrap items-center gap-1 ${
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
        </div>
      ) : null}

      <div className="relative inline-flex">
        {showIdleReactButton ? (
          <button
            type="button"
            aria-label="Add reaction"
            onClick={onOpenPicker}
            className={`rounded-full border border-transparent px-2 py-0.5 text-[11px] text-ftc-text-muted transition hover:border-ftc-border-strong hover:bg-ftc-surface/70 hover:text-ftc-text-secondary ${idleReactVisibilityClass}`}
          >
            React
          </button>
        ) : (
          <button
            type="button"
            aria-label="Add reaction"
            disabled={reacting}
            onClick={onOpenPicker}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-ftc-border bg-ftc-bg-elevated/70 text-xs text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:opacity-50"
          >
            +
          </button>
        )}

        {showPicker ? (
          <>
            <button
              type="button"
              aria-label="Close reaction picker"
              className="fixed inset-0 z-[55]"
              onClick={onClosePicker}
            />
            <div className={`${PICKER_CLASS} ${pickerPositionClass}`}>
              {DM_QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={reacting}
                  aria-label={`React with ${emoji}`}
                  onClick={() => onToggleReaction(emoji)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition hover:bg-ftc-surface disabled:opacity-50"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
