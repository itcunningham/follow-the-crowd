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
      <p className="text-sm font-medium text-ftc-text">Welcome to your crew chat</p>
      <p className="mt-3 max-w-[16rem] text-xs leading-relaxed text-ftc-text-muted">
        Use this chat to coordinate before, during and after the event.
      </p>
    </div>
  );
}
