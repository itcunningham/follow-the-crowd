"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DmReportFormModal from "@/app/components/dm/DmReportFormModal";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { submitDmUserReport, type DmReportReason } from "@/lib/userReports";
import { getRoleLabel, getUserProfileById, type UserProfile } from "@/lib/user/currentUser";

export default function DmConversationDetailsPanel({
  open,
  conversationId,
  otherUserId,
  otherUserName,
  otherUserAvatarUrl,
  blockedByMe,
  busy,
  onClose,
  onBlock,
  onUnblock,
}: {
  open: boolean;
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  blockedByMe: boolean;
  busy: boolean;
  onClose: () => void;
  onBlock: () => Promise<void>;
  onUnblock: () => Promise<void>;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      setReportOpen(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const nextProfile = await getUserProfileById(otherUserId);

        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch (loadError) {
        console.error("Failed to load DM details profile:", loadError);

        if (!cancelled) {
          setProfile(null);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [open, otherUserId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy && !confirmOpen && !reportOpen) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, confirmOpen, reportOpen, onClose]);

  if (!open) {
    return null;
  }

  const roleLabel = profile?.role ? getRoleLabel(profile.role) : null;

  async function handleConfirmBlock() {
    await onBlock();
    setConfirmOpen(false);
  }

  async function handleSubmitUserReport(input: { reason: DmReportReason; note: string }) {
    setReportSubmitting(true);

    try {
      await submitDmUserReport({
        conversationId,
        reportedUserId: otherUserId,
        reason: input.reason,
        note: input.note,
      });
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
        onClick={() => {
          if (!busy && !confirmOpen && !reportOpen) {
            onClose();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dm-details-title"
          className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-800/80 bg-[#070708] shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:rounded-3xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 sm:px-5">
            <h2 id="dm-details-title" className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Conversation details
            </h2>
            <button
              type="button"
              aria-label="Close conversation details"
              disabled={busy}
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-6 sm:px-5">
            <div className="flex flex-col items-center text-center">
              <ProfileAvatar
                name={otherUserName}
                avatarUrl={otherUserAvatarUrl}
                size="lg"
                className="h-20 w-20 text-lg"
              />
              <p className="mt-4 text-lg font-semibold text-zinc-50">{otherUserName}</p>
              {roleLabel ? (
                <p className="mt-1 text-sm text-zinc-500">{roleLabel}</p>
              ) : null}
            </div>

            <div className="mt-6 space-y-2">
              <Link
                href={`/profile/${otherUserId}`}
                onClick={onClose}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-blue-500/35 hover:text-blue-200"
              >
                View profile
              </Link>

              <button
                type="button"
                disabled={busy || reportSubmitting}
                onClick={() => setReportOpen(true)}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 disabled:opacity-50"
              >
                Report user
              </button>

              {blockedByMe ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onUnblock()}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 disabled:opacity-50"
                >
                  {busy ? "Unblocking..." : "Unblock user"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmOpen(true)}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-400/45 hover:bg-red-600/15 disabled:opacity-50"
                >
                  Block user
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => {
            if (!busy) {
              setConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-user-title"
            className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="block-user-title" className="text-base font-semibold text-zinc-50">
              Block {otherUserName}?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              They will no longer be able to message you.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-zinc-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirmBlock()}
                className="rounded-xl border border-red-500/45 bg-red-600/15 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-red-200 transition hover:border-red-400/60 hover:bg-red-600/25 disabled:opacity-50"
              >
                {busy ? "Blocking..." : "Block user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DmReportFormModal
        open={reportOpen}
        title={`Report ${otherUserName}`}
        description="Tell us what happened. Reporting does not block this user or delete messages."
        reportType="user"
        busy={reportSubmitting}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSubmitUserReport}
      />
    </>
  );
}
