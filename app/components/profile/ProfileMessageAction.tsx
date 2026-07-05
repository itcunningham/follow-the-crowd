"use client";

export default function ProfileMessageAction({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 shrink-0 border-t border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="ftc-btn-primary w-full px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  );
}
