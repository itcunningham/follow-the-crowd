"use client";

import Link from "next/link";

export default function EventDetailBottomBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md md:bottom-0">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">{children}</div>
    </div>
  );
}

export function EventDetailPrimaryAction({
  onClick,
  href,
  disabled,
  children,
}: {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const className =
    "ftc-btn-primary w-full px-5 py-3.5 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

export function EventDetailSecondaryAction({
  onClick,
  href,
  children,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const className = "ftc-btn-secondary w-full px-5 py-3 text-sm uppercase tracking-wide";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
