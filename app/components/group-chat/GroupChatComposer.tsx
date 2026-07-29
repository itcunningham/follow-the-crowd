"use client";

import ChatSendIcon from "@/app/components/chat/ChatSendIcon";
import { handleComposerNewlineKeyDown } from "@/lib/dm/composerNewlineKeydown";
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
  const isCompactComposerField = value.length === 0 || !value.includes("\n");

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
          onKeyDown={handleComposerNewlineKeyDown}
          placeholder="Message..."
          disabled={sending}
          className={`ftc-input min-w-[5.75rem] flex-1 resize-none rounded-full px-4 disabled:cursor-not-allowed ${
            isCompactComposerField
              ? "h-11 py-0 leading-[2.75rem]"
              : "min-h-11 py-2 leading-normal"
          }`}
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
