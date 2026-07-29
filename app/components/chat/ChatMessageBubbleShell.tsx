"use client";

import type { HTMLAttributes, ReactNode, RefObject } from "react";
import DmMessageReactions, { DmReactionPicker } from "@/app/components/dm/DmMessageReactions";
import { summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

type BubbleShellHandlers = Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">;

/** Overlay slot — reactions hang from the bubble edge, never in document flow. */
function resolveMessageReactionsOverlayClass(isOwnMessage: boolean): string {
  const base = "pointer-events-none absolute bottom-0 z-10 translate-y-1/2";

  return isOwnMessage ? `${base} right-1` : `${base} left-1`;
}

/**
 * Shared bubble frame: one positioning root sized to the bubble, reactions in an overlay layer.
 * Used by DM and group chat so reactions always belong to their parent message.
 */
export default function ChatMessageBubbleShell({
  bubbleShellRef,
  pickerAnchorRef,
  bubbleShellClassName,
  highlightClassName = "",
  isOwnMessage,
  reactions,
  currentUserId,
  reacting,
  showReactionPicker,
  scrollContainerRef,
  onToggleReaction,
  onOpenReactionPicker,
  onCloseReactionPicker,
  bubbleHandlers,
  children,
}: {
  bubbleShellRef: RefObject<HTMLDivElement | null>;
  pickerAnchorRef: RefObject<HTMLDivElement | null>;
  bubbleShellClassName: string;
  highlightClassName?: string;
  isOwnMessage: boolean;
  reactions: DmMessageReaction[];
  currentUserId: string | null;
  reacting: boolean;
  showReactionPicker: boolean;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  onToggleReaction: (emoji: string) => void;
  onOpenReactionPicker: () => void;
  onCloseReactionPicker: () => void;
  bubbleHandlers: BubbleShellHandlers;
  children: ReactNode;
}) {
  const reactionSummaries = summarizeDmReactions(reactions, currentUserId);

  return (
    <div ref={pickerAnchorRef} className="inline-flex w-fit max-w-full flex-col">
      <div
        className={`relative w-fit max-w-full overflow-visible ${highlightClassName}`.trim()}
      >
        <div ref={bubbleShellRef} className={bubbleShellClassName} {...bubbleHandlers}>
          {children}
        </div>

        {reactionSummaries.length > 0 ? (
          <div className={resolveMessageReactionsOverlayClass(isOwnMessage)}>
            <DmMessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              reacting={reacting}
              isOwnMessage={isOwnMessage}
              onToggleReaction={onToggleReaction}
              onOpenPicker={onOpenReactionPicker}
            />
          </div>
        ) : null}
      </div>

      <DmReactionPicker
        show={showReactionPicker}
        reacting={reacting}
        isOwnMessage={isOwnMessage}
        anchorRef={pickerAnchorRef}
        scrollContainerRef={scrollContainerRef}
        onToggleReaction={onToggleReaction}
        onClosePicker={onCloseReactionPicker}
      />
    </div>
  );
}
