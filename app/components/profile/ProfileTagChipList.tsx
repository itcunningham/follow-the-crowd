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
 * wrapping.
 */
export const PROFILE_TAG_CHIP_MAX_WIDTH_CLASS = "max-w-[12rem]";

/**
 * Adaptive text treatment for a read-only chip: short names stay on one
 * line, longer ones wrap onto a second, and only a name still too long at
 * two lines gets an ellipsis (`-webkit-line-clamp` adds one *only* when it
 * actually clips). At 12rem two lines hold ~60 characters, comfortably more
 * than the 40-character `MAX_EVENT_BRAND_NAME_LENGTH`, so in practice every
 * valid brand is fully readable on the profile itself — no tap, tooltip, or
 * sheet needed to read one.
 *
 * `overflow-wrap: anywhere` (not `break-word`) is load-bearing: only
 * `anywhere` also shrinks the element's *min-content* width, which is what
 * lets a single unbroken 40-character word wrap inside the 12rem cap
 * instead of forcing the chip — and the page — wider than the viewport.
 * Same idiom as `DmBookingCardLayout`'s long-value text.
 */
export const PROFILE_TAG_CHIP_TEXT_CLASS = "line-clamp-2 [overflow-wrap:anywhere]";

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
          className={`${PROFILE_TAG_CHIP_BASE_CLASS} ${PROFILE_TAG_CHIP_MAX_WIDTH_CLASS} px-3 py-1 text-ftc-text-secondary`}
        >
          <span className={PROFILE_TAG_CHIP_TEXT_CLASS}>{tag}</span>
        </span>
      ))}
    </div>
  );
}
