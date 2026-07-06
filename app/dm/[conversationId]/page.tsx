"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import BookingRequestCard, {
  buildUpdatedBookingMessage,
} from "@/app/components/BookingRequestCard";
import ChatNewMessagesPill from "@/app/components/dm/ChatNewMessagesPill";
import DmConversationDetailsPanel from "@/app/components/dm/DmConversationDetailsPanel";
import DmComposer from "@/app/components/dm/DmComposer";
import DmReportFormModal from "@/app/components/dm/DmReportFormModal";
import DmTextMessageBubble from "@/app/components/dm/DmTextMessageBubble";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  buildDmCancelledBookingMatchContext,
  acceptProposedBookingRate,
  cancelAcceptedBookingRequest,
  cancelBookingRequest,
  CANCELLED_BOOKING_DM_SYSTEM_MESSAGE,
  canRecipientRespondToPendingBooking,
  declineProposedBookingRate,
  evaluateDmBookingCardVisibility,
  extractBookingIdsFromMessages,
  fetchBookingRequestsByIds,
  getBookingMutationErrorMessage,
  getBookingRequestsForConversation,
  getEventIdsWithAcceptedBookings,
  isBookingAcceptedDmMessage,
  isBookingActivityDmMessage,
  isBookingCancelledDmMessage,
  isBookingRateProposalSchemaError,
  isBookingRequestMessage,
  isRateProposedDmMessage,
  isRateProposalDeclinedDmMessage,
  mergeBookingRequests,
  mergeBookingWithMessage,
  parseBookingRequestMessage,
  proposeBookingRate,
  updateBookingRequestStatus,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { resolveDmThreadBackHref } from "@/lib/dm/threadNavigation";
import {
  getDmAttachmentNotificationBody,
  groupDmAttachmentsByMessageId,
  listDmAttachmentsForConversation,
  sendDmMessageWithAttachment,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";
import {
  groupDmReactionsByMessageId,
  listDmReactionsForConversation,
  toggleDmMessageReaction,
  upsertDmReactionInList,
  type DmMessageReaction,
} from "@/lib/dmReactions";
import { createNotification, markNotificationsReadForLink } from "@/lib/notifications";
import { getEventArtworkByIds, type EventArtworkSnapshot } from "@/lib/events";
import { resolveEventLinkedBookingDisplay } from "@/lib/events/eventBookingDisplay";
import {
  getLatestOwnDmMessageId,
  isMessageSeenByReader,
  loadDmParticipantLastReadAt,
  markConversationRead,
  shouldShowDmReadReceipts,
} from "@/lib/messageReads";
import { supabase } from "@/lib/supabaseClient";
import { useChatScroll, tagChatMessageForScroll } from "@/lib/useChatScroll";
import { getChatNewMessageHighlightClass, logChatHighlightRender } from "@/lib/chatNewMessageHighlight";
import { useChatNewMessageHighlight } from "@/lib/useChatNewMessageHighlight";
import {
  blockDmUser,
  getDmBlockBannerMessage,
  getDmBlockSendErrorMessage,
  getDmBlockStatus,
  unblockDmUser,
  type DmBlockStatus,
} from "@/lib/userBlocks";
import { submitDmMessageReport, type DmReportReason } from "@/lib/userReports";
import {
  getCurrentUserId,
  getBookingRecipientProfilesByIds,
  getUserAvatarProfilesByIds,
  type BookingRecipientProfile,
  type UserAvatarProfile,
} from "@/lib/user/currentUser";
import { resolveUserDisplayName } from "@/lib/user/displayName";

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
  _clientScrollMeta?: {
    isFromCurrentUser: boolean;
  };
};

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getConversationTitle(otherUserProfile: UserAvatarProfile | null) {
  return resolveUserDisplayName(otherUserProfile);
}

export default function DmChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId as string;
  const backHref = resolveDmThreadBackHref({
    from: searchParams.get("from"),
    tab: searchParams.get("tab"),
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<DmMessageAttachment[]>([]);
  const [reactions, setReactions] = useState<DmMessageReaction[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loadingBookingIds, setLoadingBookingIds] = useState<Set<string>>(new Set());
  const [failedBookingIds, setFailedBookingIds] = useState<Set<string>>(new Set());
  const [eventArtworkById, setEventArtworkById] = useState<Map<string, EventArtworkSnapshot>>(
    new Map(),
  );
  const [eventIdsWithAcceptedBookings, setEventIdsWithAcceptedBookings] = useState<Set<string>>(
    () => new Set(),
  );
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<UserAvatarProfile | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [respondingBookingId, setRespondingBookingId] = useState<string | null>(null);
  const [proposalLoadingId, setProposalLoadingId] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Set<string>>(() => new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<DmBlockStatus>({
    blockedByMe: false,
    blockedMe: false,
    isBlocked: false,
  });
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportMessageTarget, setReportMessageTarget] = useState<{
    messageId: string;
    reportedUserId: string;
  } | null>(null);
  const [reportMessageSubmitting, setReportMessageSubmitting] = useState(false);
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
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

  const conversationTitle = getConversationTitle(otherUserProfile);
  const otherUserLabel = resolveUserDisplayName(otherUserProfile);
  const bookingsById = useMemo(
    () => new Map(bookings.map((booking) => [booking.id, booking])),
    [bookings],
  );
  const bookingProfiles = useMemo(() => {
    if (!otherUserId || !otherUserProfile) {
      return new Map<string, BookingRecipientProfile>();
    }

    return new Map<string, BookingRecipientProfile>([
      [
        otherUserId,
        {
          user_id: otherUserId,
          display_name: otherUserProfile.display_name,
          avatar_url: otherUserProfile.avatar_url,
          genre: null,
          role: "dj",
        },
      ],
    ]);
  }, [otherUserId, otherUserProfile]);
  const blockBannerMessage = useMemo(
    () => getDmBlockBannerMessage(blockStatus, otherUserLabel),
    [blockStatus, otherUserLabel],
  );
  const cancelledBookingContext = useMemo(
    () => buildDmCancelledBookingMatchContext(bookings, conversationId),
    [bookings, conversationId],
  );
  const attachmentsByMessageId = useMemo(
    () => groupDmAttachmentsByMessageId(attachments),
    [attachments],
  );
  const reactionsByMessageId = useMemo(
    () => groupDmReactionsByMessageId(reactions),
    [reactions],
  );
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const canShowReadReceipts = shouldShowDmReadReceipts({
    isBlocked: blockStatus.isBlocked,
    otherUserDisplayName: otherUserProfile?.display_name,
  });
  const latestOwnMessageIdForReceipt = useMemo(() => {
    if (!currentUserId || !canShowReadReceipts) {
      return null;
    }

    return getLatestOwnDmMessageId(messages, currentUserId, (message) => {
      const messageAttachments = attachmentsByMessageId.get(message.id) ?? [];
      const hasAttachments = messageAttachments.length > 0;
      const hasText = message.text.trim().length > 0;
      const isBookingMessage = isBookingRequestMessage(message.text);

      return hasText || hasAttachments || isBookingMessage;
    });
  }, [attachmentsByMessageId, canShowReadReceipts, currentUserId, messages]);
  const shouldShowSeenOnMessage = useMemo(() => {
    return (messageId: string, messageCreatedAt: string) => {
      if (!canShowReadReceipts || messageId !== latestOwnMessageIdForReceipt) {
        return false;
      }

      return isMessageSeenByReader(messageCreatedAt, otherUserLastReadAt);
    };
  }, [canShowReadReceipts, latestOwnMessageIdForReceipt, otherUserLastReadAt]);
  const refreshParticipantReadState = useCallback(async () => {
    if (!conversationId || !otherUserId) {
      setOtherUserLastReadAt(null);
      return;
    }

    try {
      const lastReadAt = await loadDmParticipantLastReadAt(conversationId, otherUserId);
      setOtherUserLastReadAt(lastReadAt);
    } catch (readStateError) {
      console.error("Failed to load participant read state:", readStateError);
      setOtherUserLastReadAt(null);
    }
  }, [conversationId, otherUserId]);
  const latestConversationMessageCreatedAt =
    messages.length > 0 ? messages[messages.length - 1].created_at : null;

  useEffect(() => {
    setExpandedBookingIds(new Set());
    setEventIdsWithAcceptedBookings(new Set());
  }, [conversationId]);

  const setBookingExpanded = useCallback((bookingKey: string, expanded: boolean) => {
    setExpandedBookingIds((previous) => {
      const next = new Set(previous);

      if (expanded) {
        next.add(bookingKey);
      } else {
        next.delete(bookingKey);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    async function loadConversationMeta() {
      const currentUserIdValue = await getCurrentUserId();
      setCurrentUserId(currentUserIdValue);

      const { data, error: membersError } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (membersError) {
        console.error("conversation_members query failed:", membersError.message);
        return;
      }

      const otherMember = (data ?? []).find(
        (member) => member.user_id !== currentUserIdValue,
      );

      const nextOtherUserId = otherMember?.user_id ?? null;
      setOtherUserId(nextOtherUserId);

      if (!nextOtherUserId) {
        setOtherUserProfile(null);
        return;
      }

      try {
        const profiles = await getUserAvatarProfilesByIds([nextOtherUserId]);
        setOtherUserProfile(profiles.get(nextOtherUserId) ?? null);
      } catch (profileError) {
        console.error("Failed to load chat user profile:", profileError);
        setOtherUserProfile(null);
      }
    }

    loadConversationMeta();
  }, [conversationId]);

  useEffect(() => {
    if (!otherUserId || !currentUserId) {
      setBlockStatus({
        blockedByMe: false,
        blockedMe: false,
        isBlocked: false,
      });
      return;
    }

    async function refreshBlockStatus() {
      try {
        const status = await getDmBlockStatus(otherUserId);
        setBlockStatus(status);
      } catch (blockError) {
        console.error("Failed to load block status:", blockError);
      }
    }

    void refreshBlockStatus();

    const channel = supabase
      .channel(`dm-blocks:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_blocks",
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { blocker_id?: string; blocked_id?: string }
            | null;

          if (!row?.blocker_id || !row?.blocked_id) {
            return;
          }

          const involvesPair =
            (row.blocker_id === currentUserId && row.blocked_id === otherUserId) ||
            (row.blocker_id === otherUserId && row.blocked_id === currentUserId);

          if (involvesPair) {
            void refreshBlockStatus();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, otherUserId]);

  useEffect(() => {
    if (!conversationId || !otherUserId) {
      setOtherUserLastReadAt(null);
      return;
    }

    void refreshParticipantReadState();

    const channel = supabase
      .channel(`dm-read-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refreshParticipantReadState();
        },
      )
      .subscribe();

    const pollIntervalId = window.setInterval(() => {
      void refreshParticipantReadState();
    }, 5000);

    function handleRefreshReadReceipts() {
      void refreshParticipantReadState();
    }

    window.addEventListener("focus", handleRefreshReadReceipts);
    window.addEventListener("visibilitychange", handleRefreshReadReceipts);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollIntervalId);
      window.removeEventListener("focus", handleRefreshReadReceipts);
      window.removeEventListener("visibilitychange", handleRefreshReadReceipts);
    };
  }, [conversationId, otherUserId, refreshParticipantReadState]);

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      return;
    }

    const latestOwnMessage = latestOwnMessageIdForReceipt
      ? messages.find((message) => message.id === latestOwnMessageIdForReceipt) ?? null
      : null;
    const shouldShowSeen = latestOwnMessage
      ? shouldShowSeenOnMessage(latestOwnMessage.id, latestOwnMessage.created_at)
      : false;

    console.log("[reads] current user id", currentUserId);
    console.log("[reads] conversation id", conversationId);
    console.log("[reads] other participant id", otherUserId);
    console.log("[reads] loaded other last_read_at", otherUserLastReadAt);
    console.log(
      "[reads] latest own message id/date",
      latestOwnMessage?.id ?? null,
      latestOwnMessage?.created_at ?? null,
    );
    console.log("[reads] should show seen", shouldShowSeen);
  }, [
    conversationId,
    currentUserId,
    latestOwnMessageIdForReceipt,
    messages,
    otherUserId,
    otherUserLastReadAt,
    shouldShowSeenOnMessage,
  ]);

  useEffect(() => {
    if (!conversationId || !currentUserId || loading) {
      return;
    }

    markNotificationsReadForLink(currentUserId, `/dm/${conversationId}`);
    void markConversationRead(conversationId, {
      readThroughCreatedAt: latestConversationMessageCreatedAt,
    });
  }, [conversationId, currentUserId, latestConversationMessageCreatedAt, loading]);

  const syncEventArtwork = useCallback(async (nextBookings: BookingRequest[]) => {
    const eventIds = nextBookings
      .map((booking) => booking.event_id)
      .filter((eventId): eventId is string => Boolean(eventId));

    try {
      const artworkById = await getEventArtworkByIds(eventIds);
      setEventArtworkById(artworkById);
    } catch (artworkError) {
      console.error("Failed to load event artwork:", artworkError);
      setEventArtworkById(new Map());
    }
  }, []);

  const syncEventAcceptedBookings = useCallback(async (nextBookings: BookingRequest[]) => {
    const eventIds = nextBookings
      .map((booking) => booking.event_id)
      .filter((eventId): eventId is string => Boolean(eventId));

    try {
      const acceptedEventIds = await getEventIdsWithAcceptedBookings(eventIds);
      setEventIdsWithAcceptedBookings(acceptedEventIds);
    } catch (acceptedBookingsError) {
      console.error("Failed to load event accepted-booking state:", acceptedBookingsError);
      setEventIdsWithAcceptedBookings(new Set());
    }
  }, []);

  async function reloadConversationBookings() {
    if (!conversationId) {
      return;
    }

    try {
      let nextBookings = await getBookingRequestsForConversation(conversationId);
      const messageBookingIds = extractBookingIdsFromMessages(messages);
      const missingBookingIds = messageBookingIds.filter(
        (bookingId) => !nextBookings.some((booking) => booking.id === bookingId),
      );

      if (missingBookingIds.length > 0) {
        const fetchedById = await fetchBookingRequestsByIds(missingBookingIds);
        nextBookings = mergeBookingRequests(nextBookings, fetchedById);
      }

      setBookings(nextBookings);
      await syncEventArtwork(nextBookings);
      await syncEventAcceptedBookings(nextBookings);
    } catch (bookingError) {
      console.error("Failed to load booking requests:", bookingError);
    }
  }

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    async function loadConversationData() {
      setLoading(true);
      setError(null);
      setFailedBookingIds(new Set());
      setLoadingBookingIds(new Set());

      const messagesResult = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesResult.error) {
        setError(messagesResult.error.message);
        setLoading(false);
        return;
      }

      const loadedMessages = (messagesResult.data as Message[]) ?? [];
      const messageBookingIds = extractBookingIdsFromMessages(loadedMessages);
      let bookingsResult: BookingRequest[] = [];
      let bookingLoadError: string | null = null;

      try {
        bookingsResult = await getBookingRequestsForConversation(conversationId);
      } catch (bookingError) {
        console.error("Failed to load conversation booking requests:", bookingError);
        if (isBookingRateProposalSchemaError(bookingError)) {
          bookingLoadError = `Booking rate fields are missing from the API schema. Run scripts/supabaseReloadPostgrest.sql in the Supabase SQL Editor.`;
        } else {
          bookingLoadError = getBookingMutationErrorMessage(bookingError);
        }
      }

      const missingBookingIds = messageBookingIds.filter(
        (bookingId) => !bookingsResult.some((booking) => booking.id === bookingId),
      );

      if (missingBookingIds.length > 0) {
        setLoadingBookingIds(new Set(missingBookingIds));

        try {
          const fetchedById = await fetchBookingRequestsByIds(missingBookingIds);
          bookingsResult = mergeBookingRequests(bookingsResult, fetchedById);
          const unresolvedIds = missingBookingIds.filter(
            (bookingId) => !fetchedById.some((booking) => booking.id === bookingId),
          );

          if (unresolvedIds.length > 0) {
            setFailedBookingIds(new Set(unresolvedIds));
          }
        } catch (bookingError) {
          console.error("Failed to hydrate booking requests by id:", bookingError);
          setFailedBookingIds(new Set(missingBookingIds));

          if (isBookingRateProposalSchemaError(bookingError)) {
            bookingLoadError = `Booking rate fields are missing from the API schema. Run scripts/supabaseReloadPostgrest.sql in the Supabase SQL Editor.`;
          } else if (!bookingLoadError) {
            bookingLoadError = getBookingMutationErrorMessage(bookingError);
          }
        } finally {
          setLoadingBookingIds(new Set());
        }
      }

      if (bookingLoadError) {
        setError(bookingLoadError);
      }

      const [attachmentsResult, reactionsResult] = await Promise.all([
        listDmAttachmentsForConversation(conversationId).catch((attachmentError) => {
          console.error("Failed to load message attachments:", attachmentError);
          return [] as DmMessageAttachment[];
        }),
        listDmReactionsForConversation(conversationId).catch((reactionError) => {
          console.error("Failed to load message reactions:", reactionError);
          return [] as DmMessageReaction[];
        }),
      ]);

      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      setMessages(loadedMessages.map((message) => tagChatMessageForScroll(message, userId)));
      setBookings(bookingsResult);
      setAttachments(attachmentsResult);
      setReactions(reactionsResult);
      await syncEventArtwork(bookingsResult);
      await syncEventAcceptedBookings(bookingsResult);
      setLoading(false);
    }

    loadConversationData();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`dm-bookings:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_requests",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void reloadConversationBookings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (loading || !conversationId) {
      return;
    }

    const missingIds = extractBookingIdsFromMessages(messages).filter(
      (bookingId) =>
        !bookingsById.has(bookingId) &&
        !loadingBookingIds.has(bookingId) &&
        !failedBookingIds.has(bookingId),
    );

    if (missingIds.length === 0) {
      return;
    }

    let cancelled = false;

    setLoadingBookingIds((prev) => new Set([...prev, ...missingIds]));

    void (async () => {
      try {
        const fetched = await fetchBookingRequestsByIds(missingIds);

        if (cancelled) {
          return;
        }

        if (fetched.length > 0) {
          setBookings((prev) => mergeBookingRequests(prev, fetched));
        }

        const unresolvedIds = missingIds.filter(
          (bookingId) => !fetched.some((booking) => booking.id === bookingId),
        );

        if (unresolvedIds.length > 0) {
          setFailedBookingIds((prev) => new Set([...prev, ...unresolvedIds]));
        }
      } catch (fetchError) {
        console.error("Failed to hydrate missing bookings:", fetchError);
        if (!cancelled) {
          setFailedBookingIds((prev) => new Set([...prev, ...missingIds]));
        }
      } finally {
        if (!cancelled) {
          setLoadingBookingIds((prev) => {
            const next = new Set(prev);
            for (const bookingId of missingIds) {
              next.delete(bookingId);
            }
            return next;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, conversationId, messages, bookingsById, loadingBookingIds, failedBookingIds]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`dm-attachments:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_attachments",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const nextAttachment = payload.new as DmMessageAttachment;

          setAttachments((prev) => {
            if (prev.some((attachment) => attachment.id === nextAttachment.id)) {
              return prev;
            }

            return [...prev, nextAttachment];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    function upsertReaction(nextReaction: DmMessageReaction) {
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
      .channel(`dm-reactions:${conversationId}`)
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

          void markConversationRead(conversationId, {
            readThroughCreatedAt: newMessage.created_at,
          });
          void refreshParticipantReadState();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    currentUserId,
    captureScrollBeforeIncomingInsert,
    addHighlightedMessageId,
    refreshParticipantReadState,
  ]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || !conversationId || sending || uploading) {
      return;
    }

    const blockSendError = getDmBlockSendErrorMessage(blockStatus);

    if (blockSendError) {
      setError(blockSendError);
      return;
    }

    setSending(true);
    setError(null);
    markUserSentMessage();

    const userId = await getCurrentUserId();

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      text,
    });

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    if (otherUserId) {
      try {
        await createNotification(
          otherUserId,
          "message",
          "New message",
          text,
          `/dm/${conversationId}`,
        );
      } catch (notificationError) {
        console.error(
          "[dm] Message sent but notification failed:",
          notificationError,
        );
      }
    }

    setInput("");
    setSending(false);
    void markConversationRead(conversationId, {
      readThroughCreatedAt: latestConversationMessageCreatedAt,
    });
  }

  async function sendAttachment(file: File) {
    if (!conversationId || uploading || sending) {
      return;
    }

    const blockSendError = getDmBlockSendErrorMessage(blockStatus);

    if (blockSendError) {
      setError(blockSendError);
      return;
    }

    setUploading(true);
    setError(null);
    markUserSentMessage();

    try {
      const caption = input.trim();
      const { messageId, attachment } = await sendDmMessageWithAttachment({
        conversationId,
        text: caption,
        file,
      });

      const userId = await getCurrentUserId();
      const optimisticMessage: Message = tagChatMessageForScroll(
        {
          id: messageId,
          conversation_id: conversationId,
          user_id: userId,
          text: caption,
          created_at: new Date().toISOString(),
        },
        userId,
      );

      setMessages((prev) => {
        if (prev.some((message) => message.id === messageId)) {
          return prev;
        }

        return [...prev, optimisticMessage];
      });

      setAttachments((prev) => {
        if (prev.some((item) => item.id === attachment.id)) {
          return prev;
        }

        return [...prev, attachment];
      });

      if (otherUserId) {
        await createNotification(
          otherUserId,
          "message",
          "New message",
          caption || getDmAttachmentNotificationBody(attachment),
          `/dm/${conversationId}`,
        );
      }

      setInput("");
      void markConversationRead(conversationId, {
        readThroughCreatedAt: optimisticMessage.created_at,
      });
    } catch (uploadError) {
      console.error("Failed to send attachment:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Failed to send attachment");
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleReaction(messageId: string, emoji: string) {
    if (!currentUserId || reactingMessageId) {
      return;
    }

    setReactingMessageId(messageId);
    setError(null);

    try {
      const nextReaction = await toggleDmMessageReaction(messageId, emoji);

      setReactions((prev) =>
        upsertDmReactionInList(prev, nextReaction, messageId, currentUserId),
      );
      setReactionPickerMessageId(null);
    } catch (reactionError) {
      console.error("Failed to toggle reaction:", reactionError);
      setError(reactionError instanceof Error ? reactionError.message : "Failed to update reaction");
    } finally {
      setReactingMessageId(null);
    }
  }

  async function handleBookingResponse(
    booking: BookingRequest,
    message: Message,
    status: "accepted" | "declined",
  ) {
    if (respondingBookingId) {
      return;
    }

    setRespondingBookingId(booking.id);
    setError(null);

    try {
      const updatedBooking = await updateBookingRequestStatus(booking.id, status);
      const updatedMessageText = buildUpdatedBookingMessage(updatedBooking, status);

      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)),
      );

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, text: updatedMessageText } : item,
        ),
      );

      await supabase.from("messages").update({ text: updatedMessageText }).eq("id", message.id);
    } catch (responseError) {
      console.error("Failed to update booking request:", responseError);
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Failed to update booking request",
      );
    } finally {
      setRespondingBookingId(null);
    }
  }

  async function handleProposeRate(
    booking: BookingRequest,
    proposedRate: number,
    note: string,
  ) {
    if (proposalLoadingId || respondingBookingId) {
      return;
    }

    setProposalLoadingId(booking.id);
    setError(null);
    setNotice(null);

    try {
      const { booking: updatedBooking, warning } = await proposeBookingRate(
        booking.id,
        proposedRate,
        note,
      );

      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)),
      );

      if (warning) {
        setNotice(warning);
      }
    } catch (proposalError) {
      console.error("Failed to propose booking rate:", proposalError);
      setError(getBookingMutationErrorMessage(proposalError));
      throw proposalError instanceof Error
        ? proposalError
        : new Error(getBookingMutationErrorMessage(proposalError));
    } finally {
      setProposalLoadingId(null);
    }
  }

  async function handleAcceptProposedRate(booking: BookingRequest, message: Message) {
    if (proposalLoadingId || respondingBookingId || cancellingBookingId) {
      return;
    }

    setProposalLoadingId(booking.id);
    setError(null);

    try {
      const updatedBooking = await acceptProposedBookingRate(booking.id);
      const updatedMessageText = buildUpdatedBookingMessage(updatedBooking, "accepted");

      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)),
      );

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, text: updatedMessageText } : item,
        ),
      );

      await supabase.from("messages").update({ text: updatedMessageText }).eq("id", message.id);
    } catch (acceptError) {
      console.error("Failed to accept proposed rate:", acceptError);
      setError(getBookingMutationErrorMessage(acceptError));
    } finally {
      setProposalLoadingId(null);
    }
  }

  async function handleKeepOriginalOffer(booking: BookingRequest) {
    if (proposalLoadingId || respondingBookingId || cancellingBookingId) {
      return;
    }

    setProposalLoadingId(booking.id);
    setError(null);

    try {
      const { booking: updatedBooking, warning } = await declineProposedBookingRate(booking.id);

      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)),
      );
      await reloadConversationBookings();

      if (warning) {
        setNotice(warning);
      }
    } catch (declineError) {
      console.error("Failed to keep original offer:", declineError);
      setError(getBookingMutationErrorMessage(declineError));
    } finally {
      setProposalLoadingId(null);
    }
  }

  async function handleBookingCancel(booking: BookingRequest, message: Message) {
    if (respondingBookingId || cancellingBookingId) {
      return;
    }

    setCancellingBookingId(booking.id);
    setError(null);

    try {
      const updatedBooking = await cancelBookingRequest(booking.id);
      const updatedMessageText = buildUpdatedBookingMessage(updatedBooking, "cancelled");

      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)),
      );

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, text: updatedMessageText } : item,
        ),
      );

      await supabase.from("messages").update({ text: updatedMessageText }).eq("id", message.id);
      await reloadConversationBookings();
    } catch (cancelError) {
      console.error("Failed to cancel booking request:", cancelError);
      setError(getBookingMutationErrorMessage(cancelError));
    } finally {
      setCancellingBookingId(null);
    }
  }

  async function handleCancelAcceptedBooking(
    booking: BookingRequest,
    message: Message,
    reason: string,
  ) {
    if (respondingBookingId || cancellingBookingId) {
      return;
    }

    setCancellingBookingId(booking.id);
    setError(null);
    setNotice(null);

    try {
      const profileMap = await getBookingRecipientProfilesByIds([booking.recipient_id]);
      const djDisplayName =
        profileMap.get(booking.recipient_id)?.display_name?.trim() || "DJ";
      const { booking: updatedBooking, warning } = await cancelAcceptedBookingRequest(
        booking,
        reason,
        djDisplayName,
      );
      const updatedMessageText = buildUpdatedBookingMessage(updatedBooking, "cancelled");

      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)),
      );

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, text: updatedMessageText } : item,
        ),
      );

      if (warning) {
        setNotice(warning);
      }

      try {
        await supabase.from("messages").update({ text: updatedMessageText }).eq("id", message.id);
        await reloadConversationBookings();
      } catch (followUpError) {
        console.error("Failed to refresh booking conversation after withdrawal:", followUpError);
      }
    } catch (cancelError) {
      console.error("Failed to cancel accepted booking:", cancelError);
      setError(getBookingMutationErrorMessage(cancelError));
    } finally {
      setCancellingBookingId(null);
    }
  }

  async function handleBlockUser() {
    if (!otherUserId || blockActionLoading) {
      return;
    }

    setBlockActionLoading(true);
    setError(null);

    try {
      await blockDmUser(otherUserId);
      setBlockStatus({
        blockedByMe: true,
        blockedMe: false,
        isBlocked: true,
      });
    } catch (blockError) {
      console.error("Failed to block user:", blockError);
      setError(blockError instanceof Error ? blockError.message : "Failed to block user");
    } finally {
      setBlockActionLoading(false);
    }
  }

  async function handleUnblockUser() {
    if (!otherUserId || blockActionLoading) {
      return;
    }

    setBlockActionLoading(true);
    setError(null);

    try {
      await unblockDmUser(otherUserId);
      setBlockStatus({
        blockedByMe: false,
        blockedMe: false,
        isBlocked: false,
      });
    } catch (unblockError) {
      console.error("Failed to unblock user:", unblockError);
      setError(unblockError instanceof Error ? unblockError.message : "Failed to unblock user");
    } finally {
      setBlockActionLoading(false);
    }
  }

  async function handleSubmitMessageReport(input: { reason: DmReportReason; note: string }) {
    if (!reportMessageTarget || !conversationId) {
      return;
    }

    setReportMessageSubmitting(true);

    try {
      await submitDmMessageReport({
        conversationId,
        messageId: reportMessageTarget.messageId,
        reportedUserId: reportMessageTarget.reportedUserId,
        reason: input.reason,
        note: input.note,
      });
    } finally {
      setReportMessageSubmitting(false);
    }
  }

  return (
    <OnboardingGuard>
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ftc-bg font-sans text-ftc-text">
      <AppNavigation />
      <div
        className={`mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden ${MOBILE_NAV_OFFSET_CLASS}`}
      >
      <header className="z-10 shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            aria-label="Back to inbox"
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
            <ProfileAvatar
              name={otherUserLabel}
              avatarUrl={otherUserProfile?.avatar_url}
              size="md"
              className="h-10 w-10 text-xs"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-ftc-text">
                {conversationTitle}
              </h1>
              <p className="truncate text-xs text-ftc-text-muted">Direct message</p>
            </div>
          </div>

          {otherUserId ? (
            <button
              type="button"
              aria-label={`Open conversation details for ${conversationTitle}`}
              onClick={() => setDetailsOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      {otherUserId ? (
        <DmConversationDetailsPanel
          open={detailsOpen}
          conversationId={conversationId}
          otherUserId={otherUserId}
          otherUserName={otherUserLabel}
          otherUserAvatarUrl={otherUserProfile?.avatar_url}
          blockedByMe={blockStatus.blockedByMe}
          busy={blockActionLoading}
          onClose={() => setDetailsOpen(false)}
          onBlock={handleBlockUser}
          onUnblock={handleUnblockUser}
        />
      ) : null}

      <DmReportFormModal
        open={reportMessageTarget !== null}
        title="Report message"
        description="Tell us what happened. Reporting does not block this user or delete the message."
        reportType="message"
        busy={reportMessageSubmitting}
        onClose={() => setReportMessageTarget(null)}
        onSubmit={handleSubmitMessageReport}
      />

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
            <ProfileAvatar
              name={otherUserLabel}
              avatarUrl={otherUserProfile?.avatar_url}
              size="md"
              className="h-10 w-10 text-xs"
            />
            <p className="mt-4 text-sm font-medium text-ftc-text-secondary">
              No messages yet
            </p>
            <p className="mt-1 text-sm text-ftc-text-muted">
              Say hi to start the conversation.
            </p>
          </div>
        ) : (
          <ul
            data-chat-content-root
            className="flex flex-col-reverse gap-3 pb-2"
          >
            {reversedMessages.map((message) => {
              if (isBookingActivityDmMessage(message.text)) {
                return null;
              }

              const isOwnMessage = currentUserId !== null && message.user_id === currentUserId;
              const isBookingMessage = isBookingRequestMessage(message.text);
              const isBookingCancelledNotice = isBookingCancelledDmMessage(message.text);
              const isRateProposalNotice =
                isRateProposedDmMessage(message.text) ||
                isRateProposalDeclinedDmMessage(message.text) ||
                isBookingAcceptedDmMessage(message.text) ||
                isBookingCancelledNotice;

              if (isRateProposalNotice) {
                const highlighted = isMessageHighlighted(message.id);
                logChatHighlightRender(message.id, highlighted);
                const systemPillClassName = isBookingCancelledNotice
                  ? "rounded-full border border-[var(--ftc-color-danger)]/35 bg-[var(--ftc-color-danger)]/10 px-3 py-1.5 text-xs text-[var(--ftc-color-danger)]/90"
                  : "rounded-full border border-ftc-border bg-ftc-bg-elevated/50 px-3 py-1.5 text-xs text-ftc-text-muted";

                return (
                  <li
                    key={message.id}
                    data-chat-message-id={message.id}
                    className="flex justify-center"
                  >
                    <div className="max-w-sm px-3 py-1 text-center">
                      <p
                        className={`${systemPillClassName} ${getChatNewMessageHighlightClass(highlighted)}`}
                      >
                        {message.text.trim()}
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

              if (!isBookingMessage) {
                return (
                  <DmTextMessageBubble
                    key={message.id}
                    messageId={message.id}
                    text={message.text}
                    createdAt={message.created_at}
                    isOwnMessage={isOwnMessage}
                    otherUserLabel={otherUserLabel}
                    otherUserAvatarUrl={otherUserProfile?.avatar_url}
                    attachments={attachmentsByMessageId.get(message.id) ?? []}
                    reactions={reactionsByMessageId.get(message.id) ?? []}
                    currentUserId={currentUserId}
                    showReactionPicker={reactionPickerMessageId === message.id}
                    reacting={reactingMessageId === message.id}
                    onToggleReaction={(emoji) => void handleToggleReaction(message.id, emoji)}
                    onOpenReactionPicker={() => setReactionPickerMessageId(message.id)}
                    onCloseReactionPicker={() =>
                      setReactionPickerMessageId((current) =>
                        current === message.id ? null : current,
                      )
                    }
                    onReportMessage={
                      !isOwnMessage
                        ? () =>
                            setReportMessageTarget({
                              messageId: message.id,
                              reportedUserId: message.user_id,
                            })
                        : undefined
                    }
                    formatTime={formatMessageTime}
                    isHighlighted={isMessageHighlighted(message.id)}
                    showSeen={shouldShowSeenOnMessage(message.id, message.created_at)}
                  />
                );
              }

              const parsedBooking = parseBookingRequestMessage(message.text);
              const bookingId = parsedBooking?.bookingId ?? null;
              const liveBooking = bookingId ? bookingsById.get(bookingId) ?? null : null;
              const cardBooking =
                liveBooking ??
                mergeBookingWithMessage(null, message.text, bookings, conversationId);
              const bookingLoading = Boolean(
                bookingId && !liveBooking && loadingBookingIds.has(bookingId),
              );
              const bookingLoaded = Boolean(liveBooking);
              const bookingSource = bookingLoaded ? "live" : "display";

              if (!cardBooking) {
                return null;
              }

              const cardVisibility = evaluateDmBookingCardVisibility(
                message.text,
                bookings,
                conversationId,
              );
              const resolvedBooking = resolveEventLinkedBookingDisplay(
                cardBooking,
                cardBooking.event_id ? eventArtworkById.get(cardBooking.event_id) : undefined,
              );
              const actionBooking = liveBooking
                ? resolveEventLinkedBookingDisplay(
                    liveBooking,
                    liveBooking.event_id ? eventArtworkById.get(liveBooking.event_id) : undefined,
                  )
                : null;

              if (cardVisibility.hideCard) {
                  const highlighted = isMessageHighlighted(message.id);
                  logChatHighlightRender(message.id, highlighted);

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
                          {CANCELLED_BOOKING_DM_SYSTEM_MESSAGE}
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

                const canRespond = actionBooking
                  ? canRecipientRespondToPendingBooking(actionBooking, currentUserId)
                  : false;
                const highlighted = isMessageHighlighted(message.id);
                logChatHighlightRender(message.id, highlighted);
                const bookingExpansionKey =
                  resolvedBooking.id?.trim() || bookingId?.trim() || message.id;

                return (
                  <li
                    key={message.id}
                    data-chat-message-id={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[92%] items-end gap-2 sm:max-w-[80%] ${
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {!isOwnMessage ? (
                        <ProfileAvatar
                          name={otherUserLabel}
                          avatarUrl={otherUserProfile?.avatar_url}
                          size="sm"
                        />
                      ) : null}
                      <div>
                        <div
                          className={`rounded-2xl ${getChatNewMessageHighlightClass(highlighted)}`}
                        >
                          <BookingRequestCard
                            booking={resolvedBooking}
                            currentUserId={currentUserId}
                            bookingLoaded={bookingLoaded}
                            bookingLoading={bookingLoading}
                            bookingSource={bookingSource}
                            collapsible
                            expanded={expandedBookingIds.has(bookingExpansionKey)}
                            onExpandedChange={(expanded) =>
                              setBookingExpanded(bookingExpansionKey, expanded)
                            }
                            eventHasAcceptedBooking={
                              resolvedBooking.event_id
                                ? eventIdsWithAcceptedBookings.has(resolvedBooking.event_id)
                                : false
                            }
                            dmConversationId={conversationId}
                            canRespond={canRespond}
                            responding={
                              actionBooking ? respondingBookingId === actionBooking.id : false
                            }
                            cancelling={
                              actionBooking ? cancellingBookingId === actionBooking.id : false
                            }
                            proposalLoading={
                              actionBooking ? proposalLoadingId === actionBooking.id : false
                            }
                            profiles={bookingProfiles}
                            coverImageUrl={
                              resolvedBooking.event_id
                                ? eventArtworkById.get(resolvedBooking.event_id)?.coverImageUrl
                                : undefined
                            }
                            fallbackColour={
                              resolvedBooking.event_id
                                ? eventArtworkById.get(resolvedBooking.event_id)?.fallbackColour
                                : undefined
                            }
                            onAccept={() => {
                              if (actionBooking) {
                                void handleBookingResponse(actionBooking, message, "accepted");
                              }
                            }}
                            onDecline={() => {
                              if (actionBooking) {
                                void handleBookingResponse(actionBooking, message, "declined");
                              }
                            }}
                            onCancel={() =>
                              actionBooking
                                ? handleBookingCancel(actionBooking, message)
                                : undefined
                            }
                            onCancelAccepted={(reason) =>
                              actionBooking
                                ? handleCancelAcceptedBooking(actionBooking, message, reason)
                                : undefined
                            }
                            onProposeRate={
                              actionBooking
                                ? (proposedRate, note) =>
                                    handleProposeRate(actionBooking, proposedRate, note)
                                : undefined
                            }
                            onAcceptProposal={() =>
                              actionBooking
                                ? handleAcceptProposedRate(actionBooking, message)
                                : undefined
                            }
                            onKeepOriginalOffer={() =>
                              actionBooking ? handleKeepOriginalOffer(actionBooking) : undefined
                            }
                          />
                        </div>
                        <time
                          dateTime={message.created_at}
                          className={`mt-1 block text-[10px] text-ftc-text-muted ${
                            isOwnMessage ? "text-right" : "text-left"
                          }`}
                        >
                          {formatMessageTime(message.created_at)}
                        </time>
                        {isOwnMessage &&
                        shouldShowSeenOnMessage(message.id, message.created_at) ? (
                          <p className="ftc-seen-label mt-0.5 text-right">Seen</p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
            })}
          </ul>
        )}
      </div>

      <div className="relative shrink-0">
      {error ? (
        <p className="px-4 pb-2 text-sm text-red-400">{error}</p>
      ) : null}
      {notice ? (
        <p className="px-4 pb-2 text-sm text-[var(--ftc-color-warning)]">{notice}</p>
      ) : null}

      {showNewMessagesPill ? (
        <ChatNewMessagesPill
          count={newMessagesPillCount}
          onClick={scrollToBottomSmooth}
        />
      ) : null}

      {blockStatus.isBlocked && blockBannerMessage ? (
        <div className="shrink-0 border-t border-ftc-border bg-ftc-bg px-4 py-4 sm:px-6">
          <p className="text-center text-sm text-ftc-text-secondary">{blockBannerMessage}</p>
        </div>
      ) : (
        <DmComposer
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          onPhotoSelected={(file) => void sendAttachment(file)}
          onFileSelected={(file) => void sendAttachment(file)}
          onAttachmentError={setError}
          sending={sending}
          uploading={uploading}
        />
      )}
      </div>
      </div>
    </div>
    </OnboardingGuard>
  );
}
