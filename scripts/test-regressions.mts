import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatRateDisplay } from "../lib/bookingRate";
import {
  getEventDateValidationError,
  getEventSetTimeValidationError,
  getTodayDateKey,
  guardEventDatePickerChange,
  isEventStartSaveBlocked,
  isWheelMinuteDisabled,
  isWheelTimeBefore,
  resolvePickerEventDateValue,
  clampWheelTimeToMin,
  SET_TIME_RANGE_JOINER,
} from "../lib/bookingDateTime";
import type { BookingRequest } from "../lib/bookingRequests";
import {
  filterDjGigsByTab,
  countDjGigsByTab,
  getActiveEventLineupStats,
  isDmBookingActionRequired,
  isDjGigPastAccepted,
  resolveBookingDateKey,
} from "../lib/bookingRequests";
import { parseDjGigsListTab, resolveGigsListTabParam } from "../lib/bookings/gigsListNavigation";
import { resolveEventsHistoryTrashVisible } from "../lib/events/eventsListNavigation";
import { resolveHistoryBulkSelectAllToggle } from "../app/components/history/HistoryBulkManage";
import { resolvePlannerHistoryHideEventIds } from "../lib/events";
import {
  defaultGigsWorkspaceChromeState,
  gigsWorkspaceChromeStatesEqual,
} from "../app/components/bookings/GigsWorkspaceChrome";
import { computeCrewChatEventActions } from "../lib/events/crewChatEventActions";
import type { CrewChatUnlockState } from "../lib/events/crewChatUnlock";
import { resolveEventLinkedBookingDisplay } from "../lib/events/eventBookingDisplay";
import { getAuthRedirectUrl } from "../lib/auth/appUrl";
import {
  buildDmThreadHref,
  buildEventDetailDmThreadHref,
  resolveDmThreadBackHref,
} from "../lib/dm/threadNavigation";
import { resolveGigsCalendarBookingNavigation } from "../lib/bookings/gigsCalendarNavigation";
import { hasUnsavedProfileEdits, createProfileEditBaseline } from "../lib/user/profileEditDirtyState";
import { getUsernameFormatError, normalizeSoundCloudInput, resolveProfileIdentityPresentation } from "../lib/user/profileFormUtils";
import {
  PLANNER_WORKSPACE_SUBNAV_ROW_CLASS,
  PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS,
} from "../app/components/planner/PlannerWorkspaceLayout";
import { getEventsAreaSubNavItems, resolveActiveWorkspaceHref } from "../lib/plannerEventsNav";
import {
  EVENT_PLAN_ACTION_RESERVE_CLASS,
  EVENT_PLAN_USE_BUTTON_CLASS,
  EVENT_PLAN_USE_BUTTON_WRAP_CLASS,
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_MODIFIER_CLASS,
  GIGS_TAB_PILL_ROW_CLASS,
  GIGS_LIST_TAB_ROW_CLASS,
} from "../lib/design/ftcDesignSystem";

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
  const setTime = `9:00 PM${SET_TIME_RANGE_JOINER}11:00 PM`;
  const error = getEventDateValidationError("2027-01-08", setTime);
  assert.equal(error, null);
  assert.equal(isEventStartSaveBlocked("2027-01-08", setTime), false);
}

function testIncompleteSetTimeIsBlocked() {
  assert.equal(getEventSetTimeValidationError("9:00 PM"), "Select a finish time");
  assert.equal(getEventSetTimeValidationError(""), "Select a start time");
  assert.equal(
    getEventSetTimeValidationError(`9:00 PM${SET_TIME_RANGE_JOINER}11:00 PM`),
    null,
  );
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

function testDmBookingActionRequiredStates() {
  const base: BookingRequest = {
    id: "booking-1",
    created_at: "2026-07-06T10:00:00.000Z",
    sender_id: "planner-1",
    recipient_id: "dj-1",
    conversation_id: "conversation-1",
    event_id: "event-1",
    event_name: "Summer party",
    venue: "Venue",
    event_date: "Saturday, 12 July 2026",
    set_time: "9:00 PM",
    fee: "500",
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

  assert.equal(isDmBookingActionRequired(base), true);
  assert.equal(isDmBookingActionRequired({ ...base, status: "accepted" }), false);
  assert.equal(isDmBookingActionRequired({ ...base, status: "declined" }), false);
  assert.equal(isDmBookingActionRequired({ ...base, status: "cancelled" }), false);
  assert.equal(
    isDmBookingActionRequired({ ...base, status: "accepted" }, true),
    false,
  );
  assert.equal(
    isDmBookingActionRequired({ ...base, status: "pending" }, true),
    false,
  );
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

function testUsernameBlockedTermChecks() {
  const blockedMessage = "That username is not available.";

  assert.equal(getUsernameFormatError("hitler"), blockedMessage);
  assert.equal(getUsernameFormatError("breaker_breakerfuck"), blockedMessage);
  assert.equal(getUsernameFormatError("breakerbreaker"), null);
}

function testAuthRedirectUrlUsesLoginPath() {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    process.env.NEXT_PUBLIC_APP_URL = "https://follow-the-crowd.vercel.app";
    assert.equal(getAuthRedirectUrl("/login"), "https://follow-the-crowd.vercel.app/login");
  } finally {
    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  }
}

function testProfileEditDirtyDetection() {
  const profile = {
    user_id: "user-1",
    role: "dj" as const,
    onboarding_complete: true,
    full_name: null,
    username: "djone",
    display_name: "DJ One",
    bio: "Bio",
    genre: "Techno, House",
    instagram_url: "",
    tiktok_url: "",
    soundcloud_url: "",
    website_url: "",
    location: "",
    avatar_url: null,
    artist_name: "",
    dj_booking_contact_name: "",
    dj_availability: "",
    dj_past_gigs: "",
    promoter_brand_name: "",
    promoter_brand_description: "",
    promoter_venues_used: "",
    promoter_upcoming_events: "",
    promoter_past_events: "",
  };

  const baseline = createProfileEditBaseline(profile);

  assert.equal(
    hasUnsavedProfileEdits(baseline, {
      ...baseline,
      hasPendingPhoto: false,
    }),
    false,
  );

  assert.equal(
    hasUnsavedProfileEdits(baseline, {
      ...baseline,
      form: { ...baseline.form, bio: "Updated bio" },
      hasPendingPhoto: false,
    }),
    true,
  );

  assert.equal(
    hasUnsavedProfileEdits(baseline, {
      ...baseline,
      hasPendingPhoto: true,
    }),
    true,
  );
}

function testSoundCloudInputNormalization() {
  assert.equal(normalizeSoundCloudInput(""), "");
  assert.equal(normalizeSoundCloudInput("djalpha"), "https://soundcloud.com/djalpha");
  assert.equal(normalizeSoundCloudInput("@djalpha"), "https://soundcloud.com/djalpha");
  assert.equal(
    normalizeSoundCloudInput("https://soundcloud.com/djalpha"),
    "https://soundcloud.com/djalpha",
  );
  assert.equal(
    normalizeSoundCloudInput("https://soundcloud.com/djalpha/tracks"),
    "https://soundcloud.com/djalpha",
  );
  assert.equal(
    normalizeSoundCloudInput("https://on.soundcloud.com/OM9xLtVDOIqhlTyNu2"),
    "https://on.soundcloud.com/OM9xLtVDOIqhlTyNu2",
  );

  assert.throws(
    () => normalizeSoundCloudInput("Artist Name"),
    /Enter a valid SoundCloud username\./,
  );
}

function testDmThreadCalendarBackHref() {
  assert.equal(
    resolveDmThreadBackHref({
      from: "calendar",
      calendarDate: "2026-07-14",
      calendarView: "dj",
      calendarMonth: "2026-07-01",
    }),
    "/calendar?date=2026-07-14&view=dj&month=2026-07-01",
  );

  assert.equal(resolveDmThreadBackHref({ from: "dm" }), "/dm");
  assert.equal(resolveDmThreadBackHref({}), "/dm");
}

function makeLineupStatsBooking(overrides: Partial<BookingRequest>): BookingRequest {
  return {
    id: "booking-1",
    created_at: "2026-01-01T00:00:00.000Z",
    sender_id: "sender",
    recipient_id: "recipient",
    conversation_id: "conversation-1",
    event_id: "11111111-1111-4111-8111-111111111111",
    event_name: "Test Event",
    venue: "Venue",
    event_date: "2027-01-01",
    set_time: "9:00 PM",
    fee: "$500",
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
    ...overrides,
  };
}

function testActiveEventLineupStatsMatchVisibleLineupRules() {
  const stats = getActiveEventLineupStats([
    makeLineupStatsBooking({ id: "pending", status: "pending" }),
    makeLineupStatsBooking({ id: "accepted", status: "accepted" }),
    makeLineupStatsBooking({ id: "declined-visible", status: "declined" }),
    makeLineupStatsBooking({
      id: "declined-hidden",
      status: "declined",
      lineup_hidden_at: "2026-01-01T00:00:00.000Z",
    }),
    makeLineupStatsBooking({ id: "cancelled", status: "cancelled" }),
  ]);

  assert.deepEqual(stats, {
    total: 3,
    pending: 1,
    accepted: 1,
    declined: 1,
  });
}

function testDmThreadEventDetailBackHref() {
  const eventId = "11111111-1111-4111-8111-111111111111";
  const conversationId = "22222222-2222-4222-8222-222222222222";

  assert.equal(
    resolveDmThreadBackHref({ from: "event-detail", eventId }),
    `/events/${eventId}`,
  );
  assert.equal(resolveDmThreadBackHref({ from: "event-detail", eventId: "not-a-uuid" }), "/events");
  assert.equal(resolveDmThreadBackHref({ from: "bookings" }), "/bookings");
  assert.equal(
    buildEventDetailDmThreadHref(conversationId, eventId),
    `/dm/${conversationId}?from=event-detail&eventId=${eventId}`,
  );
  assert.equal(
    buildDmThreadHref(conversationId, { from: "dm" }),
    `/dm/${conversationId}?from=dm`,
  );
  assert.equal(
    buildDmThreadHref(conversationId, { from: "event-detail", eventId: "bad-id" }),
    `/dm/${conversationId}?from=event-detail`,
  );
}

function testGigsCalendarBookingNavigation() {
  const origin: import("../lib/bookings/gigsCalendarNavigation").CalendarOriginState = {
    calendarDate: "2026-07-14",
    calendarView: "dj",
    calendarMonth: "2026-07-01",
  };
  const eventId = "11111111-1111-4111-8111-111111111111";

  const booked = resolveGigsCalendarBookingNavigation(
    {
      id: "booking-1",
      status: "accepted",
      event_id: eventId,
      conversation_id: "conversation-1",
    },
    origin,
  );

  assert.equal(booked.kind, "event");

  if (booked.kind === "event") {
    assert.equal(booked.eventId, eventId);
    assert.equal(
      booked.href,
      `/events/${eventId}?from=calendar&calendarDate=2026-07-14&calendarView=dj&calendarMonth=2026-07-01`,
    );
  }

  const pending = resolveGigsCalendarBookingNavigation(
    {
      id: "booking-2",
      status: "pending",
      event_id: null,
      conversation_id: "conversation-2",
    },
    origin,
  );

  assert.equal(pending.kind, "dm");

  if (pending.kind === "dm") {
    assert.equal(
      pending.href,
      "/dm/conversation-2?bookingRequestId=booking-2&from=calendar&calendarDate=2026-07-14&calendarView=dj&calendarMonth=2026-07-01",
    );
  }

  const missingEvent = resolveGigsCalendarBookingNavigation(
    {
      id: "booking-3",
      status: "accepted",
      event_id: null,
      conversation_id: "conversation-3",
    },
    origin,
  );

  assert.equal(missingEvent.kind, "error");
}

function makeDjGigBooking(
  overrides: Partial<BookingRequest> & Pick<BookingRequest, "status" | "event_date">,
): BookingRequest {
  return {
    id: overrides.id ?? "booking-gig-1",
    created_at: overrides.created_at ?? "2026-07-06T10:00:00.000Z",
    sender_id: overrides.sender_id ?? "planner-1",
    recipient_id: overrides.recipient_id ?? "dj-1",
    conversation_id: overrides.conversation_id ?? "conversation-1",
    event_id: overrides.event_id ?? "event-1",
    event_name: overrides.event_name ?? "Campaign event",
    venue: overrides.venue ?? "Venue",
    set_time: overrides.set_time ?? "9:00 PM",
    fee: overrides.fee ?? "100",
    notes: overrides.notes ?? "",
    archived_at: overrides.archived_at ?? null,
    lineup_hidden_at: overrides.lineup_hidden_at ?? null,
    cancelled_at: overrides.cancelled_at ?? null,
    cancelled_by: overrides.cancelled_by ?? null,
    cancellation_reason: overrides.cancellation_reason ?? null,
    rate_mode: overrides.rate_mode ?? "fixed",
    proposed_rate: overrides.proposed_rate ?? null,
    proposed_rate_note: overrides.proposed_rate_note ?? null,
    proposed_rate_at: overrides.proposed_rate_at ?? null,
    proposed_rate_status: overrides.proposed_rate_status ?? null,
    ...overrides,
  };
}

function testAcceptedFutureGigAppearsInConfirmed() {
  const booking = makeDjGigBooking({
    status: "accepted",
    event_date: "2027-01-08",
  });

  assert.equal(filterDjGigsByTab([booking], "accepted").length, 1);
  assert.equal(filterDjGigsByTab([booking], "history").length, 0);
}

function testAcceptedPastGigAppearsInHistory() {
  const booking = makeDjGigBooking({
    status: "accepted",
    event_date: "2025-01-08",
  });

  assert.equal(filterDjGigsByTab([booking], "accepted").length, 0);
  assert.equal(filterDjGigsByTab([booking], "history").length, 1);
  assert.equal(isDjGigPastAccepted(booking), true);
}

function testPendingGigAppearsOnlyInIncoming() {
  const booking = makeDjGigBooking({
    status: "pending",
    event_date: "2027-01-08",
  });

  assert.equal(filterDjGigsByTab([booking], "pending").length, 1);
  assert.equal(filterDjGigsByTab([booking], "accepted").length, 0);
  assert.equal(filterDjGigsByTab([booking], "history").length, 0);
}

function testConfirmedListUpdatesAfterAcceptance() {
  const booking = makeDjGigBooking({
    status: "pending",
    event_date: "2027-01-08",
  });
  const bookings = [booking];

  assert.equal(filterDjGigsByTab(bookings, "accepted").length, 0);

  booking.status = "accepted";

  assert.equal(filterDjGigsByTab(bookings, "accepted").length, 1);
  assert.equal(filterDjGigsByTab(bookings, "pending").length, 0);
}

function testTodaysFutureGigIsNotHistorical() {
  const today = getTodayDateKey();
  const booking = makeDjGigBooking({
    status: "accepted",
    event_date: today,
    set_time: "11:00 PM",
  });

  assert.equal(resolveBookingDateKey(booking.event_date), today);
  assert.equal(isDjGigPastAccepted(booking), false);
  assert.equal(filterDjGigsByTab([booking], "accepted").length, 1);
  assert.equal(filterDjGigsByTab([booking], "history").length, 0);
}

function testLegacyEventDatesResolveForGigTabs() {
  const booking = makeDjGigBooking({
    status: "accepted",
    event_date: "Saturday, 12 July 2027",
  });

  assert.equal(resolveBookingDateKey(booking.event_date), "2027-07-12");
  assert.equal(filterDjGigsByTab([booking], "accepted").length, 1);
}

function testConfirmedTabAliasParsesFromUrl() {
  assert.equal(parseDjGigsListTab("confirmed"), "accepted");
  assert.equal(parseDjGigsListTab("accepted"), "accepted");
}

function testWorkspaceSubNavLayoutIsStable() {
  assert.match(PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS, /min-h-\[2\.375rem\]/);
  assert.match(PLANNER_WORKSPACE_SUBNAV_ROW_CLASS, /flex-nowrap/);
  assert.match(PLANNER_WORKSPACE_SUBNAV_ROW_CLASS, /overflow-x-auto/);
  assert.equal(getEventsAreaSubNavItems("promoter").map((item) => item.href).join(","), "/events,/booking-plans,/calendar");
  assert.equal(getEventsAreaSubNavItems("dj").map((item) => item.href).join(","), "/events,/calendar,/bookings");
  assert.equal(
    getEventsAreaSubNavItems("both").map((item) => item.href).join(","),
    "/events,/booking-plans,/calendar,/bookings",
  );
  assert.equal(getEventsAreaSubNavItems(null).map((item) => item.href).join(","), "/events,/calendar");
}

function testWorkspaceActiveHrefIgnoresStaleOverrides() {
  assert.equal(resolveActiveWorkspaceHref("/calendar"), "/calendar");
  assert.equal(resolveActiveWorkspaceHref("/calendar", "/events"), "/calendar");
  assert.equal(resolveActiveWorkspaceHref("/events"), "/events");
  assert.equal(resolveActiveWorkspaceHref("/bookings", "/booking-plans"), "/booking-plans");
  assert.equal(resolveActiveWorkspaceHref("/bookings"), "/bookings");
}

function testProfileIdentityPresentationHierarchy() {
  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: "FTC QA DJ",
      username: "both",
    }),
    { primary: "FTC QA DJ", secondaryUsername: "@both" },
  );

  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: "River Stage",
      username: "river_stage",
    }),
    { primary: "River Stage", secondaryUsername: "@river_stage" },
  );

  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: "river_stage",
      username: "river_stage",
    }),
    { primary: "river_stage", secondaryUsername: null },
  );

  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: null,
      username: "ftcqa_dj",
    }),
    { primary: "ftcqa_dj", secondaryUsername: null },
  );

  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: null,
      username: null,
      artist_name: "DJ Nova",
    }),
    { primary: "DJ Nova", secondaryUsername: null },
  );
}

function testEventPlanUseButtonKeepsStableCardLayout() {
  assert.match(EVENT_PLAN_USE_BUTTON_WRAP_CLASS, /shrink-0/);
  assert.match(EVENT_PLAN_USE_BUTTON_WRAP_CLASS, /self-center/);
  assert.match(EVENT_PLAN_USE_BUTTON_CLASS, /min-h-11/);
  assert.doesNotMatch(EVENT_PLAN_USE_BUTTON_CLASS, /w-full/);
  assert.doesNotMatch(EVENT_PLAN_USE_BUTTON_CLASS, /w-\[/);
  assert.match(EVENT_PLAN_ACTION_RESERVE_CLASS, /h-11/);
  assert.match(EVENT_PLAN_ACTION_RESERVE_CLASS, /w-\[5\.5rem\]/);
  assert.doesNotMatch(EVENT_PLAN_ACTION_RESERVE_CLASS, /ftc-btn/);
}

function testGigsTabRowKeepsStableCountSlots() {
  assert.match(GIGS_TAB_PILL_ROW_CLASS, /shrink-0/);
  assert.match(GIGS_TAB_PILL_ROW_CLASS, /gap-2/);
  assert.doesNotMatch(GIGS_TAB_PILL_ROW_CLASS, /flex-1/);
  assert.match(GIGS_TAB_PILL_MODIFIER_CLASS, /ftc-gigs-tab-pill/);
  assert.match(GIGS_TAB_COUNT_SLOT_CLASS, /tabular-nums/);
  assert.match(GIGS_TAB_COUNT_SLOT_CLASS, /min-w-/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /flex-nowrap/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /justify-between/);
  assert.doesNotMatch(GIGS_LIST_TAB_ROW_CLASS, /flex-wrap/);
}

async function testEventsHistorySelectAllButtonInteraction() {
  const { runHistorySelectAllInteractionTest } = await import(
    "./test-history-select-all-interaction.js"
  );
  await runHistorySelectAllInteractionTest();
}

async function testEventsHistoryRemoveConfirmInteraction() {
  const { runHistoryRemoveConfirmInteractionTest, runHistoryRemoveConfirmFailureTest } =
    await import("./test-history-remove-confirm.js");
  await runHistoryRemoveConfirmInteractionTest();
  await runHistoryRemoveConfirmFailureTest();
}

function testResolvePlannerHistoryHideEventIds() {
  const events = [
    {
      id: "cancelled-visible",
      status: "cancelled" as const,
      history_hidden_at: null,
      event_date: "2020-01-01",
      set_time: "",
    },
    {
      id: "cancelled-hidden",
      status: "cancelled" as const,
      history_hidden_at: "2026-01-01T00:00:00.000Z",
      event_date: "2020-01-01",
      set_time: "",
    },
    {
      id: "past-active",
      status: "completed" as const,
      history_hidden_at: null,
      event_date: "2020-01-01",
      set_time: "",
    },
  ];

  assert.deepEqual(
    resolvePlannerHistoryHideEventIds(events, ["cancelled-visible", "past-active"]),
    ["cancelled-visible", "past-active"],
  );
  assert.deepEqual(resolvePlannerHistoryHideEventIds(events, ["cancelled-hidden"]), []);
}

function testEventsHistoryBulkSelectAllTogglesSelection() {
  const bulkSource = readFileSync(
    new URL("../app/components/history/HistoryBulkManage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bulkSource, /export function resolveHistoryBulkSelectAllToggle/);
  assert.match(bulkSource, /toggleSelectAllForIds = useCallback/);
  assert.match(bulkSource, /setSelectedIds\(\(current\) => \{/);

  const selected = new Set(["a", "b"]);
  assert.deepEqual(
    resolveHistoryBulkSelectAllToggle(["a", "b"], selected),
    new Set<string>(),
  );
  assert.deepEqual(
    resolveHistoryBulkSelectAllToggle(["a", "b", "c"], selected),
    new Set(["a", "b", "c"]),
  );
  assert.deepEqual(
    resolveHistoryBulkSelectAllToggle(["a"], new Set(["a", "b", "off-screen"])),
    new Set(["b", "off-screen"]),
  );
  assert.deepEqual(resolveHistoryBulkSelectAllToggle([], selected), selected);

  assert.match(bulkSource, /pendingRemoveIdsRef/);
  assert.match(bulkSource, /selectedIdsRef/);

  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(eventsSource, /resolvePlannerHistoryHideEventIds\(eventsRef\.current, eventIds\)/);
  assert.match(eventsSource, /errorMessage=\{error\}/);
  assert.match(eventsSource, /confirmHistoryRemove/);
  assert.match(eventsSource, /hideEventsFromHistory\(hideableEventIds\)/);

  const eventsLibSource = readFileSync(
    new URL("../lib/events.ts", import.meta.url),
    "utf8",
  );
  assert.match(eventsLibSource, /\.update\(\{ history_hidden_at: hiddenAt \}\)/);
  assert.match(eventsLibSource, /\.eq\("owner_id", ownerId\)/);
}

function testEventsHistorySelectionToolbarUsesDeleteLabel() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /removeLabel="Delete"/);
  assert.match(source, /selectAllLabel="ALL"/);
  assert.match(source, /canToggleAll=\{canToggleAllHistorySelection\}/);
  assert.match(source, /canDelete=\{canDeleteHistorySelection\}/);
  assert.match(source, /selectAllToggle/);
  assert.match(source, /centeredSelectAll/);
  assert.match(source, /cancelVariant="backIcon"/);
}

function testEventsHistoryTrashVisibleUsesRenderedHistoryList() {
  const base = {
    isPlanner: true,
    isHistoryTab: true,
    createOpen: false,
    selectionMode: false,
    historyLoadSettled: true,
  } as const;

  assert.equal(
    resolveEventsHistoryTrashVisible({ ...base, visibleHistoryEventCount: 3 }),
    true,
    "History with visible cards shows trash",
  );
  assert.equal(
    resolveEventsHistoryTrashVisible({ ...base, visibleHistoryEventCount: 0 }),
    false,
    "empty History hides trash",
  );
  assert.equal(
    resolveEventsHistoryTrashVisible({ ...base, visibleHistoryEventCount: 3, selectionMode: true }),
    false,
    "selection mode hides trash",
  );
  assert.equal(
    resolveEventsHistoryTrashVisible({
      ...base,
      visibleHistoryEventCount: 3,
      isHistoryTab: false,
    }),
    false,
    "Active tab hides trash",
  );
  assert.equal(
    resolveEventsHistoryTrashVisible({
      ...base,
      visibleHistoryEventCount: 0,
      historyLoadSettled: false,
    }),
    true,
    "unsettled History still reserves trash slot while loading",
  );
}

function testGigsTabCountsDeriveFromSameBookingSnapshot() {
  const bookings = [
    makeDjGigBooking({ status: "pending", event_date: "Saturday, 12 July 2027" }),
    makeDjGigBooking({ status: "accepted", event_date: "Saturday, 12 July 2027" }),
    makeDjGigBooking({ status: "declined", event_date: "Saturday, 12 July 2027" }),
  ];
  const hidden = new Set<string>();
  const counts = countDjGigsByTab(bookings, hidden);

  assert.equal(counts.pending, filterDjGigsByTab(bookings, "pending", hidden).length);
  assert.equal(counts.accepted, filterDjGigsByTab(bookings, "accepted", hidden).length);
  assert.equal(counts.history, filterDjGigsByTab(bookings, "history", hidden).length);
}

function testGigsInnerTabSelectionFollowsRouteImmediately() {
  assert.equal(resolveGigsListTabParam(null, null, ""), "pending");
  assert.equal(resolveGigsListTabParam("accepted", null, null), "accepted");
  assert.equal(resolveGigsListTabParam("history", null, null), "history");
  assert.equal(resolveGigsListTabParam(null, null, "?tab=accepted"), "accepted");
}

function testGigsWorkspaceChromeStateSyncAvoidsNoOpUpdates() {
  const counts = { pending: 2, accepted: 1, history: 0 };

  assert.equal(
    gigsWorkspaceChromeStatesEqual(defaultGigsWorkspaceChromeState, defaultGigsWorkspaceChromeState),
    true,
  );
  assert.equal(
    gigsWorkspaceChromeStatesEqual(
      { ...defaultGigsWorkspaceChromeState, counts },
      { ...defaultGigsWorkspaceChromeState, counts },
    ),
    true,
  );
  assert.equal(
    gigsWorkspaceChromeStatesEqual(
      { ...defaultGigsWorkspaceChromeState, counts },
      { ...defaultGigsWorkspaceChromeState, counts: { ...counts, pending: 3 } },
    ),
    false,
  );
}

function testBookingsRouteMountsPersistentGigsSecondaryBand() {
  const layoutSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/layout.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const loadingShellSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  const workspaceLayoutSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceLayout.tsx", import.meta.url),
    "utf8",
  );
  const subNavSource = readFileSync(
    new URL("../app/components/PlannerEventsSubNav.tsx", import.meta.url),
    "utf8",
  );

  assert.match(layoutSource, /BookingsRouteChrome/);
  assert.match(pageSource, /useSetGigsWorkspaceChromeState/);
  assert.doesNotMatch(pageSource, /secondaryControlsSlot=\{/);
  assert.match(loadingShellSource, /omitSecondaryBand/);
  assert.match(workspaceLayoutSource, /workspaceRole/);
  assert.match(subNavSource, /pathnameForSubNav/);
  assert.match(subNavSource, /window\.location\.pathname/);
}

async function main() {
  testPastEventDatesAreBlocked();
  testFutureEventDatesAreAllowed();
  testIncompleteSetTimeIsBlocked();
  testPastPickerDatesAreRejected();
  testWheelTimeBeforeMinHelpers();
  testOneAcceptedDjWithNullStartShowsStartAction();
  testOneAcceptedDjWithStartedAtShowsGroupChat();
  testZeroAcceptedDjsShowsNoCrewChatAction();
  testConflictingCrewChatFlagsPreferStartAction();
  testDmBookingDisplayKeepsPerDjFeeOverEmptyEventRate();
  testDmBookingActionRequiredStates();
  testUsernameBlockedTermChecks();
  testAuthRedirectUrlUsesLoginPath();
  testProfileEditDirtyDetection();
  testSoundCloudInputNormalization();
  testDmThreadCalendarBackHref();
  testActiveEventLineupStatsMatchVisibleLineupRules();
  testDmThreadEventDetailBackHref();
  testGigsCalendarBookingNavigation();
  testAcceptedFutureGigAppearsInConfirmed();
  testAcceptedPastGigAppearsInHistory();
  testPendingGigAppearsOnlyInIncoming();
  testConfirmedListUpdatesAfterAcceptance();
  testTodaysFutureGigIsNotHistorical();
  testLegacyEventDatesResolveForGigTabs();
  testConfirmedTabAliasParsesFromUrl();
  testEventPlanUseButtonKeepsStableCardLayout();
  testGigsTabRowKeepsStableCountSlots();
  testEventsHistoryBulkSelectAllTogglesSelection();
  testResolvePlannerHistoryHideEventIds();
  testEventsHistorySelectionToolbarUsesDeleteLabel();
  testEventsHistoryTrashVisibleUsesRenderedHistoryList();
  testGigsTabCountsDeriveFromSameBookingSnapshot();
  testGigsInnerTabSelectionFollowsRouteImmediately();
  testGigsWorkspaceChromeStateSyncAvoidsNoOpUpdates();
  testBookingsRouteMountsPersistentGigsSecondaryBand();
  testWorkspaceSubNavLayoutIsStable();
  testWorkspaceActiveHrefIgnoresStaleOverrides();
  testProfileIdentityPresentationHierarchy();
  await testEventsHistorySelectAllButtonInteraction();
  await testEventsHistoryRemoveConfirmInteraction();
  console.log("All regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
