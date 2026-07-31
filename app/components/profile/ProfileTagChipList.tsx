/**
 * Shared pill base for every profile tag chip — read-only display (this
 * file) and the editable genre/event-brand pickers all build on this same
 * border/background/rounding/typography so the two chip types stay visually
 * identical wherever they appear; only padding varies (editable chips are
 * taller, and an inline remove icon needs asymmetric horizontal padding).
 */
export const PROFILE_TAG_CHIP_BASE_CLASS =
  "inline-flex items-center rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated text-xs font-medium";

/** Shared read-only chip row for profile tag lists (music genres, event brands). */
export default function ProfileTagChipList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className={`${PROFILE_TAG_CHIP_BASE_CLASS} px-3 py-1 text-ftc-text-secondary`}>
          {tag}
        </span>
      ))}
    </div>
  );
}
