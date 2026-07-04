"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import DmMessageReactions from "@/app/components/dm/DmMessageReactions";
import { getChatNewMessageHighlightClass, logChatHighlightRender } from "@/lib/chatNewMessageHighlight";
import type { DmMessageAttachment } from "@/lib/dmAttachments";
import type { DmMessageReaction } from "@/lib/dmReactions";

export default function DmTextMessageBubble({
  messageId,
  text,
  createdAt,
  isOwnMessage,
  otherUserLabel,
  otherUserAvatarUrl,
  attachments,
  reactions,
  currentUserId,
  showReactionPicker,
  reacting,
  onToggleReaction,
  onOpenReactionPicker,
  onCloseReactionPicker,
  formatTime,
  isHighlighted = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  isOwnMessage: boolean;
  otherUserLabel: string;
  otherUserAvatarUrl?: string | null;
  attachments: DmMessageAttachment[];
  reactions: DmMessageReaction[];
  currentUserId: string | null;
  showReactionPicker: boolean;
  reacting: boolean;
  onToggleReaction: (emoji: string) => void;
  onOpenReactionPicker: () => void;
  onCloseReactionPicker: () => void;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
}) {
  const trimmedText = text.trim();
  const hasAttachments = attachments.length > 0;
  const hasText = trimmedText.length > 0;

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
        {!isOwnMessage ? (
          <ProfileAvatar
            name={otherUserLabel}
            avatarUrl={otherUserAvatarUrl}
            size="sm"
          />
        ) : null}
        <div className={`min-w-0 ${isOwnMessage ? "items-end" : "items-start"} flex flex-col`}>
          <div className={`relative rounded-3xl ${highlightClass}`}>
            <div
              className={`overflow-hidden rounded-3xl ${
                isOwnMessage
                  ? "rounded-br-md border border-blue-500/40 bg-blue-600/20 text-blue-50 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                  : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-100"
              } ${hasAttachments && !hasText ? "p-1" : "px-4 py-2.5"}`}
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
                  {trimmedText}
                </p>
              ) : null}
              <time
                dateTime={createdAt}
                className={`mt-1 block w-full text-[10px] ${
                  isOwnMessage
                    ? "text-right text-blue-200/70"
                    : "text-left text-zinc-500"
                } ${hasAttachments && !hasText ? "px-1 pb-0.5" : ""}`}
              >
                {formatTime(createdAt)}
              </time>
            </div>
          </div>

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
        </div>
      </div>
    </li>
  );
}
