"use client";

import { memo } from "react";
import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";

function GroupChatSystemNotice({
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
      <div className="inline-flex max-w-[92%] flex-col items-center">
        <p
          className={`inline-block w-fit max-w-full rounded-full border border-ftc-border bg-ftc-bg-elevated/50 px-3 py-1.5 text-center text-xs text-ftc-text-muted ${getChatNewMessageHighlightClass(isHighlighted)}`}
        >
          {text}
        </p>
        {/* Hidden, matching DM and every other crew-chat row: the centred
            day/time separators are the only visible times in either
            conversation type. Kept in the DOM for machine readability. */}
        <time dateTime={createdAt} hidden>
          {formatTime(createdAt)}
        </time>
      </div>
    </li>
  );
}

/** Hundreds of messages means most system notices never change between renders — memo skips them. */
export default memo(GroupChatSystemNotice);
