"use client";

/**
 * TEMPORARY — part of the Crew Chat unread investigation. Delete with the rest
 * of lib/diagnostics/.
 *
 * One tap copies the whole trace, so reproducing the bug costs a tap rather
 * than a DevTools session. Renders ONLY while `?ftcunread=1` is active for the
 * tab, so it can never appear in normal use — but that also means nothing in
 * normal use would reveal it had been left behind, which is exactly why the
 * removal guard exists.
 */
import { useEffect, useState } from "react";
import { isUnreadTraceEnabled, readUnreadTrace } from "@/lib/diagnostics/unreadTrace";

export default function UnreadTraceCopyButton() {
  // Resolved after mount: the flag reads sessionStorage, which does not exist
  // during server rendering, so deciding at render time would desync hydration.
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(isUnreadTraceEnabled());
  }, []);

  if (!enabled) {
    return null;
  }

  async function copyTrace() {
    const entries = readUnreadTrace();
    const payload = JSON.stringify(entries, null, 2);

    try {
      await navigator.clipboard.writeText(payload);
      setStatus(`Copied ${entries.length} entries — paste to Claude`);
      return;
    } catch {
      // iOS Safari refuses the async clipboard API in some contexts. A visible,
      // pre-selected textarea always works: the user can copy with the native
      // control even when scripted copying is blocked.
      const area = document.createElement("textarea");
      area.value = payload;
      area.setAttribute("readonly", "true");
      area.style.cssText =
        "position:fixed;inset:8px;z-index:2147483647;height:60vh;font-size:12px";
      document.body.appendChild(area);
      area.select();

      try {
        document.execCommand("copy");
        setStatus(`Copied ${entries.length} entries — paste to Claude`);
      } catch {
        setStatus("Copy blocked — the text is selected, copy it manually");
      }

      window.setTimeout(() => area.remove(), 15000);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-[2147483647] flex flex-col items-center gap-1 px-4">
      <button
        type="button"
        onClick={() => void copyTrace()}
        className="w-full max-w-sm rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
      >
        Copy unread diagnostics (temporary)
      </button>
      {status ? (
        <p className="rounded-lg bg-black/80 px-3 py-1 text-[11px] text-white">{status}</p>
      ) : null}
    </div>
  );
}
