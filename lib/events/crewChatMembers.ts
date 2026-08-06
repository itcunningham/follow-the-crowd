import type { UserAvatarProfile } from "@/lib/user/currentUser";

export type CrewMemberRole = "promoter" | "dj";

export type CrewMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: CrewMemberRole;
};

export const CREW_ROLE_LABEL: Record<CrewMemberRole, string> = {
  promoter: "Planner",
  dj: "DJ",
};

/**
 * Crew member rows for the member-list sheet, ordered planner first then DJs in
 * their existing participant order.
 *
 * Role is derived, not stored: `get_event_crew_participant_ids` (the RPC behind
 * `participantIds`) only ever returns the event owner unioned with recipients of
 * *accepted* bookings, so every non-owner id here is necessarily an accepted DJ —
 * no separate acceptance-status field is needed or shown.
 */
export function buildCrewMemberList(
  participantIds: readonly string[],
  profiles: ReadonlyMap<string, UserAvatarProfile>,
  ownerId: string | null,
): CrewMember[] {
  const toMember = (userId: string): CrewMember => {
    const profile = profiles.get(userId);

    return {
      userId,
      displayName: profile?.display_name?.trim() || "Member",
      avatarUrl: profile?.avatar_url ?? null,
      role: ownerId && userId === ownerId ? "promoter" : "dj",
    };
  };

  const ownerFirst =
    ownerId && participantIds.includes(ownerId)
      ? [ownerId, ...participantIds.filter((id) => id !== ownerId)]
      : [...participantIds];

  return ownerFirst.map(toMember);
}
