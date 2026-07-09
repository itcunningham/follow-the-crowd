"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import EditProfileDiscardDialog from "@/app/components/profile/EditProfileDiscardDialog";

export default function EditProfileSetupHeader({
  backHref,
  backLabel,
  hasUnsavedChanges,
}: {
  backHref: string;
  backLabel: string;
  hasUnsavedChanges: boolean;
}) {
  const router = useRouter();
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  function navigateBack() {
    router.push(backHref);
  }

  function handleBackClick() {
    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true);
      return;
    }

    navigateBack();
  }

  return (
    <>
      <header className="-mx-4 mb-4 border-b border-ftc-border-subtle px-4 pb-3 pt-1 sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={handleBackClick}
          aria-label={backLabel}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </header>

      <EditProfileDiscardDialog
        open={discardDialogOpen}
        onKeepEditing={() => setDiscardDialogOpen(false)}
        onDiscard={() => {
          setDiscardDialogOpen(false);
          navigateBack();
        }}
      />
    </>
  );
}
