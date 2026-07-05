"use client";

import Link from "next/link";

export default function DiscoverSectionHeader({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ftc-text">{title}</h2>
      {seeAllHref ? (
        <Link href={seeAllHref} className="text-sm font-semibold text-ftc-primary">
          See all
        </Link>
      ) : (
        <span className="text-sm font-semibold text-ftc-primary">See all</span>
      )}
    </div>
  );
}
