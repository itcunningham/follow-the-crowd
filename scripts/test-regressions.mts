import assert from "node:assert/strict";
import { formatRateDisplay } from "../lib/bookingRate";
import {
  getEventDateValidationError,
  guardEventDatePickerChange,
  isEventStartSaveBlocked,
  isWheelMinuteDisabled,
  isWheelTimeBefore,
  resolvePickerEventDateValue,
  clampWheelTimeToMin,
} from "../lib/bookingDateTime";
import type { BookingRequest } from "../lib/bookingRequests";
import { computeCrewChatEventActions } from "../lib/events/crewChatEventActions";
import type { CrewChatUnlockState } from "../lib/events/crewChatUnlock";
import { resolveEventLinkedBookingDisplay } from "../lib/events/eventBookingDisplay";

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
  assert.equal(actions.crewChatHelpActionLabel, "Start group chat");
  assert.equal(actions.showCrewChatHelpUi, true);
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
  assert.equal(actions.showCrewChatHelpUi, false);
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

function testPastPickerDatesAreRejected() {
  assert.equal(guardEventDatePickerChange("2025-01-08"), null);
  assert.equal(resolvePickerEventDateValue("2025-01-08"), "");
  assert.equal(guardEventDatePickerChange("2027-01-08"), "2027-01-08");
}

function testDmBookingDisplayKeepsPerDjFeeOverEmptyEventRate() {
  const booking: BookingRequest = {
    id: "booking-1",
    created_at: "2026-07-06T10:00:00.000Z",
    sender_id: "planner-1",
    recipient_id: "dj-1",
    conversation_id: "conversation-1",
    event_id: "event-1",
    event_name: "Campaign event",
    venue: "Venue",
    event_date: "Saturday, 12 July 2026",
    set_time: "9:00 PM",
    fee: "66",
    notes: "",
    status: "pending",
    archived_at: null,
    lineup_hidden_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    rate_mode: "fixed",
    proposed_rate: null,
    proposed_rate_note: null,
    proposed_rate_at: null,
    proposed_rate_status: null,
  };

  const resolved = resolveEventLinkedBookingDisplay(booking, {
    eventName: "Campaign event",
    venue: "Venue",
    eventDate: "Saturday, 12 July 2026",
    setTime: "9:00 PM",
    rate: "",
    coverImageUrl: null,
    fallbackColour: null,
    status: "upcoming",
    crewChatStartedAt: null,
  });

  assert.equal(resolved.fee, "66");
  assert.equal(formatRateDisplay(resolved.fee), "$66");
  assert.equal(`Fixed offer · ${formatRateDisplay(resolved.fee)}`, "Fixed offer · $66");
}

function testWheelTimeBeforeMinHelpers() {
  const min = { hour: 5, minute: 30, meridiem: "PM" as const };

  assert.equal(isWheelTimeBefore({ hour: 5, minute: 29, meridiem: "PM" }, min), true);
  assert.equal(isWheelTimeBefore({ hour: 5, minute: 30, meridiem: "PM" }, min), false);
  assert.equal(isWheelMinuteDisabled(29, 5, "PM", min), true);
  assert.equal(isWheelMinuteDisabled(30, 5, "PM", min), false);
  assert.deepEqual(
    clampWheelTimeToMin({ hour: 1, minute: 0, meridiem: "AM" }, min),
    min,
  );
}

function testConflictingCrewChatFlagsPreferStartAction() {
  const unlock: CrewChatUnlockState = {
    acceptedDjCount: 1,
    crewChatStartedAt: null,
    isUnlocked: true,
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

function main() {
  testPastEventDatesAreBlocked();
  testFutureEventDatesAreAllowed();
  testPastPickerDatesAreRejected();
  testWheelTimeBeforeMinHelpers();
  testOneAcceptedDjWithNullStartShowsStartAction();
  testOneAcceptedDjWithStartedAtShowsGroupChat();
  testZeroAcceptedDjsShowsNoCrewChatAction();
  testConflictingCrewChatFlagsPreferStartAction();
  testDmBookingDisplayKeepsPerDjFeeOverEmptyEventRate();
  console.log("All regression checks passed.");
}

main();
