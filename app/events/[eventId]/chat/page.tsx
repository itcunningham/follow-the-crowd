"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  readCachedCrewMembers,
  writeCachedCrewMembers,
} from "@/lib/events/crewMemberListCache";
import {
  loadEventChatLastReadByUser,
  resolveCrewChatSeenLabel,
} from "@/lib/events/crewChatReadReceipts";
import type { EventStatus } from "@/lib/events";
import GroupChatMessageBubble from "@/app/components/group-chat/GroupChatMessageBubble";
import GroupChatSystemNotice from "@/app/components/group-chat/GroupChatSystemNotice";
import DmChatTimeSeparator from "@/app/components/dm/DmChatTimeSeparator";
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
  CREW_CHAT_EVENT_DETAIL_RETURN_PARAM,
  consumeCrewChatOpenedFromEventDetail,
} from "@/lib/events/eventDetailCrewChatReturn";
import {
  listEventCrewChatAttachmentsForEvent,
  sendEventCrewChatMessageWithAttachments,
} from "@/lib/groupChatAttachments";
import {
  DM_MAX_PHOTOS_PER_MESSAGE,
  groupDmAttachmentsByMessageId,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";
import {
  mergePendingComposerAttachments,
  removePendingComposerAttachmentAt,
  revokeAllPendingComposerAttachments,
  revokePendingComposerAttachment,
  type PendingComposerAttachment,
} from "@/lib/dm/composerPendingAttachment";
import {
  applyOptimisticDmReactionToggle,
  groupDmReactionsByMessageId,
  listMessageReactionsForEvent,
  toggleDmMessageReaction,
  upsertDmReactionInList,
  type DmMessageReaction,
} from "@/lib/dmReactions";
import {
  CHAT_MESSAGE_LIST_CLASS,
  CHAT_MESSAGE_SCROLLER_CLASS,
} from "@/lib/dm/chatMessageGroupLayout";
import { useDismissComposerKeyboardOnIntentionalScroll } from "@/lib/dm/dismissComposerKeyboardOnIntentionalScroll";
import { FIXED_CHAT_PAGE_SHELL_CLASS } from "@/lib/navigation/prepareFixedChatPageMount";
import { useFixedChatPageDocumentReset } from "@/lib/navigation/useFixedChatPageDocumentReset";
import {
  restoreComposerInputFocus as restoreComposerInputFocusElement,
  shouldKeepComposerFocusedAfterSend,
} from "@/lib/dm/restoreComposerInputFocus";
import type { CrewChatUnlockState } from "@/lib/events/crewChatUnlock";
import {
  buildCrewChatMessageGroups,
  resolveCrewChatMemberCount,
} from "@/lib/groupChatMessageLayout";
import {
  buildGroupChatTimestampLayout,
  type GroupChatTimestampLayout,
} from "@/lib/groupChatTimestampVisibility";
import { markEventChatRead } from "@/lib/messageReads";
import {
  formatGroupChatSystemNoticeText,
  isGroupChatSystemUpdateMessage,
  isHiddenCrewRosterNotice,
} from "@/lib/groupChatSystemMessages";
import { buildChatReturnTo } from "@/lib/profileNavigation";
import { supabase } from "@/lib/supabaseClient";
import {
  CHAT_NEAR_BOTTOM_THRESHOLD_PX,
  getChatMaxScrollTop,
  resolveScrollTopPreservingDistanceFromBottom,
  useChatScroll,
  tagChatMessageForScroll,
} from "@/lib/useChatScroll";
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

/**
 * Crew chat's message list is a reversed flex container (newest message
 * first in the DOM, flex-col-reverse flips it back to oldest-on-top) so new
 * messages append without disturbing scroll position — see useChatScroll.
 * A day/time separator is attached to the message it precedes chronologically,
 * so within this reversed DOM order it must render AFTER that message's own
 * node (trailing), not before it like DM's non-reversed list.
 */
function wrapWithTrailingTimeSeparator(
  messageId: string,
  createdAt: string,
  node: React.ReactNode,
  timestampLayout: GroupChatTimestampLayout | undefined,
) {
  const separatorLabel = timestampLayout?.showDaySeparatorBefore
    ? timestampLayout.daySeparatorLabel
    : timestampLayout?.showTimeSeparatorBefore
      ? formatMessageTime(createdAt)
      : undefined;

  return (
    <Fragment key={messageId}>
      {node}
      {separatorLabel ? <DmChatTimeSeparator dateTime={createdAt} label={separatorLabel} /> : null}
    </Fragment>
  );
}

const GROUP_CHAT_MESSAGES_TIMEOUT_MS = 15_000;

/**
 * How long to keep compensating the scroller for the event card's height
 * change. The card animates via AnimatedExpandPanel's `duration-200`
 * grid-template-rows transition, so its height arrives gradually rather than
 * in one step; the small tail past 200ms covers the final settling frame.
 */
/**
 * How recently a scroll event must have fired for the list to count as still
 * moving. Momentum emits scroll events continuously while coasting, so a window
 * this short reliably separates "still gliding" from "settled", without
 * lingering after the scroll has stopped.
 */
const ACTIVE_SCROLL_GRACE_MS = 150;

const EVENT_CARD_EXPAND_ANIMATION_MS = 200;
const EVENT_CARD_SCROLL_COMPENSATION_MS = EVENT_CARD_EXPAND_ANIMATION_MS + 120;

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
  /**
   * Profile links from the Crew sheet must return to a chat URL that still
   * says the sheet is open. Keeping `memberSheetOpen` in the address bar while
   * the sheet is open also makes iOS/Safari history.back() restore the sheet
   * (the previous broken approach stripped the param on mount, so Back landed
   * on a bare thread).
   */
  const profileReturnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("memberSheetOpen", "true");
    return buildChatReturnTo(pathname, params.toString());
  }, [pathname, searchParams]);
  const openedFromMessages = searchParams.get("from") === "dm";
  const eventDetailReturn = searchParams.get(CREW_CHAT_EVENT_DETAIL_RETURN_PARAM);
  const backHref = getEventCrewChatBackHref(
    eventId,
    searchParams.get("from"),
    searchParams.get("tab"),
    eventDetailReturn,
  );
  const backReplace = !openedFromMessages && Boolean(eventDetailReturn?.trim());

  function handleCrewChatBackClick(event: MouseEvent<HTMLAnchorElement>) {
    if (openedFromMessages) {
      return;
    }

    if (consumeCrewChatOpenedFromEventDetail(eventId)) {
      event.preventDefault();
      router.back();
    }
  }

  type EventCrewChatMessageWithScrollMeta = EventCrewChatMessage & {
    _clientScrollMeta?: {
      isFromCurrentUser: boolean;
    };
  };

  const [messages, setMessages] = useState<EventCrewChatMessageWithScrollMeta[]>([]);
  const [attachments, setAttachments] = useState<DmMessageAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingComposerAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
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
  const memberSheetOpenFromUrl = searchParams.get("memberSheetOpen") === "true";
  const [memberSheetOpen, setMemberSheetOpen] = useState(memberSheetOpenFromUrl);

  // Keep React state aligned with the URL. Returning from a profile (Link or
  // history.back) remounts this page with memberSheetOpen=true; loadAccess used
  // to call setMemberSheetOpen(false) on every load and immediately closed it.
  useEffect(() => {
    setMemberSheetOpen(memberSheetOpenFromUrl);
  }, [memberSheetOpenFromUrl]);

  const syncMemberSheetOpenInUrl = useCallback(
    (open: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (open) {
        params.set("memberSheetOpen", "true");
      } else {
        params.delete("memberSheetOpen");
      }
      const nextSearch = params.toString();
      const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      if (nextUrl === currentUrl) {
        return;
      }
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openMemberSheet = useCallback(() => {
    setMemberSheetOpen(true);
    syncMemberSheetOpenInUrl(true);
  }, [syncMemberSheetOpenInUrl]);

  const closeMemberSheet = useCallback(() => {
    setMemberSheetOpen(false);
    syncMemberSheetOpenInUrl(false);
  }, [syncMemberSheetOpenInUrl]);
  /**
   * Event-card visibility is owned solely by the Details/Hide toggle below.
   * Scrolling deliberately never changes it: a chat surface that rearranges
   * itself as you read takes control away from the reader, and with an
   * explicit toggle on screen the automatic version was redundant as well as
   * unstable near its own threshold.
   *
   * Starts collapsed so the conversation — the reason anyone opens this
   * screen — gets the viewport, with venue/date/time one tap away. Kept as
   * plain local state rather than persisted: it resets to collapsed on every
   * entry, which is both simpler and the behaviour we want (see the
   * `eventId` reset in loadAccess for the case where this component instance
   * is reused across two different events without unmounting).
   */
  const [eventCardCollapsed, setEventCardCollapsed] = useState(true);
  // Ref, not state: this is stamped on every scroll frame and must never
  // re-render the message list.
  const lastScrollActivityAtRef = useRef(0);
  const eventCardScrollCompensationRef = useRef<{
    observer: ResizeObserver;
    timeoutId: number;
  } | null>(null);
  const [input, setInput] = useState("");
  const [accessLoading, setAccessLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [canAccessChat, setCanAccessChat] = useState(false);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const composerRootRef = useRef<HTMLDivElement>(null);
  /** Whether the completing send should restore composer focus — see captureComposerFocusIntentForSend. */
  const keepComposerFocusedAfterSendRef = useRef(false);
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
  const [cachedCrewMembers, setCachedCrewMembers] = useState(() =>
    memberSheetOpenFromUrl ? (readCachedCrewMembers(eventId) ?? []) : [],
  );

  // Keep a session cache so Back from a profile can paint the Crew sheet
  // immediately while access/messages refetch underneath.
  useEffect(() => {
    if (crewMembers.length === 0) {
      return;
    }
    writeCachedCrewMembers(eventId, crewMembers);
    setCachedCrewMembers(crewMembers);
  }, [crewMembers, eventId]);

  useEffect(() => {
    if (!memberSheetOpen) {
      return;
    }
    if (crewMembers.length > 0) {
      return;
    }
    const cached = readCachedCrewMembers(eventId);
    if (cached && cached.length > 0) {
      setCachedCrewMembers(cached);
    }
  }, [crewMembers.length, eventId, memberSheetOpen]);

  const sheetMembers = crewMembers.length > 0 ? crewMembers : cachedCrewMembers;
  /**
   * One grouping calculation for name, avatar and spacing — see
   * buildCrewChatMessageGroups. This replaced two independent passes that
   * disagreed: system rows were filtered out of the layout pass (so messages
   * either side of an event update grouped together and lost their avatar)
   * while the name pass broke on them, and only the layout pass knew about
   * time gaps (so after a centred timestamp the avatar broke but the name
   * did not reappear). System rows are deliberately passed through now — the
   * shared helper needs to see them in order to break runs on them.
   */
  const crewChatMessageGroups = useMemo(
    () => buildCrewChatMessageGroups(messages, currentUserId),
    [messages, currentUserId],
  );
  const reactionsByMessageId = useMemo(
    () => groupDmReactionsByMessageId(reactions),
    [reactions],
  );
  const attachmentsByMessageId = useMemo(
    () => groupDmAttachmentsByMessageId(attachments),
    [attachments],
  );
  // Attachments are part of the visibility decision (an image row has no
  // text), so this has to be built after `attachmentsByMessageId` — a row
  // that paints nothing must not claim a separator slot.
  const groupChatTimestampLayout = useMemo(
    () =>
      buildGroupChatTimestampLayout(
        messages.map((message) => ({
          id: message.id,
          created_at: message.created_at,
          text: message.text,
          hasAttachments: (attachmentsByMessageId.get(message.id)?.length ?? 0) > 0,
        })),
      ),
    [messages, attachmentsByMessageId],
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
    if (!lastMessage || !currentUserId) {
      return null;
    }

    // Only show "Seen" if someone OTHER than the sender has read it.
    // Filter out current user from participants to avoid edge cases where the
    // sender's read receipt causes the label to show incorrectly.
    const otherParticipantIds = crewParticipantIds.filter(
      (id) => id !== currentUserId && id !== lastMessage.user_id,
    );

    return resolveCrewChatSeenLabel({
      messageCreatedAt: lastMessage.created_at,
      messageSenderId: lastMessage.user_id,
      participantIds: otherParticipantIds,
      ownerId,
      lastReadAtByUserId,
      profiles: crewParticipantProfiles,
    });
  }, [lastMessage, currentUserId, crewParticipantIds, ownerId, lastReadAtByUserId, crewParticipantProfiles]);
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
  /**
   * The other half of the keyboard fix, and the same call DM makes.
   *
   * Locks the document flat (html/body `overflow: hidden`, scrolled to top,
   * `scrollRestoration = "manual"`) for as long as this fixed chat surface is
   * mounted. Without it the document stays genuinely scrollable behind the
   * fixed shell, so when iOS offsets the page to reveal the focused composer
   * and the list then re-renders and auto-scrolls on send, WebKit resolves
   * the conflict by dismissing the keyboard. With the document flat there is
   * nothing for it to scroll, so the keyboard survives the send.
   */
  useFixedChatPageDocumentReset(`${pathname}?${searchParams.toString()}`);

  // Same intentional-dismissal handling as DM: a deliberate downward drag on
  // the message list at the live edge dismisses the keyboard, and this hook
  // owns that gesture. Post-send refocus never fights it, because a blur
  // while busy clears the refocus intent (see handleComposerInputBlurWhileBusy).
  useDismissComposerKeyboardOnIntentionalScroll(scrollRef, composerInputRef, composerRootRef);
  const { addHighlightedMessageId, isMessageHighlighted } = useChatNewMessageHighlight();

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

  /**
   * The user blurred the composer while a send was still running — i.e. they
   * intentionally dismissed the keyboard. Drop the refocus intent so the
   * completing send does not pull the keyboard back up.
   */
  const handleComposerInputBlurWhileBusy = useCallback(() => {
    keepComposerFocusedAfterSendRef.current = false;
  }, []);

  /**
   * Keeps the conversation visually still while the event card above it
   * expands or collapses.
   *
   * The scroller is `flex-1` in a fixed-height column, so the card's height
   * change is absorbed entirely by the scroller: growing the card by H shrinks
   * the scroller's clientHeight by H and pushes its top edge down by H, while
   * scrollHeight (the messages themselves) is untouched. With scrollTop left
   * alone the whole conversation therefore slides down by H — the jump this
   * compensates for.
   *
   * Holding `scrollHeight - clientHeight - scrollTop` (distance from the live
   * edge) constant is exactly that correction — scrollTop moves by +H on
   * expand, -H on collapse — and stays correct even if scrollHeight also
   * changes, which a raw "add H" would not. The card animates over 200ms
   * rather than resizing in one step, so a ResizeObserver applies the
   * correction on every frame the height actually changes instead of once.
   *
   * Deliberately skipped when already at the live edge: useChatScroll's own
   * ResizeObserver re-pins to the bottom there, which is the same visual
   * result, so this must not also write scrollTop and fight it.
   */
  const preserveScrollAcrossEventCardToggle = useCallback(() => {
    const scroller = scrollRef.current;

    if (!scroller || typeof ResizeObserver === "undefined") {
      return;
    }

    // Skip compensation entirely while the list is still moving.
    //
    // The compensation below works by assigning `scroller.scrollTop` on every
    // resize frame for the length of the card animation. Assigning scrollTop is
    // what cancels an in-flight touch or momentum scroll -- the browser treats
    // it as an authoritative jump and drops the inertia -- so tapping
    // Details/Hide mid-glide stopped the list dead.
    //
    // Nothing is lost by skipping it: the compensation exists to stop a
    // stationary reader's view sliding when the card above changes height, and
    // a reader who is mid-scroll is already moving that view themselves. Their
    // gesture surviving matters more than an exact offset. Once the scroll
    // settles the next toggle compensates normally.
    if (Date.now() - lastScrollActivityAtRef.current < ACTIVE_SCROLL_GRACE_MS) {
      return;
    }

    const distanceFromBottom = getChatMaxScrollTop(scroller) - scroller.scrollTop;

    if (distanceFromBottom <= CHAT_NEAR_BOTTOM_THRESHOLD_PX) {
      return;
    }

    const previous = eventCardScrollCompensationRef.current;

    if (previous) {
      previous.observer.disconnect();
      window.clearTimeout(previous.timeoutId);
    }

    const observer = new ResizeObserver(() => {
      scroller.scrollTop = resolveScrollTopPreservingDistanceFromBottom(
        scroller,
        distanceFromBottom,
      );
    });

    observer.observe(scroller);

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      eventCardScrollCompensationRef.current = null;
    }, EVENT_CARD_SCROLL_COMPENSATION_MS);

    eventCardScrollCompensationRef.current = { observer, timeoutId };
  }, [scrollRef]);

  useEffect(() => {
    return () => {
      const pending = eventCardScrollCompensationRef.current;

      if (pending) {
        pending.observer.disconnect();
        window.clearTimeout(pending.timeoutId);
        eventCardScrollCompensationRef.current = null;
      }
    };
  }, []);

  // Pending-photo staging: identical shape to the DM composer's, reusing the
  // same lib/dm/composerPendingAttachment helpers (they're already generic —
  // local blob-preview state that never touches conversation vs. event id).
  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((current) => {
      revokeAllPendingComposerAttachments(current);
      return [];
    });
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
  }, [eventId]);

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
      return;
    }

    try {
      const profiles = await getUserAvatarProfilesByIds(senderIds);
      // Merge, never replace. This runs fire-and-forget (`void
      // loadSenderProfiles(rows)`) while the realtime message handler below
      // concurrently adds profiles to the same map, so a replace lets a load
      // that started earlier but resolved later drop every profile added since
      // — the sender of a message that arrived mid-load loses their avatar
      // until the next full reload. Merging makes the two writers
      // order-independent, so no generation guard is needed.
      //
      // The empty-`rows` case above returns without clearing for the same
      // reason: entering a different event already resets this map in
      // `loadAccess`, and a stale entry is unreachable anyway because lookups
      // are keyed by the `user_id` of a message that is actually rendered.
      setSenderProfiles((prev) => {
        const next = new Map(prev);

        for (const [userId, profile] of profiles) {
          next.set(userId, profile);
        }

        return next;
      });
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

      const [rows, reactionsResult, attachmentsResult] = await Promise.all([
        withGroupChatMessagesTimeout(listEventCrewChatMessages(eventId)),
        listMessageReactionsForEvent(eventId).catch((reactionError) => {
          console.error("Failed to load group chat reactions:", reactionError);
          return [] as DmMessageReaction[];
        }),
        listEventCrewChatAttachmentsForEvent(eventId).catch((attachmentError) => {
          console.error("Failed to load group chat attachments:", attachmentError);
          return [] as DmMessageAttachment[];
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
      setAttachments(attachmentsResult);
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
      setAttachments([]);
      setReactionPickerMessageId(null);
      setSenderProfiles(new Map());
      setLastReadAtByUserId(new Map());
      // Do NOT force-close the crew sheet here. Returning from a member profile
      // remounts this page and re-runs loadAccess; wiping sheet state made Back
      // land on a bare thread even when memberSheetOpen=true was in the URL.
      // Sheet open/close is owned by the URL sync helpers above.
      // Opening a different event's chat is a fresh entry: its details start
      // collapsed like any other, even when React reuses this component
      // instance across the two routes rather than remounting it.
      setEventCardCollapsed(true);
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
            const existingIndex = prev.findIndex((message) => message.id === newMessage.id);

            if (existingIndex === -1) {
              return [...prev, taggedMessage];
            }

            // Already present as the optimistic row this client inserted after
            // its own attachment send. That row carries a CLIENT-clock
            // `created_at` (`new Date().toISOString()` in
            // `sendCrewChatAttachments`); this payload carries the
            // authoritative server value. Sender grouping and the day/time
            // separators are both derived from `created_at` (see
            // `breaksSenderGroup`), so leaving the client value in place lets a
            // skewed device clock render different sender names, avatars and
            // separators than the same conversation shows after a reload.
            // Adopting the server row is what makes live state and
            // database-derived state agree.
            //
            // Identical timestamps skip the write so an unrelated re-render is
            // never forced, and the row is replaced in place rather than
            // appended, so this can never introduce a duplicate.
            if (prev[existingIndex].created_at === newMessage.created_at) {
              return prev;
            }

            const next = [...prev];
            next[existingIndex] = taggedMessage;

            return next;
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
    if (!eventId) {
      return;
    }

    const channel = supabase
      .channel(`event-crew-chat-attachments:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_attachments",
          filter: `event_id=eq.${eventId}`,
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
  }, [eventId]);

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
    const filesToSend = pendingAttachments.map((pending) => pending.file);

    if ((!text && filesToSend.length === 0) || !eventId || sending || uploading) {
      return;
    }

    if (filesToSend.length > 0) {
      captureComposerFocusIntentForSend();
      await sendCrewChatAttachments(filesToSend);
      return;
    }

    // Captured before any await, while the composer is still the active
    // element and the keyboard is still up — afterwards there is nothing
    // left to read the intent from.
    captureComposerFocusIntentForSend();
    // Clear immediately so the draft does not linger while the request is
    // in flight. Restore the same text if the send fails.
    setInput("");
    setSending(true);
    setError(null);
    markUserSentMessage();

    try {
      await sendEventCrewChatMessage(eventId, text, eventName);
      await markEventChatRead(eventId);
    } catch (sendError) {
      console.error("Failed to send crew chat message:", sendError);
      setInput(text);
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send message",
      );
    } finally {
      setSending(false);
      restoreComposerInputFocus();
    }
  }

  async function sendCrewChatAttachments(files: File[]) {
    if (!eventId || uploading || sending || files.length === 0) {
      return;
    }

    const caption = input.trim();
    setInput("");
    setUploading(true);
    setError(null);
    markUserSentMessage();

    try {
      const { messageId, attachments: sentAttachments } =
        await sendEventCrewChatMessageWithAttachments({
          eventId,
          eventName,
          text: caption,
          files,
        });

      const userId = currentUserId ?? (await getCurrentUserId());
      const optimisticMessage = tagChatMessageForScroll(
        {
          id: messageId,
          event_id: eventId,
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
      await markEventChatRead(eventId, { readThroughCreatedAt: optimisticMessage.created_at });
    } catch (uploadError) {
      console.error("Failed to send crew chat attachments:", uploadError);
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
              onClick={() => {
                if (
                  !openedFromMessages &&
                  consumeCrewChatOpenedFromEventDetail(eventId)
                ) {
                  router.back();
                  return;
                }

                if (backReplace) {
                  router.replace(backHref);
                  return;
                }

                router.push(backHref);
              }}
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
      {/* Same shell DM uses. `fixed inset-0` (what this was) pins the shell to
          the *layout* viewport, which iOS does NOT shrink when the software
          keyboard opens — so the composer ended up underneath the keyboard and
          WebKit had to scroll the document to chase the focused input. The
          `h-[100dvh]` shell tracks the dynamic viewport instead, so the
          composer stays above the keyboard and no document scrolling is
          needed. See useFixedChatPageDocumentReset below for the other half. */}
      <div className={FIXED_CHAT_PAGE_SHELL_CLASS}>
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
                backReplace={backReplace}
                onBackClick={handleCrewChatBackClick}
                eventName={eventName}
                memberCount={memberCount}
                participantIds={crewParticipantIds}
                participantProfiles={crewParticipantProfiles}
                onOpenMemberSheet={openMemberSheet}
              />
            )}
          </header>

          {/*
            Chat sub-header: a fixed slot between the header and the event
            card, above the conversation and outside it, so it never scrolls
            away and never re-layouts the message list. Holds the event
            countdown plus the Details/Hide toggle for the card directly
            beneath it -- the only thing that changes the card's state.
          */}
          {countdownLabel ? (
            <div
              data-chat-subheader
              className="shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-1.5 backdrop-blur-md sm:px-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-ftc-text-muted">{countdownLabel}</p>
                <button
                  type="button"
                  onClick={() => {
                    // Must run before the state change, so the pre-toggle
                    // distance from the live edge is measured against the
                    // card's current height.
                    preserveScrollAcrossEventCardToggle();
                    setEventCardCollapsed((current) => !current);
                  }}
                  aria-expanded={!eventCardCollapsed}
                  className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-ftc-text-muted transition hover:text-ftc-text-secondary"
                >
                  {eventCardCollapsed ? "Details" : "Hide"}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      eventCardCollapsed ? "" : "rotate-180"
                    }`}
                  >
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}

          {/*
            Event-context card: venue/date/time + View Event, directly beneath
            the countdown/toggle row above. Shown until the reader hides it,
            and only the toggle changes that -- scrolling never does.
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

          <div
            ref={scrollRef}
            className={CHAT_MESSAGE_SCROLLER_CLASS}
            onScroll={() => {
              lastScrollActivityAtRef.current = Date.now();
            }}
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
                {reversedMessages.map((message, index) => {
                  const isOwnMessage =
                    currentUserId !== null && message.user_id === currentUserId;
                  const isSystemUpdate = isGroupChatSystemUpdateMessage(message.text);
                  const highlighted = isMessageHighlighted(message.id);
                  logChatHighlightRender(message.id, highlighted);
                  const timestampLayout = groupChatTimestampLayout.get(message.id);
                  // The chronologically-newer neighbor — one iteration back in this
                  // reversed (newest-first) loop — sits visually below this message.
                  const newerNeighbor = reversedMessages[index - 1];
                  const newerNeighborLayout = newerNeighbor
                    ? groupChatTimestampLayout.get(newerNeighbor.id)
                    : undefined;
                  const followedByTimeSeparator = Boolean(
                    newerNeighborLayout?.showDaySeparatorBefore ||
                      newerNeighborLayout?.showTimeSeparatorBefore,
                  );
                  const precededByTimeSeparator = Boolean(
                    timestampLayout?.showDaySeparatorBefore ||
                      timestampLayout?.showTimeSeparatorBefore,
                  );

                  if (isSystemUpdate) {
                    return wrapWithTrailingTimeSeparator(
                      message.id,
                      message.created_at,
                      <GroupChatSystemNotice
                        messageId={message.id}
                        text={formatGroupChatSystemNoticeText(message.text)}
                        createdAt={message.created_at}
                        formatTime={formatMessageTime}
                        isHighlighted={highlighted}
                        precededByTimeSeparator={precededByTimeSeparator}
                      />,
                      timestampLayout,
                    );
                  }

                  const profile = senderProfiles.get(message.user_id);
                  const senderLabel = getSenderLabel(profile, message.user_id);
                  const messageGroup = crewChatMessageGroups.get(message.id);

                  return wrapWithTrailingTimeSeparator(
                    message.id,
                    message.created_at,
                    <GroupChatMessageBubble
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
                      showSenderName={messageGroup?.showSenderName ?? false}
                      showAvatar={messageGroup?.showAvatar ?? true}
                      tightWithPrevious={messageGroup?.tightWithPrevious ?? false}
                      groupPosition={messageGroup?.position ?? "standalone"}
                      seenLabel={message.id === lastMessage?.id ? latestMessageSeenLabel : null}
                      attachments={attachmentsByMessageId.get(message.id) ?? []}
                      followedByTimeSeparator={followedByTimeSeparator}
                      precededByTimeSeparator={precededByTimeSeparator}
                    />,
                    timestampLayout,
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
              inputRef={composerInputRef}
              composerRootRef={composerRootRef}
              onInputBlurWhileBusy={handleComposerInputBlurWhileBusy}
              pendingPhotos={pendingAttachments}
              onStagePhotos={stagePendingPhotos}
              onRemovePendingPhoto={removePendingPhotoAt}
              onAttachmentError={(message) => setError(message)}
              uploading={uploading}
            />
          </div>
        </div>
      </div>

      <CrewMemberListSheet
        open={memberSheetOpen}
        members={sheetMembers}
        profileReturnTo={profileReturnTo}
        onClose={closeMemberSheet}
      />
    </OnboardingGuard>
  );
}
