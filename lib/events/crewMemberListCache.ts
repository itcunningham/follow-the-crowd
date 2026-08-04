import type { CrewMember, CrewMemberRole } from "@/lib/events/crewChatMembers";

/**
 * Session cache of the Crew sheet roster so returning from a member profile
 * can paint the sheet immediately while crew chat remounts and refetches.
 */
const storageKey = (eventId: string) => `ftc-crew-members-v1:${eventId.trim()}`;

function isCrewMemberRole(value: unknown): value is CrewMemberRole {
  return value === "promoter" || value === "dj";
}

function parseCachedCrewMembers(raw: string): CrewMember[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const members: CrewMember[] = [];

    for (const row of parsed) {
      if (!row || typeof row !== "object") {
        return null;
      }

      const candidate = row as Record<string, unknown>;
      const userId = typeof candidate.userId === "string" ? candidate.userId.trim() : "";
      const displayName =
        typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";
      const avatarUrl =
        candidate.avatarUrl === null
          ? null
          : typeof candidate.avatarUrl === "string"
            ? candidate.avatarUrl
            : null;

      if (!userId || !displayName || !isCrewMemberRole(candidate.role)) {
        return null;
      }

      members.push({
        userId,
        displayName,
        avatarUrl,
        role: candidate.role,
      });
    }

    return members;
  } catch {
    return null;
  }
}

export function readCachedCrewMembers(eventId: string): CrewMember[] | null {
  const trimmed = eventId?.trim();
  if (!trimmed || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey(trimmed));
    if (!raw) {
      return null;
    }
    return parseCachedCrewMembers(raw);
  } catch {
    return null;
  }
}

export function writeCachedCrewMembers(eventId: string, members: readonly CrewMember[]): void {
  const trimmed = eventId?.trim();
  if (!trimmed || typeof window === "undefined" || members.length === 0) {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey(trimmed), JSON.stringify(members));
  } catch {
    // Private mode / quota — skip cache; live fetch still works.
  }
}
