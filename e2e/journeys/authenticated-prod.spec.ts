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
  openDmConversationDetails,
  openFirstDmInboxThread,
  openFirstDmInboxThreadFromCurrentPage,
} from "../helpers/dm-navigation";
import { journeyState } from "../helpers/journey-state";

test.describe("Booking journeys", () => {
  test.describe.configure({ mode: "serial" });

  test("creates a complete QA-BETA-FIXED event", async ({ roles }) => {
    const collectors = attachEvidenceCollectors(roles.planner);
    try {
      const created = await createEventFromScratch(roles.planner, "QA-BETA-FIXED-");
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
    }

    await openFirstDmInboxThread(roles.dj, /Fixed|500/i);
    journeyState.plannerDjConversationHref = roles.dj.url();

    if (journeyState.fixedEventName) {
      await clickAcceptOnBookingCard(bookingCardForEvent(roles.dj, journeyState.fixedEventName));
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
    const created = await createEventFromScratch(roles.planner, "QA-BETA-OPEN-");
    expect(created.id).toBeTruthy();
    journeyState.openEventId = created.id;
    journeyState.openEventName = created.name;

    await roles.planner.goto(`/events/${journeyState.openEventId}`, { waitUntil: "domcontentloaded" });
    await inviteDjWithOpenOffer(roles.planner);

    await openFirstDmInboxThread(roles.dj, /Ask for rate|QA-BETA-OPEN/i);
    await clickProposeRateOnBookingCard(bookingCardForEvent(roles.dj, "QA-BETA-OPEN"));
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

    await roles.dj.goto("/bookings", { waitUntil: "domcontentloaded" });
    if (journeyState.openEventName) {
      await expect(roles.dj.locator("body")).toContainText(journeyState.openEventName);
    }
  });
});

test.describe("DM, realtime and isolation", () => {
  test("covers DM send/receive and block isolation", async ({ roles }) => {
    test.skip(
      !journeyState.plannerDjConversationHref,
      "Blocked: no planner/DJ conversation from fixed-offer journey",
    );

    const marker = `QA-BETA-DM-${Date.now()}`;
    await roles.planner.goto("/dm", { waitUntil: "domcontentloaded" });
    await openFirstDmInboxThreadFromCurrentPage(roles.planner, /FTC QA DJ/i);
    await roles.planner.locator("textarea").last().fill(marker);
    await roles.planner.getByRole("button", { name: /^Send$/i }).click();
    await expect(roles.planner.locator("body")).toContainText(marker);

    await roles.dj.goto("/dm", { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).toContainText("QA-BETA-DM");

    await roles.dj.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
    await openDmConversationDetails(roles.dj, SYNTHETIC_DISPLAY_NAMES.planner);
    await blockUserInDmDetails(roles.dj);

    await roles.planner.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
    await roles.planner.locator("textarea").last().fill(`QA-BETA-BLOCK-${Date.now()}`);
    const send = roles.planner.getByRole("button", { name: /^Send$/i });
    if (await send.isEnabled().catch(() => false)) {
      await send.click();
    }
    await expect(roles.planner.locator("body")).toContainText(/block|cannot|unable|not send/i);

    await roles.both.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
    const denied =
      /denied|access|not found|couldn't|Start group chat/i.test(
        await roles.both.locator("body").innerText(),
      ) || roles.both.url().includes("/login");
    expect(denied).toBeTruthy();
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
    const bothText = await roles.both.locator("body").innerText();
    expect(/do not have access|not available|Start group chat/i.test(bothText)).toBeTruthy();
  });
});

test.describe("Targeted navigation", () => {
  test("covers targeted navigation return paths", async ({ roles }) => {
    test.skip(!journeyState.fixedEventId, "Blocked: fixed event was not created");

    await roles.planner.goto("/events", { waitUntil: "domcontentloaded" });
    await roles.planner.goto(`/events/${journeyState.fixedEventId}`, { waitUntil: "domcontentloaded" });
    await roles.planner.goBack();
    await expect(roles.planner).toHaveURL(/\/events/);

    await roles.dj.goto("/bookings", { waitUntil: "domcontentloaded" });
    const openDm = roles.dj.getByRole("link", { name: "Open DM" }).first();
    await expect(openDm).toBeVisible();
    await openDm.click();
    const dmUrl = roles.dj.url();
    await roles.dj.goBack();
    await expect(roles.dj).toHaveURL(/\/bookings/);
    expect(dmUrl).toContain("/dm/");
  });
});
