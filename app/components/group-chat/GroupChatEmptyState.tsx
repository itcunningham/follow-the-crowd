"use client";

export default function GroupChatEmptyState() {
  return (
    <div
      data-chat-content-root
      className="flex flex-col items-center justify-center px-6 py-10 text-center"
    >
      <p className="text-sm font-semibold text-ftc-text-secondary">Crew chat</p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-ftc-text-muted">
        Only confirmed artists and planners can chat here.
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-ftc-text-muted">
        Keep all event communication in one place.
      </p>
    </div>
  );
}
