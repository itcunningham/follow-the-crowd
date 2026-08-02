"use client";

/** Round icon button beside a chat composer's text field (e.g. "Add photo").
 * Extracted from DmComposer so GroupChatComposer's photo button doesn't
 * duplicate it. */
export default function ComposerIconButton({
  label,
  disabled,
  onClick,
  children,
  className = "",
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
