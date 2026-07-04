"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import BookingRequestCard, {
  buildUpdatedBookingMessage,
} from "@/app/components/BookingRequestCard";
import ChatNewMessagesPill from "@/app/components/dm/ChatNewMessagesPill";
import DmChatHeaderMenu from "@/app/components/dm/DmChatHeaderMenu";
import DmComposer from "@/app/components/dm/DmComposer";
import DmTextMessageBubble from "@/app/components/dm/DmTextMessageBubble";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  buildDmCancelledBookingMatchContext,
  cancelBookingRequest,
  CANCELLED_BOOKING_DM_SYSTEM_MESSAGE,
  evaluateDmBookingCardVisibility,
  getBookingMutationErrorMessage,
  getBookingRequestsForConversation,
  isBookingRequestMessage,
  mergeBookingWithMessage,
  updateBookingRequestStatus,
  type BookingRequest,
} from "@/lib/bookingRequests";
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
import { markConversationRead } from "@/lib/messageReads";
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
  const [attachments, setAttachments] = useState<DmMessageAttachment[]>([]);
  const [reactions, setReactions] = useState<DmMessageReaction[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<UserAvatarProfile | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [respondingBookingId, setRespondingBookingId] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<DmBlockStatus>({
    blockedByMe: false,
    blockedMe: false,
    isBlocked: false,
  });
  const [blockActionLoading, setBlockActionLoading] = useState(false);
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

  const conversationTitle = getConversationTitle(otherUserProfile, otherUserId);
  const otherUserLabel = otherUserProfile?.display_name?.trim() || otherUserId || "DM";
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
    if (!conversationId) {
      return;
    }

    if (!conversationId || !currentUserId) {
      return;
    }

    markNotificationsReadForLink(currentUserId, `/dm/${conversationId}`);
    void markConversationRead(conversationId);
  }, [conversationId, currentUserId]);

  async function reloadConversationBookings() {
    if (!conversationId) {
      return;
    }

    try {
      const nextBookings = await getBookingRequestsForConversation(conversationId);
      setBookings(nextBookings);
      console.log("[dm booking] reloaded conversation bookings", {
        conversationId,
        bookingCount: nextBookings.length,
        cancelledBookingIds: nextBookings
          .filter((booking) => booking.status?.toLowerCase() === "cancelled")
          .map((booking) => booking.id),
      });
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

      const [messagesResult, bookingsResult, attachmentsResult, reactionsResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
        getBookingRequestsForConversation(conversationId).catch((bookingError) => {
          console.error("Failed to load booking requests:", bookingError);
          return [] as BookingRequest[];
        }),
        listDmAttachmentsForConversation(conversationId).catch((attachmentError) => {
          console.error("Failed to load message attachments:", attachmentError);
          return [] as DmMessageAttachment[];
        }),
        listDmReactionsForConversation(conversationId).catch((reactionError) => {
          console.error("Failed to load message reactions:", reactionError);
          return [] as DmMessageReaction[];
        }),
      ]);

      if (messagesResult.error) {
        setError(messagesResult.error.message);
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();

      setMessages(
        ((messagesResult.data as Message[]) ?? []).map((message) =>
          tagChatMessageForScroll(message, userId),
        ),
      );
      setBookings(bookingsResult);
      setAttachments(attachmentsResult);
      setReactions(reactionsResult);
      console.log("[dm booking] loaded conversation bookings", {
        conversationId,
        bookingCount: bookingsResult.length,
        cancelledBookingIds: bookingsResult
          .filter((booking) => booking.status?.toLowerCase() === "cancelled")
          .map((booking) => booking.id),
      });
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

          void markConversationRead(conversationId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, captureScrollBeforeIncomingInsert, addHighlightedMessageId]);

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
    void markConversationRead(conversationId);
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

  return (
    <OnboardingGuard>
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#070708] font-sans text-zinc-100">
      <AppNavigation />
      <div
        className={`mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden ${MOBILE_NAV_OFFSET_CLASS}`}
      >
      <header className="z-10 shrink-0 border-b border-zinc-800/80 bg-[#070708]/95 px-3 py-3 backdrop-blur-md sm:px-4">
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
            <p className="truncate text-xs text-zinc-500">Direct Messages</p>
          </div>
          {otherUserId ? (
            <DmChatHeaderMenu
              otherUserName={otherUserLabel}
              blockedByMe={blockStatus.blockedByMe}
              busy={blockActionLoading}
              onBlock={handleBlockUser}
              onUnblock={handleUnblockUser}
            />
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 py-4 sm:px-4"
      >
        <div ref={bottomRef} data-chat-bottom aria-hidden="true" className="h-px shrink-0" />
        {loading ? (
          <p className="text-sm text-zinc-500">Loading messages...</p>
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
            <p className="mt-4 text-sm font-medium text-zinc-300">
              No messages yet
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Say hi to start the conversation.
            </p>
          </div>
        ) : (
          <ul
            data-chat-content-root
            className="flex flex-col-reverse gap-3 pb-2"
          >
            {reversedMessages.map((message) => {
              const isOwnMessage = currentUserId !== null && message.user_id === currentUserId;
              const bookingData = mergeBookingWithMessage(
                null,
                message.text,
                bookings,
                conversationId,
              );
              const isBookingMessage = Boolean(
                bookingData && isBookingRequestMessage(message.text),
              );

              if (isBookingMessage && bookingData) {
                const cardVisibility = evaluateDmBookingCardVisibility(
                  message.text,
                  bookings,
                  conversationId,
                );
                const resolvedBooking =
                  bookings.find((booking) => booking.id === bookingData.id) ?? bookingData;

                console.log("[dm booking] card decision", {
                  messageId: message.id,
                  parsedEventName: cardVisibility.parsedEventName,
                  parsedEventDate: cardVisibility.parsedEventDate,
                  parsedRate: cardVisibility.parsedRate,
                  matchedBookingId: cardVisibility.matchedBookingId,
                  matchedBookingStatus: cardVisibility.matchedBookingStatus,
                  cancelledBookingIds: [...cancelledBookingContext.cancelledBookingIds],
                  cardHidden: cardVisibility.hideCard,
                });

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
                          className={`rounded-full border border-zinc-800/80 bg-zinc-950/50 px-3 py-1.5 text-xs text-zinc-500 ${getChatNewMessageHighlightClass(highlighted)}`}
                        >
                          {CANCELLED_BOOKING_DM_SYSTEM_MESSAGE}
                        </p>
                        <time
                          dateTime={message.created_at}
                          className="mt-1 block text-[10px] text-zinc-600"
                        >
                          {formatMessageTime(message.created_at)}
                        </time>
                      </div>
                    </li>
                  );
                }

                const canRespond =
                  resolvedBooking.status === "pending" &&
                  (resolvedBooking.recipient_id === currentUserId ||
                    (!resolvedBooking.recipient_id && !isOwnMessage));
                const highlighted = isMessageHighlighted(message.id);
                logChatHighlightRender(message.id, highlighted);

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
                            canRespond={canRespond && Boolean(resolvedBooking.id)}
                            responding={respondingBookingId === resolvedBooking.id}
                            cancelling={cancellingBookingId === resolvedBooking.id}
                            onAccept={() =>
                              handleBookingResponse(resolvedBooking, message, "accepted")
                            }
                            onDecline={() =>
                              handleBookingResponse(resolvedBooking, message, "declined")
                            }
                            onCancel={() => handleBookingCancel(resolvedBooking, message)}
                          />
                        </div>
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
                  formatTime={formatMessageTime}
                  isHighlighted={isMessageHighlighted(message.id)}
                />
                );
              })}
          </ul>
        )}
      </div>

      <div className="relative shrink-0">
      {error ? (
        <p className="px-4 pb-2 text-sm text-red-400">{error}</p>
      ) : null}

      {showNewMessagesPill ? (
        <ChatNewMessagesPill
          count={newMessagesPillCount}
          onClick={scrollToBottomSmooth}
        />
      ) : null}

      {blockStatus.isBlocked && blockBannerMessage ? (
        <div className="shrink-0 border-t border-zinc-800/80 bg-[#070708] px-4 py-4 sm:px-6">
          <p className="text-center text-sm text-zinc-400">{blockBannerMessage}</p>
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
