"use client";

import Link from "next/link";

type ActionIcon = "send" | "chat";

const actionCardClassName = [
  "group relative flex min-h-[3.25rem] w-full min-w-0 flex-1 items-center gap-3 rounded-xl border border-ftc-border-subtle px-3.5 py-3 text-left transition",
  "bg-gradient-to-br from-[#171d28] via-[#141a24] to-[#111820] shadow-[0_4px_18px_rgb(0_0_0/0.28)]",
  "hover:-translate-y-px hover:border-ftc-border-strong hover:shadow-[0_8px_22px_rgb(0_0_0/0.34)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

const actionIconWrapClassName =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated/80 text-ftc-primary";

const actionTitleClassName =
  "min-w-0 flex-1 truncate text-sm font-semibold text-ftc-text-secondary group-hover:text-ftc-text";

function ActionIconGlyph({ icon }: { icon: ActionIcon }) {
  if (icon === "send") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path
          d="M22 2 11 13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 2 15 22l-4-9-9-4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path
        d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 2 2 0 0 1-1.8 1.1h-3.7l-3 3v-3H8a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-ftc-text-muted transition group-hover:text-ftc-primary/80 group-focus-visible:text-ftc-primary/80"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EventDetailActionCard({
  icon,
  href,
  onClick,
  disabled,
  children,
}: {
  icon: ActionIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <span className={actionIconWrapClassName}>
        <ActionIconGlyph icon={icon} />
      </span>
      <span className={actionTitleClassName}>{children}</span>
      <ActionChevron />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={actionCardClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={actionCardClassName}>
      {content}
    </button>
  );
}

export default function EventDetailBottomBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md md:bottom-0">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3">
        {children}
      </div>
    </div>
  );
}

export function EventDetailPrimaryAction({
  onClick,
  href,
  disabled,
  icon = "send",
  children,
}: {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: ActionIcon;
  children: React.ReactNode;
}) {
  return (
    <EventDetailActionCard
      icon={icon}
      href={href}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </EventDetailActionCard>
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
  return (
    <EventDetailActionCard icon="chat" href={href} onClick={onClick}>
      {children}
    </EventDetailActionCard>
  );
}
