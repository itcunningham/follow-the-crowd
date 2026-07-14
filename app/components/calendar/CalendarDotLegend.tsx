export type CalendarDotLegendItem = {
  label: string;
  dotClassName: string;
};

export const CALENDAR_DOT_LEGEND_CLASS =
  "flex flex-wrap items-center justify-center gap-x-4 gap-y-2";

export const CALENDAR_DOT_LEGEND_ROW_CLASS = `${CALENDAR_DOT_LEGEND_CLASS} min-h-[1.125rem]`;

type CalendarDotLegendProps = {
  items?: readonly CalendarDotLegendItem[];
  rows?: readonly (readonly CalendarDotLegendItem[])[];
  ariaLabel?: string;
  className?: string;
};

function CalendarDotLegendItems({
  items,
}: {
  items: readonly CalendarDotLegendItem[];
}) {
  return items.map((item) => (
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
  ));
}

export default function CalendarDotLegend({
  items = [],
  rows,
  ariaLabel = "Calendar legend",
  className = "",
}: CalendarDotLegendProps) {
  if (rows && rows.length > 0) {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        className={["flex flex-col items-center gap-y-2", className].filter(Boolean).join(" ")}
      >
        {rows.map((rowItems, rowIndex) => (
          <div
            key={rowIndex}
            role={rowItems.length > 0 ? "list" : "presentation"}
            aria-hidden={rowItems.length === 0 ? true : undefined}
            className={CALENDAR_DOT_LEGEND_ROW_CLASS}
          >
            {rowItems.length > 0 ? <CalendarDotLegendItems items={rowItems} /> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label={ariaLabel}
      className={[CALENDAR_DOT_LEGEND_CLASS, className].filter(Boolean).join(" ")}
    >
      <CalendarDotLegendItems items={items} />
    </div>
  );
}
