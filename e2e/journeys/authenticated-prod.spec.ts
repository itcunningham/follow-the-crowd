import { test, expect } from "../fixtures/multi-role.fixture";
import {
  attachEvidenceCollectors,
  captureFailureEvidence,
} from "../helpers/evidence";
import {
  assertEventBookingsSection,
  createEventFromScratch,
  inviteDjWithFixedOffer,
  inviteDjWithOpenOffer,
  SYNTHETIC_DISPLAY_NAMES,
} from "../helpers/event-form";
import {
  bookingCardForEvent,
  clickAcceptOnBookingCard,
  clickProposeRateOnBookingCard,
  submitRateProposal,
} from "../helpers/dm-booking-card";
import {
  blockUserInDmDetails,
  openFirstDmInboxThread,
  openGigDmForEvent,
  sendDmMessage,
} from "../helpers/dm-navigation";
import {
  ensureActorUnblockedOther,
  normalizeSyntheticBlockRelationships,
  verifyPlannerDjBookingReady,
} from "../helpers/qa-relationship-state";
import { journeyState } from "../helpers/journey-state";
import {
  expectEventsListTabSelected,
  expectEventsListTabsAligned,
} from "../helpers/events-list-tabs";

test.describe("QA account state", () => {
  test("normalizes synthetic block relationships before booking journeys", async ({ roles }) => {
    test.setTimeout(300_000);
    await normalizeSyntheticBlockRelationships(roles);
    await verifyPlannerDjBookingReady(roles);
  });
});

test.describe("Booking journeys", () => {
  test.describe.configure({ mode: "serial" });

  test("creates a complete QA-BETA-FIXED event", async ({ roles }) => {
    const collectors = attachEvidenceCollectors(roles.planner);
    try {
      const created = await createEventFromScratch(roles.planner, "QA-BETA-FIXED-", {
        daysAhead: 35 + (Date.now() % 20),
      });
      expect(created.id, "Event should receive a real ID after save").toBeTruthy();
      journeyState.fixedEventId = created.id;
      journeyState.fixedEventName = created.name;
    } catch (error) {
      const evidence = await captureFailureEvidence(roles.planner, "event-create", collectors);
      throw new Error(`${String(error)}\nEvidence: ${JSON.stringify(evidence)}`);
    }
  });

  test("completes fixed-offer booking journey", async ({ roles }) => {
    test.skip(!journeyState.fixedEventId, "Blocked: fixed event was not created");

    await roles.planner.goto(`/events/${journeyState.fixedEventId}`, {
      waitUntil: "domcontentloaded",
    });
    await inviteDjWithFixedOffer(roles.planner, "500");

    await roles.dj.goto("/bookings", { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).toContainText(/Incoming|Pending/i);
    if (journeyState.fixedEventName) {
      await expect(roles.dj.locator("body")).toContainText(journeyState.fixedEventName);
      await openGigDmForEvent(roles.dj, journeyState.fixedEventName);
      journeyState.plannerDjConversationHref = roles.dj.url().split("?")[0];

      await clickAcceptOnBookingCard(
        roles.dj,
        bookingCardForEvent(roles.dj, journeyState.fixedEventName),
        journeyState.fixedEventName,
      );
    }

    await assertEventBookingsSection(
      roles.planner,
      journeyState.fixedEventId!,
      /Accepted: 1|Accepted · 1/i,
    );
    await expect(roles.planner.locator("body")).toContainText(SYNTHETIC_DISPLAY_NAMES.dj);
    journeyState.fixedOfferAccepted = true;
  });

  test("completes open-offer booking journey", async ({ roles }) => {
    const created = await createEventFromScratch(roles.planner, "QA-BETA-OPEN-", {
      daysAhead: 60 + (Date.now() % 20),
    });
    expect(created.id).toBeTruthy();
    journeyState.openEventId = created.id;
    journeyState.openEventName = created.name;

    await roles.planner.goto(`/events/${journeyState.openEventId}`, { waitUntil: "domcontentloaded" });
    await inviteDjWithOpenOffer(roles.planner);

    if (journeyState.openEventName) {
      await openGigDmForEvent(roles.dj, journeyState.openEventName);
      await clickProposeRateOnBookingCard(
        bookingCardForEvent(roles.dj, journeyState.openEventName),
        journeyState.openEventName,
      );
    }
    await submitRateProposal(roles.dj, "650");

    await assertEventBookingsSection(
      roles.planner,
      journeyState.openEventId!,
      /\$650|650|Rate proposed|proposed/i,
    );

    const acceptProposal = roles.planner.getByRole("button", { name: "Accept proposed rate" });
    await expect(acceptProposal).toBeVisible();
    await acceptProposal.click();
    await expect(acceptProposal).toBeHidden({ timeout: 10_000 });

    await assertEventBookingsSection(
      roles.planner,
      journeyState.openEventId!,
      /Accepted: 1|Accepted · 1/i,
    );

    await roles.dj.goto("/bookings?tab=accepted", { waitUntil: "domcontentloaded" });
    if (journeyState.openEventName && journeyState.openEventId) {
      const gigCard = roles.dj.locator("li").filter({ hasText: journeyState.openEventName }).first();
      await expect(gigCard).toBeVisible();
      await expect(gigCard).toContainText(/Accepted/i);

      await roles.dj.goto(`/events/${journeyState.openEventId}`, { waitUntil: "domcontentloaded" });
      await expect(roles.dj.locator("body")).toContainText(/650|\$650/i);
    }
  });
});

test.describe("DM, realtime and isolation", () => {
  test("covers DM send/receive and block isolation", async ({ roles }) => {
    test.setTimeout(180_000);
    test.skip(
      !journeyState.plannerDjConversationHref,
      "Blocked: no planner/DJ conversation from fixed-offer journey",
    );

    await ensureActorUnblockedOther(roles.dj, "DJ", SYNTHETIC_DISPLAY_NAMES.both, {
      allowMissingThread: true,
    });

    let cleanupError: string | null = null;

    try {
      const marker = `QA-BETA-DM-${Date.now()}`;
      await roles.planner.goto(journeyState.plannerDjConversationHref!, {
        waitUntil: "domcontentloaded",
      });
      await sendDmMessage(roles.planner, marker);

      await roles.dj.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
      await expect(async () => {
        await expect(roles.dj.getByText(marker, { exact: true })).toBeVisible();
      }).toPass({ timeout: 30_000 });

      await roles.dj.goto("/dm", { waitUntil: "domcontentloaded" });
      await openFirstDmInboxThread(roles.dj, /FTC QA Both/i);
      await blockUserInDmDetails(roles.dj, SYNTHETIC_DISPLAY_NAMES.both);

      await roles.both.goto("/dm", { waitUntil: "domcontentloaded" });
      await openFirstDmInboxThread(roles.both, /FTC QA DJ/i);
      await expect(roles.both.locator("body")).toContainText(
        /no longer send|block|cannot|unable|not send|row-level security/i,
        { timeout: 20_000 },
      );

      const isolationMarker = `QA-BETA-ISOLATION-${Date.now()}`;
      await roles.planner.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
      await sendDmMessage(roles.planner, isolationMarker);
      await roles.dj.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
      await expect(roles.dj.getByText(isolationMarker, { exact: true })).toBeVisible({ timeout: 30_000 });
    } finally {
      try {
        await ensureActorUnblockedOther(roles.dj, "DJ", SYNTHETIC_DISPLAY_NAMES.both, {
          allowMissingThread: true,
        });
      } catch (error) {
        cleanupError = String(error);
      }
    }

    if (cleanupError) {
      throw new Error(`Block cleanup failed for DJ→Both: ${cleanupError}`);
    }
  });
});

test.describe("Crew chat authorization", () => {
  test("covers crew-chat authorization", async ({ roles }) => {
    test.skip(!journeyState.fixedEventId, "Blocked: fixed event was not created");
    test.skip(!journeyState.fixedOfferAccepted, "Blocked: fixed offer was not accepted");

    await roles.planner.goto(`/events/${journeyState.fixedEventId}/chat`, {
      waitUntil: "domcontentloaded",
    });
    await expect(roles.planner.locator("body")).not.toContainText(/do not have access/i);

    await roles.dj.goto(`/events/${journeyState.fixedEventId}/chat`, { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).not.toContainText(/do not have access/i);

    await roles.both.goto(`/events/${journeyState.fixedEventId}/chat`, { waitUntil: "domcontentloaded" });
    await expect(roles.both.locator("body")).toContainText(
      /do not have access|not available|Start group chat/i,
    );
  });
});

test.describe("Targeted navigation", () => {
  test("covers targeted navigation return paths", async ({ roles }) => {
    test.setTimeout(180_000);
    test.skip(!journeyState.fixedEventId, "Blocked: fixed event was not created");

    await roles.planner.goto("/events", { waitUntil: "domcontentloaded" });
    await expectEventsListTabsAligned(roles.planner);
    await expectEventsListTabSelected(roles.planner, "active");
    await roles.planner.goto(`/events/${journeyState.fixedEventId}`, { waitUntil: "domcontentloaded" });
    await roles.planner.getByRole("button", { name: "Back to events" }).click();
    await expect(roles.planner).toHaveURL(/\/events(?:\?|$)/);
    await expect(roles.planner).not.toHaveURL(/tab=history/);
    await expectEventsListTabsAligned(roles.planner);
    await expectEventsListTabSelected(roles.planner, "active");

    await roles.planner.getByRole("link", { name: "History", exact: true }).click();
    await expect(roles.planner).toHaveURL(/tab=history/);
    await expectEventsListTabsAligned(roles.planner);
    await expectEventsListTabSelected(roles.planner, "history");

    const historyEventLink = roles.planner.locator('a[href*="fromTab=history"]').first();
    if (await historyEventLink.isVisible().catch(() => false)) {
      await historyEventLink.click();
      await expect(roles.planner).toHaveURL(/fromTab=history/);
      await roles.planner.getByRole("button", { name: "Back to events" }).click();
      await expect(roles.planner).toHaveURL(/tab=history/);
      await expectEventsListTabsAligned(roles.planner);
      await expectEventsListTabSelected(roles.planner, "history");
    }

    await roles.dj.goto("/bookings", { waitUntil: "domcontentloaded" });
    const openDm = roles.dj.getByRole("link", { name: "Open DM" }).first();
    await expect(openDm).toBeVisible();
    await openDm.click();
    await expect(roles.dj).toHaveURL(/\/dm\//);
    const dmUrl = roles.dj.url();
    await roles.dj.getByRole("link", { name: /Back to/i }).click();
    await expect(roles.dj).toHaveURL(/\/bookings/);
    expect(dmUrl).toContain("/dm/");

    await roles.planner.goto(`/events/${journeyState.fixedEventId}`, { waitUntil: "domcontentloaded" });
    const crewChat = roles.planner.getByRole("link", { name: "Group chat" });
    if (await crewChat.isVisible().catch(() => false)) {
      await crewChat.click();
      await expect(roles.planner).toHaveURL(new RegExp(`/events/${journeyState.fixedEventId}/chat`));
      await roles.planner.getByRole("button", { name: "Back to event" }).click();
      await expect(roles.planner).toHaveURL(new RegExp(`/events/${journeyState.fixedEventId}`));
    }
  });
});
