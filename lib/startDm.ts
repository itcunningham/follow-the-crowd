import { supabase } from "@/lib/supabaseClient";

type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
};

function findSharedConversationId(
  members: ConversationMemberRow[],
  currentUserId: string,
  targetUserId: string,
) {
  const membersByConversation = new Map<string, Set<string>>();

  for (const member of members) {
    const userIds = membersByConversation.get(member.conversation_id) ?? new Set<string>();
    userIds.add(member.user_id);
    membersByConversation.set(member.conversation_id, userIds);
  }

  for (const [conversationId, userIds] of membersByConversation) {
    if (userIds.has(currentUserId) && userIds.has(targetUserId)) {
      return conversationId;
    }
  }

  return null;
}

export async function startDm(
  currentUserId: string,
  targetUserId: string,
): Promise<string> {
  const { data: members, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("user_id", [currentUserId, targetUserId]);

  if (membersError) {
    console.error(
      "startDm existing conversation query error (conversation_members):",
      membersError,
    );
    throw membersError;
  }

  const existingConversationId = findSharedConversationId(
    (members ?? []) as ConversationMemberRow[],
    currentUserId,
    targetUserId,
  );

  if (existingConversationId) {
    return existingConversationId;
  }

  const { data: newConversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (conversationError) {
    console.error("startDm conversations insert error:", conversationError);
    throw conversationError;
  }

  if (!newConversation?.id) {
    throw new Error("Failed to create conversation");
  }

  const { error: insertMembersError } = await supabase.from("conversation_members").insert([
    { conversation_id: newConversation.id, user_id: currentUserId },
    { conversation_id: newConversation.id, user_id: targetUserId },
  ]);

  if (insertMembersError) {
    console.error("startDm conversation_members insert error:", insertMembersError);
    throw insertMembersError;
  }

  return newConversation.id;
}
