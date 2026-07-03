import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export async function startDm(
  currentUserId: string,
  targetUserId: string,
): Promise<string> {
  const authenticatedUserId = await getCurrentUserId();

  if (currentUserId !== authenticatedUserId) {
    throw new Error("Cannot start a DM for another user");
  }

  const { data, error } = await supabase.rpc("start_dm", {
    p_target_user_id: targetUserId,
  });

  if (error) {
    console.error("startDm RPC error:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to start DM");
  }

  return data as string;
}
