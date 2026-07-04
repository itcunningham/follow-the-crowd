"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  applyInboxGroupMessage,
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
  type DmInboxRow,
} from "@/lib/dmInbox";
import { getNavBadgeCounts } from "@/lib/notifications";
import {
  getUnreadConversationIds,
  getUnreadEventChatIds,
  type LatestChatMessage,
} from "@/lib/messageReads";
import { supabase } from "@/lib/supabaseClient";
import { startDm } from "@/lib/startDm";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getUserAvatarProfilesByIds,
  type UserAvatarProfile,
} from "@/lib/user/currentUser";

const TARGET_DJ_USER_ID = "test-user";
const NOTIFICATIONS_PATH = "/notifications";

type InboxTab = "dm" | "group";

function InboxTabButton({
  active,
  label,
  unreadCount,
  onClick,
}: {
  active: boolean;
  label: string;
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
        active
          ? "border-blue-500 text-zinc-50"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
      {unreadCount > 0 ? (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none ${
            active
              ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.45)]"
              : "border border-blue-500/35 bg-blue-600/15 text-blue-300"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function GroupChatsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/10 text-xs font-semibold uppercase tracking-wide text-blue-300">
        GC
      </div>
      <h2 className="mt-5 text-lg font-semibold text-zinc-100">No group chats yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        Group chats appear here when you create events or accept bookings.
      </p>
    </div>
  );
}

function NotificationsBellLink({ count }: { count: number }) {
  return (
    <Link
      href={NOTIFICATIONS_PATH}
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-400 transition hover:border-blue-500/35 hover:text-blue-300"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-blue-400/50 bg-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_10px_rgba(59,130,246,0.45)]">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
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
  otherUserId?: string,
) {
  if (row.name?.trim()) {
    return row.name.trim();
  }

  if (otherUserId) {
    return `Chat with ${otherUserId}`;
  }

  return "Direct message";
}

function formatInboxTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
  });
}

function ConversationAvatar({
  label,
  avatarUrl,
}: {
  label: string;
  avatarUrl?: string | null;
}) {
  return <ProfileAvatar name={label} avatarUrl={avatarUrl} size="lg" />;
}

function MessageDjButton({
  disabled,
  onClick,
  className = "",
}: {
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {disabled ? "Opening..." : "Message DJ"}
    </button>
  );
}

function getUnreadInboxRowClass(isUnread: boolean) {
  return isUnread
    ? "border-l-2 border-blue-500/55 bg-blue-500/[0.06] shadow-[inset_0_0_20px_rgba(59,130,246,0.07)]"
    : "";
}

function UnreadInboxIndicator() {
  return (
    <span
      aria-label="Unread"
      className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]"
    />
  );
}

function GroupChatCard({ chat, isUnread }: { chat: GroupChatListItem; isUnread: boolean }) {
  return (
    <li>
      <Link
        href={chat.href}
        className={`flex w-full items-center gap-3 px-4 py-3.5 transition active:bg-blue-600/10 hover:bg-zinc-900/70 sm:px-6 sm:py-4 ${getUnreadInboxRowClass(isUnread)}`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/10 text-xs font-semibold uppercase tracking-wide text-blue-300">
          GC
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`truncate text-[15px] ${
                isUnread ? "font-bold text-zinc-50" : "font-semibold text-zinc-100"
              }`}
            >
              {chat.eventName}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {isUnread ? <UnreadInboxIndicator /> : null}
              <time
                dateTime={chat.latestActivityAt ?? chat.eventDate}
                className={`text-xs ${isUnread ? "font-medium text-blue-300/80" : "text-zinc-500"}`}
              >
                {chat.latestActivityAt
                  ? formatInboxTimestamp(chat.latestActivityAt)
                  : formatGroupChatEventDate(chat.eventDate)}
              </time>
            </div>
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {chat.venue.trim() || "Venue TBC"}
            {" · "}
            {formatGroupChatEventDate(chat.eventDate)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-400/90">
              Group Chat
            </span>
            {chat.latestPreview ? (
              <p
                className={`min-w-0 truncate text-sm ${
                  isUnread ? "font-medium text-zinc-300" : "text-zinc-500"
                }`}
              >
                {chat.latestPreview}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}

function DirectMessagesEmptyState({
  startingDm,
  startDmError,
  onMessageDj,
  compact = false,
}: {
  startingDm: boolean;
  startDmError: string | null;
  onMessageDj: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-5 text-center">
          <ConversationAvatar label={TARGET_DJ_USER_ID} />
          <h3 className="mt-4 text-base font-semibold text-zinc-100">No messages yet</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Start a conversation with a DJ or promoter.
          </p>
          <MessageDjButton
            disabled={startingDm}
            onClick={onMessageDj}
            className="mt-4 w-full max-w-xs sm:w-auto"
          />
          {startDmError ? <p className="mt-3 text-sm text-red-400">{startDmError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
      <ConversationAvatar label={TARGET_DJ_USER_ID} />
      <h2 className="mt-5 text-lg font-semibold text-zinc-100">No messages yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        Start a conversation with a DJ or promoter. Your chats will appear here.
      </p>
      <MessageDjButton
        disabled={startingDm}
        onClick={onMessageDj}
        className="mt-6 w-full max-w-xs sm:w-auto"
      />
      {startDmError ? <p className="mt-3 text-sm text-red-400">{startDmError}</p> : null}
    </div>
  );
}

export default function DmInboxPage() {
  const router = useRouter();
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
  const [startDmError, setStartDmError] = useState<string | null>(null);
  const [startingDm, setStartingDm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [unreadEventChatIds, setUnreadEventChatIds] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<InboxTab>("dm");

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
    async function loadNotificationCount() {
      try {
        const userId = await getCurrentUserId();
        const profile = await getCurrentUserProfile();
        const counts = await getNavBadgeCounts(userId, profile?.role ?? null);
        setNotificationCount(counts.total);
      } catch (loadError) {
        console.error("Failed to load notification count:", loadError);
      }
    }

    void loadNotificationCount();

    function handleBadgeRefresh() {
      void loadNotificationCount();
    }

    window.addEventListener("ftc-notifications-updated", handleBadgeRefresh);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleBadgeRefresh);
    };
  }, []);

  useEffect(() => {
    loadGroupChats().catch((loadError: Error) => {
      console.error("loadGroupChats failed:", loadError.message);
      setGroupChatsError(loadError.message);
      setGroupChatsLoading(false);
    });
  }, [loadGroupChats]);

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

            setGroupChats((previous) => {
              const result = applyInboxGroupMessage(previous, groupTargetId, {
                id: newMessage.id,
                text: newMessage.text,
                created_at: newMessage.created_at,
                user_id: newMessage.user_id,
                event_id: newMessage.event_id,
              });

              console.log(
                "[Group rendered row ids]",
                result.rows.map((chat) => ({
                  eventId: chat.eventId,
                  latestActivityAt: chat.latestActivityAt,
                })),
              );

              return [...result.rows];
            });

            if (currentUserId && newMessage.user_id !== currentUserId) {
              setUnreadEventChatIds((previous) => {
                const next = new Set(previous);
                next.add(groupTargetId);
                return next;
              });
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
  }, [currentUserId]);

  function openConversation(conversationId: string) {
    router.push(`/dm/${conversationId}`);
  }

  async function handleMessageDj() {
    setStartingDm(true);
    setStartDmError(null);

    try {
      const userId = await getCurrentUserId();
      const conversationId = await startDm(userId, TARGET_DJ_USER_ID);
      router.push(`/dm/${conversationId}`);
    } catch (startError) {
      console.error("startDm failed:", startError);
      setStartDmError(
        startError instanceof Error ? startError.message : "Failed to start DM",
      );
    } finally {
      setStartingDm(false);
    }
  }

  const hasDirectMessages = dmInboxRows.length > 0;
  const renderedGroupChats = sortGroupChatsByLatestActivity(groupChats);
  const dmUnreadCount = unreadConversationIds.size;
  const groupUnreadCount = unreadEventChatIds.size;

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
        className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />
        <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#070708]/95 px-4 py-4 backdrop-blur-md sm:px-6 md:top-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-zinc-50">Messages</h1>
              <p className="mt-0.5 text-xs text-zinc-500">{currentUserId ?? "Signed in"}</p>
            </div>
            <NotificationsBellLink count={notificationCount} />
          </div>

          {activeTab === "dm" && hasDirectMessages ? (
            <div className="mt-4">
              <MessageDjButton
                disabled={startingDm}
                onClick={handleMessageDj}
                className="w-full sm:w-auto"
              />
              {startDmError ? (
                <p className="mt-2 text-sm text-red-400">{startDmError}</p>
              ) : null}
            </div>
          ) : null}

          <div
            className="mt-4 flex border-b border-zinc-800/80"
            role="tablist"
            aria-label="Message categories"
          >
            <InboxTabButton
              active={activeTab === "dm"}
              label="Direct Messages"
              unreadCount={dmUnreadCount}
              onClick={() => setActiveTab("dm")}
            />
            <InboxTabButton
              active={activeTab === "group"}
              label="Group Chats"
              unreadCount={groupUnreadCount}
              onClick={() => setActiveTab("group")}
            />
          </div>
        </header>

        <div className="flex-1">
          {activeTab === "group" ? (
            <section aria-label="Group Chats">
              {groupChatsLoading ? (
                <p className="px-4 py-4 text-sm text-zinc-500 sm:px-6">Loading group chats...</p>
              ) : groupChatsError ? (
                <p className="px-4 py-4 text-sm text-red-400 sm:px-6">{groupChatsError}</p>
              ) : renderedGroupChats.length === 0 ? (
                <GroupChatsEmptyState />
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {renderedGroupChats.map((chat) => (
                    <GroupChatCard
                      key={chat.eventId}
                      chat={chat}
                      isUnread={unreadEventChatIds.has(chat.eventId)}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {activeTab === "dm" ? (
            <section aria-label="Direct Messages">
              {loading ? (
                <p className="px-4 py-4 text-sm text-zinc-500 sm:px-6">Loading conversations...</p>
              ) : error ? (
                <p className="px-4 py-4 text-sm text-red-400 sm:px-6">{error}</p>
              ) : !hasDirectMessages ? (
                <DirectMessagesEmptyState
                  startingDm={startingDm}
                  startDmError={startDmError}
                  onMessageDj={handleMessageDj}
                />
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {dmInboxRows.map((row) => {
                    const otherUserId = otherUsersByConversation.get(row.conversationId);
                    const otherProfile = otherUserId ? userProfiles.get(otherUserId) : undefined;
                    const displayName = getConversationDisplayName(row, otherUserId);
                    const preview = row.latestPreview
                      ? `${row.latestMessageUserId === currentUserId ? "You: " : ""}${row.latestPreview}`
                      : "No messages yet";
                    const timestamp = row.latestActivityAt ?? row.conversationCreatedAt;
                    const isUnread = unreadConversationIds.has(row.conversationId);

                    return (
                      <li key={row.conversationId}>
                        <button
                          type="button"
                          onClick={() => openConversation(row.conversationId)}
                          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-blue-600/10 hover:bg-zinc-900/70 sm:px-6 sm:py-4 ${getUnreadInboxRowClass(isUnread)}`}
                        >
                          <ConversationAvatar
                            label={displayName}
                            avatarUrl={otherProfile?.avatar_url}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p
                                className={`truncate text-[15px] ${
                                  isUnread ? "font-bold text-zinc-50" : "font-semibold text-zinc-100"
                                }`}
                              >
                                {displayName}
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                {isUnread ? <UnreadInboxIndicator /> : null}
                                {timestamp ? (
                                  <time
                                    dateTime={timestamp}
                                    className={`text-xs ${
                                      isUnread ? "font-medium text-blue-300/80" : "text-zinc-500"
                                    }`}
                                  >
                                    {formatInboxTimestamp(timestamp)}
                                  </time>
                                ) : null}
                              </div>
                            </div>
                            <p
                              className={`mt-1 truncate text-sm ${
                                isUnread ? "font-medium text-zinc-300" : "text-zinc-500"
                              }`}
                            >
                              {preview}
                            </p>
                          </div>
                        </button>
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
