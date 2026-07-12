"use client";

import { APP_PAGE_INSET_CLASS } from "@/app/components/layout/AppPageLayout";

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
    <div className={`sticky bottom-0 z-10 shrink-0 border-t border-ftc-border-subtle bg-ftc-bg/95 backdrop-blur-md ${APP_PAGE_INSET_CLASS} py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex md:justify-center`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="ftc-btn-primary w-full px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 md:max-w-sm"
      >
        {label}
      </button>
    </div>
  );
}
