"use client";

import { useCallback, useEffect, useRef } from "react";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import DmMessageReactions, { DmReactionPicker } from "@/app/components/dm/DmMessageReactions";
import { getChatNewMessageHighlightClass, logChatHighlightRender } from "@/lib/chatNewMessageHighlight";
import { formatBookingMessagePreview } from "@/lib/bookingRequests";
import type { DmMessageAttachment } from "@/lib/dmAttachments";
import {
  resolveChatMessageBubbleShellClass,
  resolveChatMessageBubbleTextClass,
} from "@/lib/dm/chatMessageBubbleGeometry";
import {
  CHAT_INCOMING_AVATAR_SLOT_CLASS,
  CHAT_INCOMING_GROUP_CLUSTER_END_CLASS,
  CHAT_INCOMING_GROUP_TIGHT_PREVIOUS_CLASS,
  CHAT_INCOMING_METADATA_INDENT_CLASS,
} from "@/lib/dm/chatMessageGroupLayout";
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
  onReportMessage,
  formatTime,
  isHighlighted = false,
  showSeen = false,
  showTimestamp = true,
  showAvatar = true,
  tightWithPrevious = false,
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
  onReportMessage?: () => void;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  showSeen?: boolean;
  showTimestamp?: boolean;
  showAvatar?: boolean;
  tightWithPrevious?: boolean;
}) {
  const trimmedText = text.trim();
  const displayText = formatBookingMessagePreview(trimmedText);
  const hasAttachments = attachments.length > 0;
  const hasText = displayText.length > 0;
  const hasReactionSummaries =
    summarizeDmReactions(reactions, currentUserId).length > 0;
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
  });
  const bubbleTextClass = resolveChatMessageBubbleTextClass(displayText);

  const bubbleBlock = (
    <div ref={pickerAnchorRef} className={`relative max-w-full ${highlightClass}`}>
      {!hasReactionSummaries ? (
        <button
          type="button"
          aria-label="React to message"
          disabled={reacting}
          onClick={onOpenReactionPicker}
          className={`absolute top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-ftc-border bg-ftc-bg-elevated/90 text-xs text-ftc-text-secondary opacity-0 transition hover:border-ftc-border-strong hover:text-ftc-text focus-visible:opacity-100 disabled:opacity-50 pointer-events-none sm:group-hover/message:pointer-events-auto sm:group-hover/message:opacity-100 ${
            isOwnMessage ? "right-1" : "left-1"
          }`}
        >
          +
        </button>
      ) : null}

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
        {hasText ? (
          <p className={bubbleTextClass}>
            {displayText}
          </p>
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

  const reactionsBlock = (
    <DmMessageReactions
      reactions={reactions}
      currentUserId={currentUserId}
      reacting={reacting}
      isOwnMessage={isOwnMessage}
      onToggleReaction={onToggleReaction}
      onOpenPicker={onOpenReactionPicker}
    />
  );

  if (!isOwnMessage) {
    return (
      <li
        className={`group/message flex justify-start ${
          tightWithPrevious ? CHAT_INCOMING_GROUP_TIGHT_PREVIOUS_CLASS : ""
        } ${showTimestamp ? CHAT_INCOMING_GROUP_CLUSTER_END_CLASS : ""}`}
        data-chat-message-id={messageId}
      >
        <div className={`flex min-w-0 flex-col ${rowMaxWidthClass}`}>
          <div className="flex items-end gap-2">
            {otherUserId ? (
              showAvatar ? (
                <ChatProfileAvatarLink
                  userId={otherUserId}
                  name={otherUserLabel}
                  avatarUrl={otherUserAvatarUrl}
                  returnTo={profileReturnTo}
                />
              ) : (
                <div className={CHAT_INCOMING_AVATAR_SLOT_CLASS} aria-hidden="true" />
              )
            ) : null}
            <div className="flex min-w-0 flex-col items-start">
              {bubbleBlock}
              {reactionsBlock}
            </div>
          </div>

          <div className={CHAT_INCOMING_METADATA_INDENT_CLASS}>
            <time
              dateTime={createdAt}
              className={`mt-0.5 block px-1 text-[10px] text-ftc-text-muted text-left ${
                showTimestamp ? "" : "sr-only"
              }`}
            >
              {formattedTime}
            </time>

            {onReportMessage ? (
              <button
                type="button"
                aria-label="Report message"
                onClick={onReportMessage}
                className={`mt-1 rounded-full border border-transparent px-2 py-0.5 text-[11px] text-ftc-text-muted transition hover:border-ftc-border-strong hover:bg-ftc-surface hover:text-ftc-text-secondary ${
                  hasAttachments ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"
                }`}
              >
                Report
              </button>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`group/message flex justify-end ${tightWithPrevious ? "-mt-2" : ""} ${
        showTimestamp ? "mb-1.5" : ""
      }`}
      data-chat-message-id={messageId}
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
            {formattedTime}
          </time>
          {reactionsBlock}
          {showSeen ? (
            <p className="ftc-seen-label mt-0.5 self-end text-right">Seen</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
