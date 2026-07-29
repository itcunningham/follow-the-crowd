"use client";

import { useCallback, useEffect, useRef } from "react";
import ChatMessageBubbleShell from "@/app/components/chat/ChatMessageBubbleShell";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import DmIncomingMessageLayout from "@/app/components/chat/DmIncomingMessageLayout";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import { getChatNewMessageHighlightClass, logChatHighlightRender } from "@/lib/chatNewMessageHighlight";
import { formatBookingMessagePreview } from "@/lib/bookingRequests";
import type { DmMessageAttachment } from "@/lib/dmAttachments";
import {
  resolveChatMessageBubbleShellClass,
  resolveChatMessageBubbleTextClass,
} from "@/lib/dm/chatMessageBubbleGeometry";
import {
  resolveIncomingGroupLiClass,
  resolveOutgoingGroupLiClass,
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

export default function DmTextMessageBubble({
  messageId,
  text,
  createdAt,
  isOwnMessage,
  otherUserId,
  otherUserLabel,
  otherUserAvatarUrl,
  profileReturnTo,
  attachments,
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
  showSeen = false,
  showAvatar = true,
  groupPosition = "standalone",
}: {
  messageId: string;
  text: string;
  createdAt: string;
  isOwnMessage: boolean;
  otherUserId?: string | null;
  otherUserLabel: string;
  otherUserAvatarUrl?: string | null;
  profileReturnTo?: string | null;
  attachments: DmMessageAttachment[];
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
  showSeen?: boolean;
  showAvatar?: boolean;
  groupPosition?: ChatMessageGroupPosition;
}) {
  const trimmedText = text.trim();
  const displayText = formatBookingMessagePreview(trimmedText);
  const hasAttachments = attachments.length > 0;
  const hasText = displayText.length > 0;
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

  if (isHighlighted) {
    logChatHighlightRender(messageId, true);
  }

  if (!hasText && !hasAttachments) {
    return null;
  }

  const highlightClass = getChatNewMessageHighlightClass(isHighlighted);
  const attachmentOnly = hasAttachments && !hasText;
  const formattedTime = formatTime(createdAt);
  const rowMaxWidthClass = isOwnMessage
    ? "max-w-[85%] sm:max-w-[72%]"
    : "max-w-[88%] sm:max-w-[78%]";
  const bubbleShellClass = resolveChatMessageBubbleShellClass({
    isOwnMessage,
    text: displayText,
    hasAttachments,
    attachmentOnly,
    groupPosition,
  });
  const bubbleTextClass = resolveChatMessageBubbleTextClass(displayText);
  const hasReactions = reactions.length > 0;
  const isClusterEnd = showAvatar;

  const bubbleBlock = (
    <ChatMessageBubbleShell
      bubbleShellRef={bubbleShellRef}
      pickerAnchorRef={pickerAnchorRef}
      bubbleShellClassName={bubbleShellClass}
      highlightClassName={highlightClass}
      isOwnMessage={isOwnMessage}
      reactions={reactions}
      currentUserId={currentUserId}
      reacting={reacting}
      showReactionPicker={showReactionPicker}
      scrollContainerRef={scrollContainerRef}
      onToggleReaction={onToggleReaction}
      onOpenReactionPicker={onOpenReactionPicker}
      onCloseReactionPicker={onCloseReactionPicker}
      bubbleHandlers={{
        onPointerDown: chainPointerHandler(handleDoubleTapPointerDown, handleLongPressPointerDown),
        onPointerMove: chainPointerHandler(handleDoubleTapPointerMove, handleLongPressPointerMove),
        onPointerUp: chainPointerHandler(handleDoubleTapPointerUp, handleLongPressPointerUp),
        onPointerCancel: chainPointerHandler(
          handleDoubleTapPointerCancel,
          handleLongPressPointerCancel,
        ),
        onContextMenu: handleContextMenu,
        onDoubleClick: handleDoubleTapDoubleClick,
        onClickCapture: (event) => {
          consumeLongPressActivation(event);
          consumeDoubleTapActivation(event);
        },
      }}
    >
      {hasAttachments ? (
        <div className={`space-y-2 ${hasText ? "mb-2" : ""}`}>
          {attachments.map((attachment) => (
            <DmMessageAttachmentView
              key={attachment.id}
              attachment={attachment}
              isOwnMessage={isOwnMessage}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : null}
      {hasText ? <p className={bubbleTextClass}>{displayText}</p> : null}
    </ChatMessageBubbleShell>
  );

  if (!isOwnMessage) {
    return (
      <li
        className={resolveIncomingGroupLiClass({
          position: groupPosition,
          isClusterEnd,
          hasReactions,
        })}
        data-chat-message-id={messageId}
      >
        <DmIncomingMessageLayout
          className={rowMaxWidthClass}
          groupPosition={groupPosition}
          showAvatar={showAvatar}
          createdAt={createdAt}
          formattedTime={formattedTime}
          avatar={
            otherUserId ? (
              <ChatProfileAvatarLink
                userId={otherUserId}
                name={otherUserLabel}
                avatarUrl={otherUserAvatarUrl}
                returnTo={profileReturnTo}
              />
            ) : null
          }
        >
          {bubbleBlock}
        </DmIncomingMessageLayout>
      </li>
    );
  }

  return (
    <li
      className={resolveOutgoingGroupLiClass({
        position: groupPosition,
        isClusterEnd,
        hasReactions,
      })}
      data-chat-message-id={messageId}
    >
      <div className={`flex ${rowMaxWidthClass} items-end gap-2 flex-row-reverse`}>
        <div className="flex min-w-0 flex-col items-end">
          {bubbleBlock}
          <time dateTime={createdAt} hidden>
            {formattedTime}
          </time>
          {showSeen ? (
            <p
              className={`ftc-seen-label self-end text-right ${
                hasReactions ? "mt-1.5" : "mt-0.5"
              }`}
            >
              Seen
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
