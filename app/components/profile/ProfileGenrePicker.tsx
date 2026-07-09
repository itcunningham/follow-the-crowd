"use client";

import { useEffect, useMemo, useState } from "react";
import { MAX_PROFILE_GENRE_TAGS, PROFILE_GENRE_OPTIONS } from "@/lib/user/profileFormUtils";

export default function ProfileGenrePicker({
  selectedTags,
  onToggleTag,
  error,
}: {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  error?: string | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const atLimit = selectedTags.length >= MAX_PROFILE_GENRE_TAGS;

  const filteredGenres = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return [...PROFILE_GENRE_OPTIONS];
    }

    return PROFILE_GENRE_OPTIONS.filter((genre) => genre.toLowerCase().includes(query));
  }, [searchQuery]);

  useEffect(() => {
    if (!sheetOpen) {
      setSearchQuery("");
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheetOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sheetOpen]);

  function handleSheetToggle(tag: string) {
    const isSelected = selectedTags.includes(tag);

    if (!isSelected && atLimit) {
      return;
    }

    onToggleTag(tag);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        Music genres
      </span>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-label={`Remove ${tag}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-ftc-primary bg-ftc-bg-elevated px-3 py-1.5 text-xs font-medium text-ftc-text transition hover:border-ftc-border-strong"
            >
              <span>{tag}</span>
              <span aria-hidden="true" className="text-ftc-text-muted">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-3 rounded-xl border border-ftc-border-strong bg-ftc-bg-elevated/60 px-4 py-2.5 text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated"
      >
        Add genres
      </button>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-genre-picker-title"
            className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated shadow-ftc-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-ftc-border-subtle px-4 pb-4 pt-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="profile-genre-picker-title" className="text-base font-semibold text-ftc-text">
                    Music genres
                  </h2>
                  <p className="mt-1 text-xs text-ftc-text-muted">
                    {selectedTags.length} of {MAX_PROFILE_GENRE_TAGS} selected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-lg border border-ftc-border-subtle px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
                >
                  Done
                </button>
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search genres"
                className="ftc-input mt-4 px-3.5 py-2.5"
              />

              {atLimit ? (
                <p className="mt-3 text-xs text-ftc-text-muted">
                  You can select up to 8 genres.
                </p>
              ) : null}
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
              {filteredGenres.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-ftc-text-muted">No genres found.</li>
              ) : (
                filteredGenres.map((genre) => {
                  const isSelected = selectedTags.includes(genre);
                  const isDisabled = !isSelected && atLimit;

                  return (
                    <li key={genre}>
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleSheetToggle(genre)}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isSelected
                            ? "border border-ftc-primary bg-ftc-bg-elevated text-ftc-text"
                            : "border border-transparent text-ftc-text-secondary hover:border-ftc-border-subtle hover:bg-ftc-surface/60 hover:text-ftc-text"
                        }`}
                      >
                        <span>{genre}</span>
                        {isSelected ? (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 shrink-0 text-ftc-primary"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="border-t border-ftc-border-subtle p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full ftc-btn-primary px-4 py-3 text-sm uppercase tracking-wide"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
