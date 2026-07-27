"use client";

import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";

export default function DmBookingTimelineNotice({
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
    <li data-chat-message-id={messageId} className="flex justify-center py-0.5">
      <div className="flex max-w-[92%] flex-col items-center px-3 text-center">
        <p
          className={`text-xs leading-snug text-ftc-text-secondary ${getChatNewMessageHighlightClass(isHighlighted)}`}
        >
          {text}
        </p>
        <time
          dateTime={createdAt}
          className="mt-1 block text-[10px] leading-none text-ftc-text-muted"
        >
          {formatTime(createdAt)}
        </time>
      </div>
    </li>
  );
}
