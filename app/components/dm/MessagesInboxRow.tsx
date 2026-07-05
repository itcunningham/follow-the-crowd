"use client";

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
      className="h-2.5 w-2.5 shrink-0 rounded-full bg-ftc-primary"
    />
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
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition sm:px-4 sm:py-3.5 ${
        isUnread
          ? "border-ftc-primary bg-ftc-bg-elevated"
          : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
      }`}
    >
      <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size="lg" className="h-12 w-12" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`truncate text-[15px] ${
              isUnread ? "font-bold text-ftc-text" : "font-semibold text-ftc-text"
            }`}
          >
            {displayName}
          </p>
          {timestamp ? (
            <time
              dateTime={timestamp}
              className={`shrink-0 text-xs ${
                isUnread ? "font-semibold text-ftc-primary" : "text-ftc-text-muted"
              }`}
            >
              {formatMessagesInboxTimestamp(timestamp)}
            </time>
          ) : null}
        </div>

        <div className="mt-1 flex items-end justify-between gap-2">
          <p
            className={`min-w-0 truncate text-sm ${
              isUnread ? "font-medium text-ftc-text-secondary" : "text-ftc-text-muted"
            }`}
          >
            {preview}
          </p>
          {isUnread ? <UnreadBadge /> : null}
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

  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 transition sm:px-4 sm:py-3.5 ${
        isUnread
          ? "border-ftc-primary bg-ftc-bg-elevated"
          : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
      }`}
    >
      <EventArtworkTile
        eventName={title}
        coverImageUrl={coverImageUrl}
        fallbackColour={fallbackColour}
        size="inbox"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`truncate text-[15px] ${
              isUnread ? "font-bold text-ftc-text" : "font-semibold text-ftc-text"
            }`}
          >
            {title}
          </p>
          {timeLabel ? (
            <time
              dateTime={timestamp ?? timestampLabel}
              className={`shrink-0 text-xs ${
                isUnread ? "font-semibold text-ftc-primary" : "text-ftc-text-muted"
              }`}
            >
              {timeLabel}
            </time>
          ) : null}
        </div>

        <p className="mt-1 truncate text-sm text-ftc-text-muted">{subtitle}</p>

        <div className="mt-1 flex items-end justify-between gap-2">
          {preview ? (
            <p
              className={`min-w-0 truncate text-sm ${
                isUnread ? "font-medium text-ftc-text-secondary" : "text-ftc-text-muted"
              }`}
            >
              {preview}
            </p>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
              Group chat
            </span>
          )}
          {isUnread ? <UnreadBadge /> : null}
        </div>
      </div>
    </Link>
  );
}
