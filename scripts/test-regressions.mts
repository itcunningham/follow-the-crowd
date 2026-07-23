import assert from "node:assert/strict";
import {
  assertEventFormTextFieldLimits,
  getEventFormFieldErrors,
  MAX_EVENT_NAME_LENGTH,
  MAX_EVENT_VENUE_LENGTH,
  PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH,
} from "../lib/events/eventFormFieldValidation";
import {
  assertBookingPlanFormTextFieldLimits,
  getBookingPlanFormFieldErrors,
  getVisibleBookingPlanFormFieldErrors,
} from "../lib/bookingPlans/bookingPlanFormFieldValidation";
import { applyTextInputLimit } from "../lib/textInputLimits";
import { formatPlannerCalendarItemHeadline } from "../lib/calendar";
import {
  resolveCompactCalendarDisplayTitle,
  resolveCompactCalendarEventOnlyTitle,
} from "../lib/calendar/compactCalendarEventVenueTitle";
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
  defaultEventFinishWheelTime,
  defaultEventStartWheelTime,
  defaultFinishWheelTime,
  defaultStartWheelTime,
  applyEventDateFieldChange,
  applyEventSetTimeStartChange,
  getMinWheelTimeForEventDate,
  getMinWheelTimeFromNow,
  resolveEventTimePickerOpenValue,
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
import { parseDjGigsListTab, resolveGigsListTabParam, resolveGigsListTabForBookingsPage, buildGigsWorkspaceIncomingHref } from "../lib/bookings/gigsListNavigation";
import {
  formatGigsTabCountAriaCount,
  formatGigsTabCountDisplay,
  GIGS_TAB_COUNT_MAX_DISPLAY,
} from "../lib/bookings/gigsTabCountDisplay";
import { resolveWorkspaceGigsPendingDisplayCount } from "../lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
import {
  clearNavigationBadgeCache,
  clearWorkspaceGigsDisplaySession,
  writeRuntimeGigsPendingCount,
} from "../lib/navigationBadgeCache";
import { resolveEventsHistoryTrashVisible, resolveEventsListTabRowChrome, resolveEventsListActiveTabLabel, resolveEventsListActiveTabLabelForWorkspaceChrome, EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER } from "../lib/events/eventsListNavigation";
import { resolveHistoryBulkSelectAllToggle } from "../app/components/history/HistoryBulkManage";
import { resolvePlannerHistoryHideEventIds } from "../lib/events";
import {
  INLINE_TAB_FEEDBACK_CLEAR_MS,
  INLINE_TAB_FEEDBACK_FADE_MS,
} from "../lib/design/inlineTabFeedback";
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
import { buildPlannerCreateEventFromPlansHref, buildPlannerCreateEventHref } from "../lib/calendar";
import { resolveGigsCalendarBookingNavigation, resolvePlannerCalendarItemEventId, resolvePlannerCalendarItemHref } from "../lib/bookings/gigsCalendarNavigation";
import { hasUnsavedProfileEdits, createProfileEditBaseline } from "../lib/user/profileEditDirtyState";
import { getUsernameFormatError, normalizeSoundCloudInput, resolveProfileIdentityPresentation } from "../lib/user/profileFormUtils";
import {
  PLANNER_WORKSPACE_SUBNAV_ROW_CLASS,
  PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS,
  PLANNER_WORKSPACE_HEADER_CLASS,
  PLANNER_WORKSPACE_SECONDARY_BAND_CLASS,
  PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS,
} from "../lib/design/plannerWorkspaceTokens";
import { getEventsAreaSubNavItems, resolveActiveWorkspaceHref, buildWorkspaceSubNavDestinationHref, EVENTS_AREA_SUB_NAV, isCalendarWorkspacePath, mergeWorkspaceNavRole, WORKSPACE_SUB_NAV_TABS, isWorkspaceSubNavTabVisible } from "../lib/plannerEventsNav";
import { resolveEventsWorkspaceChromeRole } from "../lib/events/eventsWorkspaceChromeRole";
import {
  EVENT_PLAN_ACTION_RESERVE_CLASS,
  EVENT_PLAN_USE_BUTTON_CLASS,
  EVENT_PLAN_USE_BUTTON_WRAP_CLASS,
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_GAP_CLASS,
  GIGS_TAB_PILL_MODIFIER_CLASS,
  GIGS_TAB_PILL_WITH_COUNT_MODIFIER_CLASS,
  GIGS_TAB_PILL_ROW_CLASS,
  GIGS_LIST_TAB_ROW_CLASS,
  EVENTS_LIST_TAB_ROW_CLASS,
  EVENT_PLANS_TOOLBAR_ROW_CLASS,
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
  const eventDate = "2027-01-08";
  assert.equal(getEventSetTimeValidationError(eventDate, "9:00 PM"), "Select a finish time");
  assert.equal(getEventSetTimeValidationError(eventDate, ""), "Select a start time");
  assert.equal(
    getEventSetTimeValidationError(eventDate, `9:00 PM${SET_TIME_RANGE_JOINER}11:00 PM`),
    null,
  );
}

function testEventSetTimeRangeValidation() {
  const eventDate = "2027-06-15";
  const normal = `7:00 PM${SET_TIME_RANGE_JOINER}11:00 PM`;
  const sameEveningInvalid = `7:52 PM${SET_TIME_RANGE_JOINER}7:47 PM`;
  const zeroDuration = `9:00 PM${SET_TIME_RANGE_JOINER}9:00 PM`;
  const overnightA = `9:00 PM${SET_TIME_RANGE_JOINER}2:00 AM`;
  const overnightB = `10:00 PM${SET_TIME_RANGE_JOINER}5:00 AM`;

  assert.equal(getEventSetTimeValidationError(eventDate, normal), null);
  assert.equal(
    getEventSetTimeValidationError(eventDate, sameEveningInvalid),
    "Finish time must be after start time",
  );
  assert.equal(
    getEventSetTimeValidationError(eventDate, zeroDuration),
    "Finish time must be after start time",
  );
  assert.equal(getEventSetTimeValidationError(eventDate, overnightA), null);
  assert.equal(getEventSetTimeValidationError(eventDate, overnightB), null);
  assert.equal(isEventStartSaveBlocked(eventDate, normal), false);
  assert.equal(isEventStartSaveBlocked(eventDate, sameEveningInvalid), true);

  const formErrors = getEventFormFieldErrors({
    name: "Test",
    venue: "Venue",
    eventDate,
    setTime: sameEveningInvalid,
  });
  assert.equal(formErrors.finishTime, "Finish time must be after start time");
}

function testApplyEventSetTimeStartChangeClearsInvalidFinish() {
  const eventDate = "2027-06-15";
  const next = applyEventSetTimeStartChange(eventDate, "8:00 PM", "7:47 PM");
  assert.equal(next, "8:00 PM");
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

function testEventTimePickerDefaultsForToday() {
  const todayKey = getTodayDateKey();
  const nowDefault = getMinWheelTimeFromNow();

  assert.deepEqual(defaultEventStartWheelTime(todayKey), nowDefault);
  assert.deepEqual(defaultEventFinishWheelTime(todayKey), nowDefault);
  assert.deepEqual(defaultEventStartWheelTime(""), nowDefault);
  assert.deepEqual(defaultEventFinishWheelTime("2028-06-15"), nowDefault);
  assert.notDeepEqual(defaultEventStartWheelTime(""), defaultStartWheelTime());
  assert.notDeepEqual(defaultEventFinishWheelTime(""), defaultFinishWheelTime());
}

function testResolveEventTimePickerOpenValueUsesConfirmedSelection() {
  const todayKey = getTodayDateKey();
  const nowDefault = getMinWheelTimeFromNow();
  const min = getMinWheelTimeForEventDate(todayKey);
  const confirmed = { hour: 8, minute: 15, meridiem: "PM" as const };

  assert.deepEqual(
    resolveEventTimePickerOpenValue("", "PM", null, defaultEventStartWheelTime),
    nowDefault,
  );
  assert.deepEqual(
    resolveEventTimePickerOpenValue("8:15", "PM", min, defaultEventStartWheelTime),
    confirmed,
  );
  assert.deepEqual(
    resolveEventTimePickerOpenValue("8:15", "PM", null, defaultEventStartWheelTime),
    confirmed,
  );
}

function testEventsCreateFormTimePickerWiring() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /createStep === "form"/);
  assert.match(source, /<BookingSetTimeRangeField[\s\S]*eventDate=\{form\.eventDate\}/);
  assert.match(source, /eventInputFromBookingPlan\(plan\)/);
  assert.match(source, /title="From scratch"/);
}

function testApplyEventDateFieldChangeClearsPartialSetTime() {
  const todayKey = getTodayDateKey();
  const completeSetTime = `7:00 PM${SET_TIME_RANGE_JOINER}11:00 PM`;

  assert.equal(applyEventDateFieldChange("", todayKey, "9:00 PM"), "");
  assert.equal(
    applyEventDateFieldChange(todayKey, "2028-06-15", completeSetTime),
    completeSetTime,
  );
  assert.equal(applyEventDateFieldChange(todayKey, "2028-06-15", "9:00 PM"), "");
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
  const calendarOrigin = {
    calendarDate: "2026-07-14",
    calendarView: "event" as const,
    calendarMonth: "2026-07-01",
  };

  assert.equal(
    resolveDmThreadBackHref({ from: "event-detail", eventId }),
    `/events/${eventId}`,
  );
  assert.equal(
    resolveDmThreadBackHref({
      from: "event-detail",
      eventId,
      calendarDate: calendarOrigin.calendarDate,
      calendarView: calendarOrigin.calendarView,
      calendarMonth: calendarOrigin.calendarMonth,
    }),
    `/events/${eventId}?from=calendar&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
  );
  assert.equal(resolveDmThreadBackHref({ from: "event-detail", eventId: "not-a-uuid" }), "/events");
  assert.equal(resolveDmThreadBackHref({ from: "bookings" }), "/bookings");
  assert.equal(
    buildEventDetailDmThreadHref(conversationId, eventId),
    `/dm/${conversationId}?from=event-detail&eventId=${eventId}`,
  );
  assert.equal(
    buildEventDetailDmThreadHref(conversationId, eventId, calendarOrigin),
    `/dm/${conversationId}?from=event-detail&eventId=${eventId}&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
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

function testPlannerCalendarItemHref() {
  const origin: import("../lib/bookings/gigsCalendarNavigation").CalendarOriginState = {
    calendarDate: "2026-07-14",
    calendarView: "event",
    calendarMonth: "2026-07-01",
  };
  const eventId = "11111111-1111-4111-8111-111111111111";

  assert.equal(
    resolvePlannerCalendarItemHref(
      {
        id: "sent_booking-booking-1",
        type: "sent_booking",
        href: `/dm/conversation-1?bookingRequestId=booking-1`,
        eventId,
      },
      origin,
    ),
    `/events/${eventId}?from=calendar&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
  );

  assert.equal(
    resolvePlannerCalendarItemHref(
      {
        id: "event-11111111-1111-4111-8111-111111111111",
        type: "event",
        href: `/dm/conversation-1`,
        eventId: null,
      },
      origin,
    ),
    `/events/${eventId}?from=calendar&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
  );

  assert.equal(
    resolvePlannerCalendarItemHref(
      {
        id: "sent_booking-booking-1",
        type: "sent_booking",
        href: `/dm/conversation-1?bookingRequestId=booking-1`,
        eventId: null,
      },
      origin,
    ),
    null,
  );

  assert.equal(
    resolvePlannerCalendarItemEventId({
      id: `event-${eventId}`,
      type: "event",
      href: `/dm/conversation-1`,
      eventId: null,
    }),
    eventId,
  );
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
  assert.match(PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS, /min-h-11/);
  assert.match(PLANNER_WORKSPACE_SUBNAV_ROW_CLASS, /flex-nowrap/);
  assert.match(PLANNER_WORKSPACE_SUBNAV_ROW_CLASS, /overflow-x-auto/);
  assert.doesNotMatch(PLANNER_WORKSPACE_SUBNAV_ROW_CLASS, /flex-wrap/);
  const subNavSource = readFileSync(
    new URL("../app/components/PlannerEventsSubNav.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceLayout.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(subNavSource, /scrollIntoView/);
  assert.match(subNavSource, /WORKSPACE_SUB_NAV_TABS\.map/);
  assert.match(subNavSource, /key=\{tab\.id\}/);
  assert.match(subNavSource, /isWorkspaceSubNavTabVisible/);
  assert.match(subNavSource, /WorkspaceGigsPendingBadge/);
  assert.match(subNavSource, /resolveWorkspaceGigsPendingDisplayCount/);
  assert.doesNotMatch(subNavSource, /reserveSpace/);
  assert.doesNotMatch(subNavSource, /opacity-0[\s\S]*99\+/);
  const workspaceGigsBadgeSource = readFileSync(
    new URL("../app/components/planner/WorkspaceGigsPendingBadge.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspaceGigsBadgeSource, /WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS/);
  assert.doesNotMatch(subNavSource, /from "@\/lib\/design\/ftcDesignSystem"/);
  const designSystemSource = readFileSync(
    new URL("../lib/design/ftcDesignSystem.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(designSystemSource, /PlannerWorkspaceLayout/);
  assert.doesNotMatch(designSystemSource, /AppPageLayout/);
  assert.match(designSystemSource, /plannerWorkspaceTokens/);
  assert.match(layoutSource, /from "@\/lib\/design\/plannerWorkspaceTokens"/);
  assert.match(layoutSource, /resetHeaderStateForPathnameChange/);
  assert.match(layoutSource, /mergeWorkspaceHeaderState/);
  assert.match(
    readFileSync(
      new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
      "utf8",
    ),
    /ftc-workspace-subnav-pill/,
  );
  assert.equal(getEventsAreaSubNavItems("promoter").map((item) => item.href).join(","), "/events,/booking-plans,/calendar");
  assert.equal(getEventsAreaSubNavItems("dj").map((item) => item.href).join(","), "/events,/calendar,/bookings");
  assert.equal(
    getEventsAreaSubNavItems("both").map((item) => item.href).join(","),
    "/events,/booking-plans,/calendar,/bookings",
  );
  assert.equal(getEventsAreaSubNavItems(null).map((item) => item.href).join(","), "/events,/calendar");
}

function testPlannerWorkspaceSecondaryRowRhythm() {
  assert.doesNotMatch(PLANNER_WORKSPACE_HEADER_CLASS, /\bpb-4\b/);
  assert.match(PLANNER_WORKSPACE_SECONDARY_BAND_CLASS, /^pt-4$/);
  assert.match(PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS, /\bmb-4\b/);

  assert.doesNotMatch(EVENTS_LIST_TAB_ROW_CLASS, /\bmb-4\b/);
  assert.doesNotMatch(GIGS_LIST_TAB_ROW_CLASS, /\bmb-4\b/);
  assert.doesNotMatch(EVENT_PLANS_TOOLBAR_ROW_CLASS, /\bmb-4\b/);
  assert.match(EVENTS_LIST_TAB_ROW_CLASS, /md:h-\[2\.375rem\]/);
  assert.match(EVENTS_LIST_TAB_ROW_CLASS, /max-h-\[1\.875rem\]/);
  assert.match(EVENTS_LIST_TAB_ROW_CLASS, /\bw-full\b/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /md:min-h-\[2\.375rem\]/);

  const layoutSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceLayout.tsx", import.meta.url),
    "utf8",
  );
  const gigsChromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    layoutSource,
    /secondaryControlsSlot[\s\S]*PlannerWorkspaceSecondaryControls>\{secondaryControlsSlot\}/,
  );
  assert.match(gigsChromeSource, /<PlannerWorkspaceSecondaryControls>[\s\S]*<GigsWorkspaceTabRow/);
}

function testWorkspaceNavRoleDoesNotDropEventPlansTab() {
  assert.equal(
    WORKSPACE_SUB_NAV_TABS.map((tab) => tab.label).join("|"),
    "Events|Event Plans|Calendar|Gigs",
  );
  assert.equal(WORKSPACE_SUB_NAV_TABS.map((tab) => tab.id).join(","), "events,bookingPlans,calendar,gigs");
  assert.equal(
    WORKSPACE_SUB_NAV_TABS.filter((tab) => isWorkspaceSubNavTabVisible(tab.id, null))
      .map((tab) => tab.label)
      .join("|"),
    "Events|Event Plans|Calendar|Gigs",
  );
  assert.equal(WORKSPACE_SUB_NAV_TABS[1].label, "Event Plans");
  assert.equal(WORKSPACE_SUB_NAV_TABS[2].label, "Calendar");
  assert.equal(mergeWorkspaceNavRole("dj", "both"), "both");
  assert.equal(mergeWorkspaceNavRole("both", "dj"), "both");
  assert.equal(mergeWorkspaceNavRole("dj", null), "dj");
  assert.equal(resolveEventsWorkspaceChromeRole("dj", "promoter"), "promoter");
  assert.equal(
    getEventsAreaSubNavItems(mergeWorkspaceNavRole("dj", "both")).map((item) => item.label).join("|"),
    "Events|Event Plans|Calendar|Gigs",
  );
}

function testWorkspaceActiveHrefIgnoresStaleOverrides() {
  assert.equal(resolveActiveWorkspaceHref("/calendar"), "/calendar");
  assert.equal(resolveActiveWorkspaceHref("/calendar", "/events"), "/calendar");
  assert.equal(resolveActiveWorkspaceHref("/events"), "/events");
  assert.equal(resolveActiveWorkspaceHref("/events", "/calendar"), "/calendar");
  assert.equal(resolveActiveWorkspaceHref("/bookings", "/booking-plans"), "/booking-plans");
  assert.equal(resolveActiveWorkspaceHref("/bookings"), "/bookings");
  assert.equal(resolveActiveWorkspaceHref("/events", "/booking-plans"), "/events");
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
  assert.match(GIGS_TAB_PILL_WITH_COUNT_MODIFIER_CLASS, /ftc-gigs-tab-pill-with-count/);
  assert.equal(GIGS_TAB_PILL_GAP_CLASS, "gap-2");
  assert.match(GIGS_TAB_COUNT_SLOT_CLASS, /tabular-nums/);
  assert.match(GIGS_TAB_COUNT_SLOT_CLASS, /ftc-gigs-tab-count-slot/);
  assert.doesNotMatch(GIGS_TAB_COUNT_SLOT_CLASS, /w-\[2\.25ch\]/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /flex-nowrap/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /justify-between/);
  assert.doesNotMatch(GIGS_LIST_TAB_ROW_CLASS, /flex-wrap/);
}

function testGigsFilterTabsPolish() {
  const tabsSource = readFileSync(
    new URL("../app/components/bookings/DjGigsTabs.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(tabsSource, /showCountBadge: true/);
  assert.match(tabsSource, /showCountBadge: false/);
  assert.match(tabsSource, /showCountBadge \?/);
  assert.doesNotMatch(tabsSource, /showHistoryIcon/);
  assert.doesNotMatch(tabsSource, /HistoryIcon/);
  assert.match(tabsSource, /gigsTabPillClass\(isActive, showCountBadge\)/);
  assert.match(tabsSource, /formatGigsTabCountDisplay/);
  assert.match(tabsSource, /GIGS_TAB_PILL_LABEL_CLASS/);
  assert.match(cssSource, /\.ftc-filter-pill\.ftc-gigs-tab-pill[\s\S]*padding: 0\.375rem 0\.5rem/);
  assert.match(cssSource, /\.ftc-gigs-tab-count-slot[\s\S]*min-width: 2\.75ch/);
}

function testWorkspaceGigsPendingDisplayCountPreservesLastKnown() {
  clearNavigationBadgeCache();
  clearWorkspaceGigsDisplaySession();

  assert.equal(
    resolveWorkspaceGigsPendingDisplayCount({
      canViewGigs: true,
      userId: "user-a",
      role: "dj",
      providerCount: 1,
      badgesReady: true,
    }),
    1,
  );

  assert.equal(
    resolveWorkspaceGigsPendingDisplayCount({
      canViewGigs: true,
      userId: "user-a",
      role: "dj",
      providerCount: 0,
      badgesReady: true,
    }),
    1,
    "transient provider zero must not clear a confirmed session count",
  );

  writeRuntimeGigsPendingCount("user-a", "dj", 0);
  assert.equal(
    resolveWorkspaceGigsPendingDisplayCount({
      canViewGigs: true,
      userId: "user-a",
      role: "dj",
      providerCount: 0,
      badgesReady: true,
    }),
    0,
    "cached zero must replace the displayed count",
  );
}

function testGigsTabCountDisplayCap() {
  assert.equal(GIGS_TAB_COUNT_MAX_DISPLAY, 99);
  assert.equal(formatGigsTabCountDisplay(0), null);
  assert.equal(formatGigsTabCountDisplay(12), "12");
  assert.equal(formatGigsTabCountDisplay(99), "99");
  assert.equal(formatGigsTabCountDisplay(100), "99+");
  assert.equal(formatGigsTabCountAriaCount(100), "more than 99");
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
  const rowSource = readFileSync(
    new URL("../app/components/events/EventsListTabRow.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /removeLabel="Delete"/);
  assert.match(source, /selectAllLabel="ALL"/);
  assert.match(source, /canToggleAll=\{canToggleAllHistorySelection\}/);
  assert.match(source, /canDelete=\{canDeleteHistorySelection\}/);
  assert.match(source, /selectAllToggle/);
  assert.match(source, /centeredSelectAll/);
  assert.match(source, /cancelVariant="backIcon"/);
  assert.match(source, /tabRowEmbedded/);
  const bulkSource = readFileSync(
    new URL("../app/components/history/HistoryBulkManage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bulkSource, /tabRowEmbedded[\s\S]*w-auto max-w-full/);
  assert.match(bulkSource, /HISTORY_SELECTION_EMBEDDED_PANEL_CLASS/);
  assert.match(rowSource, /selectionMode \?/);
  assert.match(rowSource, /flex shrink-0 items-center justify-end/);
  assert.match(rowSource, /min-w-0 flex-1 overflow-hidden/);
  assert.doesNotMatch(rowSource, /justify-end overflow-hidden[\s\S]*selectionToolbar/);
}

function testEventCreateFormTextFieldMaxLength() {
  const longName = "a".repeat(MAX_EVENT_NAME_LENGTH + 1);
  const errors = getEventFormFieldErrors({
    name: longName,
    venue: "Venue",
    eventDate: getTodayDateKey(),
    setTime: `18:00 ${SET_TIME_RANGE_JOINER} 19:00`,
  });
  assert.match(errors.name ?? "", /30 characters or fewer/);

  assert.throws(
    () =>
      assertEventFormTextFieldLimits({
        name: longName,
        venue: "Venue",
      }),
    /30 characters or fewer/,
  );

  const panelSource = readFileSync(
    new URL("../app/components/booking/SendBookingRequestsPanel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panelSource, /maxLength=\{MAX_BOOKING_DJ_SEARCH_QUERY_LENGTH\}/);
  assert.match(panelSource, /MAX_BOOKING_DJ_SEARCH_QUERY_LENGTH = 30/);

  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(eventsSource, /maxLength=\{MAX_EVENT_NAME_LENGTH\}/);
  assert.match(eventsSource, /maxLength=\{MAX_EVENT_VENUE_LENGTH\}/);

  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(eventDetailSource, /maxLength=\{MAX_EVENT_NAME_LENGTH\}/);
  assert.match(eventDetailSource, /maxLength=\{MAX_EVENT_VENUE_LENGTH\}/);

  assert.equal(PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH, 30);
  assert.equal(MAX_EVENT_NAME_LENGTH, MAX_EVENT_VENUE_LENGTH);

  const planErrors = getBookingPlanFormFieldErrors({
    name: "a".repeat(31),
    eventName: "Event",
    venue: "Venue",
  });
  assert.match(planErrors.name ?? "", /Plan name must be 30 characters or fewer/);

  assert.throws(
    () =>
      assertBookingPlanFormTextFieldLimits({
        name: "Plan",
        eventName: "Event",
        venue: "v".repeat(31),
      }),
    /Venue must be 30 characters or fewer/,
  );

  assert.equal(applyTextInputLimit("short", "x".repeat(31), 30), "x".repeat(30));
  assert.equal(applyTextInputLimit("x".repeat(35), "x".repeat(34), 30), "x".repeat(34));

  const bookingPlansSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bookingPlansSource, /maxLength=\{MAX_BOOKING_PLAN_NAME_LENGTH\}/);
  assert.match(bookingPlansSource, /getVisibleBookingPlanFormFieldErrors/);
  assert.match(bookingPlansSource, /planFormSaveAttempted/);
  assert.match(bookingPlansSource, /markPlanFormFieldTouched/);

  assert.deepEqual(
    getVisibleBookingPlanFormFieldErrors(
      getBookingPlanFormFieldErrors({ name: "", eventName: "", venue: "" }),
      { saveAttempted: false, touched: {} },
    ),
    {},
  );

  assert.equal(
    getVisibleBookingPlanFormFieldErrors(
      getBookingPlanFormFieldErrors({ name: "", eventName: "Gig", venue: "Club" }),
      { saveAttempted: false, touched: { name: true } },
    ).name,
    "Enter a plan name",
  );

  const bookingsSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bookingsSource, /maxLength=\{MAX_EVENT_NAME_LENGTH\}/);
  assert.match(bookingsSource, /getEventNameVenueFieldErrors/);

  const plannerUiSource = readFileSync(
    new URL("../app/components/planner/PlannerUi.tsx", import.meta.url),
    "utf8",
  );
  assert.match(plannerUiSource, /applyTextInputLimit\(value, next, maxLength\)/);
}

function testEventPlanPickerClearsSelectionOnFormBack() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /if \(selectedPlanId\) \{\s*setSelectedPlanId\(null\);\s*setCreateStep\("pick-plan"\)/);
}

function testEventFallbackColourSelectionRadioBehaviour() {
  const source = readFileSync(
    new URL("../app/components/events/EventFallbackColourField.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /Preview tile colour/);
  assert.doesNotMatch(source, /ftc-event-colour-preview/);
  assert.match(source, /onClick=\{\(\) => onChange\(option\.key\)\}/);
  assert.doesNotMatch(source, /value === option\.key \? null : option\.key/);
}

function testEventDetailLoadUsesParallelQueriesAndListCache() {
  const pageSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  const cacheSource = readFileSync(
    new URL("../lib/events/eventDetailCache.ts", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(cacheSource, /readCachedEventSummaryById/);
  assert.match(pageSource, /readCachedEventSummaryById/);
  assert.match(
    pageSource,
    /const \[loadedEvent, bookings, unlock\] = await Promise\.all\(\[\s*getEventById\(eventId\),\s*listBookingRequestsForEvent\(eventId\),\s*getCrewChatUnlockStateForEvent\(eventId\),/,
  );
  assert.match(pageSource, /showEventDetailLoadingShell/);
  assert.match(
    pageSource,
    /\(loadingEvent && !event\) \|\|\s*\(shouldApplyMobileScrollGate && !mobileScrollReady\)/,
  );
  assert.doesNotMatch(pageSource, /mobileScrollGateClass/);
  assert.match(pageSource, /lineupLoading \? \(\s*<EventDetailPlannerLowerSectionsSkeleton/);
  assert.match(skeletonSource, /data-event-detail-hero/);
  assert.match(skeletonSource, /EventDetailPlannerLowerSectionsSkeleton/);
  assert.match(skeletonSource, /min-h-\[3\.25rem\]/);
}

function testMobileSoftwareKeyboardHidesBottomNavigation() {
  const navSource = readFileSync(
    new URL("../app/components/AppNavigation.tsx", import.meta.url),
    "utf8",
  );
  const keyboardSource = readFileSync(
    new URL("../lib/navigation/mobileSoftwareKeyboard.ts", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(navSource, /ftc-mobile-nav-bar/);
  assert.match(navSource, /subscribeMobileSoftwareKeyboard/);
  assert.match(navSource, /syncMobileSoftwareKeyboardDocumentState/);
  assert.match(keyboardSource, /mobileKeyboardSessionActive/);
  assert.match(keyboardSource, /readMobileKeyboardHeightGap/);
  assert.match(keyboardSource, /window\.innerHeight - viewport\.height/);
  assert.doesNotMatch(
    keyboardSource,
    /window\.innerHeight - viewport\.height - viewport\.offsetTop/,
  );
  assert.match(cssSource, /html\[data-mobile-keyboard-open\] \.ftc-mobile-nav-bar/);
  assert.match(cssSource, /html\[data-mobile-keyboard-open\] \.ftc-mobile-nav-offset/);
}

function testEventsActiveStatusPillsSingleRowLayout() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /EVENT_LIST_CARD_SUMMARY_ACTIVE_SINGLE_ROW_CLASS/);
  assert.match(source, /flex-wrap items-center justify-start gap-0\.5/);
  assert.match(source, /compactActiveRow/);
  assert.match(source, /eventListCardStatusPillsSingleRow = isPlanner/);
  assert.match(source, /statusPillsSingleRow=\{eventListCardStatusPillsSingleRow\}/);
  assert.match(source, /eventListCardDimCancelledAppearance = !isHistoryTab/);
  assert.match(source, /dimCancelledAppearance=\{eventListCardDimCancelledAppearance\}/);
}

function testEventsCreateFlowTabPillNavigation() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const controlsSource = readFileSync(
    new URL("../app/components/events/EventsListTabControls.tsx", import.meta.url),
    "utf8",
  );
  const tabLinkHandler =
    source.match(/function handleEventsListTabLinkClick\([\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(tabLinkHandler.length > 0, "handleEventsListTabLinkClick not found");
  assert.match(controlsSource, /eventsListTabPillClass\(!createOpen && !isHistoryTab\)/);
  assert.match(controlsSource, /eventsListTabPillClass\(!createOpen && isHistoryTab\)/);
  assert.match(source, /<EventsListTabControls/);
  assert.match(tabLinkHandler, /createOpen && !isCalendarCreateFlow/);
  assert.match(
    tabLinkHandler,
    /if \(!isTargetTab\) \{\s*const href = buildEventsListHref\(tab\);\s*window\.history\.pushState\(window\.history\.state, "", href\);\s*handleEventsListTabChange\(\);\s*\}\s*closeCreateFlow\(\);/,
  );
  assert.match(tabLinkHandler, /window\.history\.pushState\(window\.history\.state, "", href\)/);
  assert.doesNotMatch(tabLinkHandler, /router\.(push|replace)\(/);
  assert.match(
    source,
    /resolveEventsListTabParam\(null, initialTab, window\.location\.search\)/,
  );
  assert.match(source, /onTabLinkClick=\{handleEventsListTabLinkClick\}/);
}

function testEventsListTabSwitchUsesClientHistoryWithoutRouterNavigation() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const tabLinkHandler =
    source.match(/function handleEventsListTabLinkClick\([\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(tabLinkHandler.length > 0, "handleEventsListTabLinkClick not found");
  assert.match(
    tabLinkHandler,
    /event\.preventDefault\(\);[\s\S]*window\.history\.pushState\(window\.history\.state, "", href\)/,
  );
  assert.doesNotMatch(tabLinkHandler, /router\.(push|replace)\(/);
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*if \(!roleReady \|\| isCalendarCreateFlow\)/,
  );
  assert.doesNotMatch(
    source,
    /isHistoryTab[\s\S]{0,120}loadEvents\(/,
  );
}

function testEventsCreateEventHiddenDuringHistorySelectionToolbar() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /historyTabRowSelectionMode/);
  assert.match(source, /workspaceHeaderActions/);
  assert.match(source, /hideEventsHeaderCreateForCalendarFlow/);
  assert.match(source, /isCalendarWorkspaceHost/);
  assert.match(source, /buildPlannerCalendarCreateHref/);
  assert.match(source, /EVENTS_HEADER_CREATE_EVENT_PLACEHOLDER/);
  assert.match(source, /actions=\{workspaceHeaderActions\}/);
}

function testEventPlansSelectionToolbarMatchesHistory() {
  const source = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /removeLabel="Delete"/);
  assert.match(source, /selectAllLabel="ALL"/);
  assert.match(source, /canToggleAll=\{canToggleAllPlanSelection\}/);
  assert.match(source, /canDelete=\{canDeletePlanSelection\}/);
  assert.match(source, /selectAllToggle/);
  assert.match(source, /centeredSelectAll/);
  assert.match(source, /cancelVariant="backIcon"/);
  assert.match(source, /toggleSelectAllForIds/);
  assert.match(source, /planBulkManage\.selectionMode/);
  assert.match(source, /pointer-events-none invisible \$\{EVENT_PLANS_CREATE_BUTTON_CLASS\}/);
  assert.doesNotMatch(source, /removeLabel="Delete selected"/);
  assert.doesNotMatch(source, /selectAllLabel="Select all"/i);
}

function testEventPlansSelectionToolbarRowMatchesEventsHistory() {
  const source = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /export function EventsListTabPillWidthSpacer/);
  assert.match(source, /selectionMode[\s\S]*<EventsListTabRow/);
  assert.match(source, /<EventsListTabPillWidthSpacer \/>/);
}

function testEventPlansListLoadUsesCacheAndPrefetch() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  const subNavSource = readFileSync(
    new URL("../app/components/PlannerEventsSubNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(pageSource, /readBookingPlansListCache\(\) \?\? \[\]/);
  assert.match(pageSource, /readBookingPlansListCache\(\) === null/);
  assert.match(pageSource, /if \(cachedPlans\) \{\s*setPlans\(cachedPlans\);\s*setLoadingPlans\(false\)/);
  assert.match(pageSource, /writeBookingPlansListCache\(rows\)/);
  assert.match(pageSource, /writeBookingPlansListCache\(nextPlans\)/);
  assert.match(subNavSource, /ensureBookingPlansListPrefetched/);
}

function testCalendarLoadUsesCacheAndPrefetch() {
  const plannerCalendarSource = readFileSync(
    new URL("../app/components/PlannerCalendar.tsx", import.meta.url),
    "utf8",
  );
  const djCalendarSource = readFileSync(
    new URL("../app/components/DjAvailabilityCalendar.tsx", import.meta.url),
    "utf8",
  );
  const bothCalendarSource = readFileSync(
    new URL("../app/components/BothRoleCalendarView.tsx", import.meta.url),
    "utf8",
  );
  const subNavSource = readFileSync(
    new URL("../app/components/PlannerEventsSubNav.tsx", import.meta.url),
    "utf8",
  );

  assert.match(plannerCalendarSource, /readPlannerCalendarItemsCache\(\) \?\? \[\]/);
  assert.match(plannerCalendarSource, /readPlannerCalendarItemsCache\(\) === null/);
  assert.match(
    plannerCalendarSource,
    /if \(cachedItems !== null\) \{\s*setItems\(cachedItems\);\s*setLoading\(false\)/,
  );
  assert.match(plannerCalendarSource, /writePlannerCalendarItemsCache\(nextItems\)/);
  assert.doesNotMatch(plannerCalendarSource, /\[loadCalendar, searchParams\]/);
  assert.doesNotMatch(plannerCalendarSource, /scrollIntoView/);
  assert.match(plannerCalendarSource, /usePlannerCalendarItemNavigation/);
  assert.match(plannerCalendarSource, /readBookingPlansListCache\(\)/);

  assert.match(djCalendarSource, /readDjGigsCalendarCache\(\)/);
  assert.match(
    djCalendarSource,
    /if \(cachedSnapshot !== null\) \{\s*setAvailabilityEntries\(cachedSnapshot\.entries\)/,
  );
  assert.match(djCalendarSource, /writeDjGigsCalendarCache\(\{ entries, bookings: activeBookings \}\)/);

  assert.match(bothCalendarSource, /activeTab === "planner" \? \(/);
  assert.doesNotMatch(bothCalendarSource, /display:\s*contents|"contents"/);

  assert.match(subNavSource, /ensurePlannerCalendarItemsPrefetched/);
  assert.match(subNavSource, /ensureDjGigsCalendarPrefetched/);
}

function testBookingsUsePlanWorkspaceTabNavigation() {
  const bookingsSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const subNavLinkSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
    "utf8",
  );

  assert.match(bookingsSource, /interceptWorkspaceTabNavigation=\{/);
  assert.match(bookingsSource, /handleWorkspaceTabNavigate/);
  assert.match(bookingsSource, /resetCreateFlowState\(\)/);
  assert.match(bookingsSource, /buildGigsWorkspaceIncomingHref\(\)/);
  assert.match(subNavLinkSource, /interceptNavigate\?\.\(destinationHref\)/);
  assert.match(subNavLinkSource, /if \(interceptNavigate\)/);
}

function testCalendarScrollStabilityOnTabSwitch() {
  const calendarPageSource = readFileSync(
    new URL("../app/(planner-workspace)/calendar/page.tsx", import.meta.url),
    "utf8",
  );
  const subNavLinkSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
    "utf8",
  );

  assert.match(calendarPageSource, /pendingCalendarViewScrollYRef/);
  assert.match(calendarPageSource, /window\.scrollTo\(0, scrollY\)/);
  assert.match(subNavLinkSource, /if \(isActive\) \{\s*event\.preventDefault\(\)/);
}

function testCalendarRouteLoadingSkipsFullSkeletonCard() {
  const routeLoadingSource = readFileSync(
    new URL("../app/(planner-workspace)/calendar/loading.tsx", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  const calendarPageSource = readFileSync(
    new URL("../app/(planner-workspace)/calendar/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routeLoadingSource, /CalendarPageLoadingShell/);
  const calendarLoadingShellSource =
    skeletonSource.match(/export function CalendarPageLoadingShell\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.notEqual(calendarLoadingShellSource, "");
  assert.match(calendarLoadingShellSource, /CalendarViewTabs/);
  assert.doesNotMatch(calendarLoadingShellSource, /PlannerCalendarLoadingCard/);
  assert.doesNotMatch(calendarLoadingShellSource, /DjCalendarLoadingCard/);
  assert.doesNotMatch(calendarPageSource, /PlannerCalendarLoadingCard/);
  assert.doesNotMatch(calendarPageSource, /DjCalendarLoadingCard/);
}

function testEventPlansActionRowLayout() {
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(skeletonSource, /justify-center overflow-hidden/);
  assert.match(skeletonSource, /EVENTS_LIST_TAB_FEEDBACK_CLASS} w-full text-center/);
  assert.match(pageSource, /const showEventPlansToolbar = !formOpen;/);
}

function testEventPlansInlineFeedbackMatchesEventsHistory() {
  const plansSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(plansSource, /useInlineTabFeedbackDismiss/);
  assert.match(plansSource, /feedbackMessage=\{successMessage\}/);
  assert.match(plansSource, /feedbackFading=\{successFeedbackFading\}/);
  assert.doesNotMatch(
    plansSource,
    /rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary/,
  );
  assert.equal(INLINE_TAB_FEEDBACK_FADE_MS, 2700);
  assert.equal(INLINE_TAB_FEEDBACK_CLEAR_MS, 3000);
  assert.match(eventsSource, /setTimeout\(\(\) => setHistoryFeedbackFading\(true\), 2700\)/);
  assert.match(eventsSource, /3000\)/);
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

function testEventsListTabControlsMatchLoadingShellAndLoadedPage() {
  const clientSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const controlsSource = readFileSync(
    new URL("../app/components/events/EventsListTabControls.tsx", import.meta.url),
    "utf8",
  );
  const appLoadingSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(clientSource, /<EventsListTabControls/);
  assert.match(clientSource, /loadingShell=\{!eventsListReady\}/);
  assert.match(
    clientSource,
    /loadingEvents && events\.length === 0/,
  );
  assert.match(
    clientSource,
    /seedEventsListStateFromCache/,
  );
  assert.match(
    appLoadingSource,
    /hasCachedEventsList[\s\S]*EventListSkeleton/,
  );
  assert.match(controlsSource, /FTC_EVENTS_LIST_TAB_PILL_ROW_CLASS/);
  assert.match(controlsSource, /eventsListTabPillClass/);
  assert.match(controlsSource, /resolveEventsListActiveTabLabelForWorkspaceChrome\(isPlanner/);
  assert.match(controlsSource, /loadingShell/);
  assert.equal(
    resolveEventsListActiveTabLabelForWorkspaceChrome(false, { loadingShell: true }),
    EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER,
  );
  assert.equal(
    resolveEventsListActiveTabLabelForWorkspaceChrome(false, {
      loadingShell: false,
      guardRole: "both",
    }),
    "Active",
  );
  assert.doesNotMatch(controlsSource, /resolveEventsListActiveTabLabel\(isPlanner\)/);

  const loadingActive = resolveEventsListTabRowChrome({
    isPlanner: true,
    isHistoryTab: false,
    createOpen: false,
    selectionMode: false,
    historyLoadSettled: true,
    visibleHistoryEventCount: 0,
    loadingShell: true,
  });
  const loadedActiveBeforeFetch = resolveEventsListTabRowChrome({
    isPlanner: true,
    isHistoryTab: false,
    createOpen: false,
    selectionMode: false,
    historyLoadSettled: false,
    visibleHistoryEventCount: 0,
  });
  assert.deepEqual(loadingActive, loadedActiveBeforeFetch);

  const loadingHistory = resolveEventsListTabRowChrome({
    isPlanner: true,
    isHistoryTab: true,
    createOpen: false,
    selectionMode: false,
    historyLoadSettled: true,
    visibleHistoryEventCount: 0,
    loadingShell: true,
  });
  const loadedHistoryBeforeFetch = resolveEventsListTabRowChrome({
    isPlanner: true,
    isHistoryTab: true,
    createOpen: false,
    selectionMode: false,
    historyLoadSettled: false,
    visibleHistoryEventCount: 0,
  });
  assert.deepEqual(loadingHistory, loadedHistoryBeforeFetch);
  assert.equal(resolveEventsListActiveTabLabel(true), EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER);
  assert.equal(resolveEventsListActiveTabLabel(true), "Active");
}

function testEventsRouteLoadingIsListAreaOnly() {
  const loadingSource = readFileSync(
    new URL("../app/(planner-workspace)/events/loading.tsx", import.meta.url),
    "utf8",
  );
  const routeShellSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsRouteLoadingShell.tsx", import.meta.url),
    "utf8",
  );
  const listAreaSource = readFileSync(
    new URL("../app/components/events/EventsListAreaLoading.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/events/page.tsx", import.meta.url),
    "utf8",
  );
  const appLoadingSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );

  assert.match(loadingSource, /EventsRouteLoadingShell/);
  assert.match(routeShellSource, /EventsListAreaLoading/);
  assert.doesNotMatch(routeShellSource, /EventsPageLoadingShell/);
  assert.match(listAreaSource, /EventsPageLoadingShell/);
  assert.doesNotMatch(listAreaSource, /EventListSkeleton/);
  assert.match(listAreaSource, /readCachedNavRole/);
  assert.doesNotMatch(pageSource, /Suspense/);
  assert.doesNotMatch(pageSource, /EventsPageLoadingFallback/);
  assert.match(
    appLoadingSource,
    /pathname === "\/events"[\s\S]*EventsPageLoadingShell/,
  );
  assert.match(
    appLoadingSource,
    /export function EventsPageLoadingShell[\s\S]*resolveEventsWorkspaceChromeRole[\s\S]*EventsWorkspaceCreateEventAction disabled/,
  );
  assert.match(
    appLoadingSource,
    /EventListSkeleton[\s\S]*ftc-gigs-list[\s\S]*FTC_LIST_GAP_CLASS/,
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
  assert.equal(resolveGigsListTabParam("history", null, ""), "pending");
  assert.equal(resolveGigsListTabParam("history", null, "?tab=history"), "history");

  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "history",
      locationPathname: "/events",
      locationSearch: "?tab=history",
    }),
    "pending",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "history",
      locationPathname: "/bookings",
      locationSearch: "",
    }),
    "pending",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "history",
      locationPathname: "/bookings",
      locationSearch: "?tab=history",
    }),
    "history",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "accepted",
      locationPathname: null,
      locationSearch: null,
    }),
    "accepted",
  );
}

function testWorkspaceGigsTabOpensIncomingWithoutEventsQuery() {
  assert.equal(buildGigsWorkspaceIncomingHref(), "/bookings");
  assert.equal(buildWorkspaceSubNavDestinationHref(EVENTS_AREA_SUB_NAV.gigs.href), "/bookings");
  assert.equal(
    buildWorkspaceSubNavDestinationHref(EVENTS_AREA_SUB_NAV.gigs.href, "/calendar"),
    "/bookings",
  );
  assert.equal(buildWorkspaceSubNavDestinationHref(EVENTS_AREA_SUB_NAV.events.href), "/events");
  assert.equal(
    buildWorkspaceSubNavDestinationHref(EVENTS_AREA_SUB_NAV.events.href, "/calendar?view=dj"),
    "/events",
  );
  assert.equal(
    buildWorkspaceSubNavDestinationHref(EVENTS_AREA_SUB_NAV.bookingPlans.href, "/calendar"),
    "/booking-plans",
  );
  assert.equal(
    buildWorkspaceSubNavDestinationHref(
      EVENTS_AREA_SUB_NAV.bookingPlans.href,
      "/booking-plans",
    ),
    "/booking-plans",
  );

  const subNavSource = readFileSync(
    new URL("../app/components/PlannerEventsSubNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(subNavSource, /href=\{tab\.href\}/);
}

function testCalendarWorkspaceClearsStaleWorkspaceIntercept() {
  const layoutSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceLayout.tsx", import.meta.url),
    "utf8",
  );
  const subNavLinkSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
    "utf8",
  );
  const bothCalendarSource = readFileSync(
    new URL("../app/components/BothRoleCalendarView.tsx", import.meta.url),
    "utf8",
  );
  const monthNavSource = readFileSync(
    new URL("../app/components/CalendarMonthNav.tsx", import.meta.url),
    "utf8",
  );

  const tokensSource = readFileSync(
    new URL("../lib/design/plannerWorkspaceTokens.ts", import.meta.url),
    "utf8",
  );

  assert.match(layoutSource, /workspaceIntercept/);
  assert.match(layoutSource, /interceptWorkspaceTabNavigation=\{workspaceIntercept\}/);
  assert.match(tokensSource, /PLANNER_WORKSPACE_HEADER_CLASS[\s\S]*sticky top-0 z-50/);
  assert.match(tokensSource, /PLANNER_WORKSPACE_BELOW_HEADER_CLASS[\s\S]*relative z-0/);
  assert.match(layoutSource, /PLANNER_WORKSPACE_HEADER_CLASS/);
  assert.match(layoutSource, /PLANNER_WORKSPACE_BELOW_HEADER_CLASS/);
  assert.match(subNavLinkSource, /isCalendarWorkspacePath\(pathname\)/);
  assert.match(subNavLinkSource, /window\.location\.assign\(destinationHref\)/);
  assert.match(subNavLinkSource, /router\.push\(destinationHref/);
  assert.match(bothCalendarSource, /relative isolate z-0 flex flex-col/);
  assert.match(monthNavSource, /grid-cols-1 grid-rows-1/);
  assert.equal(isCalendarWorkspacePath("/calendar"), true);
  assert.equal(isCalendarWorkspacePath("/calendar/foo"), true);
  assert.equal(isCalendarWorkspacePath("/events"), false);
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

function testCompactCalendarEventVenueTitleTruncates() {
  const mobileUiSource = readFileSync(
    new URL("../app/components/calendar/calendarMobileUi.tsx", import.meta.url),
    "utf8",
  );
  const compactTitleSource = readFileSync(
    new URL("../lib/calendar/compactCalendarEventVenueTitle.ts", import.meta.url),
    "utf8",
  );
  const plannerCalendarSource = readFileSync(
    new URL("../app/components/PlannerCalendar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(mobileUiSource, /CompactCalendarEventVenueTitle/);
  assert.match(mobileUiSource, /doesFullCalendarTitleFit/);
  assert.match(mobileUiSource, /ResizeObserver/);
  assert.doesNotMatch(mobileUiSource, /formatPlannerCalendarItemHeadline/);
  assert.doesNotMatch(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_ROW_CLASS/);
  assert.doesNotMatch(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_EVENT_CLASS/);
  assert.doesNotMatch(mobileUiSource, /formatCompactCalendarEventVenueTitle/);
  assert.match(mobileUiSource, /overflow-hidden text-ellipsis whitespace-nowrap/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_CLASS[\s\S]*w-full max-w-full min-w-0/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_SLOT_CLASS[\s\S]*min-w-0 w-0 flex-1/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_BADGE_SLOT_CLASS[\s\S]*basis-\[5\.75rem\]/);
  assert.match(compactTitleSource, /formatPlannerCalendarItemHeadline/);
  assert.match(compactTitleSource, /doesFullCalendarTitleFit/);
  assert.doesNotMatch(compactTitleSource, /\.\.\./);
  assert.doesNotMatch(compactTitleSource, /slice\s*\(/);
  assert.match(plannerCalendarSource, /CompactCalendarEventVenueTitle/);

  assert.equal(
    formatPlannerCalendarItemHeadline("Warehouse Session", "Revolver"),
    "Warehouse Session · Revolver",
  );
  assert.equal(formatPlannerCalendarItemHeadline("Warehouse Session", ""), "Warehouse Session");
  assert.equal(formatPlannerCalendarItemHeadline("Warehouse Session", "   "), "Warehouse Session");

  assert.equal(resolveCompactCalendarEventOnlyTitle("  Beta  "), "Beta");
  assert.equal(resolveCompactCalendarEventOnlyTitle(""), "Untitled event");
  assert.equal(
    resolveCompactCalendarDisplayTitle("Warehouse Session", "Revolver", true),
    "Warehouse Session · Revolver",
  );
  assert.equal(
    resolveCompactCalendarDisplayTitle("Warehouse Session", "Revolver", false),
    "Warehouse Session",
  );
  assert.equal(
    resolveCompactCalendarDisplayTitle("Warehouse Session", "", true),
    "Warehouse Session",
  );
}

function testCalendarOriginCreateLinksStayOnCalendarRoute() {
  assert.match(buildPlannerCreateEventHref("2027-03-15"), /^\/calendar\?/);
  assert.match(buildPlannerCreateEventFromPlansHref("2027-03-15"), /^\/calendar\?/);
  assert.match(buildPlannerCreateEventHref("2027-03-15"), /create=calendar/);
  assert.match(buildPlannerCreateEventFromPlansHref("2027-03-15"), /create=calendar-plans/);
  assert.doesNotMatch(buildPlannerCreateEventHref("2027-03-15"), /^\/events/);

  const calendarPageSource = readFileSync(
    new URL("../app/(planner-workspace)/calendar/page.tsx", import.meta.url),
    "utf8",
  );
  const eventsClientSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(calendarPageSource, /EventsCalendarOriginCreateClient/);
  assert.match(calendarPageSource, /isCalendarOriginCreateParam/);
  assert.match(
    eventsClientSource,
    /createParam === "calendar" \|\| createParam === "calendar-plans"[\s\S]*isCalendarWorkspaceHost[\s\S]*return;/,
  );
  assert.doesNotMatch(
    eventsClientSource,
    /isCalendarWorkspaceHost && createOpen && isCalendarOriginCreateParam\(createParam\)/,
  );
  assert.match(eventsClientSource, /createFlowPanelTitle/);
  assert.match(eventsClientSource, /createStep === "pick-plan" \? "Event Plans" : "Create event"/);
}

async function main() {
  testPastEventDatesAreBlocked();
  testFutureEventDatesAreAllowed();
  testIncompleteSetTimeIsBlocked();
  testEventSetTimeRangeValidation();
  testApplyEventSetTimeStartChangeClearsInvalidFinish();
  testPastPickerDatesAreRejected();
  testWheelTimeBeforeMinHelpers();
  testEventTimePickerDefaultsForToday();
  testResolveEventTimePickerOpenValueUsesConfirmedSelection();
  testEventsCreateFormTimePickerWiring();
  testApplyEventDateFieldChangeClearsPartialSetTime();
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
  testPlannerCalendarItemHref();
  testAcceptedFutureGigAppearsInConfirmed();
  testAcceptedPastGigAppearsInHistory();
  testPendingGigAppearsOnlyInIncoming();
  testConfirmedListUpdatesAfterAcceptance();
  testTodaysFutureGigIsNotHistorical();
  testLegacyEventDatesResolveForGigTabs();
  testConfirmedTabAliasParsesFromUrl();
  testEventPlanUseButtonKeepsStableCardLayout();
  testGigsTabRowKeepsStableCountSlots();
  testGigsFilterTabsPolish();
  testWorkspaceGigsPendingDisplayCountPreservesLastKnown();
  testGigsTabCountDisplayCap();
  testEventsHistoryBulkSelectAllTogglesSelection();
  testResolvePlannerHistoryHideEventIds();
  testEventsHistorySelectionToolbarUsesDeleteLabel();
  testEventsCreateFlowTabPillNavigation();
  testBookingsUsePlanWorkspaceTabNavigation();
  testEventsListTabSwitchUsesClientHistoryWithoutRouterNavigation();
  testEventsCreateEventHiddenDuringHistorySelectionToolbar();
  testEventDetailLoadUsesParallelQueriesAndListCache();
  testMobileSoftwareKeyboardHidesBottomNavigation();
  testEventsActiveStatusPillsSingleRowLayout();
  testEventCreateFormTextFieldMaxLength();
  testEventFallbackColourSelectionRadioBehaviour();
  testEventPlanPickerClearsSelectionOnFormBack();
  testEventPlansSelectionToolbarMatchesHistory();
  testEventPlansSelectionToolbarRowMatchesEventsHistory();
  testEventPlansListLoadUsesCacheAndPrefetch();
  testCalendarLoadUsesCacheAndPrefetch();
  testCalendarScrollStabilityOnTabSwitch();
  testCalendarRouteLoadingSkipsFullSkeletonCard();
  testCalendarOriginCreateLinksStayOnCalendarRoute();
  testCompactCalendarEventVenueTitleTruncates();
  testEventPlansActionRowLayout();
  testEventPlansInlineFeedbackMatchesEventsHistory();
  testEventsHistoryTrashVisibleUsesRenderedHistoryList();
  testEventsListTabControlsMatchLoadingShellAndLoadedPage();
  testEventsRouteLoadingIsListAreaOnly();
  testGigsTabCountsDeriveFromSameBookingSnapshot();
  testGigsInnerTabSelectionFollowsRouteImmediately();
  testWorkspaceGigsTabOpensIncomingWithoutEventsQuery();
  testCalendarWorkspaceClearsStaleWorkspaceIntercept();
  testGigsWorkspaceChromeStateSyncAvoidsNoOpUpdates();
  testBookingsRouteMountsPersistentGigsSecondaryBand();
  testWorkspaceSubNavLayoutIsStable();
  testPlannerWorkspaceSecondaryRowRhythm();
  testWorkspaceNavRoleDoesNotDropEventPlansTab();
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
