"use client";

import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import DmMessageReactions from "@/app/components/dm/DmMessageReactions";
import { getChatNewMessageHighlightClass, logChatHighlightRender } from "@/lib/chatNewMessageHighlight";
import { formatBookingMessagePreview } from "@/lib/bookingRequests";
import type { DmMessageAttachment } from "@/lib/dmAttachments";
import type { DmMessageReaction } from "@/lib/dmReactions";

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
  onToggleReaction,
  onOpenReactionPicker,
  onCloseReactionPicker,
  onReportMessage,
  formatTime,
  isHighlighted = false,
  showSeen = false,
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
  onToggleReaction: (emoji: string) => void;
  onOpenReactionPicker: () => void;
  onCloseReactionPicker: () => void;
  onReportMessage?: () => void;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  showSeen?: boolean;
}) {
  const trimmedText = text.trim();
  const displayText = formatBookingMessagePreview(trimmedText);
  const hasAttachments = attachments.length > 0;
  const hasText = displayText.length > 0;

  if (isHighlighted) {
    logChatHighlightRender(messageId, true);
  }

  if (!hasText && !hasAttachments) {
    return null;
  }

  const highlightClass = getChatNewMessageHighlightClass(isHighlighted);

  return (
    <li
      className={`group/message flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      data-chat-message-id={messageId}
    >
      <div
        className={`flex max-w-[88%] items-end gap-2 sm:max-w-[78%] ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwnMessage && otherUserId ? (
          <ChatProfileAvatarLink
            userId={otherUserId}
            name={otherUserLabel}
            avatarUrl={otherUserAvatarUrl}
            returnTo={profileReturnTo}
          />
        ) : null}
        <div className={`flex min-w-0 flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
          <div className={`relative max-w-full ${highlightClass}`}>
            <div
              className={`overflow-hidden ${
                isOwnMessage
                  ? `ftc-bubble-own ${hasAttachments && !hasText ? "p-1" : "px-4 py-2.5"}`
                  : `ftc-bubble-other ${hasAttachments && !hasText ? "p-1" : "px-4 py-2.5"}`
              }`}
            >
              {hasAttachments ? (
                <div className={`space-y-2 ${hasText ? "mb-2" : ""}`}>
                  {attachments.map((attachment) => (
                    <DmMessageAttachmentView
                      key={attachment.id}
                      attachment={attachment}
                      isOwnMessage={isOwnMessage}
                    />
                  ))}
                </div>
              ) : null}
              {hasText ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {displayText}
                </p>
              ) : null}
            </div>
          </div>

          <time
            dateTime={createdAt}
            className={`-mt-1 block px-1 text-[10px] text-ftc-text-muted ${
              isOwnMessage ? "text-right" : "text-left"
            }`}
          >
            {formatTime(createdAt)}
          </time>

          <DmMessageReactions
            reactions={reactions}
            currentUserId={currentUserId}
            showPicker={showReactionPicker}
            reacting={reacting}
            prominentActions={hasAttachments}
            isOwnMessage={isOwnMessage}
            onToggleReaction={onToggleReaction}
            onOpenPicker={onOpenReactionPicker}
            onClosePicker={onCloseReactionPicker}
          />

          {isOwnMessage && showSeen ? (
            <p className="ftc-seen-label mt-0.5 self-end text-right">Seen</p>
          ) : null}

          {!isOwnMessage && onReportMessage ? (
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
