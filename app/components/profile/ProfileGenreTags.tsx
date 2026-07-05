"use client";

import { parseGenreTags } from "@/app/components/profile/parseGenreTags";

export default function ProfileGenreTags({ genre }: { genre: string | null | undefined }) {
  const tags = parseGenreTags(genre);

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-1 text-xs font-medium text-ftc-text-secondary"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
