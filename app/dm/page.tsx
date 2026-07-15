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
  buildDmInboxRows,
  detectInboxRealtimeMessageType,
  logInboxRenderOrder,
  normalizeInboxId,
  type DmInboxRow,
} from "@/lib/dmInbox";
import { formatGroupChatInboxPreview, isGroupChatSystemUpdateMessage } from "@/lib/groupChatSystemMessages";
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
import { formatDmInboxMessagePreview, isDmInboxSystemPreviewMessage } from "@/lib/dm/messagePreview";
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
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-0 bg-ftc-primary text-xs font-semibold uppercase tracking-wide text-ftc-bg">
        GC
      </div>
      <h2 className="mt-5 text-lg font-semibold text-ftc-text">No group chats yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ftc-text-muted">
        Group chats appear here when you create events or accept bookings
      </p>
    </div>
  );
}

const GROUP_CHATS_LOAD_TIMEOUT_MS = 15_000;
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
        {retrying ? "Retrying..." : "Try again"}
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

const MVP_DM_EMPTY_MESSAGE =
  "Ask the DJ or planner you are working with to join FTC so you can send or receive booking requests.";

function DirectMessagesEmptyIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-0 bg-ftc-primary text-xs font-semibold uppercase tracking-wide text-ftc-bg">
      DM
    </div>
  );
}

function DirectMessagesEmptyState({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-ftc-border bg-ftc-surface/30 px-4 py-5 text-center">
          <DirectMessagesEmptyIcon />
          <h3 className="mt-4 text-base font-semibold text-ftc-text">No messages yet</h3>
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-muted">
            {MVP_DM_EMPTY_MESSAGE}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
      <DirectMessagesEmptyIcon />
      <h2 className="mt-5 text-lg font-semibold text-ftc-text">No messages yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ftc-text-muted">
        {MVP_DM_EMPTY_MESSAGE} Your chats will appear here.
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
  const groupChatsLoadGenerationRef = useRef(0);
  const groupChatsLoadInFlightRef = useRef<Promise<void> | null>(null);
  const groupChatsHasDataRef = useRef(false);
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
      const showLoading = options?.forceLoading || !groupChatsHasDataRef.current;

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

        groupChatsHasDataRef.current = loaded.length > 0;
        groupChatsLastFetchedAtRef.current = Date.now();

        setGroupChats((previous) => {
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

    const [profilesResult, response, messagesResponse, bookingsResult] = await Promise.all([
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
    ]);

    setUserProfiles(profilesResult);
    setBookingsByConversationId(bookingsResult);
    bookingsByConversationRef.current = bookingsResult;

    if (response.error) {
      console.log("conversations error:", response.error);
    }

    const conversationRows = normalizeConversations(response.data);
    const messageRows = (messagesResponse.data ?? []) as Message[];
    inboxMessagesRef.current = messageRows;

    if (messagesResponse.error) {
      console.error("messages response error", messagesResponse.error);
      setDmInboxRows(buildDmInboxRows(conversationRows, [], { bookingsByConversationId: bookingsResult }));
    } else {
      setDmInboxRows(
        buildDmInboxRows(conversationRows, messageRows, {
          bookingsByConversationId: bookingsResult,
        }),
      );
    }

    setLoading(false);
  }, [dmInboxRows.length]);

  const refreshUnreadState = useCallback(async () => {
    if (!currentUserId) {
      setUnreadConversationIds(new Set());
      setUnreadEventChatIds(new Set());
      return;
    }

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
      if (chat.latestActivityAt && chat.latestMessageUserId) {
        latestEventMessages.set(chat.eventId, {
          user_id: chat.latestMessageUserId,
          created_at: chat.latestActivityAt,
        });
      }
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
    groupChatsHasDataRef.current = true;
    groupChatsLastFetchedAtRef.current = Date.now();
    setGroupChatsLoading(false);
  }, []);

  useEffect(() => {
    void loadGroupChats();
  }, [loadGroupChats]);

  useEffect(() => {
    if (activeTab !== "group") {
      return;
    }

    void loadGroupChats({ soft: true });
  }, [activeTab, loadGroupChats]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && activeTab === "group") {
        void loadGroupChats({ soft: true });
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
            console.log("[Group realtime raw]", payload.new);
            console.log("[Group realtime target id]", groupTargetId);

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

              console.log(
                "[Group rendered row ids]",
                result.rows.map((chat) => ({
                  eventId: chat.eventId,
                  latestActivityAt: chat.latestActivityAt,
                })),
              );

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
              void loadGroupChats();
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

          console.log("[Inbox realtime raw] new message payload", payload.new);
          console.log("[Inbox realtime raw] detected type", messageType);

          if (messageType !== "dm") {
            console.log("[Inbox realtime] ignored message with unknown routing", newMessage);
            return;
          }

          const targetId = newMessage.conversation_id;

          console.log("[Inbox realtime] DM message received", {
            targetId,
            messageId: newMessage.id,
            created_at: newMessage.created_at,
          });

          setDmInboxRows((previous) => {
            const beforeIds = previous.map((row) => row.conversationId);
            const mergedMessages = [
              newMessage,
              ...inboxMessagesRef.current.filter((message) => message.id !== newMessage.id),
            ];
            inboxMessagesRef.current = mergedMessages;
            const result = applyDmInboxRealtimeMessage(previous, newMessage, {
              allMessages: mergedMessages,
              bookingsByConversationId: bookingsByConversationRef.current,
            });

            console.log("[Inbox realtime] DM matched", result.matched, {
              targetId,
              beforeIds,
              afterIds: result.rows.map((row) => row.conversationId),
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadGroupChats]);

  function openConversation(conversationId: string) {
    router.push(buildDmThreadHref(conversationId, { from: "dm" }));
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
      const preview = (
        formatDmInboxMessagePreview(row.latestPreview, {
          bookings: bookingsByConversationId.get(row.conversationId) ?? [],
        }) ?? ""
      ).toLowerCase();

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
                      No group chats match your search.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
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
                  No conversations match your search.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filteredDmRows.map((row) => {
                    const otherUserId = otherUsersByConversation.get(row.conversationId);
                    const otherProfile = otherUserId ? userProfiles.get(otherUserId) : undefined;
                    const displayName = getConversationDisplayName(row, otherProfile);
                    const previewText = formatDmInboxMessagePreview(row.latestPreview, {
                      bookings: bookingsByConversationId.get(row.conversationId) ?? [],
                    });
                    const prefixPreviewWithYou =
                      row.latestMessageUserId === currentUserId &&
                      Boolean(previewText) &&
                      !isDmInboxSystemPreviewMessage(row.latestPreview);
                    const preview = previewText
                      ? `${prefixPreviewWithYou ? "You: " : ""}${previewText}`
                      : "No messages yet";
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
