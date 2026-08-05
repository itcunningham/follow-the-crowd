"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

/** Rounded back-chevron button in a chat header (DM, Crew Chat).
 * Extracted from DmConversationHeader so GroupChatHeader's back button
 * doesn't duplicate it. */
export default function ChatBackButton({
  href,
  label = "Back to inbox",
  replace = false,
  onClick,
}: {
  href: string;
  label?: string;
  replace?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      replace={replace}
      scroll={false}
      aria-label={label}
      onClick={onClick}
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
