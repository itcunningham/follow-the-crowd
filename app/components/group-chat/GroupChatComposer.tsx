"use client";

import ChatSendIcon from "@/app/components/chat/ChatSendIcon";

function SendIcon() {
  return <ChatSendIcon />;
}

export default function GroupChatComposer({
  value,
  onChange,
  onSend,
  sending,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-ftc-border-subtle bg-ftc-bg px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="flex min-w-0 items-end gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={sending}
          className="ftc-input h-11 min-w-0 flex-1 rounded-full py-0 px-4 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !value.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:bg-ftc-primary-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <span className="text-xs font-bold">…</span> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}
