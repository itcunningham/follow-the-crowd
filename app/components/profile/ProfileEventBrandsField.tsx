"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyEventBrandNameInputLimit,
  MAX_PROMOTER_EVENT_BRANDS,
} from "@/lib/user/profileFormUtils";
import {
  PROFILE_TAG_CHIP_BASE_CLASS,
  PROFILE_TAG_CHIP_MAX_WIDTH_CLASS,
} from "@/app/components/profile/ProfileTagChipList";

export default function ProfileEventBrandsField({
  brands,
  onAddBrand,
  onRemoveBrand,
  error,
}: {
  brands: string[];
  onAddBrand: (rawName: string) => void;
  onRemoveBrand: (brand: string) => void;
  error?: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = brands.length >= MAX_PROMOTER_EVENT_BRANDS;

  useEffect(() => {
    if (adding) {
      inputRef.current?.focus();
    }
  }, [adding]);

  function commitDraft() {
    const trimmed = draftName.trim();

    if (!trimmed) {
      setAdding(false);
      setDraftName("");
      return;
    }

    onAddBrand(trimmed);
    setDraftName("");
    setAdding(false);
  }

  function cancelDraft() {
    setAdding(false);
    setDraftName("");
  }

  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        Event brands
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {brands.map((brand) => (
          <span
            key={brand}
            className={`${PROFILE_TAG_CHIP_BASE_CLASS} ${PROFILE_TAG_CHIP_MAX_WIDTH_CLASS} gap-1.5 py-1.5 pl-3 pr-2 text-ftc-text`}
          >
            <span className="min-w-0 truncate">{brand}</span>
            <button
              type="button"
              onClick={() => onRemoveBrand(brand)}
              aria-label={`Remove ${brand}`}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ftc-text-muted transition hover:text-ftc-text"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {adding ? (
          <span className="inline-flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={draftName}
              onChange={(event) =>
                setDraftName((current) =>
                  applyEventBrandNameInputLimit(current, event.target.value) ?? current,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraft();
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelDraft();
                }
              }}
              onBlur={commitDraft}
              placeholder="Brand name"
              className="ftc-input h-8 w-40 px-3 py-1.5 text-xs"
            />
          </span>
        ) : !atLimit ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center rounded-full border border-dashed border-ftc-border-strong px-3 py-1.5 text-xs font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
          >
            + Add brand
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-ftc-text-muted">
        {brands.length} / {MAX_PROMOTER_EVENT_BRANDS} brands
      </p>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
