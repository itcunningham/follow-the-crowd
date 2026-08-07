/**
 * Runsheet update system message format for crew chat.
 * Stored as plain text with a special prefix, parsed at read time for styled rendering.
 */

export const RUNSHEET_UPDATE_PREFIX = "Run sheet updated:";

export type RunSheetUpdateChange = {
  djName: string;
  changes: string[];
};

export function isRunSheetUpdateMessage(text: string): boolean {
  return text.trim().startsWith(RUNSHEET_UPDATE_PREFIX);
}

/**
 * Parse runsheet update message from stored text format.
 * Returns the changes, or null if the text isn't a runsheet update or can't be parsed.
 */
export function parseRunSheetUpdateMessage(text: string): RunSheetUpdateChange[] | null {
  const trimmed = text.trim();

  if (!isRunSheetUpdateMessage(trimmed)) {
    return null;
  }

  const changes: RunSheetUpdateChange[] = [];
  const lines = trimmed.slice(RUNSHEET_UPDATE_PREFIX.length).split("\n");

  let currentDj: string | null = null;
  let currentChanges: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    // DJ name line (no indentation)
    if (!rawLine.startsWith("  ")) {
      // Save previous DJ if exists
      if (currentDj && currentChanges.length > 0) {
        changes.push({
          djName: currentDj,
          changes: currentChanges,
        });
      }

      currentDj = line;
      currentChanges = [];
    } else {
      // Change line (indented)
      const change = line.trim();
      if (change) {
        currentChanges.push(change);
      }
    }
  }

  // Save last DJ
  if (currentDj && currentChanges.length > 0) {
    changes.push({
      djName: currentDj,
      changes: currentChanges,
    });
  }

  return changes.length > 0 ? changes : null;
}

/**
 * Format runsheet update for storage as system message.
 */
export function formatRunSheetUpdateMessage(changes: RunSheetUpdateChange[]): string {
  if (changes.length === 0) {
    return "";
  }

  const lines = [RUNSHEET_UPDATE_PREFIX];

  for (const change of changes) {
    lines.push(change.djName);
    for (const item of change.changes) {
      lines.push(`  ${item}`);
    }
  }

  return lines.join("\n");
}
