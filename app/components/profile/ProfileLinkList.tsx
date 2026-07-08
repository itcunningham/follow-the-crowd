"use client";

import { getMusicLinkLabel } from "@/lib/user/profileFormUtils";

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-ftc-text-muted"
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
  soundcloudUrl,
  websiteUrl,
}: {
  instagramUrl?: string | null;
  soundcloudUrl?: string | null;
  websiteUrl?: string | null;
}) {
  const links: { href: string; label: string }[] = [];

  if (instagramUrl?.trim()) {
    links.push({ href: instagramUrl.trim(), label: "Instagram" });
  }

  if (soundcloudUrl?.trim()) {
    const label = getMusicLinkLabel(soundcloudUrl.trim()) ?? "SoundCloud";
    links.push({ href: soundcloudUrl.trim(), label });
  }

  if (websiteUrl?.trim()) {
    links.push({ href: websiteUrl.trim(), label: "Website" });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-sm font-medium text-ftc-text transition hover:border-ftc-border-strong"
        >
          <span>{link.label}</span>
          <ExternalLinkIcon />
        </a>
      ))}
    </div>
  );
}
