"use client";

import { isSoundCloudUrl } from "@/lib/user/profileFormUtils";

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-ftc-text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export default function ProfileLinkList({
  instagramUrl,
  tiktokUrl,
  soundcloudUrl,
}: {
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  soundcloudUrl?: string | null;
}) {
  const links: { href: string; label: string }[] = [];

  if (instagramUrl?.trim()) {
    links.push({ href: instagramUrl.trim(), label: "Instagram" });
  }

  if (tiktokUrl?.trim()) {
    links.push({ href: tiktokUrl.trim(), label: "TikTok" });
  }

  if (isSoundCloudUrl(soundcloudUrl)) {
    links.push({ href: soundcloudUrl!.trim(), label: "SoundCloud" });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2.5 py-2 text-xs font-medium text-ftc-text-secondary transition hover:border-ftc-primary hover:text-ftc-text"
        >
          <ExternalLinkIcon />
          <span className="truncate">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
