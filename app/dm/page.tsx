"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import MessagesInboxLayout from "@/app/components/dm/MessagesInboxLayout";
import { InboxListSkeleton, MessagesInboxLoadingShell } from "@/app/components/skeleton/Skeleton";
import MessagesInboxRow, {
  MessagesGroupInboxRow,
} from "@/app/components/dm/MessagesInboxRow";
import {
  applyInboxGroupMessage,
  dedupeGroupChatsByEventId,
  extractGroupChatTargetId,
  formatGroupChatEventDate,
  getGroupChatsLoadErrorMessage,
  listAccessibleGroupChats,
  logGroupRenderedRowIds,
  mergeLoadedGroupChatsWithLiveActivity,
  readGroupChatsInboxCache,
  sortGroupChatsByLatestActivity,
  writeGroupChatsInboxCache,
  type GroupChatListItem,
} from "@/lib/groupChats";
import {
  applyDmInboxRealtimeMessage,
  applyDmInboxRealtimeReaction,
  applyDmInboxRealtimeReactionRemoval,
  buildDmInboxRows,
  detectInboxRealtimeMessageType,
  logInboxRenderOrder,
  mergeDmInboxReactionActivities,
  normalizeInboxId,
  type DmInboxRow,
} from "@/lib/dmInbox";
import { formatGroupChatInboxPreview, isCrewMemberJoinedNotice, isGroupChatSystemUpdateMessage } from "@/lib/groupChatSystemMessages";
import {
  buildDmInboxReactionActivity,
  dmInboxReactionActivityToRowFields,
  listLatestDmReactionInboxActivities,
  loadDmReactionInboxMessageContext,
  parseDmReactionInboxPreview,
  shouldApplyDmReactionInboxActivity,
  shouldMarkDmReactionInboxUnread,
} from "@/lib/dm/dmReactionInbox";
import type { DmMessageReaction } from "@/lib/dmReactions";
import {
  encodeDmAttachmentInboxPreview,
  resolveDmAttachmentPreviewKind,
  type DmAttachmentPreviewKind,
} from "@/lib/dmAttachments";
import {
  syncReadInboxNotifications,
} from "@/lib/inboxUnread";
import {
  getUnreadConversationIds,
  getUnreadEventChatIds,
  isOwnChatMessage,
  type LatestChatMessage,
} from "@/lib/messageReads";
import { supabase } from "@/lib/supabaseClient";
import { buildDmThreadHref } from "@/lib/dm/threadNavigation";
import { buildDmChatFreshOpenHref } from "@/lib/dm/dmChatScrollRestoration";
import {
  formatDmInboxConversationPreview,
  pickDmInboxPreviewMessage,
} from "@/lib/dm/messagePreview";
import { listBookingRequestsForConversations, type BookingRequest } from "@/lib/bookingRequests";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getUserAvatarProfilesByIds,
  type UserAvatarProfile,
} from "@/lib/user/currentUser";
import { looksLikeUserId, resolveUserDisplayName } from "@/lib/user/displayName";

type InboxTab = "dm" | "group";

function parseInboxTab(tab: string | null): InboxTab {
  return tab === "group" ? "group" : "dm";
}

function removeUnreadEventChatId(previous: Set<string>, eventId: string): Set<string> {
  const normalizedTargetId = normalizeInboxId(eventId);
  const next = new Set(previous);

  for (const existingId of previous) {
    if (normalizeInboxId(existingId) === normalizedTargetId) {
      next.delete(existingId);
    }
  }

  return next;
}

function GroupChatsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
      <h2 className="mt-5 text-lg font-semibold text-ftc-text">No crew chats</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ftc-text-muted">
        Event crew chats will appear here
      </p>
    </div>
  );
}

const GROUP_CHATS_LOAD_TIMEOUT_MS = 30_000;
const GROUP_CHATS_REFRESH_INTERVAL_MS = 30_000;

async function withGroupChatsLoadTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Loading group chats took too long. Please try again."));
        }, GROUP_CHATS_LOAD_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function GroupChatsLoadErrorState({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="rounded-xl border border-ftc-border-subtle bg-ftc-surface/40 px-4 py-5 text-center">
      <p className="text-sm text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-3 ftc-btn-secondary px-4 py-2 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
      >
        {retrying ? "Retrying" : "Try again"}
      </button>
    </div>
  );
}

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
  event_id?: string | null;
};

type ConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
};

type Conversation = {
  id?: string;
  conversation_id?: string;
  name?: string;
  created_at?: string;
};

function normalizeConversations(data: unknown): Conversation[] {
  if (Array.isArray(data)) {
    return data as Conversation[];
  }

  if (data && typeof data === "object") {
    return [data as Conversation];
  }

  return [];
}

// Image/file-only messages have an empty `text`, so the inbox preview
// pipeline (which reads `message.text` as `latestPreview`) has nothing to
// display and falls through to "No messages yet". Substituting an encoded
// attachment token (see lib/dmAttachments.ts) into the empty text lets the
// existing preview/sort/unread pipeline handle it unchanged. A caption
// (non-empty text) always takes priority over the attachment token.
function decorateMessageWithAttachmentPreview(
  message: Message,
  attachmentInfoByMessageId: Map<string, { kind: DmAttachmentPreviewKind; count: number }>,
): Message {
  if (message.text.trim()) {
    return message;
  }

  const attachmentInfo = attachmentInfoByMessageId.get(message.id);

  if (!attachmentInfo) {
    return message;
  }

  return {
    ...message,
    text: encodeDmAttachmentInboxPreview(attachmentInfo.kind, attachmentInfo.count),
  };
}

function buildOtherUsersByConversation(
  members: ConversationMember[],
  conversationIds: string[],
  currentUserId: string,
) {
  const otherUsers = new Map<string, string>();

  for (const member of members) {
    if (!conversationIds.includes(member.conversation_id)) {
      continue;
    }

    if (member.user_id !== currentUserId) {
      otherUsers.set(member.conversation_id, member.user_id);
    }
  }

  return otherUsers;
}

function getConversationDisplayName(
  row: DmInboxRow,
  otherUserProfile?: UserAvatarProfile | null,
) {
  const conversationName = row.name?.trim();

  if (conversationName && !looksLikeUserId(conversationName)) {
    return conversationName;
  }

  return resolveUserDisplayName(otherUserProfile);
}

function DirectMessagesEmptyState({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-ftc-border bg-ftc-surface/30 px-4 py-5 text-center">
          <h3 className="mt-4 text-base font-semibold text-ftc-text">No messages</h3>
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-muted">
            Your conversations will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
      <h2 className="mt-5 text-lg font-semibold text-ftc-text">No messages</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ftc-text-muted">
        Your conversations will appear here
      </p>
    </div>
  );
}

function DmInboxLoadingFallback() {
  const activeTab =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("tab") === "group"
      ? "group"
      : "dm";

  return <MessagesInboxLoadingShell activeTab={activeTab} />;
}

export default function DmInboxPage() {
  return (
    <Suspense fallback={<DmInboxLoadingFallback />}>
      <DmInboxPageContent />
    </Suspense>
  );
}

function DmInboxPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groupChats, setGroupChats] = useState<GroupChatListItem[]>([]);
  const [groupChatsLoading, setGroupChatsLoading] = useState(true);
  const [groupChatsError, setGroupChatsError] = useState<string | null>(null);
  const [dmInboxRows, setDmInboxRows] = useState<DmInboxRow[]>([]);
  const [bookingsByConversationId, setBookingsByConversationId] = useState<
    Map<string, BookingRequest[]>
  >(() => new Map());
  const inboxMessagesRef = useRef<Message[]>([]);
  const bookingsByConversationRef = useRef<Map<string, BookingRequest[]>>(new Map());
  const messageAttachmentTypesRef = useRef<
    Map<string, { kind: DmAttachmentPreviewKind; count: number }>
  >(new Map());
  const dmInboxRowsRef = useRef<DmInboxRow[]>([]);
  const [otherUsersByConversation, setOtherUsersByConversation] = useState<Map<string, string>>(
    new Map(),
  );
  const [userProfiles, setUserProfiles] = useState<Map<string, UserAvatarProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [unreadEventChatIds, setUnreadEventChatIds] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<InboxTab>(() =>
    parseInboxTab(searchParams.get("tab")),
  );
  // Same generation pattern as groupChatsLoadGenerationRef below. See
  // refreshUnreadState for why the unread refresh specifically needs one.
  const unreadRefreshGenerationRef = useRef(0);
  const groupChatsLoadGenerationRef = useRef(0);
  const groupChatsLoadInFlightRef = useRef<Promise<void> | null>(null);
  const groupChatsHasDataRef = useRef(false);
  /** First fetch finished (even if empty) — stop treating empty as "still loading". */
  const groupChatsSettledRef = useRef(false);
  const groupChatsLastFetchedAtRef = useRef(0);
  const groupChatsCacheHydratedRef = useRef(false);

  const selectInboxTab = useCallback(
    (tab: InboxTab) => {
      setActiveTab(tab);
      router.replace(tab === "group" ? "/dm?tab=group" : "/dm", { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    setActiveTab(parseInboxTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    dmInboxRowsRef.current = dmInboxRows;
  }, [dmInboxRows]);

  /**
   * Resolve the signed-in user once, on mount, independent of which tab is
   * showing.
   *
   * `currentUserId` is page-wide identity: the Groups realtime handler will not
   * mark a crew chat unread without it, and `refreshUnreadState` CLEARS both
   * unread Sets when it is null. But its only other assignment lives inside
   * `loadConversations`, which is called from exactly one effect, guarded by
   * `if (activeTab !== "dm") return`.
   *
   * So on any mount where the DM tab is never active — landing straight on
   * `/dm?tab=group`, which `getEventCrewChatLink(..., { tab: "group" })` links
   * to directly — identity was never resolved, and Crew Chat unread could not
   * render at all. The preview, timestamp and ordering updated anyway because
   * that half of the realtime handler runs before the `if (currentUserId)`
   * gate and does not depend on it. That is exactly the reported asymmetry:
   * the row moves and re-sorts, the highlight never appears.
   *
   * Identity does not belong to either tab, so it is resolved here rather than
   * as a side effect of loading one tab's data. `loadConversations` still sets
   * the same value; React bails out on the identical string, so the DM path is
   * unchanged.
   */
  useEffect(() => {
    let cancelled = false;

    getCurrentUserId()
      .then((userId) => {
        if (!cancelled) {
          setCurrentUserId(userId);
        }
      })
      .catch((identityError) => {
        console.error("Failed to resolve the current user for the inbox:", identityError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadGroupChats = useCallback(async (options?: { forceLoading?: boolean; soft?: boolean }) => {
    if (
      options?.soft &&
      groupChatsHasDataRef.current &&
      Date.now() - groupChatsLastFetchedAtRef.current < GROUP_CHATS_REFRESH_INTERVAL_MS
    ) {
      return;
    }

    if (groupChatsLoadInFlightRef.current) {
      return groupChatsLoadInFlightRef.current;
    }

    const loadPromise = (async () => {
      const generation = ++groupChatsLoadGenerationRef.current;
      const showLoading =
        Boolean(options?.forceLoading) ||
        (!groupChatsSettledRef.current && !groupChatsHasDataRef.current);

      if (showLoading) {
        setGroupChatsLoading(true);
      }

      setGroupChatsError(null);

      try {
        const profile = await getCurrentUserProfile();

        if (generation !== groupChatsLoadGenerationRef.current) {
          return;
        }

        const loaded = await withGroupChatsLoadTimeout(
          listAccessibleGroupChats(profile?.role ?? null),
        );

        if (generation !== groupChatsLoadGenerationRef.current) {
          return;
        }

        groupChatsSettledRef.current = true;
        groupChatsHasDataRef.current = loaded.length > 0;
        groupChatsLastFetchedAtRef.current = Date.now();

        setGroupChats((previous) => {
          if (previous.length === 0 && loaded.length === 0) {
            return previous;
          }

          const next =
            previous.length === 0
              ? loaded
              : mergeLoadedGroupChatsWithLiveActivity(previous, loaded);

          writeGroupChatsInboxCache(next);
          return next;
        });
      } catch (loadError) {
        if (generation !== groupChatsLoadGenerationRef.current) {
          return;
        }

        console.error("Failed to load group chats:", loadError);

        groupChatsSettledRef.current = true;

        if (!groupChatsHasDataRef.current) {
          setGroupChats([]);
        }

        setGroupChatsError(getGroupChatsLoadErrorMessage(loadError));
      } finally {
        if (generation === groupChatsLoadGenerationRef.current) {
          setGroupChatsLoading(false);
        }
      }
    })();

    groupChatsLoadInFlightRef.current = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (groupChatsLoadInFlightRef.current === loadPromise) {
        groupChatsLoadInFlightRef.current = null;
      }
    }
  }, []);

  const loadConversations = useCallback(async (options?: { soft?: boolean }) => {
    if (options?.soft && dmInboxRows.length > 0) {
      return;
    }

    const showLoading = dmInboxRows.length === 0;
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    const userId = await getCurrentUserId();
    setCurrentUserId(userId);

    const { data: matchingMembers, error: membersError } = await supabase
      .from("conversation_members")
      .select("id, conversation_id, user_id")
      .eq("user_id", userId);

    if (membersError) {
      console.error("conversation_members query failed:", membersError.message);
      setError(membersError.message);
      setLoading(false);
      return;
    }

    const members = (matchingMembers ?? []) as ConversationMember[];
    const conversationIds = [...new Set(members.map((row) => row.conversation_id))];

    if (conversationIds.length === 0) {
      setDmInboxRows([]);
      setOtherUsersByConversation(new Map());
      setUserProfiles(new Map());
      setLoading(false);
      return;
    }

    const { data: conversationMemberRows, error: conversationMembersError } = await supabase
      .from("conversation_members")
      .select("id, conversation_id, user_id")
      .in("conversation_id", conversationIds);

    if (conversationMembersError) {
      console.error(
        "conversation_members lookup failed:",
        conversationMembersError.message,
      );
      setError(conversationMembersError.message);
      setLoading(false);
      return;
    }

    const allMembers = (conversationMemberRows ?? []) as ConversationMember[];
    const otherUsers = buildOtherUsersByConversation(allMembers, conversationIds, userId);
    setOtherUsersByConversation(otherUsers);

    const [profilesResult, response, messagesResponse, bookingsResult, attachmentsResponse] =
      await Promise.all([
        getUserAvatarProfilesByIds([...otherUsers.values()]).catch((profileError) => {
          console.error("Failed to load DM user profiles:", profileError);
          return new Map<string, UserAvatarProfile>();
        }),
        supabase.from("conversations").select("*").in("id", conversationIds),
        supabase
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
        listBookingRequestsForConversations(conversationIds).catch((bookingsError) => {
          console.error("Failed to load conversation bookings:", bookingsError);
          return new Map<string, BookingRequest[]>();
        }),
        supabase
          .from("message_attachments")
          .select("message_id, file_type")
          .in("conversation_id", conversationIds)
          .then(
            (result) => result,
            (attachmentsError) => {
              console.error("Failed to load DM inbox attachments:", attachmentsError);
              return { data: [] as { message_id: string; file_type: string }[], error: null };
            },
          ),
      ]);

    setUserProfiles(profilesResult);
    setBookingsByConversationId(bookingsResult);
    bookingsByConversationRef.current = bookingsResult;

    if (response.error && process.env.NODE_ENV !== "production") {
      console.log("conversations error:", response.error);
    }

    const attachmentInfoByMessageId = new Map<
      string,
      { kind: DmAttachmentPreviewKind; count: number }
    >();

    for (const attachment of attachmentsResponse.data ?? []) {
      const existing = attachmentInfoByMessageId.get(attachment.message_id);

      attachmentInfoByMessageId.set(attachment.message_id, {
        kind: existing?.kind ?? resolveDmAttachmentPreviewKind(attachment.file_type),
        count: (existing?.count ?? 0) + 1,
      });
    }

    messageAttachmentTypesRef.current = attachmentInfoByMessageId;

    const conversationRows = normalizeConversations(response.data);
    const messageRows = ((messagesResponse.data ?? []) as Message[]).map((message) =>
      decorateMessageWithAttachmentPreview(message, attachmentInfoByMessageId),
    );
    inboxMessagesRef.current = messageRows;

    if (messagesResponse.error) {
      console.error("messages response error", messagesResponse.error);
      setDmInboxRows(
        mergeDmInboxReactionActivities(
          buildDmInboxRows(conversationRows, [], { bookingsByConversationId: bookingsResult }),
          new Map(),
        ),
      );
    } else {
      let rows = buildDmInboxRows(conversationRows, messageRows, {
        bookingsByConversationId: bookingsResult,
      });

      try {
        const reactionActivities = await listLatestDmReactionInboxActivities(
          userId,
          conversationIds,
        );
        rows = mergeDmInboxReactionActivities(rows, reactionActivities);
      } catch (reactionError) {
        console.error("Failed to load DM reaction inbox activity:", reactionError);
      }

      setDmInboxRows(rows);
    }

    setLoading(false);
  }, [dmInboxRows.length]);

  /**
   * Recomputes both unread sets from the database.
   *
   * The generation guard is load-bearing, not defensive. This runs
   * fire-and-forget from an effect keyed on `currentUserId` / `dmInboxRows` /
   * `groupChats`, so several runs are routinely in flight at once — every DM
   * realtime message, reaction update and attachment-preview patch starts
   * another one. Each run closes over the rows as they were when it started and
   * finishes by REPLACING both Sets wholesale.
   *
   * Without the guard, a run that started before an incoming message but
   * resolved after it overwrites the newer state with a snapshot that predates
   * the message, and nothing re-triggers a recompute afterwards — so the unread
   * highlight the realtime handler had just switched on disappeared and only a
   * reload brought it back. The preview never showed the same symptom because
   * `setGroupChats` is a functional update this function never writes to; only
   * the unread Sets were being clobbered, which is exactly why the row's
   * timestamp updated live while its unread styling did not.
   *
   * Discarding a stale result is safe: a newer run is by definition already in
   * flight with fresher rows, and it is the one that will write.
   */
  const refreshUnreadState = useCallback(async () => {
    if (!currentUserId) {
      // Bump too, so a run still in flight from the signed-in session cannot
      // repopulate unread state after sign-out.
      unreadRefreshGenerationRef.current += 1;
      setUnreadConversationIds(new Set());
      setUnreadEventChatIds(new Set());
      return;
    }

    const generation = ++unreadRefreshGenerationRef.current;
    const latestConversationMessages = new Map<string, LatestChatMessage>();

    for (const row of dmInboxRows) {
      if (row.latestActivityAt && row.latestMessageUserId) {
        latestConversationMessages.set(row.conversationId, {
          user_id: row.latestMessageUserId,
          created_at: row.latestActivityAt,
        });
      }
    }

    const latestEventMessages = new Map<string, LatestChatMessage>();

    for (const chat of groupChats) {
      if (!chat.latestActivityAt || !chat.latestMessageUserId) {
        continue;
      }

      // Planner already knows from the booking accept — join lines must not
      // light Crew Chats unread for the event owner.
      if (chat.isOwnedByViewer && isCrewMemberJoinedNotice(chat.latestPreview)) {
        continue;
      }

      latestEventMessages.set(chat.eventId, {
        user_id: chat.latestMessageUserId,
        created_at: chat.latestActivityAt,
      });
    }

    try {
      const [conversationUnread, eventUnread] = await Promise.all([
        getUnreadConversationIds(
          dmInboxRows.map((row) => row.conversationId),
          latestConversationMessages,
          currentUserId,
        ),
        getUnreadEventChatIds(
          groupChats.map((chat) => chat.eventId),
          latestEventMessages,
          currentUserId,
        ),
      ]);

      if (generation !== unreadRefreshGenerationRef.current) {
        return;
      }

      setUnreadConversationIds(conversationUnread);
      setUnreadEventChatIds(eventUnread);

      void syncReadInboxNotifications(currentUserId, {
        conversationIds: dmInboxRows.map((row) => row.conversationId),
        unreadConversationIds: conversationUnread,
        eventIds: groupChats.map((chat) => chat.eventId),
        unreadEventIds: eventUnread,
      }).catch((syncError) => {
        console.error("Failed to sync read inbox notifications:", syncError);
      });
    } catch (readError) {
      console.error("Failed to load message read state:", readError);
    }
  }, [currentUserId, dmInboxRows, groupChats]);

  useEffect(() => {
    void refreshUnreadState();
  }, [refreshUnreadState]);

  useEffect(() => {
    function handleReadsUpdated() {
      void refreshUnreadState();
    }

    window.addEventListener("ftc-message-reads-updated", handleReadsUpdated);

    return () => {
      window.removeEventListener("ftc-message-reads-updated", handleReadsUpdated);
    };
  }, [refreshUnreadState]);

  useEffect(() => {
    if (groupChatsCacheHydratedRef.current) {
      return;
    }

    groupChatsCacheHydratedRef.current = true;

    const cached = readGroupChatsInboxCache();

    if (cached.length === 0) {
      return;
    }

    setGroupChats(cached);
    groupChatsSettledRef.current = true;
    groupChatsHasDataRef.current = true;
    groupChatsLastFetchedAtRef.current = Date.now();
    setGroupChatsLoading(false);
  }, []);

  useEffect(() => {
    void loadGroupChats();
  }, [loadGroupChats]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    function reloadGroupChatsForCrewUnlock() {
      // Hard reload (not soft): unlock must beat the 30s soft throttle.
      void loadGroupChats();
    }

    function softReloadGroupChatsFromBadgeBus() {
      // Always refetch (no 30s soft skip): cancel must drop the event from Crew
      // Chats or the tab badge stays at 1. Loading spinner stays off unless empty.
      void loadGroupChats();
    }

    window.addEventListener("ftc-notifications-updated", softReloadGroupChatsFromBadgeBus);

    const notificationChannel = supabase
      .channel(`dm-inbox:crew-chat-unlock:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const link =
            payload.new && typeof payload.new === "object" && "link" in payload.new
              ? String((payload.new as { link?: string | null }).link ?? "")
              : "";

          // Crew chat start (and crew messages) use /events/{id}/chat links.
          if (/^\/events\/[0-9a-fA-F-]{36}\/chat/.test(link)) {
            reloadGroupChatsForCrewUnlock();
          }
        },
      )
      .subscribe();

    const cancellationChannel = supabase
      .channel("event-cancellations")
      .on("broadcast", { event: "event_cancelled" }, (broadcast) => {
        const eventId =
          broadcast?.payload &&
          typeof broadcast.payload === "object" &&
          "eventId" in broadcast.payload
            ? String((broadcast.payload as { eventId?: string }).eventId ?? "")
            : "";

        if (eventId) {
          setGroupChats((previous) => {
            const next = previous.filter(
              (chat) => normalizeInboxId(chat.eventId) !== normalizeInboxId(eventId),
            );

            if (next.length !== previous.length) {
              writeGroupChatsInboxCache(next);
            }

            return next;
          });
        }

        void loadGroupChats({ forceLoading: true });
      })
      .subscribe();

    return () => {
      window.removeEventListener("ftc-notifications-updated", softReloadGroupChatsFromBadgeBus);
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(cancellationChannel);
    };
  }, [currentUserId, loadGroupChats]);

  useEffect(() => {
    if (activeTab !== "group") {
      return;
    }

    void loadGroupChats({ soft: true });
  }, [activeTab, loadGroupChats]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && activeTab === "group") {
        // Hard reload on visibility change to catch event cancellations and other changes
        void loadGroupChats({ forceLoading: false });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, loadGroupChats]);

  useEffect(() => {
    if (activeTab !== "dm") {
      return;
    }

    loadConversations().catch((loadError: Error) => {
      console.error("loadConversations failed:", loadError.message);
      setError(loadError.message);
      setLoading(false);
    });
  }, [activeTab, loadConversations]);

  useEffect(() => {
    async function resolveDmInboxAttachmentPreview(message: Message, attempt = 0): Promise<void> {
      const { data, error } = await supabase
        .from("message_attachments")
        .select("file_type")
        .eq("message_id", message.id)
        .eq("conversation_id", message.conversation_id);

      if (error) {
        console.error("Failed to resolve DM inbox attachment preview:", error);
        return;
      }

      if (!data || data.length === 0) {
        if (attempt >= 1) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 700));
        return resolveDmInboxAttachmentPreview(message, attempt + 1);
      }

      const attachmentInfo = {
        kind: resolveDmAttachmentPreviewKind(data[0].file_type),
        count: data.length,
      };
      messageAttachmentTypesRef.current.set(message.id, attachmentInfo);

      const existingMessage = inboxMessagesRef.current.find((m) => m.id === message.id);

      // If real caption text has since arrived (or the message was
      // superseded), that always wins over the attachment token.
      if (existingMessage && existingMessage.text.trim()) {
        return;
      }

      const decoratedMessage: Message = {
        ...(existingMessage ?? message),
        text: encodeDmAttachmentInboxPreview(attachmentInfo.kind, attachmentInfo.count),
      };

      setDmInboxRows((previous) => {
        const mergedMessages = [
          decoratedMessage,
          ...inboxMessagesRef.current.filter((m) => m.id !== decoratedMessage.id),
        ];
        inboxMessagesRef.current = mergedMessages;
        const result = applyDmInboxRealtimeMessage(previous, decoratedMessage, {
          allMessages: mergedMessages,
          bookingsByConversationId: bookingsByConversationRef.current,
        });

        return result.rows;
      });
    }

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
          const groupTargetId = extractGroupChatTargetId(newMessage);

          if (groupTargetId) {
            let matchedGroupChat = false;
            let nextGroupChats: GroupChatListItem[] | null = null;

            setGroupChats((previous) => {
              const result = applyInboxGroupMessage(previous, groupTargetId, {
                id: newMessage.id,
                text: newMessage.text,
                created_at: newMessage.created_at,
                user_id: newMessage.user_id,
                event_id: newMessage.event_id,
              });

              matchedGroupChat = result.matched;

              if (process.env.NODE_ENV !== "production") {
                console.log(
                  "[Group rendered row ids]",
                  result.rows.map((chat) => ({
                    eventId: chat.eventId,
                    latestActivityAt: chat.latestActivityAt,
                  })),
                );
              }

              if (result.matched) {
                nextGroupChats = result.rows;
                return [...result.rows];
              }

              return previous;
            });

            if (matchedGroupChat && nextGroupChats) {
              writeGroupChatsInboxCache(nextGroupChats);
            }

            if (!matchedGroupChat) {
              void loadGroupChats({ soft: true });
            }

            if (currentUserId) {
              if (isOwnChatMessage(newMessage.user_id, currentUserId)) {
                setUnreadEventChatIds((previous) =>
                  removeUnreadEventChatId(previous, groupTargetId),
                );
              } else {
                setUnreadEventChatIds((previous) => {
                  const next = new Set(previous);
                  next.add(groupTargetId);
                  return next;
                });
              }
            }

            return;
          }

          const messageType = detectInboxRealtimeMessageType(newMessage);

          if (messageType !== "dm") {
            return;
          }

          const targetId = newMessage.conversation_id;
          // A caption-less image/file message inserts the `messages` row
          // first, then a `message_attachments` row moments later. If the
          // attachment kind is already cached here (e.g. resolved for an
          // earlier message), decorate immediately; otherwise
          // resolveDmInboxAttachmentPreview (below) patches it in shortly.
          const decoratedNewMessage = decorateMessageWithAttachmentPreview(
            newMessage,
            messageAttachmentTypesRef.current,
          );

          setDmInboxRows((previous) => {
            const mergedMessages = [
              decoratedNewMessage,
              ...inboxMessagesRef.current.filter(
                (message) => message.id !== decoratedNewMessage.id,
              ),
            ];
            inboxMessagesRef.current = mergedMessages;
            const result = applyDmInboxRealtimeMessage(previous, decoratedNewMessage, {
              allMessages: mergedMessages,
              bookingsByConversationId: bookingsByConversationRef.current,
            });

            return result.rows;
          });

          if (currentUserId && newMessage.user_id !== currentUserId) {
            setUnreadConversationIds((previous) => {
              const next = new Set(previous);
              next.add(targetId);
              return next;
            });
          } else if (currentUserId && newMessage.user_id === currentUserId) {
            setUnreadConversationIds((previous) => {
              const next = new Set(previous);
              next.delete(targetId);
              return next;
            });
          }

          // message_attachments is not in the Realtime publication, so an
          // image/file message (empty text) can't be patched via a
          // postgres_changes callback on that table. Instead, resolve it
          // with a direct, narrowly-scoped select — sendDmMessageWithAttachment
          // inserts the message row first and the attachment row moments
          // later, so a short bounded retry covers that ordering gap without
          // open-ended polling.
          if (!decoratedNewMessage.text.trim()) {
            void resolveDmInboxAttachmentPreview(decoratedNewMessage);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadGroupChats]);

  useEffect(() => {
    async function handleDmReactionInboxActivity(
      reaction: DmMessageReaction,
      eventType: "INSERT" | "UPDATE",
    ) {
      if (!currentUserId) {
        return;
      }

      let messageContext: { conversationId: string; messageAuthorUserId: string } | null;

      try {
        messageContext = await loadDmReactionInboxMessageContext(reaction.message_id);
      } catch (contextError) {
        console.error("Failed to load DM reaction inbox context:", contextError);
        return;
      }

      if (
        !messageContext ||
        !shouldApplyDmReactionInboxActivity({
          currentUserId,
          messageAuthorUserId: messageContext.messageAuthorUserId,
          reactorUserId: reaction.user_id,
        })
      ) {
        return;
      }

      const activity = buildDmInboxReactionActivity({
        reaction,
        conversationId: messageContext.conversationId,
        messageAuthorUserId: messageContext.messageAuthorUserId,
      });

      let inboxUpdated = false;

      setDmInboxRows((previous) => {
        const result = applyDmInboxRealtimeReaction(previous, activity);
        inboxUpdated = result.updated;

        return result.rows;
      });

      if (!inboxUpdated) {
        return;
      }

      if (
        shouldMarkDmReactionInboxUnread({
          eventType,
          currentUserId,
          messageAuthorUserId: messageContext.messageAuthorUserId,
          reactorUserId: reaction.user_id,
        })
      ) {
        setUnreadConversationIds((previous) => {
          const next = new Set(previous);
          next.add(messageContext.conversationId);
          return next;
        });
      }
    }

    async function handleDmReactionInboxRemoval(reaction: Pick<DmMessageReaction, "id">) {
      if (!currentUserId || !reaction.id) {
        return;
      }

      // Supabase Realtime's DELETE payload for message_reactions only carries
      // the row's primary key (`id`) even with replica identity full — the
      // other columns (message_id/user_id/emoji) are not forwarded to the
      // client. So the affected conversation must be resolved from local
      // inbox state, where the reaction id is already encoded in whichever
      // row's `latestPreview` currently represents it. Reading via a ref
      // (rather than closing over `dmInboxRows`) avoids acting on a stale
      // snapshot captured when this subscription effect was created.
      const conversationId = dmInboxRowsRef.current.find((row) => {
        const encoded = parseDmReactionInboxPreview(row.latestPreview);
        return encoded?.reactionId === reaction.id;
      })?.conversationId;

      if (!conversationId) {
        return;
      }

      try {
        const remainingReactionActivities = await listLatestDmReactionInboxActivities(
          currentUserId,
          [conversationId],
        );
        const remainingReaction = remainingReactionActivities.get(conversationId);
        const bookings = bookingsByConversationRef.current.get(conversationId) ?? [];
        const fallbackMessage = pickDmInboxPreviewMessage(
          inboxMessagesRef.current,
          conversationId,
          bookings,
        );
        const fallback =
          remainingReaction &&
          (!fallbackMessage ||
            new Date(remainingReaction.activityAt).getTime() >=
              new Date(fallbackMessage.created_at).getTime())
            ? dmInboxReactionActivityToRowFields(remainingReaction)
            : {
                latestActivityAt: fallbackMessage?.created_at ?? null,
                latestPreview: fallbackMessage?.text ?? null,
                latestMessageUserId: fallbackMessage?.user_id ?? null,
              };

        let inboxRemoved = false;

        setDmInboxRows((previous) => {
          const result = applyDmInboxRealtimeReactionRemoval(previous, {
            conversationId,
            reactionId: reaction.id,
            fallback,
          });
          inboxRemoved = result.removed;

          return result.rows;
        });

        if (!inboxRemoved) {
          return;
        }

        if (!fallback.latestActivityAt || !fallback.latestMessageUserId) {
          setUnreadConversationIds((previous) => {
            const next = new Set(previous);
            next.delete(conversationId);
            return next;
          });
          return;
        }

        const unreadConversationIds = await getUnreadConversationIds(
          [conversationId],
          new Map([
            [
              conversationId,
              {
                user_id: fallback.latestMessageUserId,
                created_at: fallback.latestActivityAt,
              },
            ],
          ]),
          currentUserId,
        );

        setUnreadConversationIds((previous) => {
          const next = new Set(previous);

          if (unreadConversationIds.has(conversationId)) {
            next.add(conversationId);
          } else {
            next.delete(conversationId);
          }

          return next;
        });
      } catch (removalError) {
        console.error("Failed to restore DM inbox after reaction removal:", removalError);
      }
    }

    const channel = supabase
      .channel("dm-inbox:reactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          void handleDmReactionInboxActivity(payload.new as DmMessageReaction, "INSERT");
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
          void handleDmReactionInboxActivity(payload.new as DmMessageReaction, "UPDATE");
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
          void handleDmReactionInboxRemoval(payload.old as Pick<DmMessageReaction, "id">);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  function openConversation(conversationId: string) {
    router.push(buildDmChatFreshOpenHref(buildDmThreadHref(conversationId, { from: "dm" })));
  }

  const hasDirectMessages = dmInboxRows.length > 0;
  const renderedGroupChats = sortGroupChatsByLatestActivity(
    dedupeGroupChatsByEventId(groupChats),
  );
  const hasGroupChats = renderedGroupChats.length > 0;
  const showGroupChatsLoading = groupChatsLoading && !hasGroupChats;
  const dmUnreadCount = unreadConversationIds.size;
  const groupUnreadCount = unreadEventChatIds.size;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredDmRows = useMemo(() => {
    if (!normalizedSearch) {
      return dmInboxRows;
    }

    return dmInboxRows.filter((row) => {
      const otherUserId = otherUsersByConversation.get(row.conversationId);
      const otherProfile = otherUserId ? userProfiles.get(otherUserId) : undefined;
      const displayName = getConversationDisplayName(row, otherProfile).toLowerCase();
      const preview = formatDmInboxConversationPreview({
        latestPreview: row.latestPreview,
        latestMessageUserId: row.latestMessageUserId,
        currentUserId,
        bookings: bookingsByConversationId.get(row.conversationId) ?? [],
        userProfiles,
      }).toLowerCase();

      return displayName.includes(normalizedSearch) || preview.includes(normalizedSearch);
    });
  }, [dmInboxRows, normalizedSearch, otherUsersByConversation, userProfiles, bookingsByConversationId]);

  const filteredGroupChats = useMemo(() => {
    if (!normalizedSearch) {
      return renderedGroupChats;
    }

    return renderedGroupChats.filter((chat) => {
      const haystack = [chat.eventName, chat.venue, chat.latestPreview ?? ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [renderedGroupChats, normalizedSearch]);

  useEffect(() => {
    logGroupRenderedRowIds(sortGroupChatsByLatestActivity(groupChats));
  }, [groupChats]);

  logInboxRenderOrder(
    "DM",
    dmInboxRows.map((row) => ({
      id: row.conversationId,
      latestActivityAt: row.latestActivityAt,
    })),
  );

  return (
    <OnboardingGuard>
      <MessagesInboxLayout
        activeTab={activeTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectTab={selectInboxTab}
        dmUnreadCount={dmUnreadCount}
        groupUnreadCount={groupUnreadCount}
      >
        {activeTab === "group" ? (
          <section aria-label="Group Chats">
            {showGroupChatsLoading ? (
              <InboxListSkeleton variant="group" />
            ) : groupChatsError && !hasGroupChats ? (
                <GroupChatsLoadErrorState
                  message={groupChatsError}
                  retrying={groupChatsLoading}
                  onRetry={() => {
                    void loadGroupChats({ forceLoading: true });
                  }}
                />
              ) : !hasGroupChats ? (
                <GroupChatsEmptyState />
              ) : (
                <>
                  {groupChatsError ? (
                    <div className="mb-3">
                      <GroupChatsLoadErrorState
                        message={groupChatsError}
                        retrying={groupChatsLoading}
                        onRetry={() => {
                          void loadGroupChats({ forceLoading: false });
                        }}
                      />
                    </div>
                  ) : null}
                  {filteredGroupChats.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ftc-text-muted">
                      No crew chats match your search
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2 pt-3.5">
                      {filteredGroupChats.map((chat) => {
                        const preview = formatGroupChatInboxPreview(chat.latestPreview, {
                          prefixYou:
                            chat.latestMessageUserId === currentUserId &&
                            Boolean(chat.latestPreview?.trim()) &&
                            !isGroupChatSystemUpdateMessage(chat.latestPreview ?? ""),
                        });

                        return (
                          <li key={chat.eventId}>
                            <MessagesGroupInboxRow
                              title={chat.eventName}
                              subtitle={`${chat.venue.trim() || "Venue TBC"} · ${formatGroupChatEventDate(chat.eventDate)}`}
                              preview={preview}
                              timestamp={chat.latestActivityAt ?? undefined}
                              timestampLabel={
                                chat.latestActivityAt
                                  ? undefined
                                  : formatGroupChatEventDate(chat.eventDate)
                              }
                              isUnread={unreadEventChatIds.has(chat.eventId)}
                              href={chat.href}
                              coverImageUrl={chat.coverImageUrl}
                              fallbackColour={chat.fallbackColour}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </section>
          ) : null}

        {activeTab === "dm" ? (
          <section aria-label="Messages">
            {loading ? (
              <InboxListSkeleton />
            ) : error ? (
                <p className="py-2 text-sm text-red-400">{error}</p>
              ) : !hasDirectMessages ? (
                <DirectMessagesEmptyState />
              ) : filteredDmRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-ftc-text-muted">
                  No conversations match your search
                </p>
              ) : (
                <ul className="flex flex-col gap-2 pt-3.5">
                  {filteredDmRows.map((row) => {
                    const otherUserId = otherUsersByConversation.get(row.conversationId);
                    const otherProfile = otherUserId ? userProfiles.get(otherUserId) : undefined;
                    const displayName = getConversationDisplayName(row, otherProfile);
                    const preview = formatDmInboxConversationPreview({
                      latestPreview: row.latestPreview,
                      latestMessageUserId: row.latestMessageUserId,
                      currentUserId,
                      bookings: bookingsByConversationId.get(row.conversationId) ?? [],
                      userProfiles,
                    });
                    const timestamp = row.latestActivityAt ?? row.conversationCreatedAt;

                    return (
                      <li key={row.conversationId}>
                        <MessagesInboxRow
                          displayName={displayName}
                          preview={preview}
                          timestamp={timestamp}
                          avatarUrl={otherProfile?.avatar_url}
                          isUnread={unreadConversationIds.has(row.conversationId)}
                          onClick={() => openConversation(row.conversationId)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
      </MessagesInboxLayout>
    </OnboardingGuard>
  );
}
