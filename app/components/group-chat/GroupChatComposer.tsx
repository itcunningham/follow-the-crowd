"use client";

import ChatSendIcon from "@/app/components/chat/ChatSendIcon";
import { useComposerTextareaAutogrow } from "@/lib/dm/useComposerTextareaAutogrow";

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
  const { textareaRef } = useComposerTextareaAutogrow(value);

  return (
    <div
      data-chat-composer
      className="shrink-0 border-t border-ftc-border-subtle bg-ftc-bg px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      <div className="flex min-w-0 items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Message..."
          disabled={sending}
          className="ftc-input min-h-11 min-w-0 flex-1 resize-none rounded-full py-0 px-4 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !value.trim()}
          aria-label="Send message"
          aria-busy={sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:bg-ftc-primary-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
