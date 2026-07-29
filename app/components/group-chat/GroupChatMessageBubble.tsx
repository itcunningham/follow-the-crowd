"use client";

import { useCallback, useEffect, useRef } from "react";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import DmMessageReactions, { DmReactionPicker } from "@/app/components/dm/DmMessageReactions";
import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";
import {
  DM_DEFAULT_REACTION_EMOJI,
  useMessageReactionDoubleTap,
} from "@/lib/dm/useMessageReactionDoubleTap";
import { useMessageReactionLongPress } from "@/lib/dm/useMessageReactionLongPress";
import { summarizeDmReactions, type DmMessageReaction } from "@/lib/dmReactions";

function chainPointerHandler(
  first: (event: React.PointerEvent<HTMLElement>) => void,
  second: (event: React.PointerEvent<HTMLElement>) => void,
) {
  return (event: React.PointerEvent<HTMLElement>) => {
    first(event);
    second(event);
  };
}

export default function GroupChatMessageBubble({
  messageId,
  text,
  createdAt,
  isOwnMessage,
  senderUserId,
  senderLabel,
  senderAvatarUrl,
  profileReturnTo,
  reactions,
  currentUserId,
  showReactionPicker,
  reacting,
  scrollContainerRef,
  onToggleReaction,
  onOpenReactionPicker,
  onCloseReactionPicker,
  formatTime,
  isHighlighted = false,
  showSenderName = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  isOwnMessage: boolean;
  senderUserId: string;
  senderLabel: string;
  senderAvatarUrl?: string | null;
  profileReturnTo?: string | null;
  reactions: DmMessageReaction[];
  currentUserId: string | null;
  showReactionPicker: boolean;
  reacting: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onToggleReaction: (emoji: string) => void;
  onOpenReactionPicker: () => void;
  onCloseReactionPicker: () => void;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  showSenderName?: boolean;
}) {
  const bubbleShellRef = useRef<HTMLDivElement>(null);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const hasReactionSummaries =
    summarizeDmReactions(reactions, currentUserId).length > 0;

  const {
    handlePointerDown: handleLongPressPointerDown,
    handlePointerMove: handleLongPressPointerMove,
    handlePointerUp: handleLongPressPointerUp,
    handlePointerCancel: handleLongPressPointerCancel,
    handleContextMenu,
    consumeLongPressActivation,
    wasLongPressActivated,
    resetLongPressGesture,
  } = useMessageReactionLongPress(onOpenReactionPicker);

  const handleToggleHeart = useCallback(() => {
    onToggleReaction(DM_DEFAULT_REACTION_EMOJI);
  }, [onToggleReaction]);

  const {
    handlePointerDown: handleDoubleTapPointerDown,
    handlePointerMove: handleDoubleTapPointerMove,
    handlePointerUp: handleDoubleTapPointerUp,
    handlePointerCancel: handleDoubleTapPointerCancel,
    consumeDoubleTapActivation,
    resetDoubleTapGesture,
  } = useMessageReactionDoubleTap({
    bubbleRootRef: bubbleShellRef,
    onToggleHeart: handleToggleHeart,
    wasLongPressActivated,
    disabled: reacting,
  });

  useEffect(() => {
    if (!showReactionPicker) {
      return;
    }

    resetLongPressGesture();
    resetDoubleTapGesture();
  }, [resetDoubleTapGesture, resetLongPressGesture, showReactionPicker]);

  const highlightClass = getChatNewMessageHighlightClass(isHighlighted);
  const rowMaxWidthClass = isOwnMessage
    ? "max-w-[85%] sm:max-w-[72%]"
    : "max-w-[88%] sm:max-w-[78%]";

  return (
    <li
      data-chat-message-id={messageId}
      className={`group/message flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex ${rowMaxWidthClass} items-end gap-2 ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwnMessage ? (
          <ChatProfileAvatarLink
            userId={senderUserId}
            name={senderLabel}
            avatarUrl={senderAvatarUrl}
            returnTo={profileReturnTo}
          />
        ) : null}

        <div className={`flex min-w-0 flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
          {!isOwnMessage && showSenderName ? (
            <p className="mb-1 px-1 text-[11px] font-semibold text-ftc-text-secondary">
              {senderLabel}
            </p>
          ) : null}

          <div ref={pickerAnchorRef} className={`relative max-w-full ${highlightClass}`}>
            {!hasReactionSummaries ? (
              <button
                type="button"
                aria-label="React to message"
                disabled={reacting}
                onClick={onOpenReactionPicker}
                className={`absolute top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-ftc-border bg-ftc-bg-elevated/90 text-xs text-ftc-text-secondary opacity-0 transition hover:border-ftc-border-strong hover:text-ftc-text focus-visible:opacity-100 disabled:opacity-50 sm:group-hover/message:opacity-100 ${
                  isOwnMessage ? "right-1" : "left-1"
                }`}
              >
                +
              </button>
            ) : null}

            <div
              ref={bubbleShellRef}
              className={`overflow-hidden [touch-action:pan-y] select-none sm:select-text ${
                isOwnMessage ? "ftc-bubble-own px-3.5 py-2" : "ftc-bubble-other px-4 py-2.5"
              }`}
              onPointerDown={chainPointerHandler(
                handleDoubleTapPointerDown,
                handleLongPressPointerDown,
              )}
              onPointerMove={chainPointerHandler(
                handleDoubleTapPointerMove,
                handleLongPressPointerMove,
              )}
              onPointerUp={chainPointerHandler(handleDoubleTapPointerUp, handleLongPressPointerUp)}
              onPointerCancel={chainPointerHandler(
                handleDoubleTapPointerCancel,
                handleLongPressPointerCancel,
              )}
              onContextMenu={handleContextMenu}
              onClickCapture={(event) => {
                consumeLongPressActivation(event);
                consumeDoubleTapActivation(event);
              }}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{text}</p>
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

          <time
            dateTime={createdAt}
            className={`${isOwnMessage ? "mt-0.5" : "mt-1"} block px-1 text-[10px] text-ftc-text-muted ${
              isOwnMessage ? "text-right" : "text-left"
            }`}
          >
            {formatTime(createdAt)}
          </time>

          <DmMessageReactions
            reactions={reactions}
            currentUserId={currentUserId}
            reacting={reacting}
            isOwnMessage={isOwnMessage}
            onToggleReaction={onToggleReaction}
            onOpenPicker={onOpenReactionPicker}
          />
        </div>
      </div>
    </li>
  );
}
