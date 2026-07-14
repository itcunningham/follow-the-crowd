"use client";

import Link from "next/link";
import { FTC_PAGE_SECTION_TITLE_CLASS } from "@/lib/design/ftcDesignSystem";

export default function DiscoverSectionHeader({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className={FTC_PAGE_SECTION_TITLE_CLASS}>{title}</h2>
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
