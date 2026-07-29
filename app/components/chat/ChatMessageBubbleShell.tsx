"use client";

import { useEffect, useState } from "react";
import type { HTMLAttributes, ReactNode, RefObject } from "react";
import DmMessageReactions, { DmReactionPicker } from "@/app/components/dm/DmMessageReactions";
import {
  CHAT_MESSAGE_REACTION_OVERLAP_RESERVE_CLASS,
  CHAT_MESSAGE_REACTION_PILL_ANIMATION_MS,
  resolveMessageReactionAnchorClass,
} from "@/lib/dm/chatMessageGroupLayout";
import { summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

type BubbleShellHandlers = Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">;

function useReactionOverlayLifecycle(
  reactions: DmMessageReaction[],
  currentUserId: string | null,
) {
  const summaries = summarizeDmReactions(reactions, currentUserId);
  const hasSummaries = summaries.length > 0;
  const [mounted, setMounted] = useState(hasSummaries);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSummaries) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    if (mounted) {
      setVisible(false);
      const timer = window.setTimeout(() => {
        setMounted(false);
      }, CHAT_MESSAGE_REACTION_PILL_ANIMATION_MS);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [hasSummaries, mounted]);

  return { mounted, visible, summaries };
}

/**
 * Shared bubble frame: bubble shell + absolute reaction badge.
 * Reactions overlap the bubble corner without affecting list-item stack rhythm.
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
  const { mounted: reactionRowMounted, visible: reactionRowVisible } =
    useReactionOverlayLifecycle(reactions, currentUserId);

  return (
    <div
      ref={pickerAnchorRef}
      className={`inline-flex w-fit max-w-full flex-col ${
        reactionRowMounted ? CHAT_MESSAGE_REACTION_OVERLAP_RESERVE_CLASS : ""
      }`.trim()}
    >
      <div
        className={`relative w-fit max-w-full overflow-visible ${highlightClassName}`.trim()}
      >
        <div ref={bubbleShellRef} className={bubbleShellClassName} {...bubbleHandlers}>
          {children}
        </div>

        {reactionRowMounted ? (
          <div className={resolveMessageReactionAnchorClass(isOwnMessage)}>
            <DmMessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              reacting={reacting}
              visible={reactionRowVisible}
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
