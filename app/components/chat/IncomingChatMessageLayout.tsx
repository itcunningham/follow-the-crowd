"use client";

import type { ReactNode } from "react";
import {
  CHAT_INCOMING_AVATAR_CELL_CLASS,
  CHAT_INCOMING_AVATAR_SLOT_CLASS,
  CHAT_INCOMING_BUBBLE_CELL_CLASS,
  CHAT_INCOMING_ROW_GRID_CLASS,
  isIncomingClusterEnd,
  type ChatMessageGroupPosition,
} from "@/lib/dm/chatMessageGroupLayout";

/**
 * Incoming layout for group chats — reserved avatar column plus an optional
 * per-message sender label.
 *
 * Carries no visible timestamp: day separators and the grouped time
 * separators between clusters already say when a message was sent, so a
 * per-message time under every avatar repeated it and cluttered the column.
 * The `<time>` is kept in the DOM (hidden) so each row still carries its own
 * machine-readable timestamp — same shape as DmIncomingMessageLayout, which
 * dropped its visible timestamp for the same reason.
 */
export default function IncomingChatMessageLayout({
  className = "",
  groupPosition,
  avatar,
  createdAt,
  formattedTime,
  leadingContent,
  children,
}: {
  className?: string;
  groupPosition: ChatMessageGroupPosition;
  avatar: ReactNode;
  createdAt: string;
  formattedTime: string;
  leadingContent?: ReactNode;
  children: ReactNode;
}) {
  const isClusterEnd = isIncomingClusterEnd(groupPosition);

  if (isClusterEnd) {
    return (
      <div className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${className}`.trim()}>
        <div className={CHAT_INCOMING_AVATAR_CELL_CLASS}>{avatar}</div>

        <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>
          {leadingContent}
          {children}
        </div>

        <time dateTime={createdAt} hidden>
          {formattedTime}
        </time>
      </div>
    );
  }

  return (
    <div className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${className}`.trim()}>
      <div className="col-start-1 row-start-1 justify-self-center self-start">
        <span aria-hidden="true" className={CHAT_INCOMING_AVATAR_SLOT_CLASS} />
      </div>

      <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>
        {leadingContent}
        {children}
      </div>

      <time dateTime={createdAt} hidden>
        {formattedTime}
      </time>
    </div>
  );
}
