"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  getEventCrewChatAccess,
  getEventCrewChatLink,
  getEventCrewChatLoadErrorMessage,
  listEventCrewChatMessages,
  sendEventCrewChatMessage,
  type EventCrewChatMessage,
} from "@/lib/eventCrewChat";
import { markNotificationsReadForLink } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentUserId,
  getUserAvatarProfilesByIds,
  type UserAvatarProfile,
} from "@/lib/user/currentUser";

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getSenderLabel(profile: UserAvatarProfile | undefined, userId: string) {
  return profile?.display_name?.trim() || userId.slice(0, 8);
}

export default function EventCrewChatPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = params.eventId;

  const [messages, setMessages] = useState<EventCrewChatMessage[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<Map<string, UserAvatarProfile>>(
    new Map(),
  );
  const [eventName, setEventName] = useState("Event");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    async function loadChat() {
      setLoading(true);
      setError(null);

      try {
        const [userId, access] = await Promise.all([
          getCurrentUserId(),
          getEventCrewChatAccess(eventId),
        ]);

        setCurrentUserId(userId);

        if (!access.canAccess) {
          setError("You do not have access to this event crew chat.");
          setMessages([]);
          setSenderProfiles(new Map());
          return;
        }

        setEventName(access.eventName ?? "Event");

        const chatLink = getEventCrewChatLink(eventId);
        await markNotificationsReadForLink(userId, chatLink);

        const rows = await listEventCrewChatMessages(eventId);
        setMessages(rows);

        const senderIds = [...new Set(rows.map((message) => message.user_id))];

        if (senderIds.length > 0) {
          const profiles = await getUserAvatarProfilesByIds(senderIds);
          setSenderProfiles(profiles);
        } else {
          setSenderProfiles(new Map());
        }
      } catch (loadError) {
        console.error("Failed to load event crew chat:", loadError);
        setError(getEventCrewChatLoadErrorMessage(loadError));
        setMessages([]);
        setSenderProfiles(new Map());
      } finally {
        setLoading(false);
      }
    }

    loadChat();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const channel = supabase
      .channel(`event-crew-chat:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const newMessage = payload.new as EventCrewChatMessage;

          setMessages((prev) => {
            if (prev.some((message) => message.id === newMessage.id)) {
              return prev;
            }

            return [...prev, newMessage];
          });

          setSenderProfiles((prev) => {
            if (prev.has(newMessage.user_id)) {
              return prev;
            }

            void getUserAvatarProfilesByIds([newMessage.user_id]).then((profiles) => {
              const profile = profiles.get(newMessage.user_id);

              if (!profile) {
                return;
              }

              setSenderProfiles((current) => {
                if (current.has(newMessage.user_id)) {
                  return current;
                }

                return new Map(current).set(newMessage.user_id, profile);
              });
            });

            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || !eventId || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await sendEventCrewChatMessage(eventId, text, eventName);
      setInput("");
    } catch (sendError) {
      console.error("Failed to send crew chat message:", sendError);
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  if (error && !loading && messages.length === 0 && error.includes("access")) {
    return (
      <OnboardingGuard>
        <div
          className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
        >
          <AppNavigation />
          <div className="px-4 py-8 sm:px-6">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => router.push(`/events/${eventId}`)}
              className="mt-4 text-sm font-semibold text-blue-300"
            >
              Back to event
            </button>
          </div>
        </div>
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto flex h-[100dvh] w-full max-w-2xl flex-col bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="sticky top-0 z-10 shrink-0 border-b border-zinc-800/80 bg-[#070708]/95 px-3 py-3 backdrop-blur-md sm:px-4 md:top-12">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              aria-label="Back to event"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-lg text-zinc-300 transition hover:border-blue-500/40 hover:text-blue-300"
            >
              ←
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-zinc-50">{eventName}</h1>
              <p className="truncate text-xs text-zinc-500">Crew chat</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-zinc-300">No crew messages yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Accepted DJs and the event planner can chat here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3 pb-2">
              {messages.map((message) => {
                const isOwnMessage =
                  currentUserId !== null && message.user_id === currentUserId;
                const profile = senderProfiles.get(message.user_id);
                const senderLabel = getSenderLabel(profile, message.user_id);

                return (
                  <li
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[85%] items-end gap-2 sm:max-w-[75%] ${
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {!isOwnMessage ? (
                        <ProfileAvatar
                          name={senderLabel}
                          avatarUrl={profile?.avatar_url}
                          size="sm"
                        />
                      ) : null}
                      <div>
                        {!isOwnMessage ? (
                          <p className="mb-1 text-[11px] font-semibold text-zinc-400">
                            {senderLabel}
                          </p>
                        ) : null}
                        <div
                          className={`rounded-3xl px-4 py-2.5 ${
                            isOwnMessage
                              ? "rounded-br-md border border-blue-500/40 bg-blue-600/20 text-blue-50 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                              : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-100"
                          }`}
                        >
                          <p className="text-[15px] leading-relaxed">{message.text}</p>
                          <time
                            dateTime={message.created_at}
                            className="mt-1 block text-[10px] text-zinc-500"
                          >
                            {formatMessageTime(message.created_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error ? <p className="px-4 pb-2 text-sm text-red-400">{error}</p> : null}

        <div className="sticky bottom-0 border-t border-zinc-800/80 bg-[#070708] px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-end gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="min-h-[44px] flex-1 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || !input.trim()}
              className="min-h-[44px] shrink-0 rounded-full border border-blue-500/45 bg-blue-600/20 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </OnboardingGuard>
  );
}
