import assert from "node:assert/strict";
import {
  getEventDateValidationError,
  isEventStartSaveBlocked,
} from "../lib/bookingDateTime";
import { computeCrewChatEventActions } from "../lib/events/crewChatEventActions";
import type { CrewChatUnlockState } from "../lib/events/crewChatUnlock";

function testPastEventDatesAreBlocked() {
  const cases = [
    ["2025-01-08", "9:00 PM"],
    ["Wednesday, 8 January 2025", "9:00 PM"],
    ["8 January 2025", "9:00 PM"],
    ["2026-04-01", "9:00 PM"],
  ] as const;

  for (const [eventDate, setTime] of cases) {
    const error = getEventDateValidationError(eventDate, setTime);
    assert.ok(error, `expected past date to block save: ${eventDate}`);
    assert.equal(isEventStartSaveBlocked(eventDate, setTime), true);
  }
}

function testFutureEventDatesAreAllowed() {
  const error = getEventDateValidationError("2027-01-08", "9:00 PM");
  assert.equal(error, null);
  assert.equal(isEventStartSaveBlocked("2027-01-08", "9:00 PM"), false);
}

function testOneAcceptedDjWithNullStartShowsStartAction() {
  const unlock: CrewChatUnlockState = {
    acceptedDjCount: 1,
    crewChatStartedAt: null,
    isUnlocked: false,
    canPlannerStart: true,
  };

  const actions = computeCrewChatEventActions({
    unlock,
    isOwner: true,
    isPlanner: true,
    eventIsCancelled: false,
    hasAcceptedBooking: false,
  });

  assert.equal(actions.showStartCrewChatAction, true);
  assert.equal(actions.showEventGroupChatAction, false);
}

function testOneAcceptedDjWithStartedAtShowsGroupChat() {
  const unlock: CrewChatUnlockState = {
    acceptedDjCount: 1,
    crewChatStartedAt: "2026-07-07T10:00:00.000Z",
    isUnlocked: true,
    canPlannerStart: false,
  };

  const actions = computeCrewChatEventActions({
    unlock,
    isOwner: true,
    isPlanner: true,
    eventIsCancelled: false,
    hasAcceptedBooking: false,
  });

  assert.equal(actions.showStartCrewChatAction, false);
  assert.equal(actions.showEventGroupChatAction, true);
}

function testZeroAcceptedDjsShowsNoCrewChatAction() {
  const unlock: CrewChatUnlockState = {
    acceptedDjCount: 0,
    crewChatStartedAt: null,
    isUnlocked: false,
    canPlannerStart: false,
  };

  const actions = computeCrewChatEventActions({
    unlock,
    isOwner: true,
    isPlanner: true,
    eventIsCancelled: false,
    hasAcceptedBooking: false,
  });

  assert.equal(actions.showStartCrewChatAction, false);
  assert.equal(actions.showEventGroupChatAction, false);
}

function main() {
  testPastEventDatesAreBlocked();
  testFutureEventDatesAreAllowed();
  testOneAcceptedDjWithNullStartShowsStartAction();
  testOneAcceptedDjWithStartedAtShowsGroupChat();
  testZeroAcceptedDjsShowsNoCrewChatAction();
  console.log("All regression checks passed.");
}

main();
