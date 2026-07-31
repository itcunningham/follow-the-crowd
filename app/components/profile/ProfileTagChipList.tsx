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
          className="rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-1 text-xs font-medium text-ftc-text-secondary"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
