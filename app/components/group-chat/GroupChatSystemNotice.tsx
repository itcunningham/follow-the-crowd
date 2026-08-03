"use client";

import { memo } from "react";
import { getChatNewMessageHighlightClass } from "@/lib/chatNewMessageHighlight";
import {
  GROUP_CHAT_SYSTEM_CARD_AFTER_TIMESTAMP_SPACING_CLASS,
  GROUP_CHAT_SYSTEM_CARD_SPACING_CLASS,
} from "@/lib/dm/chatMessageGroupLayout";

function GroupChatSystemNotice({
  messageId,
  text,
  createdAt,
  formatTime,
  isHighlighted = false,
  precededByTimeSeparator = false,
}: {
  messageId: string;
  text: string;
  createdAt: string;
  formatTime: (timestamp: string) => string;
  isHighlighted?: boolean;
  /** A centred day/time separator already sits directly above this row. */
  precededByTimeSeparator?: boolean;
}) {
  // Same group-separating spacing the Event Updated card already uses. These
  // notices are timeline rows too — "X joined the crew", booking changes — and
  // at the old `py-0.5` (2px) they sat as tight against the surrounding
  // messages as two messages from one sender do, so they read as part of
  // whichever run they landed in. The shared token keeps every app-authored
  // row separating message groups by the same amount. Alignment is unchanged:
  // this row stays centred, the Event Updated card stays left-aligned.
  //
  // The same exception applies too: a centred separator directly above is
  // already a break, so stacking the full gap on top of it would leave a hole.
  return (
    <li
      data-chat-message-id={messageId}
      className={`flex justify-center ${
        precededByTimeSeparator
          ? GROUP_CHAT_SYSTEM_CARD_AFTER_TIMESTAMP_SPACING_CLASS
          : GROUP_CHAT_SYSTEM_CARD_SPACING_CLASS
      }`}
    >
      {/* Capped to a normal chat bubble's width. `max-w-[92%]` let a long
          notice run WIDER than any message in the conversation (own bubbles cap
          at 85%/72%, incoming at 88%/78%), so the one row nobody wrote was also
          the widest thing on screen. The Event Updated card needed no such cap:
          measured 263.5px against a 311.1px widest bubble at 390px, and
          306.7px against 450px at 1280px — already the narrower of the two. */}
      <div className="inline-flex max-w-[85%] flex-col items-center sm:max-w-[72%]">
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
