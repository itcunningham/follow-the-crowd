"use client";

import type { ReactNode } from "react";
import {
  DM_INCOMING_MESSAGE_COLUMN_CLASS,
  DM_INCOMING_TIMESTAMP_CLASS,
  isIncomingClusterEnd,
  type ChatMessageGroupPosition,
} from "@/lib/dm/chatMessageGroupLayout";

/** Incoming layout for 1-to-1 DMs — no per-message avatar column. */
export default function DmIncomingMessageLayout({
  className = "",
  groupPosition,
  showTimestamp,
  createdAt,
  formattedTime,
  children,
}: {
  className?: string;
  groupPosition: ChatMessageGroupPosition;
  showTimestamp: boolean;
  createdAt: string;
  formattedTime: string;
  children: ReactNode;
}) {
  const showVisibleTimestamp = isIncomingClusterEnd(groupPosition) && showTimestamp;

  return (
    <div className={`${DM_INCOMING_MESSAGE_COLUMN_CLASS} ${className}`.trim()}>
      {children}
      {showVisibleTimestamp ? (
        <time dateTime={createdAt} className={DM_INCOMING_TIMESTAMP_CLASS}>
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
