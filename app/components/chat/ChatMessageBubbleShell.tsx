"use client";

import type { HTMLAttributes, ReactNode, RefObject } from "react";
import DmMessageReactions, { DmReactionPicker } from "@/app/components/dm/DmMessageReactions";
import {
  CHAT_MESSAGE_REACTION_GUTTER_CLASS,
  resolveMessageReactionsOverlayClass,
} from "@/lib/dm/chatMessageGroupLayout";
import { summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

type BubbleShellHandlers = Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">;

/**
 * Shared bubble frame: bubble shell + reserved reaction gutter + absolute overlay pill.
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
  const hasReactions = reactionSummaries.length > 0;

  return (
    <div
      ref={pickerAnchorRef}
      className={`inline-flex w-fit max-w-full flex-col ${
        hasReactions ? CHAT_MESSAGE_REACTION_GUTTER_CLASS : ""
      }`.trim()}
    >
      <div
        className={`relative w-fit max-w-full overflow-visible ${highlightClassName}`.trim()}
      >
        <div ref={bubbleShellRef} className={bubbleShellClassName} {...bubbleHandlers}>
          {children}
        </div>

        {hasReactions ? (
          <div className={resolveMessageReactionsOverlayClass(isOwnMessage)}>
            <DmMessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              reacting={reacting}
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
