"use client";

export const DISCOVER_GENRE_FILTERS = ["All", "Techno", "House", "Breaks", "Ambient"] as const;

export type DiscoverGenreFilter = (typeof DISCOVER_GENRE_FILTERS)[number];

export default function DiscoverGenreChips({
  active,
  onChange,
}: {
  active: DiscoverGenreFilter;
  onChange: (genre: DiscoverGenreFilter) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      <div className="flex w-max gap-2 pb-1">
        {DISCOVER_GENRE_FILTERS.map((genre) => {
          const isActive = active === genre;

          return (
            <button
              key={genre}
              type="button"
              onClick={() => onChange(genre)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-ftc-primary text-ftc-bg"
                  : "border border-ftc-border-subtle bg-ftc-surface text-ftc-text hover:border-ftc-border-strong"
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );
}
