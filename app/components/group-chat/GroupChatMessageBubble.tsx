"use client";

import { useCallback, useEffect, useRef } from "react";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import IncomingChatMessageLayout from "@/app/components/chat/IncomingChatMessageLayout";
import DmMessageReactions, { DmReactionPicker } from "@/app/components/dm/DmMessageReactions";
import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";
import {
  resolveChatMessageBubbleShellClass,
  resolveChatMessageBubbleTextClass,
} from "@/lib/dm/chatMessageBubbleGeometry";
import {
  resolveIncomingGroupLiClass,
  CHAT_OUTGOING_GROUP_TIGHT_PREVIOUS_CLASS,
  CHAT_INCOMING_GROUP_CLUSTER_END_CLASS,
  type ChatMessageGroupPosition,
} from "@/lib/dm/chatMessageGroupLayout";
import {
  DM_DEFAULT_REACTION_EMOJI,
  useMessageReactionDoubleTap,
} from "@/lib/dm/useMessageReactionDoubleTap";
import { useMessageReactionLongPress } from "@/lib/dm/useMessageReactionLongPress";
import type { DmMessageReaction } from "@/lib/dmReactions";

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
  showAvatar = true,
  tightWithPrevious = false,
  showTimestamp = true,
  groupPosition = "standalone",
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
  showAvatar?: boolean;
  tightWithPrevious?: boolean;
  showTimestamp?: boolean;
  groupPosition?: ChatMessageGroupPosition;
}) {
  const bubbleShellRef = useRef<HTMLDivElement>(null);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

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
    handleDoubleClick: handleDoubleTapDoubleClick,
    consumeDoubleTapActivation,
    resetDoubleTapGesture,
  } = useMessageReactionDoubleTap({
    bubbleRootRef: bubbleShellRef,
    onToggleHeart: handleToggleHeart,
    wasLongPressActivated,
    onCancelCompetingGesture: resetLongPressGesture,
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

  const bubbleShellClass = resolveChatMessageBubbleShellClass({
    isOwnMessage,
    text,
    groupPosition,
  });
  const bubbleTextClass = resolveChatMessageBubbleTextClass(text);

  const bubbleBlock = (
    <div ref={pickerAnchorRef} className={`max-w-full ${highlightClass}`}>
      <div className="relative w-fit max-w-full">
        <div
          ref={bubbleShellRef}
          className={bubbleShellClass}
          onPointerDown={chainPointerHandler(handleDoubleTapPointerDown, handleLongPressPointerDown)}
          onPointerMove={chainPointerHandler(handleDoubleTapPointerMove, handleLongPressPointerMove)}
          onPointerUp={chainPointerHandler(handleDoubleTapPointerUp, handleLongPressPointerUp)}
          onPointerCancel={chainPointerHandler(
            handleDoubleTapPointerCancel,
            handleLongPressPointerCancel,
          )}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleTapDoubleClick}
          onClickCapture={(event) => {
            consumeLongPressActivation(event);
            consumeDoubleTapActivation(event);
          }}
        >
          <p className={bubbleTextClass}>{text}</p>
        </div>

        <DmMessageReactions
          reactions={reactions}
          currentUserId={currentUserId}
          reacting={reacting}
          isOwnMessage={isOwnMessage}
          onToggleReaction={onToggleReaction}
          onOpenPicker={onOpenReactionPicker}
        />
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

  if (!isOwnMessage) {
    const isClusterEnd = showAvatar;

    return (
      <li
        data-chat-message-id={messageId}
        className={resolveIncomingGroupLiClass({
          position: groupPosition,
          isClusterEnd,
          showTimestamp,
        })}
      >
        <IncomingChatMessageLayout
          className={rowMaxWidthClass}
          groupPosition={groupPosition}
          showTimestamp={showTimestamp}
          createdAt={createdAt}
          formattedTime={formatTime(createdAt)}
          leadingContent={
            showSenderName ? (
              <p className="mb-1 px-1 text-[11px] font-semibold text-ftc-text-secondary">
                {senderLabel}
              </p>
            ) : null
          }
          avatar={
            <ChatProfileAvatarLink
              userId={senderUserId}
              name={senderLabel}
              avatarUrl={senderAvatarUrl}
              returnTo={profileReturnTo}
            />
          }
        >
          {bubbleBlock}
        </IncomingChatMessageLayout>
      </li>
    );
  }

  return (
    <li
      data-chat-message-id={messageId}
      className={`group/message flex justify-end ${
        tightWithPrevious ? CHAT_OUTGOING_GROUP_TIGHT_PREVIOUS_CLASS : ""
      } ${CHAT_INCOMING_GROUP_CLUSTER_END_CLASS}`}
    >
      <div className={`flex ${rowMaxWidthClass} items-end gap-2 flex-row-reverse`}>
        <div className="flex min-w-0 flex-col items-end">
          {bubbleBlock}
          <time
            dateTime={createdAt}
            className="mt-0.5 block px-1 text-[10px] text-ftc-text-muted text-right"
          >
            {formatTime(createdAt)}
          </time>
        </div>
      </div>
    </li>
  );
}
