/**
 * Presentation half of the event-update crew chat message.
 *
 * The message is stored as plain text (see `formatEventGroupChatUpdateMessage`
 * in `eventGroupChatUpdate.ts`) because that is what `messages.text` holds and
 * what notification previews read. Rendering it as a compact field list is
 * therefore a *parse at read time*, not a change to what gets written — which
 * also means every message already in the database picks up the new layout,
 * and nothing about generation, notifications or ordering moves.
 *
 * Parsing is deliberately lenient: anything that doesn't match falls back to
 * the plain-text bubble, so an unrecognised or hand-written message can never
 * render as an empty card.
 */

/** Stored prefix. Never shown — `EVENT_GROUP_CHAT_UPDATE_HEADING` is displayed instead. */
export const EVENT_GROUP_CHAT_UPDATE_PREFIX = "Event details updated:";

/** Displayed heading — shorter and calmer than the stored prefix. */
export const EVENT_GROUP_CHAT_UPDATE_HEADING = "Event updated";

export type EventGroupChatUpdateChange = {
  label: string;
  from: string;
  to: string;
};

/**
 * "Event name" is redundant under a heading that already says "Event updated".
 * Display-only: the stored text and the change detection keep their own labels.
 */
const DISPLAY_LABEL_OVERRIDES: Record<string, string> = {
  "Event name": "Name",
};

export function isEventGroupChatUpdateMessage(text: string): boolean {
  return text.trim().startsWith(EVENT_GROUP_CHAT_UPDATE_PREFIX);
}

/**
 * Returns the changed fields, or `null` when the text isn't an event update or
 * carries no parseable rows — both of which mean "render it as plain text".
 */
export function parseEventGroupChatUpdateMessage(
  text: string,
): EventGroupChatUpdateChange[] | null {
  const trimmed = text.trim();

  if (!isEventGroupChatUpdateMessage(trimmed)) {
    return null;
  }

  const changes: EventGroupChatUpdateChange[] = [];

  for (const rawLine of trimmed.slice(EVENT_GROUP_CHAT_UPDATE_PREFIX.length).split("\n")) {
    const line = rawLine.trim();

    if (!line.startsWith("•")) {
      continue;
    }

    const row = line.slice(1).trim();
    // Labels never contain a colon, so the first one always ends the label —
    // values often do ("Set time: 10:51 PM – 11:46 PM → …").
    const labelEnd = row.indexOf(":");

    if (labelEnd === -1) {
      continue;
    }

    const label = row.slice(0, labelEnd).trim();
    const values = row.slice(labelEnd + 1).trim();
    const arrowAt = values.indexOf("→");

    if (!label || arrowAt === -1) {
      continue;
    }

    changes.push({
      label: DISPLAY_LABEL_OVERRIDES[label] ?? label,
      from: values.slice(0, arrowAt).trim(),
      to: values.slice(arrowAt + 1).trim(),
    });
  }

  return changes.length > 0 ? changes : null;
}
