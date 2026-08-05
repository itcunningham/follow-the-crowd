/**
 * DJ Event Details helpers for Your booking / Message CTA.
 */

export function collectEventDetailProfileIds(
  recipientIds: string[],
  ownerId: string | null | undefined,
): string[] {
  const ids = new Set<string>();

  for (const recipientId of recipientIds) {
    const trimmed = recipientId.trim();

    if (trimmed) {
      ids.add(trimmed);
    }
  }

  const trimmedOwnerId = ownerId?.trim();

  if (trimmedOwnerId) {
    ids.add(trimmedOwnerId);
  }

  return Array.from(ids);
}

/** Message CTA for DJ → planner booking conversation. */
export function formatDjBookingMessageLabel(
  plannerDisplayName: string | null | undefined,
): string {
  const name = plannerDisplayName?.trim();

  return name ? `Message ${name}` : "Message";
}
