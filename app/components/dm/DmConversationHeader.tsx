"use client";

import Link from "next/link";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { SkeletonBlock } from "@/app/components/skeleton/Skeleton";

function ChatBackButton({ href, label = "Back to inbox" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}

function ChatDetailsMenuButton({
  conversationTitle,
  onClick,
}: {
  conversationTitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Open conversation details for ${conversationTitle}`}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </svg>
    </button>
  );
}

export default function DmConversationHeader({
  backHref,
  backLabel = "Back to inbox",
  loading = false,
  conversationTitle,
  avatarName,
  avatarUrl,
  otherUserId,
  onOpenDetails,
}: {
  backHref: string;
  backLabel?: string;
  loading?: boolean;
  conversationTitle: string;
  avatarName: string;
  avatarUrl?: string | null;
  otherUserId: string | null;
  onOpenDetails?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ChatBackButton href={backHref} label={backLabel} />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {loading ? (
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
        ) : otherUserId ? (
          <Link
            href={`/profile/${otherUserId}`}
            aria-label={`View ${avatarName}'s profile`}
            className="shrink-0 rounded-full transition hover:ring-2 hover:ring-ftc-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary"
          >
            <ProfileAvatar
              name={avatarName}
              avatarUrl={avatarUrl}
              size="md"
              className="h-10 w-10 text-xs"
            />
          </Link>
        ) : (
          <ProfileAvatar
            name={avatarName}
            avatarUrl={avatarUrl}
            size="md"
            className="h-10 w-10 text-xs"
          />
        )}
        <div className="min-w-0 flex-1">
          {loading ? (
            <SkeletonBlock className="h-4 w-32 max-w-[40vw]" />
          ) : (
            <h1 className="truncate text-base font-semibold text-ftc-text">{conversationTitle}</h1>
          )}
        </div>
      </div>

      {!loading && otherUserId && onOpenDetails ? (
        <ChatDetailsMenuButton conversationTitle={conversationTitle} onClick={onOpenDetails} />
      ) : null}
    </div>
  );
}
