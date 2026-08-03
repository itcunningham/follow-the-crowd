"use client";

import {
  EVENT_GROUP_CHAT_UPDATE_HEADING,
  type EventGroupChatUpdateChange,
} from "@/lib/events/eventGroupChatUpdateMessage";

/**
 * Compact field list for an event-update message, rendered inside the normal
 * message bubble so alignment, grouping, reactions, timestamps and the avatar
 * all keep working exactly as they do for any other message.
 *
 * De-emphasis is opacity-based rather than a muted colour token on purpose:
 * the same markup renders on a primary-coloured bubble for the planner who
 * sent it and on a surface-coloured bubble for everyone else, so a fixed
 * `text-ftc-text-muted` would lose contrast against the blue. Opacity stays
 * legible against whichever background the bubble supplies.
 */
export default function EventUpdateMessageContent({
  changes,
}: {
  changes: EventGroupChatUpdateChange[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold leading-snug">
        {EVENT_GROUP_CHAT_UPDATE_HEADING}
      </p>

      <ul className="flex flex-col gap-1">
        {changes.map((change) => (
          <li key={change.label} className="flex flex-col leading-snug">
            <span className="text-[12px] font-medium opacity-80">{change.label}</span>
            <span className="text-[12px] break-words">
              <span className="opacity-70">{change.from}</span>
              <span aria-hidden="true" className="px-1 opacity-50">
                →
              </span>
              <span>{change.to}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
