"use client";

export default function ChatNewMessagesPill({
  count = 1,
  onClick,
}: {
  count?: number;
  onClick: () => void;
}) {
  const text = count > 1 ? "New messages" : "New message";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2.5 flex justify-center px-4"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Scroll to ${text.toLowerCase()}`}
        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-ftc-border-subtle bg-ftc-surface px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-ftc-text transition hover:border-ftc-border-strong active:scale-[0.98]"
      >
        <span>{text}</span>
        <span className="text-ftc-primary" aria-hidden="true">
          ↓
        </span>
      </button>
    </div>
  );
}
