"use client";

import { parseRunSheetUpdateMessage, type RunSheetUpdateChange } from "@/lib/events/runSheetUpdateMessage";

export function RunSheetUpdateMessage({ text }: { text: string }) {
  const changes = parseRunSheetUpdateMessage(text);

  if (!changes) {
    return null;
  }

  return (
    <div className="mx-4 my-4 rounded-2xl bg-ftc-bg-elevated px-5 py-4 border-t border-b border-ftc-border">
      <p className="mb-4 text-sm font-medium uppercase tracking-wide text-ftc-text-muted">
        Run sheet updated
      </p>

      <div className="space-y-4">
        {changes.map((change, djIndex) => (
          <div key={djIndex}>
            <p className="text-sm font-semibold text-ftc-primary">{change.djName}</p>
            <ul className="mt-2 space-y-1.5">
              {change.changes.map((item, changeIndex) => (
                <li key={changeIndex} className="text-sm leading-snug text-ftc-text-secondary">
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
