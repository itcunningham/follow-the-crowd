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
  openGigDmForEvent,
  sendDmMessage,
  unblockUserIfNeeded,
} from "../helpers/dm-navigation";
import { journeyState } from "../helpers/journey-state";

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

    await unblockUserIfNeeded(roles.dj, SYNTHETIC_DISPLAY_NAMES.planner);

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
    test.skip(
      !journeyState.plannerDjConversationHref,
      "Blocked: no planner/DJ conversation from fixed-offer journey",
    );

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
    await openDmConversationDetails(roles.dj, SYNTHETIC_DISPLAY_NAMES.both);
    await blockUserInDmDetails(roles.dj);

    await roles.both.goto("/dm", { waitUntil: "domcontentloaded" });
    await openFirstDmInboxThread(roles.both, /FTC QA DJ/i);
    const composer = roles.both.getByPlaceholder("Message...");
    await composer.fill(`QA-BETA-BLOCK-${Date.now()}`);
    const send = roles.both.getByRole("button", { name: "Send message" });
    if (await send.isEnabled().catch(() => false)) {
      await send.click();
    }
    await expect(roles.both.locator("body")).toContainText(
      /no longer send|block|cannot|unable|not send|row-level security/i,
    );

    await roles.both.goto(journeyState.plannerDjConversationHref!, { waitUntil: "domcontentloaded" });
    const denied =
      /denied|access|not found|couldn't|Start group chat/i.test(
        await roles.both.locator("body").innerText(),
      ) || roles.both.url().includes("/login");
    expect(denied).toBeTruthy();

    await unblockUserIfNeeded(roles.dj, SYNTHETIC_DISPLAY_NAMES.both);
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
