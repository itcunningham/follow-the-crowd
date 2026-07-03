"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  formatGroupChatEventDate,
  getGroupChatsLoadErrorMessage,
  listAccessibleGroupChats,
  type GroupChatListItem,
} from "@/lib/groupChats";
import { getNavBadgeCounts } from "@/lib/notifications";
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

function buildLatestMessageMap(messages: Message[]) {
  const latestByConversation = new Map<string, Message>();

  for (const message of messages) {
    if (!latestByConversation.has(message.conversation_id)) {
      latestByConversation.set(message.conversation_id, message);
    }
  }

  return latestByConversation;
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
  conversation: Conversation,
  conversationId: string,
  otherUserId?: string,
) {
  if (conversation.name?.trim()) {
    return conversation.name.trim();
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

function GroupChatCard({ chat }: { chat: GroupChatListItem }) {
  return (
    <li>
      <Link
        href={chat.href}
        className="flex w-full items-center gap-3 px-4 py-3.5 transition active:bg-blue-600/10 hover:bg-zinc-900/70 sm:px-6 sm:py-4"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/10 text-xs font-semibold uppercase tracking-wide text-blue-300">
          GC
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[15px] font-semibold text-zinc-100">{chat.eventName}</p>
            <time
              dateTime={chat.latestMessageAt ?? chat.eventDate}
              className="shrink-0 text-xs text-zinc-500"
            >
              {chat.latestMessageAt
                ? formatInboxTimestamp(chat.latestMessageAt)
                : formatGroupChatEventDate(chat.eventDate)}
            </time>
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
              <p className="min-w-0 truncate text-sm text-zinc-500">{chat.latestPreview}</p>
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [otherUsersByConversation, setOtherUsersByConversation] = useState<Map<string, string>>(
    new Map(),
  );
  const [lastMessages, setLastMessages] = useState<Map<string, Message>>(new Map());
  const [userProfiles, setUserProfiles] = useState<Map<string, UserAvatarProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDmError, setStartDmError] = useState<string | null>(null);
  const [startingDm, setStartingDm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadGroupChats = useCallback(async () => {
    setGroupChatsLoading(true);
    setGroupChatsError(null);

    try {
      const profile = await getCurrentUserProfile();
      const userRole = profile?.role ?? null;
      setGroupChats(await listAccessibleGroupChats(userRole));
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
      setConversations([]);
      setOtherUsersByConversation(new Map());
      setLastMessages(new Map());
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

    setConversations(conversationRows);
    setLoading(false);

    const messagesResponse = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (messagesResponse.error) {
      console.error("messages response error", messagesResponse.error);
    } else {
      setLastMessages(buildLatestMessageMap((messagesResponse.data ?? []) as Message[]));
    }
  }, []);

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
          const newMessage = payload.new as Message & { event_id?: string | null };

          if (newMessage.event_id) {
            setGroupChats((prev) => {
              const index = prev.findIndex((chat) => chat.eventId === newMessage.event_id);

              if (index === -1) {
                return prev;
              }

              const updated = [...prev];
              const chat = updated[index];

              updated[index] = {
                ...chat,
                latestPreview: newMessage.text.trim() || null,
                latestMessageAt: newMessage.created_at,
              };

              return updated;
            });
            return;
          }

          if (!newMessage.conversation_id) {
            return;
          }

          setLastMessages((prev) => {
            const next = new Map(prev);
            next.set(newMessage.conversation_id, newMessage);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const hasDirectMessages = conversations.length > 0;
  const showCompactDmEmpty = !loading && !hasDirectMessages && groupChats.length > 0;

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

          {hasDirectMessages ? (
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
        </header>

        <div className="flex-1">
          <section aria-labelledby="group-chats-heading">
            <div className="border-b border-zinc-800/80 px-4 py-3 sm:px-6">
              <h2 id="group-chats-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Group Chats
              </h2>
            </div>

            {groupChatsLoading ? (
              <p className="px-4 py-4 text-sm text-zinc-500 sm:px-6">Loading group chats...</p>
            ) : groupChatsError ? (
              <p className="px-4 py-4 text-sm text-red-400 sm:px-6">{groupChatsError}</p>
            ) : groupChats.length === 0 ? (
              <p className="px-4 py-4 text-sm text-zinc-500 sm:px-6">No group chats yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {groupChats.map((chat) => (
                  <GroupChatCard key={chat.eventId} chat={chat} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="direct-messages-heading">
            <div className="border-b border-zinc-800/80 px-4 py-3 sm:px-6">
              <h2
                id="direct-messages-heading"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Direct Messages
              </h2>
            </div>

            {loading ? (
              <p className="px-4 py-4 text-sm text-zinc-500 sm:px-6">Loading conversations...</p>
            ) : error ? (
              <p className="px-4 py-4 text-sm text-red-400 sm:px-6">{error}</p>
            ) : !hasDirectMessages ? (
              <DirectMessagesEmptyState
                startingDm={startingDm}
                startDmError={startDmError}
                onMessageDj={handleMessageDj}
                compact={showCompactDmEmpty}
              />
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {conversations.map((conversation, index) => {
                  const id =
                    conversation.id ||
                    conversation.conversation_id ||
                    `conversation-${index}`;
                  const otherUserId = otherUsersByConversation.get(id);
                  const otherProfile = otherUserId ? userProfiles.get(otherUserId) : undefined;
                  const displayName =
                    otherProfile?.display_name?.trim() ||
                    getConversationDisplayName(conversation, id, otherUserId);
                  const lastMessage = lastMessages.get(id);
                  const preview = lastMessage
                    ? `${lastMessage.user_id === currentUserId ? "You: " : ""}${lastMessage.text}`
                    : "No messages yet";
                  const timestamp = lastMessage?.created_at ?? conversation.created_at;

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => openConversation(id)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-blue-600/10 hover:bg-zinc-900/70 sm:px-6 sm:py-4"
                      >
                        <ConversationAvatar
                          label={displayName}
                          avatarUrl={otherProfile?.avatar_url}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[15px] font-semibold text-zinc-100">
                              {displayName}
                            </p>
                            {timestamp ? (
                              <time
                                dateTime={timestamp}
                                className="shrink-0 text-xs text-zinc-500"
                              >
                                {formatInboxTimestamp(timestamp)}
                              </time>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-sm text-zinc-500">{preview}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </OnboardingGuard>
  );
}
