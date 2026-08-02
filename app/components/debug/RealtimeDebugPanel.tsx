"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import {
  clearRealtimeDiagnostics,
  getRealtimeDiagnosticsSnapshot,
  isRealtimeDiagnosticsEnabled,
  subscribeRealtimeDiagnostics,
} from "@/lib/diagnostics/realtimeDiagnostics";

/**
 * TEMPORARY on-screen diagnostics for the booking-acceptance investigation.
 *
 * Renders nothing at all unless ?ftcdebug=realtime has been used on this device,
 * so normal users can never see it. Exists so logs can be collected from a
 * physical phone without attaching a desktop console.
 *
 * REMOVE THIS COMPONENT with the rest of the diagnostics.
 */
const EMPTY: readonly string[] = [];

export default function RealtimeDebugPanel() {
  const pathname = usePathname();
  const guardProfile = useGuardProfile();
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = useSyncExternalStore(
    subscribeRealtimeDiagnostics,
    getRealtimeDiagnosticsSnapshot,
    () => EMPTY,
  );

  const enabled = useSyncExternalStore(
    subscribeRealtimeDiagnostics,
    isRealtimeDiagnosticsEnabled,
    () => false,
  );

  const header = `route=${pathname} user=${guardProfile?.user_id ?? "unknown"} role=${
    guardProfile?.role ?? "unknown"
  }`;

  const handleCopy = useCallback(() => {
    const text = [header, ...lines].join("\n");

    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // iOS Safari without clipboard permission — fall back to a selectable prompt.
        window.prompt("Copy diagnostics:", text);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    })();
  }, [header, lines]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 4,
        right: 4,
        bottom: 4,
        zIndex: 2147483647,
        maxHeight: collapsed ? undefined : "45vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.92)",
        border: "1px solid #444",
        borderRadius: 8,
        color: "#d7ffd7",
        font: "10px/1.35 ui-monospace, Menlo, monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 6px",
          borderBottom: collapsed ? "none" : "1px solid #333",
        }}
      >
        <span style={{ flex: 1, minWidth: 0, wordBreak: "break-all", color: "#9fd3ff" }}>
          {header} · {lines.length}
        </span>
        <button type="button" onClick={handleCopy} style={buttonStyle}>
          {copied ? "copied" : "copy"}
        </button>
        <button type="button" onClick={() => clearRealtimeDiagnostics()} style={buttonStyle}>
          clear
        </button>
        <button type="button" onClick={() => setCollapsed((v) => !v)} style={buttonStyle}>
          {collapsed ? "show" : "hide"}
        </button>
      </div>

      {collapsed ? null : (
        <div style={{ overflowY: "auto", padding: "4px 6px" }}>
          {lines.length === 0 ? (
            <div style={{ color: "#888" }}>no events yet</div>
          ) : (
            lines.map((line, index) => (
              <div key={`${index}-${line}`} style={{ wordBreak: "break-all" }}>
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#1d1d1d",
  color: "#d7ffd7",
  border: "1px solid #555",
  borderRadius: 4,
  padding: "2px 6px",
  font: "10px ui-monospace, Menlo, monospace",
};
