"use client";

import ChatEmptyState from "@/app/components/chat/ChatEmptyState";

/**
 * Shown until the crew sends its first message, then never again.
 *
 * Gated on the messages actually rendered rather than the raw row count, so a
 * chat whose only history is hidden roster notices still reads as empty.
 */
export default function GroupChatEmptyState() {
  return (
    <ChatEmptyState
      title="Welcome to your Crew Chat"
      subtitle="Coordinate set times, arrivals, equipment and event updates with your crew."
      subtitleClassName="max-w-[17rem]"
    />
  );
}
