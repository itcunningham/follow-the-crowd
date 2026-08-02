"use client";

/**
 * Reserved location for future event announcements ("Run Sheet Updated",
 * "Venue Changed", "Event Cancelled", "Important Crew Notice") — sitting
 * directly beneath the event card, above the message scroller.
 *
 * Deliberately renders nothing today: no announcement messaging exists yet
 * (that's separate work, needing somewhere to persist that a message *is* an
 * announcement — there's no `kind`/`type` column on `messages` today, and
 * adding one is a schema change outside a UX-only pass). This component is the
 * structural placeholder instead of a visual one — a real, positioned slot in
 * the render tree, not a placeholder box or dead space, so wiring in real
 * announcements later is a matter of returning JSX here, not restructuring the
 * chat header/card/scroller layout around it.
 */
export default function CrewChatAnnouncementBand() {
  return null;
}
