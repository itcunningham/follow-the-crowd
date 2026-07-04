import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export type DmBlockStatus = {
  blockedByMe: boolean;
  blockedMe: boolean;
  isBlocked: boolean;
};

const EMPTY_BLOCK_STATUS: DmBlockStatus = {
  blockedByMe: false,
  blockedMe: false,
  isBlocked: false,
};

export function getDmBlockBannerMessage(
  status: DmBlockStatus,
  otherUserName: string,
): string | null {
  if (status.blockedByMe) {
    return `You blocked ${otherUserName}`;
  }

  if (status.blockedMe) {
    return "You can no longer send messages in this conversation.";
  }

  return null;
}

export function getDmBlockSendErrorMessage(status: DmBlockStatus): string | null {
  if (status.blockedByMe) {
    return "Unblock this user to send messages.";
  }

  if (status.blockedMe) {
    return "You can no longer send messages in this conversation.";
  }

  return null;
}

export async function getDmBlockStatus(otherUserId: string | null): Promise<DmBlockStatus> {
  if (!otherUserId) {
    return EMPTY_BLOCK_STATUS;
  }

  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`,
    );

  if (error) {
    throw error;
  }

  const blockedByMe = (data ?? []).some(
    (row) => row.blocker_id === userId && row.blocked_id === otherUserId,
  );
  const blockedMe = (data ?? []).some(
    (row) => row.blocker_id === otherUserId && row.blocked_id === userId,
  );

  return {
    blockedByMe,
    blockedMe,
    isBlocked: blockedByMe || blockedMe,
  };
}

export async function blockDmUser(blockedUserId: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase.from("user_blocks").insert({
    blocker_id: userId,
    blocked_id: blockedUserId,
  });

  if (error) {
    throw error;
  }
}

export async function unblockDmUser(blockedUserId: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", blockedUserId);

  if (error) {
    throw error;
  }
}
