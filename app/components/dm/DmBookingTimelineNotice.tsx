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
      className={`flex justify-center pt-0 ${compactBelow ? "pb-1" : "pb-0"}`}
    >
      <div className="flex max-w-[88%] flex-col items-center px-2 text-center">
        <p
          className={`text-[11px] font-normal leading-snug tracking-wide text-ftc-text-muted/85 ${getChatNewMessageHighlightClass(isHighlighted)}`}
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
