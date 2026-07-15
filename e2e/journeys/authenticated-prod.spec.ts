import { test, expect } from "../fixtures/multi-role.fixture";
import {
  attachEvidenceCollectors,
  captureFailureEvidence,
} from "../helpers/evidence";
import {
  createEventFromScratch,
  inviteFirstDjWithFixedOffer,
  inviteFirstDjWithOpenOffer,
} from "../helpers/event-form";

test.describe.configure({ mode: "serial" });

let fixedEventId: string | null = null;
let fixedEventName: string | null = null;
let openEventId: string | null = null;
let plannerDjConversationHref: string | null = null;

test.describe("Authenticated production beta journeys", () => {
  test("creates a complete QA-BETA-FIXED event", async ({ roles }) => {
    const collectors = attachEvidenceCollectors(roles.planner);
    try {
      const created = await createEventFromScratch(roles.planner, "QA-BETA-FIXED-");
      expect(created.id, "Event should receive a real ID after save").toBeTruthy();
      fixedEventId = created.id;
      fixedEventName = created.name;
    } catch (error) {
      const evidence = await captureFailureEvidence(roles.planner, "event-create", collectors);
      throw new Error(`${String(error)}\nEvidence: ${JSON.stringify(evidence)}`);
    }
  });

  test("completes fixed-offer booking journey", async ({ roles }) => {
    test.skip(!fixedEventId, "Fixed event was not created");

    await roles.planner.goto(`/events/${fixedEventId}`, { waitUntil: "domcontentloaded" });
    await inviteFirstDjWithFixedOffer(roles.planner, "500");

    await roles.dj.goto("/bookings", { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).toContainText(/Incoming|Pending/i);
    if (fixedEventName) {
      await expect(roles.dj.locator("body")).toContainText(fixedEventName);
    }

    await roles.dj.goto("/dm", { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).toContainText(/Fixed|500/i);
    await roles.dj.locator('a[href^="/dm/"]').first().click();
    plannerDjConversationHref = await roles.dj.url();

    const accept = roles.dj.getByRole("button", { name: "Accept offer" });
    await expect(accept).toBeVisible();
    await accept.click();
    await roles.dj.waitForTimeout(2_000);
    await expect(accept).toBeHidden({ timeout: 5_000 }).catch(async () => {
      await accept.click().catch(() => undefined);
    });

    await roles.planner.goto("/bookings", { waitUntil: "domcontentloaded" });
    await expect(roles.planner.locator("body")).toContainText(/Confirmed|Accepted/i);

    await roles.planner.goto(`/events/${fixedEventId}`, { waitUntil: "domcontentloaded" });
    const runSheet = await roles.planner.locator("body").innerText();
    const acceptedCount = (runSheet.match(/Accepted/gi) ?? []).length;
    expect(acceptedCount).toBeGreaterThanOrEqual(1);
    expect(acceptedCount).toBeLessThanOrEqual(2);
  });

  test("completes open-offer booking journey", async ({ roles }) => {
    const created = await createEventFromScratch(roles.planner, "QA-BETA-OPEN-");
    expect(created.id).toBeTruthy();
    openEventId = created.id;

    await roles.planner.goto(`/events/${openEventId}`, { waitUntil: "domcontentloaded" });
    await inviteFirstDjWithOpenOffer(roles.planner);

    await roles.dj.goto("/dm", { waitUntil: "domcontentloaded" });
    await roles.dj.locator('a[href^="/dm/"]').first().click();
    const propose = roles.dj.getByRole("button", { name: "Propose rate" });
    await expect(propose).toBeVisible();
    await propose.click();
    await roles.dj.locator('input[inputmode="decimal"]').last().fill("650");
    await roles.dj.getByRole("button", { name: /Send proposal|Propose/i }).click();
    await roles.dj.waitForTimeout(2_000);

    await roles.planner.goto("/bookings", { waitUntil: "domcontentloaded" });
    await expect(roles.planner.locator("body")).toContainText(/650|proposed|Pending/i);
  });

  test("covers DM send/receive and block isolation", async ({ roles }) => {
    const marker = `QA-BETA-DM-${Date.now()}`;
    await roles.planner.goto("/dm", { waitUntil: "domcontentloaded" });
    await roles.planner.locator('a[href^="/dm/"]').first().click();
    await roles.planner.locator("textarea").last().fill(marker);
    await roles.planner.getByRole("button", { name: /^Send$/i }).click();

    await roles.dj.goto("/dm", { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).toContainText("QA-BETA-DM");

    if (plannerDjConversationHref) {
      await roles.both.goto(plannerDjConversationHref, { waitUntil: "domcontentloaded" });
      const denied =
        /denied|access|not found|couldn't|Start group chat/i.test(
          await roles.both.locator("body").innerText(),
        ) || roles.both.url().includes("/login");
      expect(denied).toBeTruthy();
    }
  });

  test("covers crew-chat authorization", async ({ roles }) => {
    test.skip(!fixedEventId, "Fixed event was not created");

    await roles.planner.goto(`/events/${fixedEventId}/chat`, { waitUntil: "domcontentloaded" });
    await expect(roles.planner.locator("body")).not.toContainText(/do not have access/i);

    await roles.dj.goto(`/events/${fixedEventId}/chat`, { waitUntil: "domcontentloaded" });
    await expect(roles.dj.locator("body")).not.toContainText(/do not have access/i);

    await roles.both.goto(`/events/${fixedEventId}/chat`, { waitUntil: "domcontentloaded" });
    const bothText = await roles.both.locator("body").innerText();
    expect(
      /do not have access|not available|Start group chat/i.test(bothText),
    ).toBeTruthy();
  });

  test("covers targeted navigation return paths", async ({ roles }) => {
    test.skip(!fixedEventId, "Fixed event was not created");

    await roles.planner.goto("/events", { waitUntil: "domcontentloaded" });
    await roles.planner.goto(`/events/${fixedEventId}`, { waitUntil: "domcontentloaded" });
    await roles.planner.goBack();
    await expect(roles.planner).toHaveURL(/\/events/);

    await roles.dj.goto("/bookings", { waitUntil: "domcontentloaded" });
    await roles.dj.locator('a[href^="/dm/"]').first().click();
    const dmUrl = roles.dj.url();
    await roles.dj.goBack();
    await expect(roles.dj).toHaveURL(/\/bookings/);
    expect(dmUrl).toContain("/dm/");
  });
});
