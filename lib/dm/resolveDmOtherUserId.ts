import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";

/**
 * Other participant in a 1:1 DM. Used for header profile, blocks, and
 * createNotification after send — must not depend on fragile member-count gates.
 */
export async function resolveDmOtherUserId(
  conversationId: string,
  currentUserId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  if (error) {
    console.error("conversation_members query failed:", error.message);
    return null;
  }

  const otherMember = (data ?? []).find((member) => member.user_id !== currentUserId);
  return otherMember?.user_id ?? null;
}

/**
 * After a successful DM insert: resolve the peer if needed, then notify.
 * Soft-fail — the message already exists. Never skip solely because React
 * state has not caught up with conversation_members yet.
 */
export async function notifyDmPeerOfMessage(options: {
  conversationId: string;
  senderUserId: string;
  otherUserId: string | null;
  body: string;
}): Promise<string | null> {
  const { conversationId, senderUserId, body } = options;
  let recipientId = options.otherUserId;

  if (!recipientId || recipientId === senderUserId) {
    recipientId = await resolveDmOtherUserId(conversationId, senderUserId);
  }

  if (!recipientId || recipientId === senderUserId) {
    console.error("[dm] Message sent but could not resolve recipient for notification", {
      conversationId,
      senderUserId,
      otherUserId: options.otherUserId,
    });
    return null;
  }

  try {
    await createNotification(
      recipientId,
      "message",
      "New message",
      body,
      `/dm/${conversationId}`,
    );
  } catch (notificationError) {
    console.error("[dm] Message sent but notification failed:", notificationError);
  }

  return recipientId;
}
