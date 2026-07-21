import type { EventWithLineupStats } from "@/lib/events";

/** TEMP: Remove after Active status-pill single-row visual QA. */
export const FTC_DEV_EVENT_PILL_ROW_TEST_CARD_ID = "__ftc-dev-event-pill-row-test-card__";

/**
 * Dev-only mock for Events → Active pill layout QA (10×4 counts).
 * Enabled when `NODE_ENV === "development"` or `NEXT_PUBLIC_FTC_EVENT_PILL_ROW_TEST=true`.
 */
export function isActiveEventPillRowTestCardEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return process.env.NEXT_PUBLIC_FTC_EVENT_PILL_ROW_TEST === "true";
}

export function isDevEventPillRowTestCardId(eventId: string): boolean {
  return eventId === FTC_DEV_EVENT_PILL_ROW_TEST_CARD_ID;
}

export function createDevEventPillRowTestCard(ownerId: string): EventWithLineupStats {
  return {
    id: FTC_DEV_EVENT_PILL_ROW_TEST_CARD_ID,
    created_at: "1970-01-01T00:00:00.000Z",
    owner_id: ownerId,
    booking_plan_id: null,
    name: "[DEV QA] Status pill row test",
    venue: "Visual test venue",
    event_date: "2030-06-15",
    set_time: "22:00 - 23:00",
    rate: "",
    notes: "",
    status: "upcoming",
    cover_image_url: null,
    fallback_colour: null,
    crew_chat_started_at: null,
    history_hidden_at: null,
    lineupStats: {
      total: 10,
      pending: 10,
      accepted: 10,
      declined: 10,
    },
  };
}
