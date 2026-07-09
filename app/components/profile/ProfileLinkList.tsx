"use client";

import { isSoundCloudUrl } from "@/lib/user/profileFormUtils";

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
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
    <nav aria-label="Profile links" className="ftc-profile-link-pills">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="ftc-profile-link-pill"
        >
          <ExternalLinkIcon />
          <span>{link.label}</span>
        </a>
      ))}
    </nav>
  );
}
