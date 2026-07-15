"use client";

export default function GroupChatEmptyState() {
  return (
    <div
      data-chat-content-root
      className="flex flex-col items-center justify-center px-6 py-8 text-center"
    >
      <p className="text-sm font-medium text-ftc-text-muted">Crew chat</p>
      <p className="mt-3 max-w-[14rem] text-xs leading-relaxed text-ftc-text-muted/75">
        Only confirmed artists and planners can chat here.
      </p>
      <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-ftc-text-muted/75">
        Messages sent here are visible to everyone working this event.
      </p>
    </div>
  );
}
