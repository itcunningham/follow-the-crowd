"use client";

import type { ReactNode } from "react";
import type { ChatMessageBubbleShellLayout } from "@/app/components/chat/ChatMessageBubbleShell";
import {
  CHAT_INCOMING_AVATAR_CELL_CLASS,
  CHAT_INCOMING_AVATAR_SLOT_CLASS,
  CHAT_INCOMING_BUBBLE_CELL_CLASS,
  CHAT_INCOMING_ROW_GRID_CLASS,
  CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS,
  isIncomingClusterEnd,
  type ChatMessageGroupPosition,
} from "@/lib/dm/chatMessageGroupLayout";

/** Incoming layout for 1-to-1 DMs — reserved avatar column, no per-message sender labels. */
export default function DmIncomingMessageLayout({
  className = "",
  groupPosition,
  showAvatar,
  avatar,
  createdAt,
  formattedTime,
  shellLayout = "stacked",
  children,
}: {
  className?: string;
  groupPosition: ChatMessageGroupPosition;
  showAvatar: boolean;
  avatar: ReactNode;
  createdAt: string;
  formattedTime: string;
  /** When grid-participant, bubble + reaction gutter are direct grid children (row 1 + row 2). */
  shellLayout?: ChatMessageBubbleShellLayout;
  children: ReactNode;
}) {
  const isClusterEnd = isIncomingClusterEnd(groupPosition);
  const useReactionGutterRow = isClusterEnd && shellLayout === "grid-participant";

  if (isClusterEnd) {
    return (
      <div
        className={`${CHAT_INCOMING_ROW_GRID_CLASS} ${useReactionGutterRow ? CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS : ""} ${className}`.trim()}
      >
        <div className={CHAT_INCOMING_AVATAR_CELL_CLASS}>
          {showAvatar ? avatar : <span aria-hidden="true" className={CHAT_INCOMING_AVATAR_SLOT_CLASS} />}
        </div>

        {useReactionGutterRow ? (
          children
        ) : (
          <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>{children}</div>
        )}

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

      <div className={CHAT_INCOMING_BUBBLE_CELL_CLASS}>{children}</div>

      <time dateTime={createdAt} hidden>
        {formattedTime}
      </time>
    </div>
  );
}
