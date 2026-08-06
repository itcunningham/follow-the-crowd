import { supabase } from "@/lib/supabaseClient";
import { isMessageSeenByReader } from "@/lib/messageReads";
import type { UserAvatarProfile } from "@/lib/user/currentUser";

/**
 * Per-user last-read timestamps for one event's crew chat.
 *
 * `message_reads` already stores one row per (user, event) with a `last_read_at`
 * high-water mark — the same table and shape DM's "Seen" indicator reads from,
 * just generalised from one other participant to every crew member. No schema
 * change: this is a different filter over an existing table.
 */
export async function loadEventChatLastReadByUser(
  eventId: string,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const uniqueUserIds = [...new Set(userIds)];
  const lastReadByUserId = new Map<string, string>();

  if (uniqueUserIds.length === 0) {
    return lastReadByUserId;
  }

  const { data, error } = await supabase
    .from("message_reads")
    .select("user_id, last_read_at")
    .eq("event_id", eventId)
    .in("user_id", uniqueUserIds);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    lastReadByUserId.set(row.user_id as string, row.last_read_at as string);
  }

  return lastReadByUserId;
}

/**
 * "Seen by" label for the single most recent message in the conversation.
 *
 * Shown on the latest message only, regardless of who sent it — unlike DM's
 * per-sender "Seen" (meaningful for a 1:1 thread), a crew chat has several
 * readers, and the one thing everyone benefits from knowing is whether the
 * conversation is caught up. Repeating it under every historical message would
 * be exactly the kind of noise the rest of this pass removes.
 *
 * Two shapes, matching how the information is actually useful: naming the one
 * other reader when there is exactly one (and calling out the promoter
 * specifically, since "seen by the promoter" is the one name every DJ already
 * recognises), or just a count once several people have read it.
 */
export function resolveCrewChatSeenLabel(options: {
  messageCreatedAt: string;
  messageSenderId: string;
  participantIds: readonly string[];
  ownerId: string | null;
  lastReadAtByUserId: ReadonlyMap<string, string>;
  profiles: ReadonlyMap<string, UserAvatarProfile>;
}): string | null {
  // Filter to: (1) exclude sender, (2) only include those who have actually read
  // Double-check that sender is excluded since they should never count as a reader
  const readerIds = options.participantIds.filter((userId) => {
    if (userId === options.messageSenderId) {
      return false;
    }
    return isMessageSeenByReader(options.messageCreatedAt, options.lastReadAtByUserId.get(userId));
  });

  if (readerIds.length === 0) {
    return null;
  }

  if (readerIds.length === 1) {
    const [readerId] = readerIds;

    if (options.ownerId && readerId === options.ownerId) {
      return "Seen by Promoter";
    }

    const displayName = options.profiles.get(readerId)?.display_name?.trim();
    return displayName ? `Seen by ${displayName}` : "Seen by 1 member";
  }

  return `Seen by ${readerIds.length} members`;
}
