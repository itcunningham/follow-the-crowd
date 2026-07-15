"use client";

import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";

export default function GroupChatSystemNotice({
  messageId,
  text,
  createdAt,
  formatTime,
  isHighlighted = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
}) {
  return (
    <li
      data-chat-message-id={messageId}
      className="flex justify-center"
    >
      <div className="max-w-sm px-3 py-1 text-center">
        <p
          className={`rounded-full border border-ftc-border bg-ftc-bg-elevated/50 px-3 py-1.5 text-xs text-ftc-text-muted ${getChatNewMessageHighlightClass(isHighlighted)}`}
        >
          {text}
        </p>
        <time
          dateTime={createdAt}
          className="mt-1 block text-[10px] text-ftc-text-muted"
        >
          {formatTime(createdAt)}
        </time>
      </div>
    </li>
  );
}
