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
      setModalError("Type DELETE exactly to confirm.");
      return;
    }

    setDeleting(true);
    setModalError(null);
    onError(null);

    try {
      await deleteAccount(confirmation);
      await signOut();
      window.location.href = LOGIN_PATH;
    } catch (deleteError) {
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
      <section className="rounded-2xl border border-red-500/30 bg-red-950/10 p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-red-300">
          Danger zone
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
          Permanently delete your Follow The Crowd account and personal app data. This
          removes your profile, signs you out, deletes attachments you uploaded, and
          cannot be undone. Pending bookings and draft or upcoming events you own will be
          cancelled automatically. Messages you sent may remain in conversations as
          &quot;Deleted User&quot; so other users&apos; chats and booking history stay
          intact.
        </p>

        {loadingWarnings ? (
          <p className="mt-4 text-sm text-ftc-text-muted">Checking account status...</p>
        ) : warningItems.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-100">
              The following will be cancelled automatically when you delete your account:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
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
          className="mt-4 rounded-xl border border-red-500/45 bg-red-600/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-red-200 transition hover:border-red-400/60 hover:bg-red-600/25 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-red-500/30 bg-ftc-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-ftc-card sm:rounded-2xl sm:p-5"
          onClick={(event) => event.stopPropagation()}
        >
            <h3 id="delete-account-title" className="text-base font-semibold text-ftc-text">
              Delete your account permanently?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
              This permanently removes your account, profile, attachments you uploaded,
              notifications, blocks, and your side of personal app data. Pending booking
              requests and accepted bookings on upcoming events involving you will be
              cancelled. Draft or upcoming events you own will be cancelled or removed.
              Other users&apos; completed history is preserved. Messages you sent may
              remain as &quot;Deleted User&quot;. This cannot be undone.
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
                className="w-full rounded-xl border border-ftc-border bg-ftc-surface/70 px-3 py-2.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-red-500/40 disabled:opacity-50"
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
                className="rounded-xl border border-red-500/45 bg-red-600/15 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-red-200 transition hover:border-red-400/60 hover:bg-red-600/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
