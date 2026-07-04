"use client";

import { DM_QUICK_REACTIONS, summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

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
  const wrapperAlignmentClass = isOwnMessage ? "self-end" : "self-start";
  const pickerPositionClass = isOwnMessage
    ? "right-0 origin-bottom-right"
    : "left-0 origin-bottom-left";

  if (showIdleReactButton) {
    return (
      <button
        type="button"
        aria-label="Add reaction"
        onClick={onOpenPicker}
        className={`mt-1 rounded-full border border-transparent px-2 py-0.5 text-[11px] text-zinc-500 transition hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-300 ${wrapperAlignmentClass} ${
          prominentActions ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"
        }`}
      >
        React
      </button>
    );
  }

  return (
    <div className={`relative mt-1 max-w-full ${wrapperAlignmentClass}`}>
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
                ? "border-blue-500/40 bg-blue-600/15 text-blue-100"
                : "border-zinc-800 bg-zinc-950/70 text-zinc-200 hover:border-zinc-700"
            }`}
          >
            <span>{summary.emoji}</span>
            {summary.count > 1 ? (
              <span className="text-[10px] font-semibold text-zinc-400">{summary.count}</span>
            ) : null}
          </button>
        ))}
        <button
          type="button"
          aria-label="Add reaction"
          disabled={reacting}
          onClick={onOpenPicker}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/70 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"
        >
          +
        </button>
      </div>

      {showPicker ? (
        <>
          <button
            type="button"
            aria-label="Close reaction picker"
            className="fixed inset-0 z-40"
            onClick={onClosePicker}
          />
          <div
            className={`absolute top-full z-[60] mt-2 flex max-w-[min(100vw-2rem,20rem)] items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-950/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm ${pickerPositionClass}`}
          >
            {DM_QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={reacting}
                aria-label={`React with ${emoji}`}
                onClick={() => onToggleReaction(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-zinc-900 disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
