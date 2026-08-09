"use client";

import { useEffect, useState } from "react";
import {
  ACCOUNT_DELETION_FAILED_MESSAGE,
  checkAccountDeletionBlockers,
  deleteAccount,
  type AccountDeletionBlockers,
} from "@/lib/accountDeletion";
import { LOGIN_PATH, signOut } from "@/lib/user/currentUser";

export default function DeleteAccountSection({
  onError,
}: {
  onError: (message: string | null) => void;
}) {
  const [warnings, setWarnings] = useState<AccountDeletionBlockers | null>(null);
  const [loadingWarnings, setLoadingWarnings] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWarnings() {
      setLoadingWarnings(true);

      try {
        const nextWarnings = await checkAccountDeletionBlockers();

        if (!cancelled) {
          setWarnings(nextWarnings);
        }
      } catch (loadError) {
        console.error("Failed to load account deletion warnings:", loadError);

        if (!cancelled) {
          setWarnings({ blocked: false, reasons: [] });
        }
      } finally {
        if (!cancelled) {
          setLoadingWarnings(false);
        }
      }
    }

    void loadWarnings();

    return () => {
      cancelled = true;
    };
  }, []);

  function openModal() {
    setConfirmation("");
    setModalError(null);
    setModalOpen(true);
    onError(null);
  }

  function closeModal() {
    if (deleting) {
      return;
    }

    setModalOpen(false);
    setConfirmation("");
    setModalError(null);
  }

  async function handleDeleteAccount() {
    if (confirmation !== "DELETE") {
      setModalError("Type DELETE exactly to confirm");
      return;
    }

    setDeleting(true);
    setModalError(null);
    onError(null);

    try {
      // Server deletion is authoritative and must not be retried.
      // Once this succeeds, the account is gone server-side.
      await deleteAccount(confirmation);

      // After server deletion succeeds, local cleanup is best-effort only.
      // Even if sign-out fails, the account is already deleted and we must navigate away.
      try {
        await signOut();
      } catch (signOutError) {
        console.error("Sign-out after successful deletion failed:", signOutError);
        // Continue to redirect; account is deleted server-side regardless
      }

      // Navigate away using replace() so Back button does not return to deleted-account Settings.
      window.location.replace(LOGIN_PATH);
    } catch (deleteError) {
      // Only server-side deletion errors should be reported as deletion failures.
      // Client-side cleanup failures do not undo server deletion and should not block navigation.
      console.error("Failed to delete account:", deleteError);
      const message =
        deleteError instanceof Error ? deleteError.message : ACCOUNT_DELETION_FAILED_MESSAGE;
      setModalError(message);
      onError(message);
      setDeleting(false);
    }
  }

  const warningItems = warnings?.reasons ?? [];

  return (
    <>
      <section className="rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-red-300">
          Account deletion
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
          Permanently delete your Follow The Crowd account and personal data. This cannot be undone. Your profile and uploaded attachments will be deleted, and you&apos;ll be signed out. Pending bookings and upcoming events you own will be cancelled. Messages you&apos;ve sent may remain as &quot;Deleted User&quot; to preserve conversations and booking history
        </p>

        {loadingWarnings ? (
          <p className="mt-4 text-sm text-ftc-text-muted">Checking account status...</p>
        ) : warningItems.length > 0 ? (
          <div className="mt-4 rounded-xl border border-0 bg-[var(--ftc-color-warning)] px-4 py-3 text-ftc-bg">
            <p className="text-sm font-medium text-ftc-bg">
              The following will be cancelled when you delete your account:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ftc-bg/90">
              {warningItems.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          disabled={loadingWarnings || deleting}
          onClick={openModal}
          className="mt-4 rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete account
        </button>
      </section>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={closeModal}
        >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-ftc-card sm:rounded-2xl sm:p-5"
          onClick={(event) => event.stopPropagation()}
        >
            <h3 id="delete-account-title" className="text-base font-semibold text-ftc-text">
              Delete your account permanently?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
              This will permanently delete your account, profile, and attachments. Pending bookings and upcoming events you own will be cancelled. Messages you&apos;ve sent may remain as &quot;Deleted User&quot; to preserve other users&apos; conversations and booking history. This cannot be undone
            </p>

            {warningItems.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
                {warningItems.map((warning) => (
                  <li key={`modal-${warning}`}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
                Type DELETE to confirm
              </span>
              <input
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={deleting}
                className="ftc-input px-3 py-2.5 disabled:cursor-not-allowed"
                placeholder="DELETE"
              />
            </label>

            {modalError ? <p className="mt-3 text-sm text-red-400">{modalError}</p> : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={closeModal}
                className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || confirmation !== "DELETE"}
                onClick={() => void handleDeleteAccount()}
                className="rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
