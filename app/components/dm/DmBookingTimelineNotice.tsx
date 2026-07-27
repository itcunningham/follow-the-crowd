"use client";

import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";

export default function DmBookingTimelineNotice({
  messageId,
  text,
  createdAt,
  formatTime,
  isHighlighted = false,
  compactBelow = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  compactBelow?: boolean;
}) {
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
        <time dateTime={createdAt} className="sr-only">
          {formatTime(createdAt)}
        </time>
      </div>
    </li>
  );
}
