"use client";

import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";

export default function DmBookingTimelineNotice({
  messageId,
  text,
  createdAt,
  formatTime,
  isHighlighted = false,
  showTimestamp = true,
  compactBelow = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  showTimestamp?: boolean;
  compactBelow?: boolean;
}) {
  const formattedTime = formatTime(createdAt);

  return (
    <li
      data-chat-message-id={messageId}
      className={`flex justify-center pt-0.5 ${compactBelow ? "-mb-2 pb-0" : "pb-0.5"}`}
    >
      <div className="flex max-w-[92%] flex-col items-center px-3 text-center">
        <p
          className={`text-xs leading-snug text-ftc-text-secondary ${getChatNewMessageHighlightClass(isHighlighted)}`}
        >
          {text}
        </p>
        {showTimestamp ? (
          <time
            dateTime={createdAt}
            className="mt-1 block text-[10px] leading-none text-ftc-text-muted"
          >
            {formattedTime}
          </time>
        ) : (
          <time dateTime={createdAt} className="sr-only">
            {formattedTime}
          </time>
        )}
      </div>
    </li>
  );
}
