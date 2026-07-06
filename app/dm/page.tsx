"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import MessagesInboxComposeButton from "@/app/components/dm/MessagesInboxComposeButton";
import MessagesInboxRow, {
  MessagesGroupInboxRow,
} from "@/app/components/dm/MessagesInboxRow";
import MessagesInboxSearchBar from "@/app/components/dm/MessagesInboxSearchBar";
import {
  applyInboxGroupMessage,
  dedupeGroupChatsByEventId,
  extractGroupChatTargetId,
  formatGroupChatEventDate,
  getGroupChatsLoadErrorMessage,
  listAccessibleGroupChats,
  logGroupRenderedRowIds,
  mergeLoadedGroupChatsWithLiveActivity,
  sortGroupChatsByLatestActivity,
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
import { formatGroupChatInboxPreview } from "@/lib/groupChatSystemMessages";
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
import { formatDmInboxMessagePreview } from "@/lib/dm/messagePreview";
import {
  DISCOVER_PATH,
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

function InboxTabButton({
  active,
  label,
  mobileLabel,
  unreadCount,
  showUnreadBadge = true,
  onClick,
}: {
  active: boolean;
  label: string;
  mobileLabel?: string;
  unreadCount: number;
  showUnreadBadge?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm transition sm:gap-2 sm:px-4 ${
        active ? "ftc-tab-pill-active" : "ftc-tab-pill-inactive"
      }`}
    >
      <span className="min-w-0 truncate">
        <span className="sm:hidden">{mobileLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      {showUnreadBadge && unreadCount > 0 ? (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none ${
            active ? "bg-ftc-bg text-ftc-primary" : "bg-ftc-primary text-ftc-bg"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
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
        Group chats appear here when you create events or accept bookings.
      </p>
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

function DirectMessagesEmptyIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-0 bg-ftc-primary text-xs font-semibold uppercase tracking-wide text-ftc-bg">
      DM
    </div>
  );
}

function BrowseDiscoverButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={DISCOVER_PATH}
      className={`ftc-btn-primary inline-flex px-5 py-3 text-sm uppercase tracking-wide ${className}`}
    >
      Browse Discover
    </Link>
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
            Find a DJ or promoter on Discover to start a conversation.
          </p>
          <BrowseDiscoverButton className="mt-4 w-full max-w-xs sm:w-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
      <DirectMessagesEmptyIcon />
      <h2 className="mt-5 text-lg font-semibold text-ftc-text">No messages yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ftc-text-muted">
        Find a DJ or promoter on Discover to start a conversation. Your chats will appear here.
      </p>
      <BrowseDiscoverButton className="mt-6 w-full max-w-xs sm:w-auto" />
    </div>
  );
}

export default function DmInboxPage() {
  return (
    <Suspense
      fallback={
        <OnboardingGuard>
          <div
            className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
          >
            <AppNavigation />
            <p className="px-4 py-4 text-sm text-ftc-text-muted sm:px-6">Loading messages...</p>
          </div>
        </OnboardingGuard>
      }
    >
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

  const loadGroupChats = useCallback(async () => {
    setGroupChatsLoading(true);
    setGroupChatsError(null);

    try {
      const profile = await getCurrentUserProfile();
      const userRole = profile?.role ?? null;
      const loaded = await listAccessibleGroupChats(userRole);
      setGroupChats((previous) => {
        if (previous.length === 0) {
          return loaded;
        }

        return mergeLoadedGroupChatsWithLiveActivity(previous, loaded);
      });
    } catch (loadError) {
      console.error("Failed to load group chats:", loadError);
      setGroupChats([]);
      setGroupChatsError(getGroupChatsLoadErrorMessage(loadError));
    } finally {
      setGroupChatsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const userId = await getCurrentUserId();
    setCurrentUserId(userId);

    const { data: allMembers, error: membersError } = await supabase
      .from("conversation_members")
      .select("*");

    if (membersError) {
      console.error("conversation_members query failed:", membersError.message);
      setError(membersError.message);
      setLoading(false);
      return;
    }

    const members = (allMembers ?? []) as ConversationMember[];
    const matchingMembers = members.filter((row) => row.user_id === userId);

    const conversationIds = [
      ...new Set(matchingMembers.map((row) => row.conversation_id)),
    ];

    if (conversationIds.length === 0) {
      setDmInboxRows([]);
      setOtherUsersByConversation(new Map());
      setUserProfiles(new Map());
      setLoading(false);
      return;
    }

    const otherUsers = buildOtherUsersByConversation(members, conversationIds, userId);
    setOtherUsersByConversation(otherUsers);

    try {
      const profiles = await getUserAvatarProfilesByIds([...otherUsers.values()]);
      setUserProfiles(profiles);
    } catch (profileError) {
      console.error("Failed to load DM user profiles:", profileError);
      setUserProfiles(new Map());
    }

    const response = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds);

    if (response.error) {
      console.log("conversations error:", response.error);
    }

    const conversationRows = normalizeConversations(response.data);

    const messagesResponse = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (messagesResponse.error) {
      console.error("messages response error", messagesResponse.error);
      setDmInboxRows(buildDmInboxRows(conversationRows, []));
    } else {
      setDmInboxRows(
        buildDmInboxRows(conversationRows, (messagesResponse.data ?? []) as Message[]),
      );
    }

    setLoading(false);
  }, []);

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

      await syncReadInboxNotifications(currentUserId, {
        conversationIds: dmInboxRows.map((row) => row.conversationId),
        unreadConversationIds: conversationUnread,
        eventIds: groupChats.map((chat) => chat.eventId),
        unreadEventIds: eventUnread,
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
    loadGroupChats().catch((loadError: Error) => {
      console.error("loadGroupChats failed:", loadError.message);
      setGroupChatsError(loadError.message);
      setGroupChatsLoading(false);
    });
  }, [loadGroupChats]);

  useEffect(() => {
    if (activeTab !== "group") {
      return;
    }

    void loadGroupChats();
  }, [activeTab, loadGroupChats]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && activeTab === "group") {
        void loadGroupChats();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, loadGroupChats]);

  useEffect(() => {
    loadConversations().catch((loadError: Error) => {
      console.error("loadConversations failed:", loadError.message);
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
          const groupTargetId = extractGroupChatTargetId(newMessage);

          if (groupTargetId) {
            console.log("[Group realtime raw]", payload.new);
            console.log("[Group realtime target id]", groupTargetId);

            let matchedGroupChat = false;

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

              return result.matched ? [...result.rows] : previous;
            });

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
            const result = applyDmInboxRealtimeMessage(previous, newMessage);

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
    router.push(`/dm/${conversationId}`);
  }

  const hasDirectMessages = dmInboxRows.length > 0;
  const renderedGroupChats = sortGroupChatsByLatestActivity(
    dedupeGroupChatsByEventId(groupChats),
  );
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
      const preview = (formatDmInboxMessagePreview(row.latestPreview) ?? "").toLowerCase();

      return displayName.includes(normalizedSearch) || preview.includes(normalizedSearch);
    });
  }, [dmInboxRows, normalizedSearch, otherUsersByConversation, userProfiles]);

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
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />
        <header className="sticky top-0 z-10 border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6 md:top-12">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold tracking-tight text-ftc-text">Messages</h1>
            <MessagesInboxComposeButton onClick={() => router.push(DISCOVER_PATH)} />
          </div>

          <div className="mt-3">
            <MessagesInboxSearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <div
            className="ftc-tab-pill mt-3"
            role="tablist"
            aria-label="Message categories"
          >
            <InboxTabButton
              active={activeTab === "dm"}
              label="Direct Messages"
              mobileLabel="DMs"
              unreadCount={dmUnreadCount}
              onClick={() => selectInboxTab("dm")}
            />
            <InboxTabButton
              active={activeTab === "group"}
              label="Group Chats"
              mobileLabel="Groups"
              unreadCount={groupUnreadCount}
              onClick={() => selectInboxTab("group")}
            />
          </div>
        </header>

        <div className="flex-1 px-4 py-3 sm:px-6">
          {activeTab === "group" ? (
            <section aria-label="Group Chats">
              {groupChatsLoading ? (
                <p className="py-2 text-sm text-ftc-text-muted">Loading group chats...</p>
              ) : groupChatsError ? (
                <p className="py-2 text-sm text-red-400">{groupChatsError}</p>
              ) : renderedGroupChats.length === 0 ? (
                <GroupChatsEmptyState />
              ) : filteredGroupChats.length === 0 ? (
                <p className="py-8 text-center text-sm text-ftc-text-muted">
                  No group chats match your search.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filteredGroupChats.map((chat) => {
                    const preview = formatGroupChatInboxPreview(chat.latestPreview, {
                      prefixYou: chat.latestMessageUserId === currentUserId,
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
            </section>
          ) : null}

          {activeTab === "dm" ? (
            <section aria-label="Direct Messages">
              {loading ? (
                <p className="py-2 text-sm text-ftc-text-muted">Loading conversations...</p>
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
                    const previewText = formatDmInboxMessagePreview(row.latestPreview);
                    const preview = previewText
                      ? `${row.latestMessageUserId === currentUserId ? "You: " : ""}${previewText}`
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
        </div>
      </div>
    </OnboardingGuard>
  );
}
