"use client";

/**
 * Shown until the crew sends its first message, then never again.
 *
 * Gated on the messages actually rendered rather than the raw row count, so a
 * chat whose only history is hidden roster notices still reads as empty.
 */
export default function GroupChatEmptyState() {
  return (
    <div
      data-chat-content-root
      className="flex flex-col items-center justify-center px-6 py-8 text-center"
    >
      <p className="text-sm font-medium text-ftc-text">Welcome to your Crew Chat</p>
      <p className="mt-3 max-w-[17rem] text-xs leading-relaxed text-ftc-text-muted">
        Coordinate set times, arrivals, equipment and event updates with your crew.
      </p>
    </div>
  );
}
