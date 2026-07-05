"use client";

export function BookingDetailItem({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-words text-sm ${muted ? "text-ftc-text-muted" : "text-ftc-text-secondary"}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default function BookingDetailGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <dl className={`grid gap-3 text-sm ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {children}
    </dl>
  );
}
