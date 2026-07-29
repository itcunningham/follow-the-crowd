"use client";

import type { ReactNode } from "react";
import {
  CHAT_INCOMING_AVATAR_CELL_CLASS,
  CHAT_INCOMING_AVATAR_SLOT_CLASS,
  CHAT_INCOMING_BUBBLE_CELL_CLASS,
  CHAT_INCOMING_ROW_GRID_CLASS,
  CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS,
  CHAT_INCOMING_TIMESTAMP_CELL_CLASS,
  isIncomingClusterEnd,
  type ChatMessageGroupPosition,
} from "@/lib/dm/chatMessageGroupLayout";

export default function IncomingChatMessageLayout({
  className = "",
  groupPosition,
  showTimestamp,
  avatar,
  createdAt,
  formattedTime,
  leadingContent,
  children,
}: {
  className?: string;
  groupPosition: ChatMessageGroupPosition;
  showTimestamp: boolean;
  avatar: ReactNode;
  createdAt: string;
  formattedTime: string;
  leadingContent?: ReactNode;
  children: ReactNode;
}) {
  const isClusterEnd = isIncomingClusterEnd(groupPosition);

  if (isClusterEnd) {
    return (
      <div
        className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS} ${className}`.trim()}
      >
        <div className={CHAT_INCOMING_AVATAR_CELL_CLASS}>{avatar}</div>

        <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>
          {leadingContent}
          {children}
        </div>

        <time
          dateTime={createdAt}
          className={`${CHAT_INCOMING_TIMESTAMP_CELL_CLASS} ${showTimestamp ? "" : "sr-only"}`}
        >
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
