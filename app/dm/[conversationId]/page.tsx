"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

export default function DmChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    async function loadMessages() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setMessages((data as Message[]) ?? []);
      setLoading(false);
    }

    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`dm-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((prev) => {
            if (prev.some((message) => message.id === newMessage.id)) {
              return prev;
            }

            return [...prev, newMessage];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || !conversationId || sending) {
      return;
    }

    setSending(true);
    setError(null);

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: "demo-user",
      text,
    });

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    setInput("");
    setSending(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-4">
        <h1 className="text-lg font-semibold">Direct Message</h1>
        <p className="mt-1 text-xs text-zinc-500">Conversation: {conversationId}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet. Start the conversation.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <p className="text-xs font-medium text-blue-400">{message.user_id}</p>
                <p className="mt-1 text-sm text-zinc-100">{message.text}</p>
              </li>
            ))}
          </ul>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <p className="px-4 pb-2 text-sm text-red-400">{error}</p>
      ) : null}

      <div className="border-t border-zinc-800 px-4 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
