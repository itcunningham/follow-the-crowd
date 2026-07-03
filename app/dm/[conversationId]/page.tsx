"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import BookingRequestCard, {
  buildUpdatedBookingMessage,
} from "@/app/components/BookingRequestCard";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  getBookingRequestsForConversation,
  isBookingRequestMessage,
  mergeBookingWithMessage,
  resolveBookingForMessage,
  updateBookingRequestStatus,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { createNotification, markNotificationsReadForLink } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentUserId,
  getUserAvatarProfilesByIds,
  type UserAvatarProfile,
} from "@/lib/user/currentUser";

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getConversationTitle(otherUserProfile: UserAvatarProfile | null, otherUserId: string | null) {
  if (otherUserProfile?.display_name?.trim()) {
    return otherUserProfile.display_name.trim();
  }

  if (otherUserId) {
    return `Chat with ${otherUserId}`;
  }

  return "Direct message";
}

export default function DmChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<UserAvatarProfile | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [respondingBookingId, setRespondingBookingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const conversationTitle = getConversationTitle(otherUserProfile, otherUserId);
  const otherUserLabel = otherUserProfile?.display_name?.trim() || otherUserId || "DM";

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
    if (!conversationId) {
      return;
    }

    if (!conversationId || !currentUserId) {
      return;
    }

    markNotificationsReadForLink(currentUserId, `/dm/${conversationId}`);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    async function loadConversationData() {
      setLoading(true);
      setError(null);

      const [messagesResult, bookingsResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
        getBookingRequestsForConversation(conversationId).catch((bookingError) => {
          console.error("Failed to load booking requests:", bookingError);
          return [] as BookingRequest[];
        }),
      ]);

      if (messagesResult.error) {
        setError(messagesResult.error.message);
        setLoading(false);
        return;
      }

      setMessages((messagesResult.data as Message[]) ?? []);
      setBookings(bookingsResult);
      setLoading(false);
    }

    loadConversationData();
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

          setMessages((prev) => {
            if (prev.some((message) => message.id === newMessage.id)) {
              return prev;
            }

            return [...prev, newMessage];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || !conversationId || sending) {
      return;
    }

    setSending(true);
    setError(null);

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
      await createNotification(
        otherUserId,
        "message",
        "New message",
        text,
        `/dm/${conversationId}`,
      );
    }

    setInput("");
    setSending(false);
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <OnboardingGuard>
    <div
      className={`mx-auto flex h-[100dvh] w-full max-w-2xl flex-col bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="sticky top-0 z-10 shrink-0 border-b border-zinc-800/80 bg-[#070708]/95 px-3 py-3 backdrop-blur-md sm:px-4 md:top-12">
        <div className="flex items-center gap-3">
          <Link
            href="/dm"
            aria-label="Back to inbox"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-lg text-zinc-300 transition hover:border-blue-500/40 hover:text-blue-300"
          >
            ←
          </Link>
          <ProfileAvatar
            name={otherUserLabel}
            avatarUrl={otherUserProfile?.avatar_url}
            size="md"
            className="h-10 w-10 text-xs"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-zinc-50">
              {conversationTitle}
            </h1>
            <p className="truncate text-xs text-zinc-500">Direct message</p>
          </div>
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center px-6 text-center">
            <ProfileAvatar
              name={otherUserLabel}
              avatarUrl={otherUserProfile?.avatar_url}
              size="md"
              className="h-10 w-10 text-xs"
            />
            <p className="mt-4 text-sm font-medium text-zinc-300">
              No messages yet
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Say hi to start the conversation.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 pb-2">
            {messages.map((message) => {
              const isOwnMessage = currentUserId !== null && message.user_id === currentUserId;
              const bookingData = mergeBookingWithMessage(
                resolveBookingForMessage(message.text, bookings),
                message.text,
              );
              const isBookingMessage = Boolean(
                bookingData && isBookingRequestMessage(message.text),
              );

              if (isBookingMessage && bookingData) {
                const resolvedBooking =
                  bookings.find((booking) => booking.id === bookingData.id) ?? bookingData;
                const canRespond =
                  resolvedBooking.status === "pending" &&
                  (resolvedBooking.recipient_id === currentUserId ||
                    (!resolvedBooking.recipient_id && !isOwnMessage));

                return (
                  <li
                    key={message.id}
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
                        <BookingRequestCard
                          booking={resolvedBooking}
                          canRespond={canRespond && Boolean(resolvedBooking.id)}
                          responding={respondingBookingId === resolvedBooking.id}
                          onAccept={() =>
                            handleBookingResponse(resolvedBooking, message, "accepted")
                          }
                          onDecline={() =>
                            handleBookingResponse(resolvedBooking, message, "declined")
                          }
                        />
                        <time
                          dateTime={message.created_at}
                          className={`mt-1 block text-[10px] text-zinc-500 ${
                            isOwnMessage ? "text-right" : "text-left"
                          }`}
                        >
                          {formatMessageTime(message.created_at)}
                        </time>
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[85%] items-end gap-2 sm:max-w-[75%] ${
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
                    <div
                      className={`rounded-3xl px-4 py-2.5 ${
                        isOwnMessage
                          ? "rounded-br-md border border-blue-500/40 bg-blue-600/20 text-blue-50 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                          : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-100"
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed">{message.text}</p>
                      <time
                        dateTime={message.created_at}
                        className="mt-1 block text-[10px] text-zinc-500"
                      >
                        {formatMessageTime(message.created_at)}
                      </time>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <p className="px-4 pb-2 text-sm text-red-400">{error}</p>
      ) : null}

      <div className="sticky bottom-0 border-t border-zinc-800/80 bg-[#070708] px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-end gap-2 sm:gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="min-h-[44px] flex-1 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="min-h-[44px] shrink-0 rounded-full border border-blue-500/45 bg-blue-600/20 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
    </OnboardingGuard>
  );
}
