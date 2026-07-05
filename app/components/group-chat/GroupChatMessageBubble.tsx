"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";

export default function GroupChatMessageBubble({
  messageId,
  text,
  createdAt,
  isOwnMessage,
  senderLabel,
  senderAvatarUrl,
  formatTime,
  isHighlighted = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  isOwnMessage: boolean;
  senderLabel: string;
  senderAvatarUrl?: string | null;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
}) {
  const highlightClass = getChatNewMessageHighlightClass(isHighlighted);

  return (
    <li
      data-chat-message-id={messageId}
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[88%] items-end gap-2 sm:max-w-[78%] ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwnMessage ? (
          <ProfileAvatar name={senderLabel} avatarUrl={senderAvatarUrl} size="sm" />
        ) : null}

        <div className={`flex min-w-0 flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
          {!isOwnMessage ? (
            <p className="mb-1 px-1 text-[11px] font-semibold text-ftc-text-secondary">
              {senderLabel}
            </p>
          ) : null}

          <div className={`relative max-w-full ${highlightClass}`}>
            <div
              className={
                isOwnMessage ? "ftc-bubble-own px-4 py-2.5" : "ftc-bubble-other px-4 py-2.5"
              }
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{text}</p>
            </div>
          </div>

          <time
            dateTime={createdAt}
            className={`mt-1 block px-1 text-[10px] text-ftc-text-muted ${
              isOwnMessage ? "text-right" : "text-left"
            }`}
          >
            {formatTime(createdAt)}
          </time>
        </div>
      </div>
    </li>
  );
}
