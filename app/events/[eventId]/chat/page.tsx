"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import ChatNewMessagesPill from "@/app/components/dm/ChatNewMessagesPill";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  getEventCrewChatAccess,
  getEventCrewChatBackHref,
  getEventCrewChatLink,
  getEventCrewChatLoadErrorMessage,
  listEventCrewChatMessages,
  sendEventCrewChatMessage,
  type EventCrewChatMessage,
} from "@/lib/eventCrewChat";
import { markNotificationsReadForLink } from "@/lib/notifications";
import { markEventChatRead } from "@/lib/messageReads";
import { supabase } from "@/lib/supabaseClient";
import { useChatScroll, tagChatMessageForScroll } from "@/lib/useChatScroll";
import { getChatNewMessageHighlightClass, logChatHighlightRender } from "@/lib/chatNewMessageHighlight";
import { useChatNewMessageHighlight } from "@/lib/useChatNewMessageHighlight";
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
  const searchParams = useSearchParams();
  const eventId = params.eventId;
  const backHref = getEventCrewChatBackHref(
    eventId,
    searchParams.get("from"),
    searchParams.get("tab"),
  );

  type EventCrewChatMessageWithScrollMeta = EventCrewChatMessage & {
    _clientScrollMeta?: {
      isFromCurrentUser: boolean;
    };
  };

  const [messages, setMessages] = useState<EventCrewChatMessageWithScrollMeta[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<Map<string, UserAvatarProfile>>(
    new Map(),
  );
  const [eventName, setEventName] = useState("Event");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const {
    scrollRef,
    bottomRef,
    showNewMessagesPill,
    newMessagesPillCount,
    scrollToBottomSmooth,
    markUserSentMessage,
    captureScrollBeforeIncomingInsert,
  } = useChatScroll({
    loading,
    messageCount: messages.length,
    lastMessageSenderId: lastMessage?.user_id ?? null,
    lastMessageIsFromCurrentUser: lastMessage?._clientScrollMeta?.isFromCurrentUser ?? null,
    currentUserId,
  });
  const { addHighlightedMessageId, isMessageHighlighted } = useChatNewMessageHighlight();

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
          setError("You do not have access to this group chat.");
          setMessages([]);
          setSenderProfiles(new Map());
          return;
        }

        setEventName(access.eventName ?? "Event");

        const chatLink = getEventCrewChatLink(eventId);
        await markNotificationsReadForLink(userId, chatLink);
        await markEventChatRead(eventId);

        const rows = await listEventCrewChatMessages(eventId);
        setMessages(rows.map((message) => tagChatMessageForScroll(message, userId)));

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
          const taggedMessage = tagChatMessageForScroll(newMessage, currentUserId);

          captureScrollBeforeIncomingInsert(taggedMessage._clientScrollMeta.isFromCurrentUser);

          setMessages((prev) => {
            if (prev.some((message) => message.id === newMessage.id)) {
              return prev;
            }

            return [...prev, taggedMessage];
          });

          addHighlightedMessageId(
            newMessage.id,
            taggedMessage._clientScrollMeta.isFromCurrentUser,
          );

          void markEventChatRead(eventId);

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
  }, [eventId, currentUserId, captureScrollBeforeIncomingInsert, addHighlightedMessageId]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || !eventId || sending) {
      return;
    }

    setSending(true);
    setError(null);
    markUserSentMessage();

    try {
      await sendEventCrewChatMessage(eventId, text, eventName);
      setInput("");
      await markEventChatRead(eventId);
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
          className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
        >
          <AppNavigation />
          <div className="px-4 py-8 sm:px-6">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="mt-4 text-sm font-semibold text-ftc-primary"
            >
              {searchParams.get("from") === "dm" ? "Back to messages" : "Back to event"}
            </button>
          </div>
        </div>
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-ftc-bg font-sans text-ftc-text">
        <AppNavigation />

        <div
          className={`mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden ${MOBILE_NAV_OFFSET_CLASS}`}
        >
          <header className="z-10 shrink-0 border-b border-ftc-border bg-ftc-bg/95 px-3 py-3 backdrop-blur-md sm:px-4">
            <div className="flex items-center gap-3">
              <Link
                href={backHref}
                aria-label={searchParams.get("from") === "dm" ? "Back to messages" : "Back to event"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ftc-border text-lg text-ftc-text-secondary transition hover:border-ftc-primary/35 hover:text-ftc-primary"
              >
                ←
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold text-ftc-text">{eventName}</h1>
                <p className="truncate text-xs text-ftc-text-muted">Group chat</p>
              </div>
              {searchParams.get("from") === "dm" ? (
                <Link
                  href={`/events/${eventId}`}
                  className="shrink-0 rounded-full border border-ftc-border-strong bg-ftc-surface/70 px-3 py-2 text-xs font-semibold text-ftc-text transition hover:border-ftc-primary/35 hover:text-ftc-primary"
                >
                  Event Details
                </Link>
              ) : null}
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 py-4 sm:px-4"
          >
            <div ref={bottomRef} data-chat-bottom aria-hidden="true" className="h-px shrink-0" />
            {loading ? (
              <p className="text-sm text-ftc-text-muted">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div
                data-chat-content-root
                className="flex flex-col items-center justify-center px-6 py-16 text-center"
              >
                <p className="text-sm font-medium text-ftc-text-secondary">No group messages yet</p>
                <p className="mt-1 text-sm text-ftc-text-muted">
                  Accepted DJs and the event planner can chat here.
                </p>
              </div>
            ) : (
              <ul data-chat-content-root className="flex flex-col-reverse gap-3 pb-2">
                {reversedMessages.map((message) => {
                  const isOwnMessage =
                    currentUserId !== null && message.user_id === currentUserId;
                  const profile = senderProfiles.get(message.user_id);
                  const senderLabel = getSenderLabel(profile, message.user_id);
                  const highlighted = isMessageHighlighted(message.id);
                  logChatHighlightRender(message.id, highlighted);

                  return (
                    <li
                      key={message.id}
                      data-chat-message-id={message.id}
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
                            <p className="mb-1 text-[11px] font-semibold text-ftc-primary">
                              {senderLabel}
                            </p>
                          ) : null}
                          <div className={`relative overflow-hidden ${getChatNewMessageHighlightClass(highlighted)}`}>
                            <div
                              className={
                                isOwnMessage
                                  ? "ftc-bubble-own px-4 py-2.5"
                                  : "ftc-bubble-other px-4 py-2.5"
                              }
                            >
                              <p className="text-[15px] leading-relaxed">{message.text}</p>
                              <time
                                dateTime={message.created_at}
                                className={`mt-1 block text-[10px] ${
                                  isOwnMessage ? "text-ftc-bg/70" : "text-ftc-text-muted"
                                }`}
                              >
                                {formatMessageTime(message.created_at)}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="relative shrink-0">
            {error ? <p className="px-4 pb-2 text-sm text-red-400">{error}</p> : null}

            {showNewMessagesPill ? (
              <ChatNewMessagesPill
                count={newMessagesPillCount}
                onClick={scrollToBottomSmooth}
              />
            ) : null}

            <div className="border-t border-ftc-border bg-ftc-bg px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex items-end gap-2 sm:gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  className="ftc-input min-h-[44px] flex-1 rounded-full px-4 py-2.5"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <span className="text-xs font-bold">…</span>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="m4 12 16-8-4 8 4 8-16-8 4-2-4-2Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardingGuard>
  );
}
