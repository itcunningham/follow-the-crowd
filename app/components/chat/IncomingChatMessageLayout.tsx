"use client";

import type { ReactNode } from "react";
import {
  CHAT_INCOMING_AVATAR_CELL_CLASS,
  CHAT_INCOMING_AVATAR_SLOT_CLASS,
  CHAT_INCOMING_BUBBLE_CELL_CLASS,
  CHAT_INCOMING_REACTIONS_CELL_CLASS,
  CHAT_INCOMING_ROW_GRID_CLASS,
  CHAT_INCOMING_TIMESTAMP_CELL_CLASS,
} from "@/lib/dm/chatMessageGroupLayout";

export default function IncomingChatMessageLayout({
  className = "",
  showAvatar,
  showTimestamp,
  avatar,
  createdAt,
  formattedTime,
  hasReactions,
  leadingContent,
  children,
  reactions,
}: {
  className?: string;
  showAvatar: boolean;
  showTimestamp: boolean;
  avatar: ReactNode;
  createdAt: string;
  formattedTime: string;
  hasReactions: boolean;
  leadingContent?: ReactNode;
  children: ReactNode;
  reactions?: ReactNode;
}) {
  const isClusterEnd = showAvatar;
  const showTimestampRow = isClusterEnd && showTimestamp;

  return (
    <div className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${className}`.trim()}>
      <div className={CHAT_INCOMING_AVATAR_CELL_CLASS}>
        {isClusterEnd ? avatar : <span aria-hidden="true" className={CHAT_INCOMING_AVATAR_SLOT_CLASS} />}
      </div>

      <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>
        {leadingContent}
        {children}
      </div>

      {showTimestampRow ? (
        <time dateTime={createdAt} className={CHAT_INCOMING_TIMESTAMP_CELL_CLASS}>
          {formattedTime}
        </time>
      ) : (
        <time dateTime={createdAt} className="sr-only">
          {formattedTime}
        </time>
      )}

      {hasReactions ? (
        <div className={CHAT_INCOMING_REACTIONS_CELL_CLASS}>{reactions}</div>
      ) : null}
    </div>
  );
}
