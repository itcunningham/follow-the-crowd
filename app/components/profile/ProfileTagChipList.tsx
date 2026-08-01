/**
 * Shared pill base for every profile tag chip — read-only display (this
 * file) and the editable genre/event-brand pickers all build on this same
 * border/background/rounding/typography so the two chip types stay visually
 * identical wherever they appear; only padding varies (editable chips are
 * taller, and an inline remove icon needs asymmetric horizontal padding).
 */
export const PROFILE_TAG_CHIP_BASE_CLASS =
  "inline-flex items-center rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated text-xs font-medium";

/**
 * Safe upper bound for one chip's overall width, regardless of viewport or
 * content. Genre tags come from a short curated list and never approach
 * this; Event Brands are free text up to 40 characters and CAN be one
 * unbroken word with no natural break point, which — with no width cap —
 * would force the chip (and the page) wider than the viewport instead of
 * wrapping. Paired with `min-w-0 truncate` (see below) so the browser is
 * actually allowed to shrink the chip below its unbroken content's natural
 * width before clipping it.
 */
export const PROFILE_TAG_CHIP_MAX_WIDTH_CLASS = "max-w-[12rem]";

/** Shared read-only chip row for profile tag lists (music genres, event brands). */
export default function ProfileTagChipList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          title={tag}
          className={`${PROFILE_TAG_CHIP_BASE_CLASS} ${PROFILE_TAG_CHIP_MAX_WIDTH_CLASS} min-w-0 truncate px-3 py-1 text-ftc-text-secondary`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
