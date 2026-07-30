import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfileById } from "@/lib/user/currentUser";
import { resolveUserDisplayName } from "@/lib/user/displayName";

export function buildDmReactionNotificationBody(
  reactorDisplayName: string,
  emoji: string,
): string {
  return `${reactorDisplayName} reacted ${emoji} to your message.`;
}

/**
 * Notify the message author when another participant adds or changes a reaction.
 * Uses the existing `message` notification type and `/dm/{conversationId}` link.
 * Call only after a successful toggle that returned a persisted reaction (not on remove).
 */
export async function notifyDmReactionRecipient({
  messageId,
  emoji,
  conversationId,
  reactorUserId,
  reactionId,
}: {
  messageId: string;
  emoji: string;
  conversationId: string;
  reactorUserId: string;
  reactionId: string;
}): Promise<void> {
  const { data: message, error } = await supabase
    .from("messages")
    .select("user_id, conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!message?.conversation_id || message.conversation_id !== conversationId) {
    return;
  }

  const recipientUserId = message.user_id;

  if (!recipientUserId || recipientUserId === reactorUserId) {
    return;
  }

  const reactorProfile = await getUserProfileById(reactorUserId);
  const reactorDisplayName = reactorProfile
    ? resolveUserDisplayName(reactorProfile)
    : "Someone";

  await createNotification(
    recipientUserId,
    "message",
    "New reaction",
    buildDmReactionNotificationBody(reactorDisplayName, emoji),
    `/dm/${conversationId}`,
    reactionId,
  );
}

/**
 * Remove the notification tied to a single reaction after that reaction is deleted.
 * Keyed by `message_reactions.id`, so it never touches another reactor's notification
 * or any other notification type. Removal itself never creates a notification.
 */
export async function revokeDmReactionNotification(reactionId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_reaction_notification", {
    p_reaction_id: reactionId,
  });

  if (error) {
    throw error;
  }
}
