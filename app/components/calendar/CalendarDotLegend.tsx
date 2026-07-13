export type CalendarDotLegendItem = {
  label: string;
  dotClassName: string;
};

export const CALENDAR_DOT_LEGEND_CLASS =
  "flex flex-wrap items-center justify-center gap-x-4 gap-y-2";

type CalendarDotLegendProps = {
  items: readonly CalendarDotLegendItem[];
  ariaLabel?: string;
  className?: string;
};

export default function CalendarDotLegend({
  items,
  ariaLabel = "Calendar legend",
  className = "",
}: CalendarDotLegendProps) {
  return (
    <div
      role="list"
      aria-label={ariaLabel}
      className={[CALENDAR_DOT_LEGEND_CLASS, className].filter(Boolean).join(" ")}
    >
      {items.map((item) => (
        <span
          key={item.label}
          role="listitem"
          className="inline-flex items-center gap-1.5 text-xs text-ftc-text-secondary"
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClassName}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
