"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import EventArtworkTile from "@/app/components/events/EventArtworkTile";

export function formatMessagesInboxTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("en-AU", { weekday: "short" });
  }

  return date.toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
  });
}

function UnreadBadge() {
  return (
    <span
      aria-label="Unread"
      className="h-2 w-2 shrink-0 rounded-full bg-ftc-primary"
    />
  );
}

const INBOX_ROW_SURFACE_CLASS =
  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-[transform,border-color,background-color] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none active:scale-[0.98] sm:px-4 sm:py-3 md:px-5";

const INBOX_PREVIEW_GAP_CLASS = "mt-2";

const INBOX_TIMESTAMP_CLASS =
  "min-w-[3.75rem] shrink-0 pt-0.5 text-right text-xs tabular-nums leading-4";

const INBOX_TITLE_CLASS = (isUnread: boolean) =>
  `min-w-0 truncate pt-0.5 text-[15px] leading-4 ${
    isUnread ? "font-bold text-ftc-text" : "font-semibold text-ftc-text"
  }`;

const INBOX_PREVIEW_TEXT_CLASS = (isUnread: boolean) =>
  `min-w-0 flex-1 truncate text-sm leading-5 ${
    isUnread ? "font-medium text-ftc-text-secondary" : "text-ftc-text-secondary/90"
  }`;

function InboxUnreadIndicator({ isUnread }: { isUnread: boolean }) {
  return isUnread ? (
    <UnreadBadge />
  ) : (
    <span aria-hidden="true" className="h-2 w-2 shrink-0" />
  );
}

function InboxTimestamp({
  dateTime,
  isUnread,
  children,
}: {
  dateTime?: string;
  isUnread: boolean;
  children: ReactNode;
}) {
  if (!dateTime) {
    return null;
  }

  return (
    <time
      dateTime={dateTime}
      className={`${INBOX_TIMESTAMP_CLASS} ${
        isUnread ? "font-bold text-ftc-primary" : "text-ftc-text-muted"
      }`}
    >
      {children}
    </time>
  );
}

export default function MessagesInboxRow({
  displayName,
  preview,
  timestamp,
  avatarUrl,
  isUnread,
  onClick,
}: {
  displayName: string;
  preview: string;
  timestamp?: string;
  avatarUrl?: string | null;
  isUnread: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${INBOX_ROW_SURFACE_CLASS} ${
        isUnread
          ? "border-ftc-primary bg-ftc-bg-elevated"
          : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
      }`}
    >
      <div className="flex shrink-0 self-center">
        <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size="lg" className="h-12 w-12" />
      </div>

      <div className="min-w-0 flex-1 self-center">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
          <p className={INBOX_TITLE_CLASS(isUnread)}>{displayName}</p>
          {timestamp ? (
            <InboxTimestamp dateTime={timestamp} isUnread={isUnread}>
              {formatMessagesInboxTimestamp(timestamp)}
            </InboxTimestamp>
          ) : (
            <span aria-hidden="true" className={INBOX_TIMESTAMP_CLASS} />
          )}
        </div>

        <div className={`${INBOX_PREVIEW_GAP_CLASS} flex min-w-0 items-center gap-2`}>
          <p className={INBOX_PREVIEW_TEXT_CLASS(isUnread)}>{preview}</p>
          <InboxUnreadIndicator isUnread={isUnread} />
        </div>
      </div>
    </button>
  );
}

export function MessagesGroupInboxRow({
  title,
  subtitle,
  preview,
  timestamp,
  timestampLabel,
  isUnread,
  href,
  coverImageUrl,
  fallbackColour,
}: {
  title: string;
  subtitle: string;
  preview?: string | null;
  timestamp?: string;
  timestampLabel?: string;
  isUnread: boolean;
  href: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
}) {
  const timeLabel =
    timestampLabel ?? (timestamp ? formatMessagesInboxTimestamp(timestamp) : null);
  const timeDateTime = timestamp ?? timestampLabel ?? undefined;

  return (
    <Link
      href={href}
      className={`${INBOX_ROW_SURFACE_CLASS} ${
        isUnread
          ? "border-ftc-primary bg-ftc-bg-elevated"
          : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
      }`}
    >
      <div className="flex shrink-0 self-center">
        <EventArtworkTile
          eventName={title}
          coverImageUrl={coverImageUrl}
          fallbackColour={fallbackColour}
          size="inbox"
        />
      </div>

      <div className="min-w-0 flex-1 self-center">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
          <p className={INBOX_TITLE_CLASS(isUnread)}>{title}</p>
          {timeLabel ? (
            <InboxTimestamp dateTime={timeDateTime} isUnread={isUnread}>
              {timeLabel}
            </InboxTimestamp>
          ) : (
            <span aria-hidden="true" className={INBOX_TIMESTAMP_CLASS} />
          )}
        </div>

        <p className={`${INBOX_PREVIEW_GAP_CLASS} truncate text-sm leading-5 text-ftc-text-secondary/90`}>
          {subtitle}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          {preview ? (
            <p className={INBOX_PREVIEW_TEXT_CLASS(isUnread)}>{preview}</p>
          ) : (
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase leading-5 tracking-wide text-ftc-primary">
              Group chat
            </span>
          )}
          <InboxUnreadIndicator isUnread={isUnread} />
        </div>
      </div>
    </Link>
  );
}
