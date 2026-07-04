"use client";

import { useRef, useState } from "react";
import { DM_COMPOSER_EMOJIS } from "@/lib/dmReactions";

function IconButton({
  label,
  disabled,
  onClick,
  children,
  className = "",
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function DmComposer({
  value,
  onChange,
  onSend,
  onPhotoSelected,
  onFileSelected,
  sending,
  uploading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onPhotoSelected: (file: File) => void;
  onFileSelected: (file: File) => void;
  sending: boolean;
  uploading: boolean;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const busy = sending || uploading;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  }

  function appendEmoji(emoji: string) {
    onChange(`${value}${emoji}`);
    setEmojiOpen(false);
  }

  return (
    <div className="shrink-0 border-t border-zinc-800/80 bg-[#070708] px-3 py-3 sm:px-4 sm:py-4">
      {emojiOpen ? (
        <div className="mb-2 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-2">
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
            {DM_COMPOSER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => appendEmoji(emoji)}
                className="flex h-9 items-center justify-center rounded-lg text-lg transition hover:bg-zinc-900"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-end gap-1.5 sm:gap-2">
        <IconButton
          label="Add photo"
          disabled={busy}
          onClick={() => photoInputRef.current?.click()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="11" r="1.5" fill="currentColor" />
            <path d="m9 16 3-3 2 2 3-4 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </IconButton>

        <IconButton
          label="Attach file"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M8 12.5 14.5 6a3.5 3.5 0 1 1 5 5L10 20.5a5 5 0 1 1-7-7l8.5-8.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>

        <IconButton label="GIF search coming soon" disabled className="opacity-50">
          <span className="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-400">
            GIF
          </span>
        </IconButton>

        <IconButton
          label="Add emoji"
          disabled={busy}
          onClick={() => setEmojiOpen((open) => !open)}
          className={emojiOpen ? "border-blue-500/35 text-blue-200" : ""}
        >
          <span className="text-lg leading-none">😊</span>
        </IconButton>

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={busy}
          className="min-h-[44px] flex-1 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="min-h-[44px] shrink-0 rounded-full border border-blue-500/45 bg-blue-600/20 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "..." : "Send"}
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            onPhotoSelected(file);
          }
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.zip,.doc,.docx,application/pdf,text/plain,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            onFileSelected(file);
          }
        }}
      />
    </div>
  );
}
