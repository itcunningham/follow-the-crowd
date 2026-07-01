"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const CURRENT_USER_ID = "demo-user";

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

type ConversationPreview = {
  conversation_id: string;
  lastMessage: Message | null;
};

function sortByLatestMessage(conversations: ConversationPreview[]) {
  return [...conversations].sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? "";
    const bTime = b.lastMessage?.created_at ?? "";

    return bTime.localeCompare(aTime);
  });
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DmInboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: memberships, error: membersError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", CURRENT_USER_ID);

    if (membersError) {
      setError(membersError.message);
      setLoading(false);
      return;
    }

    const ids = (memberships ?? []).map((row) => row.conversation_id as string);

    if (ids.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const previews = await Promise.all(
      ids.map(async (conversationId) => {
        const { data: latestMessage, error: messageError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (messageError) {
          throw new Error(messageError.message);
        }

        return {
          conversation_id: conversationId,
          lastMessage: (latestMessage as Message | null) ?? null,
        };
      }),
    );

    setConversations(sortByLatestMessage(previews));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations().catch((loadError: Error) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, [loadConversations]);

  useEffect(() => {
    const channel = supabase
      .channel("dm-inbox:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setConversations((prev) => {
            const isInInbox = prev.some(
              (conversation) => conversation.conversation_id === newMessage.conversation_id,
            );

            if (!isInInbox) {
              return prev;
            }

            const updated = prev.map((conversation) =>
              conversation.conversation_id === newMessage.conversation_id
                ? { ...conversation, lastMessage: newMessage }
                : conversation,
            );

            return sortByLatestMessage(updated);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function openConversation(conversationId: string) {
    router.push(`/dm/${conversationId}`);
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-4">
        <h1 className="text-lg font-semibold">Direct Messages</h1>
        <p className="mt-1 text-xs text-zinc-500">Signed in as {CURRENT_USER_ID}</p>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading conversations...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-zinc-500">No conversations yet.</p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((conversation) => (
              <li key={conversation.conversation_id}>
                <button
                  type="button"
                  onClick={() => openConversation(conversation.conversation_id)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-left transition hover:border-blue-500/50 hover:bg-zinc-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-xs font-medium text-blue-400">
                      {conversation.conversation_id}
                    </p>
                    {conversation.lastMessage ? (
                      <time
                        dateTime={conversation.lastMessage.created_at}
                        className="shrink-0 text-xs text-zinc-500"
                      >
                        {formatTimestamp(conversation.lastMessage.created_at)}
                      </time>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-300">
                    {conversation.lastMessage?.text ?? "No messages yet"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
