"use client";

import { useEffect, useRef, useState } from "react";

export default function DmChatHeaderMenu({
  otherUserName,
  blockedByMe,
  busy,
  onBlock,
  onUnblock,
}: {
  otherUserName: string;
  blockedByMe: boolean;
  busy: boolean;
  onBlock: () => Promise<void>;
  onUnblock: () => Promise<void>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  async function handleConfirmBlock() {
    await onBlock();
    setConfirmOpen(false);
    setMenuOpen(false);
  }

  async function handleUnblock() {
    await onUnblock();
    setMenuOpen(false);
  }

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Conversation options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={busy}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition hover:border-blue-500/35 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
          >
            <circle cx="6" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="18" cy="12" r="1.5" />
          </svg>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/95 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          >
            {blockedByMe ? (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void handleUnblock()}
                className="flex w-full px-4 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-900/80 disabled:opacity-50"
              >
                Unblock user
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
                className="flex w-full px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                Block user
              </button>
            )}
          </div>
        ) : null}
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
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
            <h2 id="block-user-title" className="text-base font-semibold text-zinc-50">
              Block {otherUserName}?
            </h2>
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
    </>
  );
}
