"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import ChatNewMessagesPill from "@/app/components/dm/ChatNewMessagesPill";
import GroupChatComposer from "@/app/components/group-chat/GroupChatComposer";
import GroupChatEmptyState from "@/app/components/group-chat/GroupChatEmptyState";
import GroupChatEventContextCard from "@/app/components/group-chat/GroupChatEventContextCard";
import CrewChatAnnouncementBand from "@/app/components/group-chat/CrewChatAnnouncementBand";
import CrewMemberListSheet from "@/app/components/group-chat/CrewMemberListSheet";
import GroupChatHeader from "@/app/components/group-chat/GroupChatHeader";
import { resolveCrewChatCountdownLabel } from "@/lib/events/crewChatCountdown";
import { buildCrewMemberList } from "@/lib/events/crewChatMembers";
import {
  loadEventChatLastReadByUser,
  resolveCrewChatSeenLabel,
} from "@/lib/events/crewChatReadReceipts";
import type { EventStatus } from "@/lib/events";
import GroupChatMessageBubble from "@/app/components/group-chat/GroupChatMessageBubble";
import GroupChatSystemNotice from "@/app/components/group-chat/GroupChatSystemNotice";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { ChatHeaderSkeleton, ChatMessagesSkeleton } from "@/app/components/skeleton/Skeleton";
import {
  getEventCrewChatAccess,
  getEventCrewChatBackHref,
  getEventCrewChatLoadErrorMessage,
  getEventCrewParticipantIds,
  listEventCrewChatMessages,
  sendEventCrewChatMessage,
  type EventCrewChatMessage,
} from "@/lib/eventCrewChat";
import {
  applyOptimisticDmReactionToggle,
  groupDmReactionsByMessageId,
  listMessageReactionsForEvent,
  toggleDmMessageReaction,
  upsertDmReactionInList,
  type DmMessageReaction,
} from "@/lib/dmReactions";
import {
  buildChatMessageGroupLayout,
  CHAT_MESSAGE_LIST_CLASS,
  CHAT_MESSAGE_SCROLLER_CLASS,
} from "@/lib/dm/chatMessageGroupLayout";
import type { CrewChatUnlockState } from "@/lib/events/crewChatUnlock";
import {
  buildGroupChatSenderNameVisibility,
  resolveCrewChatMemberCount,
} from "@/lib/groupChatMessageLayout";
import { markEventChatRead } from "@/lib/messageReads";
import {
  formatGroupChatSystemNoticeText,
  isGroupChatSystemUpdateMessage,
  isHiddenCrewRosterNotice,
} from "@/lib/groupChatSystemMessages";
import { buildChatReturnTo } from "@/lib/profileNavigation";
import { supabase } from "@/lib/supabaseClient";
import { getChatMaxScrollTop, useChatScroll, tagChatMessageForScroll } from "@/lib/useChatScroll";
import {
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

/** Distance from the live edge (px) before the event-context card collapses. */
const EVENT_CARD_COLLAPSE_THRESHOLD_PX = 24;

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
        {retrying ? "Retrying" : "Try again"}
      </button>
    </div>
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
  const [reactions, setReactions] = useState<DmMessageReaction[]>([]);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [senderProfiles, setSenderProfiles] = useState<Map<string, UserAvatarProfile>>(
    new Map(),
  );
  const [eventName, setEventName] = useState("Event");
  const [eventVenue, setEventVenue] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventSetTime, setEventSetTime] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [crewUnlock, setCrewUnlock] = useState<CrewChatUnlockState | null>(null);
  const [crewParticipantIds, setCrewParticipantIds] = useState<string[]>([]);
  const [crewParticipantProfiles, setCrewParticipantProfiles] = useState<
    Map<string, UserAvatarProfile>
  >(new Map());
  const [lastReadAtByUserId, setLastReadAtByUserId] = useState<Map<string, string>>(new Map());
  const [memberSheetOpen, setMemberSheetOpen] = useState(false);
  const [eventCardCollapsed, setEventCardCollapsed] = useState(false);
  const [input, setInput] = useState("");
  const [accessLoading, setAccessLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [canAccessChat, setCanAccessChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesLoadGenerationRef = useRef(0);
  const messageIdsRef = useRef<string[]>([]);
  const loading = accessLoading || messagesLoading;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const countdownLabel = useMemo(
    () => resolveCrewChatCountdownLabel(eventDate, eventStatus),
    [eventDate, eventStatus],
  );
  const crewMembers = useMemo(
    () => buildCrewMemberList(crewParticipantIds, crewParticipantProfiles, ownerId),
    [crewParticipantIds, crewParticipantProfiles, ownerId],
  );
  const senderNameVisibility = useMemo(
    () => buildGroupChatSenderNameVisibility(messages, currentUserId),
    [messages, currentUserId],
  );
  const chatMessageGroupLayout = useMemo(() => {
    const chatMessages = messages
      .filter((message) => !isGroupChatSystemUpdateMessage(message.text))
      .map((message) => ({
        id: message.id,
        user_id: message.user_id,
        created_at: message.created_at,
      }));

    return buildChatMessageGroupLayout(chatMessages);
  }, [messages]);
  const reactionsByMessageId = useMemo(
    () => groupDmReactionsByMessageId(reactions),
    [reactions],
  );
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages]);
  messageIdsRef.current = messageIds;
  const memberCount = resolveCrewChatMemberCount(
    crewParticipantIds.length > 0 ? crewParticipantIds.length : null,
    crewUnlock?.acceptedDjCount ?? 0,
  );
  /**
   * "Seen by …" for the single latest message only — see crewChatReadReceipts
   * for why not per-message. Recomputes on every last-read refresh (initial
   * load, realtime update, or a crew member's own read-through), not on every
   * message, so it stays cheap regardless of conversation length.
   */
  const latestMessageSeenLabel = useMemo(() => {
    if (!lastMessage) {
      return null;
    }

    return resolveCrewChatSeenLabel({
      messageCreatedAt: lastMessage.created_at,
      messageSenderId: lastMessage.user_id,
      participantIds: crewParticipantIds,
      ownerId,
      lastReadAtByUserId,
      profiles: crewParticipantProfiles,
    });
  }, [lastMessage, crewParticipantIds, ownerId, lastReadAtByUserId, crewParticipantProfiles]);
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
    messageIds,
    lastMessageSenderId: lastMessage?.user_id ?? null,
    lastMessageIsFromCurrentUser: lastMessage?._clientScrollMeta?.isFromCurrentUser ?? null,
    currentUserId,
  });
  const { addHighlightedMessageId, isMessageHighlighted } = useChatNewMessageHighlight();

  /**
   * Collapses the event-context card once the user scrolls into the
   * conversation, so long-lived history reads without a permanent info strip
   * eating the top of the viewport; reappears back at the live edge. rAF-
   * throttled scroll listener, one boolean of state — no ResizeObserver, no
   * per-message cost, so it doesn't add to the per-render list work task 12
   * is about.
   */
  useEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller) {
      return;
    }

    let ticking = false;

    function evaluateCollapse() {
      ticking = false;

      if (!scroller) {
        return;
      }

      const distanceFromBottom = getChatMaxScrollTop(scroller) - scroller.scrollTop;
      setEventCardCollapsed(distanceFromBottom > EVENT_CARD_COLLAPSE_THRESHOLD_PX);
    }

    function handleScroll() {
      if (ticking) {
        return;
      }

      ticking = true;
      requestAnimationFrame(evaluateCollapse);
    }

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [scrollRef]);

  const refreshEventArtwork = useCallback(async () => {
    if (!eventId) {
      return;
    }

    try {
      const access = await getEventCrewChatAccess(eventId);

      if (!access.canAccess) {
        return;
      }

      setEventName(access.eventName ?? "Event");
      setEventVenue(access.eventVenue ?? null);
      setEventDate(access.eventDate ?? null);
      setEventSetTime(access.eventSetTime ?? null);
      setEventStatus(access.eventStatus ?? null);
      setOwnerId(access.ownerId ?? null);
      setCrewUnlock(access.unlock);
    } catch (refreshError) {
      console.error("Failed to refresh group chat header:", refreshError);
    }
  }, [eventId]);

  const loadCrewParticipants = useCallback(async (targetEventId: string) => {
    try {
      const participantIds = await getEventCrewParticipantIds(targetEventId);
      setCrewParticipantIds(participantIds);

      if (participantIds.length === 0) {
        setCrewParticipantProfiles(new Map());
        return;
      }

      const profiles = await getUserAvatarProfilesByIds(participantIds);
      setCrewParticipantProfiles(profiles);
    } catch (participantError) {
      console.error("Failed to load crew chat participants:", participantError);
    }
  }, []);

  // Read receipts: message_reads already stores one (user, event) row with a
  // last_read_at high-water mark — same table DM's "Seen" reads, generalised
  // from one other participant to every crew member. Loaded once participants
  // are known, then kept live below.
  useEffect(() => {
    if (!eventId || crewParticipantIds.length === 0) {
      return;
    }

    let cancelled = false;

    loadEventChatLastReadByUser(eventId, crewParticipantIds)
      .then((lastReadByUserId) => {
        if (!cancelled) {
          setLastReadAtByUserId(lastReadByUserId);
        }
      })
      .catch((loadError) => {
        console.error("Failed to load crew chat read receipts:", loadError);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, crewParticipantIds]);

  useEffect(() => {
    if (!eventId || crewParticipantIds.length === 0) {
      return;
    }

    function upsertLastReadAt(row: { user_id: string; last_read_at: string }) {
      if (!crewParticipantIds.includes(row.user_id)) {
        return;
      }

      setLastReadAtByUserId((prev) => {
        const next = new Map(prev);
        next.set(row.user_id, row.last_read_at);
        return next;
      });
    }

    const channel = supabase
      .channel(`event-crew-chat-reads:${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reads", filter: `event_id=eq.${eventId}` },
        (payload) => upsertLastReadAt(payload.new as { user_id: string; last_read_at: string }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "message_reads", filter: `event_id=eq.${eventId}` },
        (payload) => upsertLastReadAt(payload.new as { user_id: string; last_read_at: string }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, crewParticipantIds]);

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

      const [rows, reactionsResult] = await Promise.all([
        withGroupChatMessagesTimeout(listEventCrewChatMessages(eventId)),
        listMessageReactionsForEvent(eventId).catch((reactionError) => {
          console.error("Failed to load group chat reactions:", reactionError);
          return [] as DmMessageReaction[];
        }),
      ]);

      if (generation !== messagesLoadGenerationRef.current) {
        return;
      }

      const latestMessageCreatedAt =
        rows.length > 0 ? rows[rows.length - 1]?.created_at ?? null : null;

      setMessages(
        rows
          .filter((message) => !isHiddenCrewRosterNotice(message.text))
          .map((message) => tagChatMessageForScroll(message, userId)),
      );
      setReactions(reactionsResult);
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
      setReactions([]);
      setReactionPickerMessageId(null);
      setSenderProfiles(new Map());
      setLastReadAtByUserId(new Map());
      setMemberSheetOpen(false);
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
            setError("Group chat is not available because no DJs are confirmed for this event");
          } else if (access.canStartCrewChat) {
            setError("Start group chat from the event page when you are ready to coordinate");
          } else {
            setError("Group chat is not available yet. The planner will start it when ready.");
          }
          setMessagesLoading(false);
          return;
        }

        setCanAccessChat(true);
        setEventName(access.eventName ?? "Event");
        setEventVenue(access.eventVenue ?? null);
        setEventDate(access.eventDate ?? null);
        setEventSetTime(access.eventSetTime ?? null);
        setEventStatus(access.eventStatus ?? null);
        setOwnerId(access.ownerId ?? null);
        setCrewUnlock(access.unlock);
        void loadCrewParticipants(eventId);
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
  }, [eventId, loadCrewParticipants]);

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
          if (isHiddenCrewRosterNotice(newMessage.text)) {
            return;
          }

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

  useEffect(() => {
    setReactionPickerMessageId(null);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !canAccessChat) {
      return;
    }

    function upsertReaction(nextReaction: DmMessageReaction) {
      if (!messageIdsRef.current.includes(nextReaction.message_id)) {
        return;
      }

      setReactions((prev) => {
        const withoutExisting = prev.filter(
          (reaction) =>
            !(
              reaction.message_id === nextReaction.message_id &&
              reaction.user_id === nextReaction.user_id
            ),
        );

        return [...withoutExisting, nextReaction];
      });
    }

    const channel = supabase
      .channel(`event-crew-reactions:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          upsertReaction(payload.new as DmMessageReaction);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          upsertReaction(payload.new as DmMessageReaction);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const deleted = payload.old as DmMessageReaction;

          if (!messageIdsRef.current.includes(deleted.message_id)) {
            return;
          }

          setReactions((prev) =>
            prev.filter(
              (reaction) =>
                !(
                  reaction.message_id === deleted.message_id &&
                  reaction.user_id === deleted.user_id
                ),
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canAccessChat, eventId]);

  /** Stable (messageId-first) so it can be passed straight to memoised bubbles without a per-row closure. */
  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId) {
        return;
      }

      let rollbackReactions: DmMessageReaction[] = [];

      setReactions((prev) => {
        rollbackReactions = prev.filter((reaction) => reaction.message_id === messageId);
        return applyOptimisticDmReactionToggle(prev, messageId, emoji, currentUserId);
      });
      setReactionPickerMessageId(null);
      setReactingMessageId(messageId);
      setError(null);

      try {
        const nextReaction = await toggleDmMessageReaction(messageId, emoji);

        setReactions((prev) =>
          upsertDmReactionInList(prev, nextReaction, messageId, currentUserId),
        );
      } catch (reactionError) {
        console.error("Failed to toggle group chat reaction:", reactionError);
        setReactions((prev) => {
          const withoutMessage = prev.filter((reaction) => reaction.message_id !== messageId);

          return [...withoutMessage, ...rollbackReactions];
        });
        setError(
          reactionError instanceof Error ? reactionError.message : "Failed to update reaction",
        );
      } finally {
        setReactingMessageId(null);
      }
    },
    [currentUserId],
  );

  const handleOpenReactionPicker = useCallback((messageId: string) => {
    setReactionPickerMessageId(messageId);
  }, []);

  const handleCloseReactionPicker = useCallback((messageId: string) => {
    setReactionPickerMessageId((current) => (current === messageId ? null : current));
  }, []);

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
          <header
            data-chat-header
            className="z-10 shrink-0 overflow-visible border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4"
          >
            {accessLoading ? (
              <ChatHeaderSkeleton />
            ) : (
              <GroupChatHeader
                backHref={backHref}
                backLabel={openedFromMessages ? "Back to messages" : "Back to event"}
                eventName={eventName}
                memberCount={memberCount}
                participantIds={crewParticipantIds}
                participantProfiles={crewParticipantProfiles}
                onOpenMemberSheet={() => setMemberSheetOpen(true)}
              />
            )}
          </header>

          {/*
            Event-context card: venue/date/time + View Event, directly beneath
            the header. Collapses once the user scrolls into the conversation
            (see the scroll listener above) so long history reads without a
            permanent info strip; reappears back at the live edge.
          */}
          {!accessLoading ? (
            <GroupChatEventContextCard
              eventId={eventId}
              venue={eventVenue ?? ""}
              eventDate={eventDate ?? ""}
              setTime={eventSetTime ?? ""}
              showViewEventAction={openedFromMessages}
              collapsed={eventCardCollapsed}
            />
          ) : null}

          {/*
            Reserved for future announcements ("Run Sheet Updated", "Venue
            Changed", …) — beneath the event card, renders nothing today. See
            CrewChatAnnouncementBand for why this is a real, positioned
            component rather than a placeholder box.
          */}
          <CrewChatAnnouncementBand />

          {/*
            Chat sub-header: a fixed slot between the header/card and the
            scroller, above the conversation and outside it, so it never
            scrolls away and never re-layouts the message list. Holds the event
            countdown.
          */}
          {countdownLabel ? (
            <div
              data-chat-subheader
              className="shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-1.5 backdrop-blur-md sm:px-4"
            >
              <p className="text-[11px] font-medium text-ftc-text-muted">{countdownLabel}</p>
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className={CHAT_MESSAGE_SCROLLER_CLASS}
          >
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
              <GroupChatEmptyState />
            ) : (
              <ul data-chat-content-root className={CHAT_MESSAGE_LIST_CLASS}>
                {reversedMessages.map((message) => {
                  const isOwnMessage =
                    currentUserId !== null && message.user_id === currentUserId;
                  const isSystemUpdate = isGroupChatSystemUpdateMessage(message.text);
                  const highlighted = isMessageHighlighted(message.id);
                  logChatHighlightRender(message.id, highlighted);

                  if (isSystemUpdate) {
                    return (
                      <GroupChatSystemNotice
                        key={message.id}
                        messageId={message.id}
                        text={formatGroupChatSystemNoticeText(message.text)}
                        createdAt={message.created_at}
                        formatTime={formatMessageTime}
                        isHighlighted={highlighted}
                      />
                    );
                  }

                  const profile = senderProfiles.get(message.user_id);
                  const senderLabel = getSenderLabel(profile, message.user_id);
                  const messageGroupLayout = chatMessageGroupLayout.get(message.id);

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
                      reactions={reactionsByMessageId.get(message.id) ?? []}
                      currentUserId={currentUserId}
                      showReactionPicker={reactionPickerMessageId === message.id}
                      reacting={reactingMessageId === message.id}
                      scrollContainerRef={scrollRef}
                      onToggleReaction={handleToggleReaction}
                      onOpenReactionPicker={handleOpenReactionPicker}
                      onCloseReactionPicker={handleCloseReactionPicker}
                      formatTime={formatMessageTime}
                      isHighlighted={highlighted}
                      showSenderName={senderNameVisibility.get(message.id) ?? false}
                      showAvatar={messageGroupLayout?.showAvatar ?? true}
                      tightWithPrevious={messageGroupLayout?.tightWithPrevious ?? false}
                      showTimestamp={messageGroupLayout?.showAvatar ?? true}
                      groupPosition={messageGroupLayout?.position ?? "standalone"}
                      seenLabel={message.id === lastMessage?.id ? latestMessageSeenLabel : null}
                    />
                  );
                })}
              </ul>
            )}
            <div ref={bottomRef} data-chat-bottom aria-hidden="true" className="h-px shrink-0" />
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

      <CrewMemberListSheet
        open={memberSheetOpen}
        members={crewMembers}
        profileReturnTo={chatReturnTo}
        onClose={() => setMemberSheetOpen(false)}
      />
    </OnboardingGuard>
  );
}
