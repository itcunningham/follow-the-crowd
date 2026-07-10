"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import ChatNewMessagesPill from "@/app/components/dm/ChatNewMessagesPill";
import GroupChatComposer from "@/app/components/group-chat/GroupChatComposer";
import GroupChatMessageBubble from "@/app/components/group-chat/GroupChatMessageBubble";
import EventArtworkTile from "@/app/components/events/EventArtworkTile";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { ChatHeaderSkeleton, ChatMessagesSkeleton } from "@/app/components/skeleton/Skeleton";
import {
  getEventCrewChatAccess,
  getEventCrewChatBackHref,
  getEventCrewChatLoadErrorMessage,
  listEventCrewChatMessages,
  sendEventCrewChatMessage,
  type EventCrewChatMessage,
} from "@/lib/eventCrewChat";
import { markEventChatRead } from "@/lib/messageReads";
import {
  formatGroupChatSystemNoticeText,
  isGroupChatSystemUpdateMessage,
} from "@/lib/groupChatSystemMessages";
import { buildChatReturnTo } from "@/lib/profileNavigation";
import { supabase } from "@/lib/supabaseClient";
import { useChatScroll, tagChatMessageForScroll } from "@/lib/useChatScroll";
import {
  getChatNewMessageHighlightClass,
  logChatHighlightRender,
} from "@/lib/chatNewMessageHighlight";
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

const GROUP_CHAT_MESSAGES_TIMEOUT_MS = 15_000;

async function withGroupChatMessagesTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Loading messages took too long. Please try again."));
        }, GROUP_CHAT_MESSAGES_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getSenderLabel(profile: UserAvatarProfile | undefined, userId: string) {
  return profile?.display_name?.trim() || userId.slice(0, 8);
}

function GroupChatMessagesLoadError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div
      data-chat-content-root
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <p className="text-sm text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-4 ftc-btn-secondary px-4 py-2 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
      >
        {retrying ? "Retrying..." : "Try again"}
      </button>
    </div>
  );
}

function GroupChatHeaderArtwork({
  eventName,
  coverImageUrl,
  fallbackColour,
}: {
  eventName: string;
  coverImageUrl: string | null;
  fallbackColour: string | null;
}) {
  return (
    <EventArtworkTile
      eventName={eventName}
      coverImageUrl={coverImageUrl}
      fallbackColour={fallbackColour}
      size="context"
    />
  );
}

export default function EventCrewChatPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventId = params.eventId;
  const chatReturnTo = useMemo(
    () => buildChatReturnTo(pathname, searchParams.toString()),
    [pathname, searchParams],
  );
  const openedFromMessages = searchParams.get("from") === "dm";
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
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [fallbackColour, setFallbackColour] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [accessLoading, setAccessLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [canAccessChat, setCanAccessChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesLoadGenerationRef = useRef(0);
  const loading = accessLoading || messagesLoading;
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

  const refreshEventArtwork = useCallback(async () => {
    if (!eventId) {
      return;
    }

    try {
      const access = await getEventCrewChatAccess(eventId);

      if (!access.canAccess) {
        return;
      }

      setCoverImageUrl(access.coverImageUrl);
      setFallbackColour(access.fallbackColour);
      setEventName(access.eventName ?? "Event");
    } catch (refreshError) {
      console.error("Failed to refresh group chat artwork:", refreshError);
    }
  }, [eventId]);

  const markGroupChatOpened = useCallback(
    (latestMessageCreatedAt: string | null) => {
      if (!eventId) {
        return;
      }

      void markEventChatRead(eventId, { readThroughCreatedAt: latestMessageCreatedAt }).catch(
        (readError) => {
          console.error("Failed to mark group chat read:", readError);
        },
      );
    },
    [eventId],
  );

  const loadSenderProfiles = useCallback(async (rows: EventCrewChatMessage[]) => {
    const senderIds = [...new Set(rows.map((message) => message.user_id))];

    if (senderIds.length === 0) {
      setSenderProfiles(new Map());
      return;
    }

    try {
      const profiles = await getUserAvatarProfilesByIds(senderIds);
      setSenderProfiles(profiles);
    } catch (profileError) {
      console.error("Failed to load group chat sender profiles:", profileError);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!eventId || !canAccessChat) {
      return;
    }

    const generation = ++messagesLoadGenerationRef.current;
    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const userId = currentUserId ?? (await getCurrentUserId());

      if (generation !== messagesLoadGenerationRef.current) {
        return;
      }

      if (!currentUserId) {
        setCurrentUserId(userId);
      }

      const rows = await withGroupChatMessagesTimeout(listEventCrewChatMessages(eventId));

      if (generation !== messagesLoadGenerationRef.current) {
        return;
      }

      const latestMessageCreatedAt =
        rows.length > 0 ? rows[rows.length - 1]?.created_at ?? null : null;

      setMessages(rows.map((message) => tagChatMessageForScroll(message, userId)));
      markGroupChatOpened(latestMessageCreatedAt);
      void loadSenderProfiles(rows);
    } catch (loadError) {
      if (generation !== messagesLoadGenerationRef.current) {
        return;
      }

      console.error("Failed to load event crew chat messages:", loadError);
      setMessagesError(getEventCrewChatLoadErrorMessage(loadError));
    } finally {
      if (generation === messagesLoadGenerationRef.current) {
        setMessagesLoading(false);
      }
    }
  }, [canAccessChat, currentUserId, eventId, loadSenderProfiles, markGroupChatOpened]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let cancelled = false;

    async function loadAccess() {
      setAccessLoading(true);
      setCanAccessChat(false);
      setError(null);
      setMessages([]);
      setSenderProfiles(new Map());
      setMessagesError(null);
      setMessagesLoading(true);

      try {
        const [userId, access] = await Promise.all([
          getCurrentUserId(),
          getEventCrewChatAccess(eventId),
        ]);

        if (cancelled) {
          return;
        }

        setCurrentUserId(userId);

        if (!access.canAccess) {
          if (access.eventStatus === "cancelled") {
            setError("This event was cancelled. Group chat is no longer available.");
          } else if (access.unlock.acceptedDjCount === 0) {
            setError("Group chat is not available because no DJs are confirmed for this event.");
          } else if (access.canStartCrewChat) {
            setError("Start group chat from the event page when you are ready to coordinate.");
          } else {
            setError("Group chat is not available yet. The planner will start it when ready.");
          }
          setMessagesLoading(false);
          return;
        }

        setCanAccessChat(true);
        setEventName(access.eventName ?? "Event");
        setCoverImageUrl(access.coverImageUrl);
        setFallbackColour(access.fallbackColour);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load event crew chat access:", loadError);
        setError(getEventCrewChatLoadErrorMessage(loadError));
        setMessagesLoading(false);
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    }

    void loadAccess();

    return () => {
      cancelled = true;
      messagesLoadGenerationRef.current += 1;
    };
  }, [eventId]);

  useEffect(() => {
    if (!canAccessChat || accessLoading) {
      return;
    }

    void loadMessages();
  }, [accessLoading, canAccessChat, loadMessages]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshEventArtwork();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshEventArtwork]);

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

          if (taggedMessage._clientScrollMeta.isFromCurrentUser) {
            void markEventChatRead(eventId, { readThroughCreatedAt: newMessage.created_at });
          }

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

  if (error && !accessLoading && !canAccessChat) {
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
              {openedFromMessages ? "Back to messages" : "Back to event"}
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
          <header className="z-10 shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
            {accessLoading ? (
              <ChatHeaderSkeleton />
            ) : (
            <div className="flex items-center gap-2">
              <Link
                href={backHref}
                aria-label={openedFromMessages ? "Back to messages" : "Back to event"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <GroupChatHeaderArtwork
                  eventName={eventName}
                  coverImageUrl={coverImageUrl}
                  fallbackColour={fallbackColour}
                />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold text-ftc-text">{eventName}</h1>
                  <p className="truncate text-xs text-ftc-text-muted">Group chat</p>
                </div>
              </div>

              {openedFromMessages ? (
                <Link
                  href={`/events/${eventId}`}
                  className="shrink-0 rounded-xl border border-ftc-border-subtle bg-ftc-surface px-3 py-2 text-xs font-semibold text-ftc-text transition hover:border-ftc-border-strong"
                >
                  Event Details
                </Link>
              ) : null}
            </div>
            )}
          </header>

          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 py-4 sm:px-4"
          >
            <div ref={bottomRef} data-chat-bottom aria-hidden="true" className="h-px shrink-0" />
            {accessLoading || messagesLoading ? (
              <ChatMessagesSkeleton />
            ) : messagesError ? (
              <GroupChatMessagesLoadError
                message={messagesError}
                retrying={messagesLoading}
                onRetry={() => {
                  void loadMessages();
                }}
              />
            ) : messages.length === 0 ? (
              <div
                data-chat-content-root
                className="flex flex-col items-center justify-center px-6 py-16 text-center"
              >
                <GroupChatHeaderArtwork
                  eventName={eventName}
                  coverImageUrl={coverImageUrl}
                  fallbackColour={fallbackColour}
                />
                <p className="mt-4 text-sm font-medium text-ftc-text-secondary">
                  No group messages yet
                </p>
                <p className="mt-1 text-sm text-ftc-text-muted">
                  Accepted DJs and the event planner can chat here.
                </p>
              </div>
            ) : (
              <ul data-chat-content-root className="flex flex-col-reverse gap-3 pb-2">
                {reversedMessages.map((message) => {
                  const isOwnMessage =
                    currentUserId !== null && message.user_id === currentUserId;
                  const isSystemUpdate = isGroupChatSystemUpdateMessage(message.text);
                  const highlighted = isMessageHighlighted(message.id);
                  logChatHighlightRender(message.id, highlighted);

                  if (isSystemUpdate) {
                    return (
                      <li
                        key={message.id}
                        data-chat-message-id={message.id}
                        className="flex justify-center"
                      >
                        <div className="max-w-sm px-3 py-1 text-center">
                          <p
                            className={`rounded-full border border-ftc-border bg-ftc-bg-elevated/50 px-3 py-1.5 text-xs text-ftc-text-muted ${getChatNewMessageHighlightClass(highlighted)}`}
                          >
                            {formatGroupChatSystemNoticeText(message.text)}
                          </p>
                          <time
                            dateTime={message.created_at}
                            className="mt-1 block text-[10px] text-ftc-text-muted"
                          >
                            {formatMessageTime(message.created_at)}
                          </time>
                        </div>
                      </li>
                    );
                  }

                  const profile = senderProfiles.get(message.user_id);
                  const senderLabel = getSenderLabel(profile, message.user_id);

                  return (
                    <GroupChatMessageBubble
                      key={message.id}
                      messageId={message.id}
                      text={message.text}
                      createdAt={message.created_at}
                      isOwnMessage={isOwnMessage}
                      senderUserId={message.user_id}
                      senderLabel={senderLabel}
                      senderAvatarUrl={profile?.avatar_url}
                      profileReturnTo={chatReturnTo}
                      formatTime={formatMessageTime}
                      isHighlighted={highlighted}
                    />
                  );
                })}
              </ul>
            )}
          </div>

          <div className="relative shrink-0">
            {error && !error.includes("access") ? (
              <p className="px-4 pb-2 text-sm text-red-400">{error}</p>
            ) : null}

            {showNewMessagesPill ? (
              <ChatNewMessagesPill
                count={newMessagesPillCount}
                onClick={scrollToBottomSmooth}
              />
            ) : null}

            <GroupChatComposer
              value={input}
              onChange={setInput}
              onSend={() => void sendMessage()}
              sending={sending}
            />
          </div>
        </div>
      </div>
    </OnboardingGuard>
  );
}
