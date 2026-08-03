"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import ChatMessageBubbleShell from "@/app/components/chat/ChatMessageBubbleShell";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import IncomingChatMessageLayout from "@/app/components/chat/IncomingChatMessageLayout";
import DmMessageAttachmentGroup from "@/app/components/dm/DmMessageAttachmentGroup";
import { buildProfileHref } from "@/lib/profileNavigation";
import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";
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

function GroupChatMessageBubble({
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
  seenLabel = null,
  attachments = [],
  followedByTimeSeparator = false,
  precededByTimeSeparator = false,
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
  /** Stable across renders (messageId-first) so React.memo below is actually effective. */
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenReactionPicker: (messageId: string) => void;
  onCloseReactionPicker: (messageId: string) => void;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  showSenderName?: boolean;
  showAvatar?: boolean;
  tightWithPrevious?: boolean;
  showTimestamp?: boolean;
  groupPosition?: ChatMessageGroupPosition;
  /** "Seen by …" — the parent computes this for the single latest message only. */
  seenLabel?: string | null;
  attachments?: DmMessageAttachment[];
  /** A centred day/time separator sits directly below this message. */
  followedByTimeSeparator?: boolean;
  /** A centred day/time separator sits directly above this message. */
  precededByTimeSeparator?: boolean;
}) {
  const bubbleShellRef = useRef<HTMLDivElement>(null);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

  const handleToggleReactionForMessage = useCallback(
    (emoji: string) => onToggleReaction(messageId, emoji),
    [messageId, onToggleReaction],
  );
  const handleOpenReactionPickerForMessage = useCallback(
    () => onOpenReactionPicker(messageId),
    [messageId, onOpenReactionPicker],
  );
  const handleCloseReactionPickerForMessage = useCallback(
    () => onCloseReactionPicker(messageId),
    [messageId, onCloseReactionPicker],
  );

  const {
    handlePointerDown: handleLongPressPointerDown,
    handlePointerMove: handleLongPressPointerMove,
    handlePointerUp: handleLongPressPointerUp,
    handlePointerCancel: handleLongPressPointerCancel,
    handleContextMenu,
    consumeLongPressActivation,
    wasLongPressActivated,
    resetLongPressGesture,
  } = useMessageReactionLongPress(handleOpenReactionPickerForMessage);

  const handleToggleHeart = useCallback(() => {
    handleToggleReactionForMessage(DM_DEFAULT_REACTION_EMOJI);
  }, [handleToggleReactionForMessage]);

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

  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const hasAttachments = attachments.length > 0;
  const attachmentOnly = hasAttachments && !hasText;

  const highlightClass = getChatNewMessageHighlightClass(isHighlighted);
  const rowMaxWidthClass = isOwnMessage
    ? "max-w-[85%] sm:max-w-[72%]"
    : "max-w-[88%] sm:max-w-[78%]";

  const bubbleShellClass = resolveChatMessageBubbleShellClass({
    isOwnMessage,
    text: trimmedText,
    hasAttachments,
    attachmentOnly,
    groupPosition,
  });
  const bubbleTextClass = resolveChatMessageBubbleTextClass(trimmedText);
  const isClusterEnd = groupPosition === "last" || groupPosition === "standalone";

  // Same guard as DmTextMessageBubble: an attachment-only message that lost
  // its attachments (send failed after the optimistic insert, or the row was
  // otherwise left with neither) has nothing to show, so it must render
  // nothing rather than an empty bubble.
  if (!hasText && !hasAttachments) {
    return null;
  }

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
      onToggleReaction={handleToggleReactionForMessage}
      onOpenReactionPicker={handleOpenReactionPickerForMessage}
      onCloseReactionPicker={handleCloseReactionPickerForMessage}
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
        <div className={hasText ? "mb-2" : ""}>
          <DmMessageAttachmentGroup
            attachments={attachments}
            isOwnMessage={isOwnMessage}
            onContextMenu={handleContextMenu}
          />
        </div>
      ) : null}
      {hasText ? <p className={bubbleTextClass}>{trimmedText}</p> : null}
    </ChatMessageBubbleShell>
  );

  if (!isOwnMessage) {
    const isClusterEnd = showAvatar;

    return (
      <li
        data-chat-message-id={messageId}
        className={resolveIncomingGroupLiClass({
          position: groupPosition,
          isClusterEnd,
          followedByTimeSeparator,
          precededByTimeSeparator,
        })}
      >
        <IncomingChatMessageLayout
          className={rowMaxWidthClass}
          groupPosition={groupPosition}
          createdAt={createdAt}
          formattedTime={formatTime(createdAt)}
          leadingContent={
            showSenderName ? (
              <Link
                href={buildProfileHref(senderUserId, { returnTo: profileReturnTo })}
                className="mb-1 block w-fit px-1 text-[11px] font-semibold text-ftc-text-secondary transition hover:text-ftc-text"
              >
                {senderLabel}
              </Link>
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
          {seenLabel ? (
            <p className="mt-0.5 px-1 text-[10px] text-ftc-text-muted">{seenLabel}</p>
          ) : null}
        </IncomingChatMessageLayout>
      </li>
    );
  }

  return (
    <li
      data-chat-message-id={messageId}
      className={resolveOutgoingGroupLiClass({
        position: groupPosition,
        isClusterEnd,
        followedByTimeSeparator,
        precededByTimeSeparator,
      })}
    >
      <div className={`flex ${rowMaxWidthClass} items-end gap-2 flex-row-reverse`}>
        <div className="flex min-w-0 flex-col items-end">
          {bubbleBlock}
          <time
            dateTime={createdAt}
            className={`mt-0.5 block px-1 text-[10px] text-ftc-text-muted text-right ${
              showTimestamp ? "" : "sr-only"
            }`}
          >
            {formatTime(createdAt)}
          </time>
          {seenLabel ? (
            <p className="px-1 text-right text-[10px] text-ftc-text-muted">{seenLabel}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Hundreds of messages in a long-lived event chat means most bubbles never
 * change between renders (a reaction toggle or the picker opening only
 * touches one message) — memo, paired with the messageId-first callbacks
 * above, means the rest skip re-rendering instead of all re-rendering because
 * their parent did.
 */
export default memo(GroupChatMessageBubble);
