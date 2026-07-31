"use client";

/**
 * Optional single-select brand chip row for event creation. Reuses the promoter's saved
 * Event Brands (profile) chip styling. Renders nothing when the promoter has no saved
 * brands — never blocks or requires a brand.
 */
export default function EventBrandSelectField({
  brands,
  selectedBrand,
  onSelectBrand,
}: {
  brands: string[];
  selectedBrand: string | null;
  onSelectBrand: (brand: string | null) => void;
}) {
  if (brands.length === 0) {
    return null;
  }

  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        Event brand
      </span>

      <div className="flex flex-wrap gap-2">
        {brands.map((brand) => {
          const isSelected = brand === selectedBrand;

          return (
            <button
              key={brand}
              type="button"
              onClick={() => onSelectBrand(isSelected ? null : brand)}
              aria-pressed={isSelected}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? "border-ftc-primary bg-ftc-bg-elevated text-ftc-text"
                  : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong hover:text-ftc-text"
              }`}
            >
              {brand}
            </button>
          );
        })}
      </div>
    </div>
  );
}
