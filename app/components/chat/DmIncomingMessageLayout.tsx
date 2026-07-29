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

/** Incoming layout for 1-to-1 DMs — reserved avatar column, no per-message sender labels. */
export default function DmIncomingMessageLayout({
  className = "",
  groupPosition,
  showTimestamp,
  showAvatar,
  avatar,
  createdAt,
  formattedTime,
  children,
}: {
  className?: string;
  groupPosition: ChatMessageGroupPosition;
  showTimestamp: boolean;
  showAvatar: boolean;
  avatar: ReactNode;
  createdAt: string;
  formattedTime: string;
  children: ReactNode;
}) {
  const isClusterEnd = isIncomingClusterEnd(groupPosition);
  const showVisibleTimestamp = isClusterEnd && showTimestamp;

  if (isClusterEnd) {
    return (
      <div
        className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS} ${className}`.trim()}
      >
        <div className={CHAT_INCOMING_AVATAR_CELL_CLASS}>
          {showAvatar ? avatar : <span aria-hidden="true" className={CHAT_INCOMING_AVATAR_SLOT_CLASS} />}
        </div>

        <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>{children}</div>

        {showVisibleTimestamp ? (
          <time dateTime={createdAt} className={CHAT_INCOMING_TIMESTAMP_CELL_CLASS}>
            {formattedTime}
          </time>
        ) : (
          <time dateTime={createdAt} hidden>
            {formattedTime}
          </time>
        )}
      </div>
    );
  }

  return (
    <div className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${className}`.trim()}>
      <div className="col-start-1 row-start-1 justify-self-center self-start">
        <span aria-hidden="true" className={CHAT_INCOMING_AVATAR_SLOT_CLASS} />
      </div>

      <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>{children}</div>

      <time dateTime={createdAt} hidden>
        {formattedTime}
      </time>
    </div>
  );
}
