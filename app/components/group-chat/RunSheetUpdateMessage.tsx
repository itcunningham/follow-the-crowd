"use client";

import { parseRunSheetUpdateMessage, type RunSheetUpdateChange } from "@/lib/events/runSheetUpdateMessage";

export function RunSheetUpdateMessage({ text }: { text: string }) {
  const changes = parseRunSheetUpdateMessage(text);

  if (!changes) {
    return null;
  }

  return (
    <div className="mx-4 my-3 rounded-2xl bg-ftc-bg-elevated px-4 py-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
        Run sheet updated
      </p>

      <div className="space-y-3">
        {changes.map((change, djIndex) => (
          <div key={djIndex}>
            <p className="text-sm font-semibold text-ftc-primary">{change.djName}</p>
            <ul className="mt-1.5 space-y-1">
              {change.changes.map((item, changeIndex) => (
                <li key={changeIndex} className="text-xs text-ftc-text-secondary">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function isRunSheetUpdateMessageComponent(text: string): boolean {
  return parseRunSheetUpdateMessage(text) !== null;
}
