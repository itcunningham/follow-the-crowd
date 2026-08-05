"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import { APP_DM_CHAT_COLUMN_CLASS } from "@/app/components/layout/AppPageLayout";
import BookingRequestCard, {
  buildUpdatedBookingMessage,
} from "@/app/components/BookingRequestCard";
import {
  DM_BOOKING_MESSAGE_COLUMN_CLASS,
} from "@/app/components/booking/DmBookingCardLayout";
import BookingCardFocusRing from "@/app/components/dm/BookingCardFocusRing";
import DmConversationHeader from "@/app/components/dm/DmConversationHeader";
import ChatNewMessagesPill from "@/app/components/dm/ChatNewMessagesPill";
import DmComposer from "@/app/components/dm/DmComposer";
import DmTextMessageBubble from "@/app/components/dm/DmTextMessageBubble";
import DmBookingTimelineNotice from "@/app/components/dm/DmBookingTimelineNotice";
import DmChatTimeSeparator from "@/app/components/dm/DmChatTimeSeparator";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ChatEmptyState from "@/app/components/chat/ChatEmptyState";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import DmIncomingMessageLayout from "@/app/components/chat/DmIncomingMessageLayout";
import { ChatMessagesSkeleton } from "@/app/components/skeleton/Skeleton";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  buildDmCancelledBookingMatchContext,
  acceptProposedBookingRate,
  cancelAcceptedBookingRequest,
  cancelBookingRequest,
  canRecipientRespondToPendingBooking,
  declineProposedBookingRate,
  evaluateDmBookingCardVisibility,
  isDmBookingActionRequired,
  extractBookingIdsFromMessages,
  fetchBookingRequestsByIds,
  getBookingMutationErrorMessage,
  getBookingRequestsForConversation,
  getEventIdsWithAcceptedBookings,
  isBookingActivityDmMessage,
  isBookingRateProposalSchemaError,
  isBookingRequestMessage,
  mergeBookingRequests,
  mergeBookingWithMessage,
  parseBookingRequestMessage,
  parseEventCancellationActivityEventName,
  proposeBookingRate,
  updateBookingRequestStatus,
  type BookingRequest,
} from "@/lib/bookingRequests";
import {
  DM_BOOKING_CANCELLED_MESSAGE,
  formatDmBookingSystemMessageDisplay,
  isDmBookingSystemMessage,
} from "@/lib/dm/dmBookingSystemMessages";
import {
  buildDmConversationTimestampLayout,
  classifyDmConversationMessageKind,
  type DmConversationTimestampLayout,
} from "@/lib/dm/dmChatTimestampVisibility";
import {
  buildChatMessageGroupLayout,
  CHAT_MESSAGE_SCROLLER_CLASS,
  CHAT_SEEN_LABEL_SPACING_CLASS,
  DM_CHAT_MESSAGE_LIST_CLASS,
  resolveMessageGroupLiClass,
} from "@/lib/dm/chatMessageGroupLayout";
import { parseDmThreadEntryContext, resolveDmThreadBackHref } from "@/lib/dm/threadNavigation";
import { CREW_CHAT_EVENT_DETAIL_RETURN_PARAM } from "@/lib/events/eventDetailCrewChatReturn";
import { useFixedChatPageDocumentReset } from "@/lib/navigation/useFixedChatPageDocumentReset";
import { FIXED_CHAT_PAGE_SHELL_CLASS } from "@/lib/navigation/prepareFixedChatPageMount";
import { traceDmChatLayout } from "@/lib/navigation/dmChatLayoutTrace";
import {
  DM_MAX_PHOTOS_PER_MESSAGE,
  getDmAttachmentNotificationBody,
  groupDmAttachmentsByMessageId,
  listDmAttachmentsForConversation,
  sendDmMessageWithAttachments,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";
import {
  mergePendingComposerAttachments,
  removePendingComposerAttachmentAt,
  revokeAllPendingComposerAttachments,
  revokePendingComposerAttachment,
  type PendingComposerAttachment,
} from "@/lib/dm/composerPendingAttachment";
import { useDismissComposerKeyboardOnIntentionalScroll } from "@/lib/dm/dismissComposerKeyboardOnIntentionalScroll";
import { useDmChatScrollRestoreOnProfileReturn } from "@/lib/dm/useDmChatScrollRestoreOnProfileReturn";
import {
  buildDmChatScrollRestoreHref,
  DM_CHAT_FRESH_OPEN_PARAM,
  DM_CHAT_SCROLL_RESTORE_PARAM,
  hasSavedDmChatScrollPosition,
  shouldRestoreDmChatScroll,
} from "@/lib/dm/dmChatScrollRestoration";
import {
  restoreComposerInputFocus as restoreComposerInputFocusElement,
  shouldKeepComposerFocusedAfterSend,
} from "@/lib/dm/restoreComposerInputFocus";
import {
  applyOptimisticDmReactionToggle,
  groupDmReactionsByMessageId,
  listDmReactionsForConversation,
  removeDmReactionFromRealtime,
  toggleDmMessageReaction,
  upsertDmReactionFromRealtime,
  upsertDmReactionInList,
  type DmMessageReaction,
} from "@/lib/dmReactions";
import {
  notifyDmReactionRecipient,
  revokeDmReactionNotification,
} from "@/lib/dm/dmReactionNotifications";
import { createNotification, markNotificationsReadForLink } from "@/lib/notifications";
import { getEventArtworkByIds, isEventCancelled, type EventArtworkSnapshot } from "@/lib/events";
import { getCrewChatUnlockStateByEventIds } from "@/lib/events/crewChatUnlock";
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
import { useChatBookingFocusHighlight } from "@/lib/useChatBookingFocusHighlight";
import {
  resolveDmBookingTarget,
  useChatBookingTargetScroll,
  CHAT_BOOKING_REQUEST_ID_ATTR,
} from "@/lib/dm/chatBookingTarget";
import {
  captureBookingCardExpandScrollContext,
  scheduleBookingCardExpandScrollTransition,
  scheduleBookingCardNotesRevealScroll,
  traceBookingCardCollapseScroll,
  type BookingCardExpandScrollContext,
} from "@/lib/dm/dmBookingCardExpandScroll";
import {
  getDmBlockBannerMessage,
  getDmBlockSendErrorMessage,
  getDmBlockStatus,
  type DmBlockStatus,
} from "@/lib/userBlocks";
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

/**
 * Wraps a message with its centred separator, Instagram-style: the separator for a
 * message belongs ABOVE it (marking the boundary since the previous message), not
 * trailing below — otherwise the newest message in the conversation ends up with a
 * separator glued underneath it, reading as if the timestamp belongs to that bubble.
 * A day separator (TODAY/YESTERDAY/date) takes precedence over a same-day time
 * separator at the same boundary — never stack both.
 */
function wrapWithTimeSeparator(
  messageId: string,
  createdAt: string,
  node: ReactNode,
  timestampLayout: DmConversationTimestampLayout | undefined,
) {
  const separatorLabel = timestampLayout?.showDaySeparatorBefore
    ? timestampLayout.daySeparatorLabel
    : timestampLayout?.showTimeSeparatorBefore
      ? formatMessageTime(createdAt)
      : undefined;

  return (
    <Fragment key={messageId}>
      {separatorLabel ? <DmChatTimeSeparator dateTime={createdAt} label={separatorLabel} /> : null}
      {node}
    </Fragment>
  );
}

function resolveFollowedByTimeSeparator(
  messageVisuallyBelowId: string | undefined,
  timestampLayout: Map<string, DmConversationTimestampLayout>,
): boolean {
  if (!messageVisuallyBelowId) {
    return false;
  }

  const nextLayout = timestampLayout.get(messageVisuallyBelowId);

  return Boolean(nextLayout?.showTimeSeparatorBefore || nextLayout?.showDaySeparatorBefore);
}

function getConversationTitle(otherUserProfile: UserAvatarProfile) {
  return resolveUserDisplayName(otherUserProfile);
}

export default function DmChatPage() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId as string;
  const chatReturnTo = useMemo(
    () => buildDmChatScrollRestoreHref(pathname, searchParams.toString()),
    [pathname, searchParams],
  );
  const shouldRestoreChatScrollOnMount = shouldRestoreDmChatScroll(
    searchParams.get(DM_CHAT_SCROLL_RESTORE_PARAM),
  );
  // A precise saved position (exact scrollTop, e.g. from "View event" -> Back)
  // is preferred over the booking-target-scroll fallback below — checked
  // read-only here so it can gate the target derivation before either
  // mechanism's effects run, instead of letting both race to set scrollTop.
  // useDmChatScrollRestoreOnProfileReturn still owns actually consuming it.
  // Cached per conversationId (same pattern as bookingTargetRef below) so the
  // determination stays stable across this mount's re-renders even after the
  // entry is consumed+removed once loading finishes — otherwise a later
  // render would see "no saved position" and wrongly re-enable the
  // booking-target fallback after the precise restore already ran.
  const preciseScrollRestoreRef = useRef<{ conversationId: string; hasPending: boolean } | null>(
    null,
  );

  if (preciseScrollRestoreRef.current?.conversationId !== conversationId) {
    preciseScrollRestoreRef.current = {
      conversationId,
      hasPending: shouldRestoreChatScrollOnMount && hasSavedDmChatScrollPosition(conversationId),
    };
  }

  const hasPendingPreciseScrollRestore = preciseScrollRestoreRef.current.hasPending;
  const freshOpenToken = searchParams.get(DM_CHAT_FRESH_OPEN_PARAM);
  const backHref = resolveDmThreadBackHref({
    from: searchParams.get("from"),
    tab: searchParams.get("tab"),
    profileUserId: searchParams.get("profileUserId"),
    profileFrom: searchParams.get("profileFrom"),
    profileReturnTo: searchParams.get("profileReturnTo"),
    fromTab: searchParams.get("fromTab"),
    eventId: searchParams.get("eventId"),
    calendarDate: searchParams.get("calendarDate"),
    calendarView: searchParams.get("calendarView"),
    calendarMonth: searchParams.get("calendarMonth"),
    eventReturn: searchParams.get(CREW_CHAT_EVENT_DETAIL_RETURN_PARAM),
  });
  const backReplace =
    searchParams.get("from") === "profile" ||
    searchParams.get("from") === "event-detail";
  const dmThreadEntryContext = useMemo(
    () => parseDmThreadEntryContext((key) => searchParams.get(key)),
    [searchParams],
  );
  const bookingTargetRef = useRef<{
    conversationId: string;
    bookingRequestId: string;
    target: ReturnType<typeof resolveDmBookingTarget>;
  } | null>(null);
  const currentBookingRequestId = searchParams.get("bookingRequestId")?.trim() || null;

  if (bookingTargetRef.current?.conversationId !== conversationId) {
    bookingTargetRef.current = null;
  }

  if (currentBookingRequestId) {
    if (
      !bookingTargetRef.current ||
      bookingTargetRef.current.bookingRequestId !== currentBookingRequestId
    ) {
      bookingTargetRef.current = {
        conversationId,
        bookingRequestId: currentBookingRequestId,
        target: resolveDmBookingTarget((key) => searchParams.get(key)),
      };
    }
  } else {
    bookingTargetRef.current = null;
  }

  const { scrollTargetBookingRequestId, highlightTargetBookingRequestId } =
    hasPendingPreciseScrollRestore
      ? { scrollTargetBookingRequestId: null, highlightTargetBookingRequestId: null }
      : bookingTargetRef.current?.target ?? {
          scrollTargetBookingRequestId: null,
          highlightTargetBookingRequestId: null,
          bookingFocusMode: "scroll-and-highlight" as const,
        };
  const suppressAutoScrollRef = useRef(
    Boolean(scrollTargetBookingRequestId) || hasPendingPreciseScrollRestore,
  );
  const fixedChatRouteKey = `${pathname}?${searchParams.toString()}`;

  useFixedChatPageDocumentReset(fixedChatRouteKey);

  useEffect(() => {
    traceDmChatLayout("dm-page:mount", fixedChatRouteKey, {
      scrollTargetBookingRequestId,
    });

    return () => {
      traceDmChatLayout("dm-page:unmount", fixedChatRouteKey);
    };
  }, [fixedChatRouteKey, scrollTargetBookingRequestId]);

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
  const [crewChatUnlockByEventId, setCrewChatUnlockByEventId] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<UserAvatarProfile | null>(null);
  const [conversationMetaLoaded, setConversationMetaLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingComposerAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [respondingBookingId, setRespondingBookingId] = useState<string | null>(null);
  const [proposalLoadingId, setProposalLoadingId] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Set<string>>(() => new Set());
  const bookingCardAnchorRefs = useRef(new Map<string, HTMLElement>());
  const pendingBookingCardScrollIdRef = useRef<string | null>(null);
  const pendingBookingNotesScrollIdRef = useRef<string | null>(null);
  const bookingCardScrollCleanupRef = useRef<(() => void) | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const composerRootRef = useRef<HTMLDivElement>(null);
  const keepComposerFocusedAfterSendRef = useRef(false);
  const bookingCardScrollContextRef = useRef(new Map<string, BookingCardExpandScrollContext>());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<DmBlockStatus>({
    blockedByMe: false,
    blockedMe: false,
    isBlocked: false,
  });
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages]);
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
    suppressAutoScrollRef,
    freshOpenToken,
  });
  useDismissComposerKeyboardOnIntentionalScroll(scrollRef, composerInputRef, composerRootRef);
  useDmChatScrollRestoreOnProfileReturn({
    conversationId,
    loading,
    scrollRef,
    suppressAutoScrollRef,
    shouldRestoreScroll: shouldRestoreChatScrollOnMount,
  });
  const { addHighlightedMessageId, isMessageHighlighted } = useChatNewMessageHighlight();
  const { highlightBookingFocus, getMessageBookingFocusPhase } = useChatBookingFocusHighlight();

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((current) => {
      revokeAllPendingComposerAttachments(current);
      return [];
    });
  }, []);

  const captureComposerFocusIntentForSend = useCallback(() => {
    keepComposerFocusedAfterSendRef.current = shouldKeepComposerFocusedAfterSend(
      composerInputRef.current,
    );
  }, []);

  const restoreComposerInputFocus = useCallback(() => {
    if (!keepComposerFocusedAfterSendRef.current) {
      return;
    }

    keepComposerFocusedAfterSendRef.current = false;
    restoreComposerInputFocusElement(composerInputRef.current);
  }, []);

  const handleComposerInputBlurWhileBusy = useCallback(() => {
    keepComposerFocusedAfterSendRef.current = false;
  }, []);

  const stagePendingPhotos = useCallback((files: File[]) => {
    setPendingAttachments((current) => {
      const result = mergePendingComposerAttachments(current, files, DM_MAX_PHOTOS_PER_MESSAGE);

      if (result.skippedLimitCount > 0) {
        setError(
          `You can only send up to ${DM_MAX_PHOTOS_PER_MESSAGE} photos at once. ` +
            `${result.skippedLimitCount === 1 ? "1 photo was" : `${result.skippedLimitCount} photos were`} not added.`,
        );
      }

      return result.attachments;
    });
  }, []);

  const removePendingPhotoAt = useCallback((index: number) => {
    setPendingAttachments((current) => {
      const result = removePendingComposerAttachmentAt(current, index);
      revokePendingComposerAttachment(result.removed);
      return result.attachments;
    });
  }, []);

  const pendingAttachmentsRef = useRef<PendingComposerAttachment[]>(pendingAttachments);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      revokeAllPendingComposerAttachments(pendingAttachmentsRef.current);
    };
  }, []);

  useEffect(() => {
    clearPendingAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    setReactionPickerMessageId(null);
  }, [conversationId]);

  useChatBookingTargetScroll({
    scrollTargetBookingRequestId,
    highlightTargetBookingRequestId,
    loading,
    messages,
    scrollRef,
    highlightBookingFocus,
    suppressAutoScrollRef,
  });

  useEffect(() => {
    if (loading) {
      return;
    }

    traceDmChatLayout("dm-page:ready", fixedChatRouteKey, {
      scrollTargetBookingRequestId,
      messageCount: messages.length,
    });
  }, [fixedChatRouteKey, loading, messages.length, scrollTargetBookingRequestId]);

  const conversationTitle = otherUserProfile ? getConversationTitle(otherUserProfile) : "";
  const otherUserLabel = otherUserProfile ? resolveUserDisplayName(otherUserProfile) : "";
  const dmHeaderLoading =
    !conversationMetaLoaded || (otherUserId !== null && otherUserProfile === null);
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
  const conversationTimestampLayout = useMemo(
    () =>
      buildDmConversationTimestampLayout(messages, {
        bookings,
        conversationId,
      }),
    [bookings, conversationId, messages],
  );
  const chatMessageGroupLayout = useMemo(() => {
    const chatMessages = messages.flatMap((message, messageIndex) => {
      if (
        isBookingActivityDmMessage(message.text) &&
        parseEventCancellationActivityEventName(message.text)
      ) {
        return [];
      }

      if (isDmBookingSystemMessage(message.text)) {
        const timelineKind = classifyDmConversationMessageKind(message.text, {
          bookings,
          conversationId,
          messages,
          messageIndex,
        });

        if (timelineKind !== "chat") {
          return [];
        }
      }

      if (isBookingActivityDmMessage(message.text)) {
        return [];
      }

      if (isBookingRequestMessage(message.text)) {
        return [{ id: message.id, user_id: message.user_id, groupable: false, created_at: message.created_at }];
      }

      const messageAttachments = attachmentsByMessageId.get(message.id) ?? [];

      return [
        {
          id: message.id,
          user_id: message.user_id,
          created_at: message.created_at,
        },
      ];
    });

    return buildChatMessageGroupLayout(chatMessages);
  }, [attachmentsByMessageId, bookings, conversationId, messages]);
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
  const latestConversationReadThroughAt = useMemo(() => {
    let latest = messages.length > 0 ? messages[messages.length - 1].created_at : null;

    if (!currentUserId) {
      return latest;
    }

    for (const reaction of reactions) {
      if (reaction.user_id === currentUserId) {
        continue;
      }

      const message = messages.find((item) => item.id === reaction.message_id);

      if (!message || message.user_id !== currentUserId) {
        continue;
      }

      if (
        !latest ||
        new Date(reaction.created_at).getTime() > new Date(latest).getTime()
      ) {
        latest = reaction.created_at;
      }
    }

    return latest;
  }, [currentUserId, messages, reactions]);

  useEffect(() => {
    setExpandedBookingIds(new Set());
    setEventIdsWithAcceptedBookings(new Set());
    bookingCardScrollCleanupRef.current?.();
    bookingCardScrollCleanupRef.current = null;
    bookingCardAnchorRefs.current.clear();
    bookingCardScrollContextRef.current.clear();
    pendingBookingCardScrollIdRef.current = null;
    pendingBookingNotesScrollIdRef.current = null;
  }, [conversationId]);

  const registerBookingCardAnchor = useCallback(
    (bookingRequestId: string, element: HTMLElement | null) => {
      if (!bookingRequestId) {
        return;
      }

      if (element) {
        bookingCardAnchorRefs.current.set(bookingRequestId, element);
      } else {
        bookingCardAnchorRefs.current.delete(bookingRequestId);
      }
    },
    [],
  );

  const restoreChatAutoScrollSuppression = useCallback(() => {
    suppressAutoScrollRef.current = Boolean(scrollTargetBookingRequestId);
  }, [scrollTargetBookingRequestId]);

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

  const handleBookingExpansionChange = useCallback(
    (bookingRequestId: string, expanded: boolean) => {
      bookingCardScrollCleanupRef.current?.();
      bookingCardScrollCleanupRef.current = null;
      suppressAutoScrollRef.current = true;

      const container = scrollRef.current;
      const getCardAnchor = () => bookingCardAnchorRefs.current.get(bookingRequestId) ?? null;

      if (expanded) {
        pendingBookingCardScrollIdRef.current = bookingRequestId;

        const cardAnchor = getCardAnchor();
        let scrollContext: BookingCardExpandScrollContext | null = null;

        if (container && cardAnchor) {
          scrollContext = captureBookingCardExpandScrollContext(container, cardAnchor);
          bookingCardScrollContextRef.current.set(bookingRequestId, scrollContext);
          traceBookingCardCollapseScroll("expand-start", container, cardAnchor, undefined, scrollContext);
        } else {
          bookingCardScrollContextRef.current.delete(bookingRequestId);
        }

        setBookingExpanded(bookingRequestId, true);

        if (container && scrollContext) {
          bookingCardScrollCleanupRef.current = scheduleBookingCardExpandScrollTransition(
            container,
            getCardAnchor,
            bookingRequestId,
            "expand",
            scrollContext,
            pendingBookingCardScrollIdRef,
            () => {
              pendingBookingCardScrollIdRef.current = null;
              restoreChatAutoScrollSuppression();
            },
          );
        } else {
          pendingBookingCardScrollIdRef.current = null;
          restoreChatAutoScrollSuppression();
        }

        return;
      }

      pendingBookingCardScrollIdRef.current = null;

      const cardAnchor = getCardAnchor();
      const scrollContext = bookingCardScrollContextRef.current.get(bookingRequestId) ?? null;

      if (container && cardAnchor) {
        traceBookingCardCollapseScroll("collapse-start", container, cardAnchor, undefined, scrollContext);
      }

      setBookingExpanded(bookingRequestId, false);

      if (container && scrollContext) {
        bookingCardScrollCleanupRef.current = scheduleBookingCardExpandScrollTransition(
          container,
          getCardAnchor,
          bookingRequestId,
          "collapse",
          scrollContext,
          pendingBookingCardScrollIdRef,
          () => {
            bookingCardScrollContextRef.current.delete(bookingRequestId);
            restoreChatAutoScrollSuppression();
          },
        );
      } else {
        bookingCardScrollContextRef.current.delete(bookingRequestId);
        restoreChatAutoScrollSuppression();
      }
    },
    [restoreChatAutoScrollSuppression, scrollRef, setBookingExpanded],
  );

  const handleBookingNotesExpansionChange = useCallback(
    (bookingRequestId: string, expanded: boolean) => {
      if (!expanded) {
        return;
      }

      bookingCardScrollCleanupRef.current?.();
      bookingCardScrollCleanupRef.current = null;
      suppressAutoScrollRef.current = true;
      pendingBookingNotesScrollIdRef.current = bookingRequestId;

      const container = scrollRef.current;

      if (container) {
        bookingCardScrollCleanupRef.current = scheduleBookingCardNotesRevealScroll(
          container,
          () => bookingCardAnchorRefs.current.get(bookingRequestId) ?? null,
          bookingRequestId,
          pendingBookingNotesScrollIdRef,
          () => {
            pendingBookingNotesScrollIdRef.current = null;
            restoreChatAutoScrollSuppression();
          },
        );
      } else {
        pendingBookingNotesScrollIdRef.current = null;
        restoreChatAutoScrollSuppression();
      }
    },
    [restoreChatAutoScrollSuppression, scrollRef],
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let cancelled = false;
    setConversationMetaLoaded(false);

    async function loadConversationMeta() {
      const currentUserIdValue = await getCurrentUserId();
      if (cancelled) {
        return;
      }

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
        if (!cancelled) {
          setOtherUserProfile(profiles.get(nextOtherUserId) ?? null);
        }
      } catch (profileError) {
        console.error("Failed to load chat user profile:", profileError);
        if (!cancelled) {
          setOtherUserProfile(null);
        }
      }
    }

    void loadConversationMeta().finally(() => {
      if (!cancelled) {
        setConversationMetaLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
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
    if (!conversationId || !currentUserId || loading) {
      return;
    }

    markNotificationsReadForLink(currentUserId, `/dm/${conversationId}`);
    void markConversationRead(conversationId, {
      readThroughCreatedAt: latestConversationReadThroughAt,
    });
  }, [conversationId, currentUserId, latestConversationReadThroughAt, loading]);

  const syncEventArtwork = useCallback(async (nextBookings: BookingRequest[]) => {
    const eventIds = nextBookings
      .map((booking) => booking.event_id)
      .filter((eventId): eventId is string => Boolean(eventId));

    try {
      const artworkById = await getEventArtworkByIds(eventIds);
      setEventArtworkById(artworkById);

      const unlockByEventId = await getCrewChatUnlockStateByEventIds(
        [...artworkById.entries()].map(([id, artwork]) => ({
          id,
          status: artwork.status,
          crew_chat_started_at: artwork.crewChatStartedAt,
        })),
      );
      const unlocked = new Map<string, boolean>();

      for (const [eventId, unlockState] of unlockByEventId) {
        unlocked.set(eventId, unlockState.isUnlocked);
      }

      setCrewChatUnlockByEventId(unlocked);
    } catch (artworkError) {
      console.error("Failed to load event artwork:", artworkError);
      setEventArtworkById(new Map());
      setCrewChatUnlockByEventId(new Map());
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
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

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
      setReactions((prev) => upsertDmReactionFromRealtime(prev, nextReaction));
    }

    function removeReaction(deleted: Pick<DmMessageReaction, "id" | "message_id" | "user_id">) {
      setReactions((prev) => removeDmReactionFromRealtime(prev, deleted));
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
          removeReaction(payload.old as DmMessageReaction);
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
    const filesToSend = pendingAttachments.map((pending) => pending.file);

    if ((!text && filesToSend.length === 0) || !conversationId || sending || uploading) {
      return;
    }

    const blockSendError = getDmBlockSendErrorMessage(blockStatus);

    if (blockSendError) {
      setError(blockSendError);
      return;
    }

    if (filesToSend.length > 0) {
      captureComposerFocusIntentForSend();
      await sendAttachments(filesToSend);
      return;
    }

    captureComposerFocusIntentForSend();
    // Clear immediately so the draft does not linger while the insert is
    // in flight. Restore the same text if the send fails.
    setInput("");
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
      setInput(text);
      setError(insertError.message);
      setSending(false);
      restoreComposerInputFocus();
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

    setSending(false);
    restoreComposerInputFocus();
    void markConversationRead(conversationId, {
      readThroughCreatedAt: latestConversationReadThroughAt,
    });
  }

  async function sendAttachments(files: File[]) {
    if (!conversationId || uploading || sending || files.length === 0) {
      return;
    }

    const blockSendError = getDmBlockSendErrorMessage(blockStatus);

    if (blockSendError) {
      setError(blockSendError);
      return;
    }

    captureComposerFocusIntentForSend();
    const caption = input.trim();
    setInput("");
    setUploading(true);
    setError(null);
    markUserSentMessage();

    try {
      const { messageId, attachments: sentAttachments } = await sendDmMessageWithAttachments({
        conversationId,
        text: caption,
        files,
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
        const existingIds = new Set(prev.map((item) => item.id));
        const newAttachments = sentAttachments.filter((item) => !existingIds.has(item.id));

        if (newAttachments.length === 0) {
          return prev;
        }

        return [...prev, ...newAttachments];
      });

      // Selection only clears once the send fully succeeds, so a failed
      // send (see catch below) leaves the same photos staged for retry.
      clearPendingAttachments();

      if (otherUserId) {
        try {
          await createNotification(
            otherUserId,
            "message",
            "New message",
            caption || getDmAttachmentNotificationBody(sentAttachments[0], sentAttachments.length),
            `/dm/${conversationId}`,
          );
        } catch (notificationError) {
          console.error(
            "[dm] Attachment sent but notification failed:",
            notificationError,
          );
        }
      }

      void markConversationRead(conversationId, {
        readThroughCreatedAt: optimisticMessage.created_at,
      });
    } catch (uploadError) {
      console.error("Failed to send attachments:", uploadError);
      setInput(caption);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : files.length > 1
            ? "Failed to send photos. Tap send to try again."
            : "Failed to send photo. Tap send to try again.",
      );
    } finally {
      setUploading(false);
      restoreComposerInputFocus();
    }
  }

  async function handleToggleReaction(messageId: string, emoji: string) {
    if (!currentUserId) {
      return;
    }

    let rollbackReactions: DmMessageReaction[] = [];
    // Captured before the toggle so a removal knows which reaction's notification to revoke.
    // Unchanged by an emoji change, since the toggle updates the same reaction row.
    const previousReactionId = reactions.find(
      (reaction) => reaction.message_id === messageId && reaction.user_id === currentUserId,
    )?.id;

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

      if (nextReaction && conversationId) {
        try {
          await notifyDmReactionRecipient({
            messageId,
            emoji: nextReaction.emoji,
            conversationId,
            reactorUserId: currentUserId,
            reactionId: nextReaction.id,
          });
        } catch (notificationError) {
          console.error("[dm] Reaction saved but notification failed:", notificationError);
        }
      } else if (
        !nextReaction &&
        previousReactionId &&
        !previousReactionId.startsWith("optimistic-")
      ) {
        try {
          await revokeDmReactionNotification(previousReactionId);
        } catch (revokeError) {
          console.error("[dm] Reaction removed but notification cleanup failed:", revokeError);
        }
      }
    } catch (reactionError) {
      console.error("Failed to toggle reaction:", reactionError);
      setReactions((prev) => {
        const withoutMessage = prev.filter((reaction) => reaction.message_id !== messageId);

        return [...withoutMessage, ...rollbackReactions];
      });
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

  return (
    <OnboardingGuard>
    <div className={FIXED_CHAT_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <div className={`${APP_DM_CHAT_COLUMN_CLASS} ${MOBILE_NAV_OFFSET_CLASS}`}>
      <header
        data-chat-header
        data-dm-conversation-header
        className="z-10 shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4"
      >
        <DmConversationHeader
          backHref={backHref}
          backReplace={backReplace}
          loading={dmHeaderLoading}
          conversationTitle={conversationTitle}
          avatarName={otherUserLabel}
          avatarUrl={otherUserProfile?.avatar_url}
          otherUserId={otherUserId}
          profileReturnTo={chatReturnTo}
        />
      </header>

      <div ref={scrollRef} className={CHAT_MESSAGE_SCROLLER_CLASS}>
        {loading ? (
          <ChatMessagesSkeleton />
        ) : messages.length === 0 ? (
          <ChatEmptyState
            icon={
              otherUserId ? (
                <ChatProfileAvatarLink
                  userId={otherUserId}
                  name={otherUserLabel}
                  avatarUrl={otherUserProfile?.avatar_url}
                  size="md"
                  className="h-10 w-10 text-xs"
                  returnTo={chatReturnTo}
                />
              ) : (
                <ProfileAvatar
                  name={otherUserLabel}
                  avatarUrl={otherUserProfile?.avatar_url}
                  size="md"
                  className="h-10 w-10 text-xs"
                />
              )
            }
            title="No messages yet"
            subtitle="Say hi to start the conversation."
          />
        ) : (
          <ul data-chat-content-root className={DM_CHAT_MESSAGE_LIST_CLASS}>
            {messages.map((message, index) => {
              if (
                isBookingActivityDmMessage(message.text) &&
                parseEventCancellationActivityEventName(message.text)
              ) {
                return null;
              }

              if (isDmBookingSystemMessage(message.text)) {
                const messageIndex = messages.findIndex(
                  (candidate) => candidate.id === message.id,
                );
                const timelineKind = classifyDmConversationMessageKind(message.text, {
                  bookings,
                  conversationId,
                  messages,
                  messageIndex,
                });

                if (timelineKind === "hidden") {
                  return null;
                }

                const timelineLayout = conversationTimestampLayout.get(message.id);

                return wrapWithTimeSeparator(
                  message.id,
                  message.created_at,
                  <DmBookingTimelineNotice
                    messageId={message.id}
                    text={formatDmBookingSystemMessageDisplay(message.text)}
                    createdAt={message.created_at}
                    formatTime={formatMessageTime}
                    isHighlighted={isMessageHighlighted(message.id)}
                    compactBelow={timelineLayout?.compactBelow ?? false}
                  />,
                  timelineLayout,
                );
              }

              if (isBookingActivityDmMessage(message.text)) {
                return null;
              }

              const isOwnMessage = currentUserId !== null && message.user_id === currentUserId;
              const isBookingMessage = isBookingRequestMessage(message.text);

              if (!isBookingMessage) {
                const messageTimestampLayout = conversationTimestampLayout.get(message.id);
                const messageGroupLayout = chatMessageGroupLayout.get(message.id);
                const messageVisuallyBelow = messages[index + 1];
                const followedByTimeSeparator = resolveFollowedByTimeSeparator(
                  messageVisuallyBelow?.id,
                  conversationTimestampLayout,
                );
                const precededByTimeSeparator = Boolean(
                  messageTimestampLayout?.showTimeSeparatorBefore ||
                    messageTimestampLayout?.showDaySeparatorBefore,
                );

                return wrapWithTimeSeparator(
                  message.id,
                  message.created_at,
                  <DmTextMessageBubble
                    messageId={message.id}
                    text={message.text}
                    createdAt={message.created_at}
                    isOwnMessage={isOwnMessage}
                    otherUserId={otherUserId}
                    otherUserLabel={otherUserLabel}
                    otherUserAvatarUrl={otherUserProfile?.avatar_url}
                    profileReturnTo={chatReturnTo}
                    attachments={attachmentsByMessageId.get(message.id) ?? []}
                    reactions={reactionsByMessageId.get(message.id) ?? []}
                    currentUserId={currentUserId}
                    showReactionPicker={reactionPickerMessageId === message.id}
                    reacting={reactingMessageId === message.id}
                    scrollContainerRef={scrollRef}
                    onToggleReaction={(emoji) => void handleToggleReaction(message.id, emoji)}
                    onOpenReactionPicker={() => setReactionPickerMessageId(message.id)}
                    onCloseReactionPicker={() =>
                      setReactionPickerMessageId((current) =>
                        current === message.id ? null : current,
                      )
                    }
                    formatTime={formatMessageTime}
                    isHighlighted={isMessageHighlighted(message.id)}
                    showSeen={shouldShowSeenOnMessage(message.id, message.created_at)}
                    showAvatar={messageGroupLayout?.showAvatar ?? true}
                    groupPosition={messageGroupLayout?.position ?? "standalone"}
                    followedByTimeSeparator={followedByTimeSeparator}
                    precededByTimeSeparator={precededByTimeSeparator}
                  />,
                  messageTimestampLayout,
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
                const timelineLayout = conversationTimestampLayout.get(message.id);

                return (
                  <DmBookingTimelineNotice
                    key={message.id}
                    messageId={message.id}
                    text={formatDmBookingSystemMessageDisplay(
                      DM_BOOKING_CANCELLED_MESSAGE,
                    )}
                    createdAt={message.created_at}
                    formatTime={formatMessageTime}
                    isHighlighted={isMessageHighlighted(message.id)}
                    compactBelow={timelineLayout?.compactBelow ?? false}
                  />
                );
              }

                const canRespond = actionBooking
                  ? canRecipientRespondToPendingBooking(actionBooking, currentUserId)
                  : false;
                const eventArtwork = resolvedBooking.event_id
                  ? eventArtworkById.get(resolvedBooking.event_id)
                  : undefined;
                const eventCancelled = eventArtwork
                  ? isEventCancelled({ status: eventArtwork.status })
                  : false;
                const highlighted = isMessageHighlighted(message.id);
                const bookingFocusPhase = getMessageBookingFocusPhase(message.id);
                logChatHighlightRender(message.id, highlighted || Boolean(bookingFocusPhase));
                const bookingExpansionKey = resolvedBooking.id;
                const registerBookingCardAnchorForCard = (element: HTMLElement | null) => {
                  registerBookingCardAnchor(bookingExpansionKey, element);
                };
                const highlightClassName = bookingFocusPhase
                  ? ""
                  : getChatNewMessageHighlightClass(highlighted);
                const actionRequired = isDmBookingActionRequired(resolvedBooking, eventCancelled);
                const isBookingExpanded = expandedBookingIds.has(bookingExpansionKey);
                const messageGroupLayout = chatMessageGroupLayout.get(message.id);
                const messageVisuallyBelow = messages[index + 1];
                const followedByTimeSeparator = resolveFollowedByTimeSeparator(
                  messageVisuallyBelow?.id,
                  conversationTimestampLayout,
                );
                const bookingTimestampLayout = conversationTimestampLayout.get(message.id);
                const precededByTimeSeparator = Boolean(
                  bookingTimestampLayout?.showTimeSeparatorBefore ||
                    bookingTimestampLayout?.showDaySeparatorBefore,
                );

                const bookingCard = (
                  <BookingRequestCard
                    booking={resolvedBooking}
                    currentUserId={currentUserId}
                    bookingLoaded={bookingLoaded}
                    bookingLoading={bookingLoading}
                    bookingSource={bookingSource}
                    collapsible
                    expanded={isBookingExpanded}
                    onExpandedChange={(expanded) =>
                      handleBookingExpansionChange(bookingExpansionKey, expanded)
                    }
                    onNotesExpandedChange={(expanded) =>
                      handleBookingNotesExpansionChange(bookingExpansionKey, expanded)
                    }
                    useCompactDmCollapseHeader={!actionRequired && isBookingExpanded}
                    eventHasAcceptedBooking={
                      resolvedBooking.event_id
                        ? eventIdsWithAcceptedBookings.has(resolvedBooking.event_id)
                        : false
                    }
                    crewChatUnlocked={
                      resolvedBooking.event_id
                        ? crewChatUnlockByEventId.get(resolvedBooking.event_id) ?? false
                        : false
                    }
                    eventCancelled={eventCancelled}
                    dmConversationId={conversationId}
                    dmThreadEntryContext={dmThreadEntryContext}
                    canRespond={canRespond && !eventCancelled}
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
                    anchorRef={registerBookingCardAnchorForCard}
                  />
                );

                return wrapWithTimeSeparator(
                  message.id,
                  message.created_at,
                  <li
                    data-chat-message-id={message.id}
                    {...(bookingId ? { [CHAT_BOOKING_REQUEST_ID_ATTR]: bookingId } : {})}
                    className={resolveMessageGroupLiClass({
                      isOwnMessage,
                      position: messageGroupLayout?.position ?? "standalone",
                      isClusterEnd: messageGroupLayout?.showAvatar ?? true,
                      followedByTimeSeparator,
                      precededByTimeSeparator,
                    })}
                  >
                    {isOwnMessage ? (
                      <div className="flex max-w-[92%] items-end gap-2 sm:max-w-[80%] flex-row-reverse">
                        <div className={DM_BOOKING_MESSAGE_COLUMN_CLASS}>
                          <BookingCardFocusRing phase={bookingFocusPhase}>
                            {highlightClassName ? (
                              <div className={highlightClassName}>{bookingCard}</div>
                            ) : (
                              bookingCard
                            )}
                          </BookingCardFocusRing>
                          <time dateTime={message.created_at} hidden>
                            {formatMessageTime(message.created_at)}
                          </time>
                          {shouldShowSeenOnMessage(message.id, message.created_at) ? (
                            <p className={`ftc-seen-label ${CHAT_SEEN_LABEL_SPACING_CLASS} text-right`}>
                              Seen
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <DmIncomingMessageLayout
                        className="max-w-[92%] sm:max-w-[80%]"
                        groupPosition={messageGroupLayout?.position ?? "standalone"}
                        showAvatar={messageGroupLayout?.showAvatar ?? true}
                        createdAt={message.created_at}
                        formattedTime={formatMessageTime(message.created_at)}
                        avatar={
                          otherUserId ? (
                            <ChatProfileAvatarLink
                              userId={otherUserId}
                              name={otherUserLabel}
                              avatarUrl={otherUserProfile?.avatar_url}
                              returnTo={chatReturnTo}
                            />
                          ) : null
                        }
                      >
                        <BookingCardFocusRing phase={bookingFocusPhase}>
                          {highlightClassName ? (
                            <div className={highlightClassName}>{bookingCard}</div>
                          ) : (
                            bookingCard
                          )}
                        </BookingCardFocusRing>
                      </DmIncomingMessageLayout>
                    )}
                  </li>,
                  bookingTimestampLayout,
                );
            })}
          </ul>
        )}
        <div ref={bottomRef} data-chat-bottom aria-hidden="true" className="h-px shrink-0" />
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
          onSend={() => void sendMessage()}
          inputRef={composerInputRef}
          composerRootRef={composerRootRef}
          onInputBlurWhileBusy={handleComposerInputBlurWhileBusy}
          pendingPhotos={pendingAttachments}
          onStagePhotos={stagePendingPhotos}
          onRemovePendingPhoto={removePendingPhotoAt}
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
