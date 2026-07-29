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
import {
  countWithdrawalOtherReasonLines,
  MAX_WITHDRAWAL_OTHER_REASON_LINES,
  sanitizeWithdrawalOtherReason,
  sanitizeWithdrawalOtherReasonValue,
} from "../lib/booking/withdrawalReasonDetails";
import { MAX_WITHDRAWAL_OTHER_REASON_LENGTH } from "../lib/bookingRequests";
import {
  formatPlannerCalendarItemHeadline,
  isDjGigsCalendarBulkSelectableDateKey,
  linkPlannerCalendarSentBookingsToEvents,
  sortPlannerCalendarAgendaItems,
  type CalendarItem,
} from "../lib/calendar";
import {
  resolveCompactCalendarDisplayTitle,
  resolveCompactCalendarEventOnlyTitle,
} from "../lib/calendar/compactCalendarEventVenueTitle";
import { readFileSync } from "node:fs";
import { canScrollInTouchDirection } from "../lib/ui/modalScrollContainment";
import { formatRateDisplay, formatIntegerRateDisplay } from "../lib/bookingRate";
import {
  getEventDateValidationError,
  getEventSetTimeValidationError,
  getTodayDateKey,
  guardEventDatePickerChange,
  hasBookingFieldTriggerLabelValue,
  isBookingFieldTriggerPlaceholder,
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
  buildBookingSendResultMessage,
  filterActiveBookings,
  filterDjGigsByTab,
  filterHistoryCancelledBookings,
  filterVisibleEventLineupBookings,
  countDjGigsByTab,
  formatBookingRequestMessage,
  getActiveEventLineupStats,
  getDmBookingCardOfferSummary,
  getProposalDeclinedDmMessage,
  getProposalReviewSecondaryActionLabel,
  isDmBookingActionRequired,
  isDjGigPastAccepted,
  resolveBookingDateKey,
  sortDjGigsCalendarAgendaBookings,
} from "../lib/bookingRequests";
import { getAppendedMessageIds } from "../lib/useChatScroll";
import {
  computeBookingCardAlignScrollTop,
  computeMinimumScrollToRevealBottom,
  computePinnedBottomScrollTop,
  computeScrollTopAfterShrink,
  captureBookingCardExpandScrollContext,
} from "../lib/dm/dmBookingCardExpandScroll";
import { CHAT_NEAR_BOTTOM_THRESHOLD_PX } from "../lib/useChatScroll";
import { computeChatMessageCenterScrollTop } from "../lib/dm/chatBookingTarget";
import {
  applyManualMessageListScrollDelta,
  computeManualMessageListScrollTop,
  isPinnedToNewestMessages,
  shouldDismissComposerKeyboardAtBottom,
} from "../lib/dm/composerKeyboardDismissPolicy";
import {
  isValidMessageHistoryGestureStart,
  shouldStabilizeComposerTouchMove,
} from "../lib/dm/messageHistoryGestureTarget";
import {
  applyMomentumFriction,
  applyMomentumScrollStep,
  computeReleaseScrollVelocityPxPerMs,
  shouldStartMomentumScroll,
} from "../lib/dm/composerMessageListMomentumScroll";
import {
  buildDmConversationTimestampLayout,
  classifyDmConversationMessageKind,
  DM_CHAT_MEANINGFUL_TIME_GAP_MS,
  shouldSuppressDmBookingTimelineNotice,
} from "../lib/dm/dmChatTimestampVisibility";
import {
  buildChatMessageGroupLayout,
  CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS,
  CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS,
  CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS,
  CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS,
  resolveMessageGroupLiClass,
} from "../lib/dm/chatMessageGroupLayout";
import {
  canComposerInsertNewline,
  getComposerLineBeforeCursor,
} from "../lib/dm/composerNewlineKeydown";
import {
  isCompactChatBubbleText,
  resolveChatMessageBubbleShellClass,
} from "../lib/dm/chatMessageBubbleGeometry";
import {
  DM_BOOKING_CONFIRMED_MESSAGE,
  DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE,
  DM_BOOKING_RATE_DECLINED_MESSAGE,
  formatDmBookingSystemMessageDisplay,
  formatRateProposedDmSystemMessage,
  isDmBookingSystemMessage,
  LEGACY_RATE_PROPOSED_DM_PREFIX,
  LEGACY_RATE_PROPOSAL_DECLINED_DM_MESSAGE,
} from "../lib/dm/dmBookingSystemMessages";
import { parseDjGigsListTab, resolveGigsListTabParam, resolveGigsListTabForBookingsPage, buildGigsWorkspaceIncomingHref, buildGigsConversationHref } from "../lib/bookings/gigsListNavigation";
import {
  formatGigsTabCountAriaCount,
  formatGigsTabCountDisplay,
  GIGS_TAB_COUNT_MAX_DISPLAY,
  shouldRenderGigsTabCount,
} from "../lib/bookings/gigsTabCountDisplay";
import { resolveWorkspaceGigsPendingDisplayCount, readWorkspaceGigsBadgeDisplayCountForSubNav } from "../lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
import {
  applyPersistedGigsPendingCount,
  clearNavigationBadgeCache,
  clearWorkspaceGigsDisplaySession,
  clearWorkspaceGigsSubNavDisplayLatch,
  getCachedGigsPendingCount,
  writeRuntimeGigsPendingCount,
} from "../lib/navigationBadgeCache";
import { resolveEventsHistoryTrashVisible, resolveEventsListTabRowChrome, resolveEventsListActiveTabLabel, resolveEventsListActiveTabLabelForWorkspaceChrome, EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER } from "../lib/events/eventsListNavigation";
import {
  appendPlanIdToCreateFlowReturnHref,
  buildEventPlansCreateFormHref,
  buildEventsCreatePickPlanReturnHref,
  completeEventPlansCreateReturn,
} from "../lib/bookings/planDeepLink";
import { resolveHistoryBulkSelectAllToggle } from "../app/components/history/HistoryBulkManage";
import { isPlannerEventVisibleOnCalendar, resolvePlannerHistoryHideEventIds } from "../lib/events";
import {
  BOOKING_REQUEST_CANCELLED_SUCCESS_MESSAGE,
  HISTORY_REMOVAL_FEEDBACK_CLEAR_MS,
  HISTORY_REMOVAL_FEEDBACK_FADE_MS,
  HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS,
  INLINE_TAB_FEEDBACK_CLEAR_MS,
  INLINE_TAB_FEEDBACK_FADE_MS,
  formatEventsHistoryRemoveSuccessMessage,
  formatGigsCalendarAvailabilityClearedMessage,
  formatGigsCalendarAvailabilityMarkedMessage,
  formatGigsHistoryRemoveSuccessMessage,
  EVENT_UPDATED_SUCCESS_MESSAGE,
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
  parseDmThreadEntryContext,
  resolveDmThreadBackHref,
} from "../lib/dm/threadNavigation";
import {
  buildEventDetailProfileHref,
  buildProfileDmThreadHref,
  buildProfileHref,
  isProfileOpenedFromDmConversation,
  readDmConversationIdFromReturnTo,
  resolveProfileChatBackNavigation,
  resolveProfileEventDetailBackNavigation,
} from "../lib/profileNavigation";
import {
  buildEventDetailFromDmHref,
  isEventsListCreateDeepLinkParam,
  resolveEventDetailBackHref,
  resolveEventDetailDmOriginConversationId,
  resolveEventsListCreateBootstrapState,
  resolveEventsListCreateFlowChromeActive,
  resolveEventsListTabParam,
  shouldHideEventDetailLineupMessageButton,
} from "../lib/events/eventsListNavigation";
import { clearEventsListTabCache } from "../lib/events/eventsListTabCache";
import { buildPlannerCreateEventFromPlansHref, buildPlannerCreateEventHref } from "../lib/calendar";
import { resolveGigsCalendarBookingNavigation, resolvePlannerCalendarItemEventId, resolvePlannerCalendarItemHref } from "../lib/bookings/gigsCalendarNavigation";
import { hasUnsavedProfileEdits, createProfileEditBaseline } from "../lib/user/profileEditDirtyState";
import { getUsernameFormatError, normalizeSoundCloudInput, resolveProfileIdentityPresentation } from "../lib/user/profileFormUtils";
import { PROPOSE_RATE_HELPER_MAX_OPENS } from "../lib/booking/proposeRateHelperPreference";
import {
  applyCappedMultilineInputLimit,
  countExplicitLines,
  shouldBlockMultilineEnter,
} from "../lib/cappedMultilineInput";
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
  EVENT_PLAN_USE_BUTTON_CLASS,
  EVENT_PLAN_USE_BUTTON_SELECTION_HIDDEN_CLASS,
  EVENT_PLAN_USE_BUTTON_WRAP_CLASS,
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_GAP_CLASS,
  GIGS_TAB_PILL_MODIFIER_CLASS,
  GIGS_TAB_PILL_WITH_COUNT_MODIFIER_CLASS,
  GIGS_TAB_PILL_ROW_CLASS,
  GIGS_LIST_TAB_ROW_CLASS,
  EVENTS_LIST_TAB_ROW_CLASS,
  EVENT_PLANS_TOOLBAR_ROW_CLASS,
  FTC_EVENT_TITLE_CLAMP_CLASS,
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
    "Finish time must be later than the start time.",
  );
  assert.equal(
    getEventSetTimeValidationError(eventDate, zeroDuration),
    "Finish time must be later than the start time.",
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
  assert.equal(formErrors.finishTime, "Finish time must be later than the start time.");
}

function testApplyEventSetTimeStartChangeClearsInvalidFinish() {
  const eventDate = "2027-06-15";
  const next = applyEventSetTimeStartChange(eventDate, "8:00 PM", "7:47 PM");
  assert.equal(next, "8:00 PM");
}

function testBookingFieldTriggerPlaceholderStylingIsShared() {
  const bookingDateTimeSource = readFileSync(
    new URL("../lib/bookingDateTime.ts", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const datePickerSource = readFileSync(
    new URL("../app/components/FtcDatePicker.tsx", import.meta.url),
    "utf8",
  );
  const bookingFieldsSource = readFileSync(
    new URL("../app/components/BookingDateTimeFields.tsx", import.meta.url),
    "utf8",
  );
  const runSheetSource = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    bookingDateTimeSource,
    /export const BOOKING_DATE_TIME_INPUT_CLASS = BOOKING_TIME_BUTTON_CLASS;/,
  );
  assert.match(bookingDateTimeSource, /isBookingFieldTriggerPlaceholder/);
  assert.match(bookingDateTimeSource, /hasBookingFieldTriggerLabelValue/);
  assert.match(bookingDateTimeSource, /BOOKING_START_TIME_PLACEHOLDER_LABEL/);
  assert.match(globalsSource, /\.ftc-field-trigger \.ftc-field-trigger-label\.is-placeholder/);
  assert.match(globalsSource, /color: var\(--ftc-color-text-muted\)/);
  assert.match(datePickerSource, /hasBookingFieldTriggerLabelValue\(buttonLabel\)/);
  assert.match(datePickerSource, /aria-invalid=\{invalid \? true : undefined\}/);
  assert.doesNotMatch(datePickerSource, /placeholder:text-/);
  assert.match(bookingFieldsSource, /hasBookingFieldTriggerLabelValue\(resolvedLabel\)/);
  assert.match(bookingFieldsSource, /invalid=\{Boolean\(error\)\}/);
  assert.match(bookingFieldsSource, /aria-invalid=\{error \? true : undefined\}/);
  assert.doesNotMatch(
    bookingFieldsSource,
    /resolvedLabel !== "Select" && resolvedLabel !== "Select time"/,
  );
  assert.match(runSheetSource, /hasBookingFieldTriggerLabelValue\(displayValue\)/);
  assert.doesNotMatch(runSheetSource, /hasValue \? "text-ftc-text" : "text-ftc-text-muted"/);
}

function testBookingFieldTriggerPlaceholderDetection() {
  assert.equal(isBookingFieldTriggerPlaceholder("Select date"), true);
  assert.equal(isBookingFieldTriggerPlaceholder("Select time"), true);
  assert.equal(isBookingFieldTriggerPlaceholder("Select start time"), true);
  assert.equal(isBookingFieldTriggerPlaceholder("Select finish time"), true);
  assert.equal(isBookingFieldTriggerPlaceholder("Select"), true);
  assert.equal(hasBookingFieldTriggerLabelValue("9:00 PM"), true);
  assert.equal(hasBookingFieldTriggerLabelValue("Select start time"), false);
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

function testBookingRateProposalPanelActionLayout() {
  const source = readFileSync(
    new URL("../app/components/booking/BookingRateProposalPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /PROPOSAL_PRIMARY_ACTION_CLASS/);
  assert.match(source, /PROPOSAL_SECONDARY_ACTION_CLASS/);
  assert.match(source, />\s*Accept\s*</);
  assert.match(source, /getProposalReviewSecondaryActionLabel/);
  assert.match(source, /secondaryActionLabel/);
  assert.match(source, /Proposed rate/);
  assert.match(source, /BookingProposalCardShell/);
  assert.doesNotMatch(source, /CancelBookingRequestButton/);
  assert.doesNotMatch(source, /onDeclineBooking/);
  assert.match(source, /PROPOSAL_ACTIONS_ROW_CLASS/);
  assert.match(source, /min-w-0 flex-1 items-center justify-center/);
  assert.doesNotMatch(source, />\s*Keep original offer\s*</);
  assert.doesNotMatch(source, /Accept proposed rate/);
  assert.doesNotMatch(source, /Accept rate/);
  assert.doesNotMatch(source, /Decline rate/);
  assert.doesNotMatch(source, /Proposal declined · original offer still available/);
  assert.doesNotMatch(source, /flex-col gap-2[\s\S]*Keep offer[\s\S]*Accept/);
}

function testAskForRateDeclineFlow() {
  const panelSource = readFileSync(
    new URL("../app/components/booking/BookingRateProposalPanel.tsx", import.meta.url),
    "utf8",
  );
  const bookingRequestsSource = readFileSync(
    new URL("../lib/bookingRequests.ts", import.meta.url),
    "utf8",
  );
  const dmMessagesSource = readFileSync(
    new URL("../lib/dm/dmBookingSystemMessages.ts", import.meta.url),
    "utf8",
  );

  assert.match(panelSource, /getProposalReviewSecondaryActionLabel/);
  assert.doesNotMatch(panelSource, /Proposal declined · original offer still available/);
  assert.match(bookingRequestsSource, /getProposalReviewSecondaryActionLabel/);
  assert.match(bookingRequestsSource, /getProposalDeclinedDmMessage/);
  assert.match(bookingRequestsSource, /DM_BOOKING_RATE_DECLINED_MESSAGE/);
  assert.match(bookingRequestsSource, /Rate declined/);
  assert.match(bookingRequestsSource, /propose a new rate/);
  assert.match(dmMessagesSource, /DM_BOOKING_RATE_DECLINED_MESSAGE = "Rate declined"/);

  const openBooking = { rate_mode: "open" } as BookingRequest;
  const fixedBooking = { rate_mode: "fixed" } as BookingRequest;

  assert.equal(getProposalReviewSecondaryActionLabel(openBooking), "Decline");
  assert.equal(getProposalReviewSecondaryActionLabel(fixedBooking), "Keep offer");
  assert.equal(getProposalDeclinedDmMessage(openBooking), "Rate declined");
  assert.equal(getProposalDeclinedDmMessage(fixedBooking), "Original offer kept");
}

function testDmBookingCardPendingEventPairedActions() {
  const cardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = readFileSync(
    new URL("../app/components/booking/DmBookingCardLayout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(cardSource, /showPendingEventPairedActions/);
  assert.match(cardSource, /DM_BOOKING_CARD_PAIRED_ACTIONS_ROW_CLASS/);
  assert.match(cardSource, /DM_BOOKING_CARD_PAIRED_VIEW_EVENT_CLASS/);
  assert.match(
    cardSource,
    /showPendingCancel &&[\s\S]*!showPendingEventPairedActions/,
  );
  assert.match(cardSource, /canReviewProposal && showPendingCancel/);
  assert.match(cardSource, /rateLine=\{pendingProposal \? "" : compactRateLine\}/);
  assert.match(layoutSource, /DM_BOOKING_CARD_PAIRED_ACTIONS_ROW_CLASS = "mt-4 flex w-full gap-1.5"/);
  assert.match(layoutSource, /DM_BOOKING_CARD_PAIRED_BUTTON_BASE_CLASS/);
  assert.match(layoutSource, /whitespace-nowrap/);
  assert.match(layoutSource, /min-h-9 min-w-0 flex-1/);
}

function testDmBookingCardExpandCollapseScrollAnchor() {
  const pageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const expandScrollSource = readFileSync(
    new URL("../lib/dm/dmBookingCardExpandScroll.ts", import.meta.url),
    "utf8",
  );
  const scrollSource = readFileSync(
    new URL("../lib/useChatScroll.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /showCompactBookingRow/);
  assert.doesNotMatch(pageSource, /DmBookingUpdateRow/);
  assert.match(pageSource, /collapsible/);
  assert.match(pageSource, /expanded=\{isBookingExpanded\}/);
  assert.match(pageSource, /scheduleBookingCardExpandScrollTransition/);
  assert.doesNotMatch(pageSource, /scheduleExpandedBookingCardScrollAlign/);
  assert.doesNotMatch(pageSource, /scheduleCollapsedBookingCardScrollRestore/);
  assert.match(pageSource, /captureBookingCardExpandScrollContext/);
  assert.match(pageSource, /bookingCardScrollContextRef/);
  assert.doesNotMatch(pageSource, /bookingCardPreExpandCaptureRef/);
  assert.match(pageSource, /traceBookingCardCollapseScroll/);
  assert.match(pageSource, /bookingCardAnchorRefs/);
  assert.match(pageSource, /registerBookingCardAnchor/);
  assert.match(pageSource, /pendingBookingCardScrollIdRef/);
  assert.match(pageSource, /anchorRef=\{registerBookingCardAnchorForCard\}/);
  assert.doesNotMatch(pageSource, /dmBookingCardScrollAnchor/);
  assert.doesNotMatch(pageSource, /scheduleDmBookingCardExpandScroll/);
  assert.doesNotMatch(pageSource, /bookingExpandSpacerPx/);
  assert.match(pageSource, /CHAT_MESSAGE_SCROLLER_CLASS/);
  assert.match(pageSource, /data-dm-conversation-header/);
  assert.match(expandScrollSource, /resolveDmBookingCardAlignTop/);
  assert.match(expandScrollSource, /resolveScrollBehavior/);
  assert.match(expandScrollSource, /waitForSmoothScrollAlign/);
  assert.match(expandScrollSource, /scrollend/);
  assert.match(expandScrollSource, /scrollTo\(/);
  assert.match(expandScrollSource, /captureBookingCardExpandScrollContext/);
  assert.match(expandScrollSource, /bottom-pinned/);
  assert.match(expandScrollSource, /anchor-preservation/);
  assert.match(expandScrollSource, /computePinnedBottomScrollTop/);
  assert.match(expandScrollSource, /CHAT_NEAR_BOTTOM_THRESHOLD_PX/);
  assert.doesNotMatch(expandScrollSource, /expand:bottom-pinned-settle/);
  assert.match(expandScrollSource, /expand-settled:before-align/);
  assert.match(expandScrollSource, /direction === "collapse" && scrollContext\.mode === "bottom-pinned"/);
  assert.match(expandScrollSource, /scheduleBookingCardExpandScrollTransition/);
  assert.match(expandScrollSource, /computeBookingCardAlignScrollTop/);
  assert.doesNotMatch(expandScrollSource, /maintainBookingCardViewportAnchor/);
  assert.doesNotMatch(expandScrollSource, /restoreBookingCardScrollPosition/);
  assert.doesNotMatch(expandScrollSource, /lockDmMessageScrollTop/);
  assert.doesNotMatch(expandScrollSource, /scrollIntoView/);
  assert.match(expandScrollSource, /abortInFlightContainerScroll/);
  assert.doesNotMatch(pageSource, /flex-1 flex-col-reverse overflow-y-auto/);
  assert.match(pageSource, /CHAT_MESSAGE_SCROLLER_CLASS/);
  assert.match(pageSource, /data-chat-bottom/);
  assert.doesNotMatch(pageSource, /flushSync/);
  assert.doesNotMatch(pageSource, /bookingCardExpandAlignGuardRef/);
  assert.doesNotMatch(pageSource, /dmBookingExpandScrollGuard/);
  assert.match(scrollSource, /getAppendedMessageIds/);
  assert.match(scrollSource, /getChatMaxScrollTop/);
  assert.match(scrollSource, /needsInitialScrollRef/);
  assert.match(scrollSource, /messageIds: readonly string\[\]/);
  assert.doesNotMatch(scrollSource, /messageCount/);
  assert.doesNotMatch(scrollSource, /flex-col-reverse anchors newest messages/);
}

function testDmBookingCardAlignScrollTopMath() {
  const desiredCardTop = 108;
  const maxScrollTop = 1200;

  assert.equal(computeBookingCardAlignScrollTop(0, desiredCardTop, desiredCardTop, maxScrollTop), 0);
  assert.equal(
    computeBookingCardAlignScrollTop(0, desiredCardTop + 92, desiredCardTop, maxScrollTop),
    92,
  );
  assert.equal(
    computeBookingCardAlignScrollTop(0, desiredCardTop - 308, desiredCardTop, maxScrollTop),
    0,
  );
  assert.equal(
    computeBookingCardAlignScrollTop(500, desiredCardTop - 308, desiredCardTop, maxScrollTop),
    192,
  );
}

function testBookingCardExpandScrollContextCapture() {
  const container = {
    scrollTop: 920,
    scrollHeight: 1520,
    clientHeight: 600,
  } as HTMLElement;

  const cardAnchor = {
    getBoundingClientRect: () => ({
      top: 480,
      bottom: 568,
      left: 0,
      right: 390,
      width: 390,
      height: 88,
      x: 0,
      y: 480,
      toJSON: () => ({}),
    }),
  } as HTMLElement;

  const nearBottom = captureBookingCardExpandScrollContext(container, cardAnchor);
  assert.equal(nearBottom.mode, "bottom-pinned");
  assert.equal(nearBottom.pinnedDistanceFromBottom, 0);

  container.scrollTop = 180;
  const anchored = captureBookingCardExpandScrollContext(container, cardAnchor);
  assert.equal(anchored.mode, "anchor-preservation");
  assert.equal(anchored.pinnedDistanceFromBottom, 740);
  assert.equal(anchored.anchorViewportTop, 480);
  assert.ok(740 > CHAT_NEAR_BOTTOM_THRESHOLD_PX);
}

function testBookingCardPinnedBottomScrollTop() {
  assert.equal(computePinnedBottomScrollTop(1520, 600, 0), 920);
  assert.equal(computePinnedBottomScrollTop(1400, 600, 0), 800);
  assert.equal(computePinnedBottomScrollTop(1400, 600, 40), 760);
}

function testBookingCardCollapseScrollHeightCompensation() {
  const maxScrollTop = 800;

  assert.equal(computeScrollTopAfterShrink(340, 1560, 1400, maxScrollTop), 180);
  assert.equal(computeScrollTopAfterShrink(340, 1400, 1400, maxScrollTop), 340);
  assert.equal(computeScrollTopAfterShrink(340, 1400, 1500, maxScrollTop), 340);
  assert.equal(computeScrollTopAfterShrink(20, 900, 850, 100), 20);
  assert.equal(computeScrollTopAfterShrink(120, 900, 850, 100), 100);
}

function testDmBookingSystemMessages() {
  const pageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const timelineSource = readFileSync(
    new URL("../app/components/dm/DmBookingTimelineNotice.tsx", import.meta.url),
    "utf8",
  );
  const bookingRequestsSource = readFileSync(
    new URL("../lib/bookingRequests.ts", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /DmBookingTimelineNotice/);
  assert.doesNotMatch(pageSource, /GroupChatSystemNotice/);
  assert.match(pageSource, /formatDmBookingSystemMessageDisplay/);
  assert.match(pageSource, /isDmBookingSystemMessage/);
  assert.doesNotMatch(pageSource, /systemPillClassName/);
  assert.doesNotMatch(pageSource, /Rate proposed ·/);
  assert.doesNotMatch(pageSource, /Proposal declined ·/);
  assert.doesNotMatch(timelineSource, /rounded-full/);
  assert.doesNotMatch(timelineSource, /border-ftc-border/);
  assert.match(timelineSource, /text-ftc-text-muted/);
  assert.match(pageSource, /classifyDmConversationMessageKind/);

  assert.match(bookingRequestsSource, /formatRateProposedDmSystemMessage/);
  assert.match(bookingRequestsSource, /DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE/);
  assert.match(bookingRequestsSource, /DM_BOOKING_RATE_DECLINED_MESSAGE/);
  assert.match(bookingRequestsSource, /DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE/);
  assert.match(bookingRequestsSource, /DM_BOOKING_CONFIRMED_MESSAGE/);
  assert.match(bookingRequestsSource, /DM_BOOKING_CANCELLED_MESSAGE/);

  assert.equal(formatRateProposedDmSystemMessage(111), "Rate proposed: $111");
  assert.equal(
    formatDmBookingSystemMessageDisplay(`${LEGACY_RATE_PROPOSED_DM_PREFIX} $111`),
    "Rate proposed: $111",
  );
  assert.equal(
    formatDmBookingSystemMessageDisplay(LEGACY_RATE_PROPOSAL_DECLINED_DM_MESSAGE),
    DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE,
  );
  assert.equal(
    formatDmBookingSystemMessageDisplay("BOOKING ACTIVITY · accepted · Summer Party"),
    DM_BOOKING_CONFIRMED_MESSAGE,
  );
  assert.equal(
    formatDmBookingSystemMessageDisplay("DJ proposed a rate of $66."),
    "Rate proposed: $66",
  );
  assert.equal(isDmBookingSystemMessage("Rate proposed: $66"), true);
  assert.equal(isDmBookingSystemMessage(DM_BOOKING_RATE_DECLINED_MESSAGE), true);
  assert.equal(
    formatDmBookingSystemMessageDisplay(DM_BOOKING_RATE_DECLINED_MESSAGE),
    DM_BOOKING_RATE_DECLINED_MESSAGE,
  );
  assert.equal(isDmBookingSystemMessage("BOOKING ACTIVITY · event-cancelled · Party"), false);
}

function testDmConversationTimestampLayout() {
  const pageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const timelineSource = readFileSync(
    new URL("../app/components/dm/DmBookingTimelineNotice.tsx", import.meta.url),
    "utf8",
  );
  const bubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /buildDmConversationTimestampLayout/);
  assert.match(pageSource, /conversationTimestampLayout/);
  assert.match(pageSource, /showTimeSeparatorBefore/);
  assert.match(pageSource, /DmChatTimeSeparator/);
  assert.match(pageSource, /wrapWithTimeSeparator/);
  assert.doesNotMatch(pageSource, /buildDmBookingTimelineTimestampLayout/);
  assert.doesNotMatch(timelineSource, /showTimestamp/);
  assert.doesNotMatch(timelineSource, /-mb-2/);
  assert.match(timelineSource, /compactBelow \? "pb-1"/);
  assert.match(bubbleSource, /resolveMessageGroupLiClass/);
  assert.doesNotMatch(bubbleSource, /showTimestamp\?: boolean/);

  const baseTime = Date.parse("2026-07-27T12:00:00.000Z");
  const quickGapMs = 60_000;
  const longGapMs = DM_CHAT_MEANINGFUL_TIME_GAP_MS + 60_000;
  const messages = [
    {
      id: "chat-1",
      created_at: new Date(baseTime).toISOString(),
      text: "Hello",
    },
    {
      id: "timeline-1",
      created_at: new Date(baseTime + quickGapMs).toISOString(),
      text: "Rate proposed: $111",
    },
    {
      id: "timeline-2",
      created_at: new Date(baseTime + quickGapMs * 2).toISOString(),
      text: "Original offer kept",
    },
    {
      id: "timeline-3",
      created_at: new Date(baseTime + quickGapMs * 3).toISOString(),
      text: "Rate proposed: $66",
    },
    {
      id: "chat-2",
      created_at: new Date(baseTime + quickGapMs * 4).toISOString(),
      text: "Thanks",
    },
  ];

  const clusteredLayout = buildDmConversationTimestampLayout(messages, {
    bookings: [],
    conversationId: "conversation-1",
  });

  assert.equal(clusteredLayout.get("timeline-1")?.showTimestamp, false);
  assert.equal(clusteredLayout.get("timeline-2")?.showTimestamp, false);
  assert.equal(clusteredLayout.get("timeline-3")?.showTimestamp, false);
  assert.equal(clusteredLayout.get("chat-2")?.showTimestamp, false);
  assert.equal(clusteredLayout.get("chat-2")?.showTimeSeparatorBefore, false);
  assert.equal(clusteredLayout.get("timeline-1")?.compactBelow, true);
  assert.equal(clusteredLayout.get("timeline-2")?.compactBelow, true);
  assert.equal(clusteredLayout.get("timeline-3")?.compactBelow, false);

  const gapMessages = [
    {
      id: "timeline-gap-1",
      created_at: new Date(baseTime).toISOString(),
      text: "Booking confirmed",
    },
    {
      id: "timeline-gap-2",
      created_at: new Date(baseTime + longGapMs).toISOString(),
      text: "Booking cancelled",
    },
  ];

  const gapLayout = buildDmConversationTimestampLayout(gapMessages, {
    bookings: [],
    conversationId: "conversation-1",
  });

  assert.equal(gapLayout.get("timeline-gap-1")?.showTimestamp, false);
  assert.equal(gapLayout.get("timeline-gap-2")?.showTimestamp, false);
  assert.equal(gapLayout.get("timeline-gap-1")?.showTimeSeparatorBefore, false);
  assert.equal(gapLayout.get("timeline-gap-2")?.showTimeSeparatorBefore, true);
}

function createRegressionBookingRequest(
  overrides: Partial<BookingRequest> = {},
): BookingRequest {
  return {
    id: "booking-regression-1",
    created_at: "2026-07-27T12:00:00.000Z",
    sender_id: "planner-1",
    recipient_id: "dj-1",
    conversation_id: "conversation-1",
    event_id: null,
    event_name: "Summer Party",
    venue: "Main Room",
    event_date: "2026-08-01",
    set_time: "22:00",
    fee: "200",
    notes: "",
    status: "pending",
    archived_at: null,
    lineup_hidden_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    rate_mode: "open",
    proposed_rate: null,
    proposed_rate_note: null,
    proposed_rate_at: null,
    proposed_rate_status: null,
    ...overrides,
  };
}

function testDmBookingTimelineSuppression() {
  const conversationId = "conversation-1";
  const booking = createRegressionBookingRequest({
    proposed_rate: 222,
    proposed_rate_status: "pending",
    proposed_rate_at: "2026-07-27T12:01:00.000Z",
  });
  const bookingMessageText = formatBookingRequestMessage(booking);
  const messages = [
    {
      id: "booking-card",
      created_at: "2026-07-27T12:00:00.000Z",
      text: bookingMessageText,
    },
    {
      id: "timeline-current-proposal",
      created_at: "2026-07-27T12:01:00.000Z",
      text: "Rate proposed: $222",
    },
    {
      id: "timeline-historical-proposal",
      created_at: "2026-07-27T12:02:00.000Z",
      text: "Rate proposed: $111",
    },
  ];

  assert.equal(
    shouldSuppressDmBookingTimelineNotice(messages[1].text, {
      bookings: [booking],
      conversationId,
      messages,
      messageIndex: 1,
    }),
    true,
  );
  assert.equal(
    shouldSuppressDmBookingTimelineNotice(messages[2].text, {
      bookings: [booking],
      conversationId,
      messages,
      messageIndex: 2,
    }),
    false,
  );
  assert.equal(
    classifyDmConversationMessageKind(messages[1].text, {
      bookings: [booking],
      conversationId,
      messages,
      messageIndex: 1,
    }),
    "hidden",
  );
  assert.equal(
    classifyDmConversationMessageKind(messages[2].text, {
      bookings: [booking],
      conversationId,
      messages,
      messageIndex: 2,
    }),
    "timeline",
  );

  const keptOfferBooking = createRegressionBookingRequest();
  const keptOfferMessages = [
    {
      id: "booking-card",
      created_at: "2026-07-27T12:00:00.000Z",
      text: formatBookingRequestMessage(keptOfferBooking),
    },
    {
      id: "timeline-kept-offer",
      created_at: "2026-07-27T12:01:00.000Z",
      text: DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE,
    },
  ];

  assert.equal(
    shouldSuppressDmBookingTimelineNotice(keptOfferMessages[1].text, {
      bookings: [keptOfferBooking],
      conversationId,
      messages: keptOfferMessages,
      messageIndex: 1,
    }),
    true,
  );

  const acceptedBooking = createRegressionBookingRequest({ status: "accepted" });
  const acceptedMessages = [
    {
      id: "booking-card",
      created_at: "2026-07-27T12:00:00.000Z",
      text: formatBookingRequestMessage(acceptedBooking),
    },
    {
      id: "timeline-confirmed",
      created_at: "2026-07-27T12:01:00.000Z",
      text: DM_BOOKING_CONFIRMED_MESSAGE,
    },
  ];

  assert.equal(
    shouldSuppressDmBookingTimelineNotice(acceptedMessages[1].text, {
      bookings: [acceptedBooking],
      conversationId,
      messages: acceptedMessages,
      messageIndex: 1,
    }),
    true,
  );
}

function testChatAppendedMessageIds() {
  assert.deepEqual(getAppendedMessageIds([], ["a"]), ["a"]);
  assert.deepEqual(getAppendedMessageIds(["a"], ["a", "b"]), ["b"]);
  assert.deepEqual(getAppendedMessageIds(["a", "b"], ["a", "b"]), []);
  assert.deepEqual(getAppendedMessageIds(["a", "b"], ["a", "c"]), []);
  assert.deepEqual(getAppendedMessageIds(["a"], ["b"]), []);
}

function testDmBookingCardProposedRateCopy() {
  const cardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );
  const panelSource = readFileSync(
    new URL("../app/components/booking/BookingRateProposalPanel.tsx", import.meta.url),
    "utf8",
  );
  const summarySource = readFileSync(
    new URL("../app/components/booking/BookingCardCompactSummary.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(cardSource, /Rate proposed/);
  assert.match(panelSource, /formatIntegerRateDisplay\(value\)/);
  assert.match(panelSource, /Proposed rate/);
  assert.match(panelSource, /BookingCardExpandableNotes/);
  assert.doesNotMatch(panelSource, /Rate proposed/);
  assert.equal(formatIntegerRateDisplay(350), "$350");
  assert.equal(formatIntegerRateDisplay(1500), "$1,500");
  assert.equal(formatIntegerRateDisplay(22238484), "$22,238,484");
  assert.match(summarySource, /return getDmBookingCardOfferSummary\(booking\)/);
  assert.doesNotMatch(summarySource, /Open offer/);
  assert.match(cardSource, /rateLine=\{pendingProposal \? "" : compactRateLine\}/);
  assert.match(cardSource, /getBookingCollapsedOfferSummary\(booking, currentUserId\)/);
  assert.match(cardSource, /urgentLabel === "Proposed"/);

  const bookingRequestsSource = readFileSync(
    new URL("../lib/bookingRequests.ts", import.meta.url),
    "utf8",
  );
  assert.match(bookingRequestsSource, /canRespondToRateProposal\(booking, currentUserId\)/);
  assert.match(bookingRequestsSource, /return "Proposed"/);
  assert.match(bookingRequestsSource, /\$\{amount\} proposed/);
}

function testDmBookingCardNotesExpandAnimation() {
  const notesSource = readFileSync(
    new URL("../app/components/booking/BookingCardExpandableNotes.tsx", import.meta.url),
    "utf8",
  );
  const summarySource = readFileSync(
    new URL("../app/components/booking/BookingCardCompactSummary.tsx", import.meta.url),
    "utf8",
  );
  const panelSource = readFileSync(
    new URL("../app/components/booking/BookingRateProposalPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(notesSource, /data-dm-booking-notes-expand-panel/);
  assert.match(notesSource, /transition-\[height\]/);
  assert.match(notesSource, /duration-200 ease-out/);
  assert.match(notesSource, /motion-reduce:transition-none/);
  assert.match(notesSource, /prefersReducedMotion/);
  assert.match(notesSource, /requestAnimationFrame/);
  assert.match(notesSource, /Show more/);
  assert.match(notesSource, /Show less/);
  assert.match(summarySource, /BookingCardExpandableNotes/);
  assert.match(panelSource, /BookingCardExpandableNotes/);
  assert.match(notesSource, /line-clamp-3/);
  assert.match(notesSource, /detailsOpen/);
  assert.match(notesSource, /scrollHeight > node\.clientHeight \+ 1/);
  assert.match(notesSource, /node\.clientHeight/);
  assert.match(notesSource, /ResizeObserver/);
  assert.match(notesSource, /onNotesExpandedChange/);
  assert.match(notesSource, /data-dm-booking-notes-toggle/);
  assert.doesNotMatch(notesSource, /useMeasuredHeight \? "block"/);

  const cardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(cardSource, /detailsOpen=\{expanded\}/);
  assert.match(cardSource, /onNotesExpandedChange/);
}

function testDmBookingCardBookingTypePresentation() {
  const cardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );
  const summarySource = readFileSync(
    new URL("../app/components/booking/BookingCardCompactSummary.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(cardSource, /renderHeaderBadges/);
  assert.doesNotMatch(cardSource, /showOpenOfferLabel/);
  assert.doesNotMatch(cardSource, /text-ftc-primary[\s\S]*Ask for rate/);
  assert.match(summarySource, /Booking type/);
  assert.match(summarySource, /text-ftc-text-secondary/);
  assert.doesNotMatch(summarySource, /FtcMetaTextRow/);
}

function testDmBookingCardNotesRevealScroll() {
  const expandScrollSource = readFileSync(
    new URL("../lib/dm/dmBookingCardExpandScroll.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(expandScrollSource, /scheduleBookingCardNotesRevealScroll/);
  assert.match(expandScrollSource, /computeMinimumScrollToRevealBottom/);
  assert.match(expandScrollSource, /resolveBookingNotesRevealBottom/);
  assert.match(expandScrollSource, /DM_BOOKING_NOTES_EXPAND_PANEL_ATTR/);
  assert.match(expandScrollSource, /DM_BOOKING_NOTES_TOGGLE_ATTR/);
  assert.match(expandScrollSource, /propertyName !== "height"/);
  assert.doesNotMatch(expandScrollSource, /scheduleBookingCardNotesRevealScroll[\s\S]*grid-template-rows/);

  assert.match(pageSource, /scheduleBookingCardNotesRevealScroll/);
  assert.match(pageSource, /handleBookingNotesExpansionChange/);
  assert.match(pageSource, /pendingBookingNotesScrollIdRef/);
  assert.match(pageSource, /onNotesExpandedChange/);

  const container = {
    scrollTop: 100,
    scrollHeight: 1000,
    clientHeight: 400,
    getBoundingClientRect: () => ({ bottom: 500 }),
    scrollTo: () => {},
  } as unknown as HTMLElement;

  assert.equal(computeMinimumScrollToRevealBottom(container, 480), null);
  assert.equal(computeMinimumScrollToRevealBottom(container, 520), 128);
  assert.equal(computeMinimumScrollToRevealBottom(container, 900), 508);
}

function testProposeBookingRateNotesTextareaGrowth() {
  const sheetSource = readFileSync(
    new URL("../app/components/booking/ProposeBookingRateSheet.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(sheetSource, /MAX_NOTE_LENGTH = 250/);
  assert.match(sheetSource, /ftc-fixed-scroll-textarea ftc-fixed-scroll-textarea-3/);
  assert.match(cssSource, /\.ftc-modal-textarea[\s\S]*height: calc\(3lh \+ 1rem \+ 2px\) !important/);
  assert.match(cssSource, /\.ftc-fixed-scroll-textarea-3[\s\S]*height: calc\(3lh \+ 1rem \+ 2px\) !important/);
  assert.match(cssSource, /\.ftc-fixed-scroll-textarea[\s\S]*overflow-y: auto !important/);
  assert.doesNotMatch(cssSource, /\.ftc-fixed-scroll-textarea-6/);
  assert.match(sheetSource, /textareaRows=\{1\}/);
  assert.match(sheetSource, /applyCappedMultilineInputLimit/);
  assert.match(sheetSource, /shouldBlockMultilineEnter/);
  assert.match(sheetSource, /MAX_NOTE_LINES = 3/);
  assert.match(sheetSource, /Enter a positive whole dollar amount"/);
  assert.doesNotMatch(sheetSource, /Send proposal/);
  assert.match(sheetSource, /Sending/);
  assert.doesNotMatch(sheetSource, /Sending\.\.\./);
  assert.match(sheetSource, /PlannerFieldError/);
  assert.match(sheetSource, /min-w-\[5\.5rem\]/);
}

function testCappedMultilineInputLimit() {
  assert.equal(countExplicitLines(""), 1);
  assert.equal(countExplicitLines("one"), 1);
  assert.equal(countExplicitLines("one\ntwo\nthree"), 3);
  assert.equal(countExplicitLines("one\ntwo\nthree\nfour"), 4);

  assert.equal(shouldBlockMultilineEnter("a\nb\nc", 3), true);
  assert.equal(shouldBlockMultilineEnter("a\nb", 3), false);

  assert.equal(applyCappedMultilineInputLimit("", "a\nb\nc\nd", 3, 250), "a\nb\nc");
  assert.equal(applyCappedMultilineInputLimit("a\nb", "a\nb\nc", 3, 250), "a\nb\nc");
  assert.equal(applyCappedMultilineInputLimit("a\nb\nc", "a\nb\nc\nd", 3, 250), null);

  const longLine = "x".repeat(200);
  assert.equal(
    applyCappedMultilineInputLimit("", `${longLine}\n${longLine}`, 3, 250)?.length,
    250,
  );

  assert.equal(
    countExplicitLines("word ".repeat(80).trim()),
    1,
  );
}

function testProposeRateHelperPreference() {
  const preferenceSource = readFileSync(
    new URL("../lib/booking/proposeRateHelperPreference.ts", import.meta.url),
    "utf8",
  );
  const sheetSource = readFileSync(
    new URL("../app/components/booking/ProposeBookingRateSheet.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(PROPOSE_RATE_HELPER_MAX_OPENS, 3);
  assert.match(preferenceSource, /resolveProposeRateHelperVisibility/);
  assert.match(preferenceSource, /ftc-propose-rate-helper-opens-v1/);
  assert.match(sheetSource, /resolveProposeRateHelperVisibility/);
  assert.match(sheetSource, /showHelper \? PROPOSE_RATE_HELPER_DESCRIPTION : undefined/);
  assert.match(sheetSource, /useLayoutEffect/);
}

function testAskForRateDmBookingCardOfferSummary() {
  const openAsk = { rate_mode: "open", fee: "" } as BookingRequest;
  const openWithSuggested = { rate_mode: "open", fee: "500" } as BookingRequest;
  const fixed = { rate_mode: "fixed", fee: "500" } as BookingRequest;

  assert.equal(getDmBookingCardOfferSummary(openAsk), "Ask for rate");
  assert.equal(getDmBookingCardOfferSummary(openWithSuggested), "Ask for rate · $500");
  assert.equal(getDmBookingCardOfferSummary(fixed), "Fixed · $500");
  assert.doesNotMatch(getDmBookingCardOfferSummary(openAsk), /Open offer/);
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

function testPlannerCancelledBookingExcludedFromActiveEventLineup() {
  const lineup = [
    makeLineupStatsBooking({ id: "pending", status: "pending" }),
    makeLineupStatsBooking({
      id: "cancelled",
      status: "cancelled",
      cancelled_by: "sender",
    }),
  ];

  const visibleLineup = filterVisibleEventLineupBookings(lineup);
  const activeLineup = filterActiveBookings(visibleLineup);

  assert.equal(visibleLineup.length, 2);
  assert.equal(activeLineup.length, 1);
  assert.equal(activeLineup[0]?.id, "pending");

  const historyLineup = filterHistoryCancelledBookings(lineup);
  assert.equal(historyLineup.length, 1);
  assert.equal(historyLineup[0]?.id, "cancelled");
}

function testSendBookingsModalLocksBackgroundInteraction() {
  const modalSource = readFileSync(
    new URL("../app/components/booking/SendBookingRequestsModal.tsx", import.meta.url),
    "utf8",
  );
  const scrollLockSource = readFileSync(
    new URL("../lib/ui/useBodyScrollLock.ts", import.meta.url),
    "utf8",
  );
  const scrollContainmentSource = readFileSync(
    new URL("../lib/ui/modalScrollContainment.ts", import.meta.url),
    "utf8",
  );
  const panelSource = readFileSync(
    new URL("../app/components/booking/SendBookingRequestsPanel.tsx", import.meta.url),
    "utf8",
  );
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(modalSource, /useBodyScrollLock\(open\)/);
  assert.match(modalSource, /useModalTouchScrollContainment\(open, dialogRef\)/);
  assert.doesNotMatch(modalSource, /onClick=\{requestClose\}/);
  assert.match(modalSource, /touch-none bg-black\/70/);
  assert.match(scrollLockSource, /body\.style\.position = "fixed"/);
  assert.match(scrollLockSource, /html\.style\.overflow = "hidden"/);
  assert.match(scrollLockSource, /window\.scrollTo\(0, scrollY\)/);
  assert.match(scrollContainmentSource, /shouldPreventModalTouchScroll/);
  assert.match(scrollContainmentSource, /canScrollInTouchDirection/);
  assert.match(panelSource, /overflow-y-auto overscroll-contain/);
  assert.match(eventDetailSource, /<SendBookingRequestsModal/);
  assert.doesNotMatch(eventDetailSource, /sendDiscardConfirmOpen/);
}

function testModalScrollContainmentBlocksBoundaryOverscroll() {
  const scrollable = {
    scrollTop: 0,
    clientHeight: 100,
    scrollHeight: 200,
  } as HTMLElement;

  assert.equal(canScrollInTouchDirection(scrollable, -10), true);
  assert.equal(canScrollInTouchDirection(scrollable, 10), false);

  scrollable.scrollTop = 100;
  assert.equal(canScrollInTouchDirection(scrollable, 10), true);
  assert.equal(canScrollInTouchDirection(scrollable, -10), false);
}

function testEventLineupBookingCardProfileNavigationAndActions() {
  const cardSource = readFileSync(
    new URL("../app/components/event-detail/EventLineupBookingCard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(cardSource, /ChatProfileAvatarLink/);
  assert.match(cardSource, /buildEventDetailProfileHref/);
  assert.match(cardSource, /href=\{profileHref\}/);
  assert.match(cardSource, /EVENT_DETAIL_LINEUP_ACTIONS_ROW/);
  assert.match(cardSource, /EVENT_DETAIL_LINEUP_ACTION_BTN/);
  assert.match(cardSource, /EVENT_DETAIL_LINEUP_BTN_SECONDARY/);
  assert.match(cardSource, /shouldHideEventDetailLineupMessageButton/);
  assert.match(cardSource, /dmOriginConversationId/);
  assert.match(cardSource, />\s*Message\s*</);
  assert.match(cardSource, /label="Cancel"/);
  assert.match(cardSource, /showCancelRequest && !pendingProposal/);
  assert.match(cardSource, /showCancelRequest && pendingProposal/);
  assert.match(cardSource, />\s*Proposed\s*</);
  assert.doesNotMatch(cardSource, /Rate proposed/);
  assert.match(cardSource, /compact/);
  assert.doesNotMatch(cardSource, /Open DM/);
  assert.match(cardSource, /Ask for rate/);
  assert.match(cardSource, /Fixed offer • \$\{amount\}/);
  assert.doesNotMatch(cardSource, /flex-col gap-2 sm:flex-row/);
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
    resolveDmThreadBackHref({ from: "bookings", tab: "accepted" }),
    "/bookings?tab=accepted",
  );
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

function testProfileChatBackNavigation() {
  const conversationId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";
  const returnTo = `/dm/${conversationId}?from=bookings&bookingRequestId=abc`;

  assert.equal(
    buildProfileHref(userId, { returnTo }),
    `/profile/${userId}?from=chat&returnTo=${encodeURIComponent(returnTo)}`,
  );
  assert.deepEqual(resolveProfileChatBackNavigation("chat", returnTo), {
    href: returnTo,
    label: "Back to chat",
  });
  assert.equal(resolveProfileChatBackNavigation("discover", returnTo), null);
  assert.equal(resolveProfileChatBackNavigation("chat", null), null);
  assert.equal(resolveProfileChatBackNavigation("chat", `/profile/${userId}`), null);

  const eventId = "11111111-1111-4111-8111-111111111111";

  assert.equal(
    readDmConversationIdFromReturnTo(returnTo),
    conversationId,
  );
  assert.equal(
    isProfileOpenedFromDmConversation("chat", returnTo),
    true,
  );
  assert.equal(
    isProfileOpenedFromDmConversation(
      "chat",
      `/events/${eventId}/chat?from=dm`,
    ),
    false,
  );
  assert.equal(isProfileOpenedFromDmConversation("discover", returnTo), false);
  const calendarOrigin = {
    calendarDate: "2026-07-14",
    calendarView: "event" as const,
    calendarMonth: "2026-07-01",
  };

  assert.equal(
    buildEventDetailProfileHref(userId, { eventId, calendarOrigin }),
    `/profile/${userId}?from=event-detail&eventId=${eventId}&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
  );
  assert.deepEqual(
    resolveProfileEventDetailBackNavigation("event-detail", {
      eventId,
      calendarDate: calendarOrigin.calendarDate,
      calendarView: calendarOrigin.calendarView,
      calendarMonth: calendarOrigin.calendarMonth,
    }),
    {
      href: `/events/${eventId}?from=calendar&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
      label: "Back to event",
    },
  );
  assert.deepEqual(
    resolveProfileEventDetailBackNavigation("event-detail", {
      eventId,
      fromTab: "history",
    }),
    {
      href: `/events/${eventId}?fromTab=history`,
      label: "Back to event",
    },
  );
  assert.equal(resolveProfileEventDetailBackNavigation("chat", { eventId }), null);

  assert.equal(
    buildProfileDmThreadHref("conversation-1", userId, { eventId, calendarOrigin }),
    `/dm/conversation-1?from=profile&profileUserId=${userId}&profileFrom=event-detail&eventId=${eventId}&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
  );
  assert.equal(
    resolveDmThreadBackHref({
      from: "profile",
      profileUserId: userId,
      profileFrom: "event-detail",
      eventId,
      calendarDate: calendarOrigin.calendarDate,
      calendarView: calendarOrigin.calendarView,
      calendarMonth: calendarOrigin.calendarMonth,
    }),
    buildEventDetailProfileHref(userId, { eventId, calendarOrigin }),
  );
  assert.equal(
    resolveDmThreadBackHref({ from: "profile", profileUserId: userId }),
    `/profile/${userId}`,
  );

  const profilePageSource = readFileSync(
    new URL("../app/profile/[userId]/page.tsx", import.meta.url),
    "utf8",
  );
  const profileHeaderSource = readFileSync(
    new URL("../app/components/profile/ProfilePageHeader.tsx", import.meta.url),
    "utf8",
  );
  const dmDetailsSource = readFileSync(
    new URL("../app/components/dm/DmConversationDetailsPanel.tsx", import.meta.url),
    "utf8",
  );
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const dmHeaderSource = readFileSync(
    new URL("../app/components/dm/DmConversationHeader.tsx", import.meta.url),
    "utf8",
  );

  assert.match(profilePageSource, /buildProfileDmThreadHref/);
  assert.match(profilePageSource, /readProfileEventDetailContext/);
  assert.match(profilePageSource, /resolveProfileEventDetailBackNavigation/);
  assert.match(profilePageSource, /resolveProfileChatBackNavigation/);
  assert.match(profilePageSource, /isProfileOpenedFromDmConversation/);
  assert.match(profilePageSource, /showMessageAction/);
  assert.match(profilePageSource, /return "Opening"/);
  assert.match(profilePageSource, /openedFromEventDetail && showDjSections/);
  assert.doesNotMatch(profilePageSource, /Opening\.\.\./);
  assert.match(profileHeaderSource, /replace/);
  assert.match(profileHeaderSource, /scroll=\{false\}/);
  assert.match(dmDetailsSource, /buildProfileHref\(otherUserId, \{ returnTo: profileReturnTo \}\)/);
  assert.match(dmPageSource, /profileFrom: searchParams\.get\("profileFrom"\)/);
  assert.match(dmPageSource, /useDmChatScrollRestoreOnProfileReturn/);
  assert.match(dmPageSource, /backReplace=\{backReplace\}/);
  assert.match(dmHeaderSource, /backReplace/);
  assert.match(dmHeaderSource, /scroll=\{false\}/);
  assert.doesNotMatch(dmHeaderSource, /ChatDetailsMenuButton/);
  assert.doesNotMatch(dmHeaderSource, /onOpenDetails/);
  assert.doesNotMatch(dmPageSource, /DmConversationDetailsPanel/);
  assert.doesNotMatch(dmPageSource, /detailsOpen/);
}

function testGigsIncomingDmEventDetailReturnChain() {
  const eventId = "11111111-1111-4111-8111-111111111111";
  const conversationId = "22222222-2222-4222-8222-222222222222";
  const bookingRequestId = "33333333-3333-4333-8333-333333333333";

  const dmHref = buildGigsConversationHref(conversationId, bookingRequestId, "pending");
  assert.equal(
    dmHref,
    `/dm/${conversationId}?from=bookings&bookingRequestId=${bookingRequestId}`,
  );

  const entryContext = parseDmThreadEntryContext((key) => {
    const params = new URLSearchParams(dmHref.split("?")[1] ?? "");
    return params.get(key);
  });
  assert.deepEqual(entryContext, {
    from: "bookings",
    tab: null,
    calendarDate: null,
    calendarView: null,
    calendarMonth: null,
    profileUserId: null,
  });

  const eventHref = buildEventDetailFromDmHref(
    eventId,
    conversationId,
    bookingRequestId,
    entryContext,
  );
  assert.equal(
    eventHref,
    `/events/${eventId}?from=dm&conversationId=${conversationId}&bookingRequestId=${bookingRequestId}&dmReturnFrom=bookings`,
  );

  const eventSearch = new URLSearchParams(eventHref.split("?")[1] ?? "");
  assert.equal(
    resolveEventDetailBackHref(null, {
      from: eventSearch.get("from"),
      conversationId: eventSearch.get("conversationId"),
      bookingRequestId: eventSearch.get("bookingRequestId"),
      dmReturnFrom: eventSearch.get("dmReturnFrom"),
      tab: eventSearch.get("tab"),
    }),
    `/dm/${conversationId}?from=bookings&bookingRequestId=${bookingRequestId}`,
  );

  assert.equal(
    resolveDmThreadBackHref({
      from: "bookings",
      tab: eventSearch.get("tab"),
    }),
    "/bookings",
  );

  const messagesEventHref = buildEventDetailFromDmHref(
    eventId,
    conversationId,
    bookingRequestId,
    null,
  );
  assert.equal(
    resolveEventDetailBackHref(null, {
      from: "dm",
      conversationId,
      bookingRequestId,
    }),
    `/dm/${conversationId}?bookingRequestId=${bookingRequestId}&bookingFocus=scroll-only`,
  );
  assert.doesNotMatch(messagesEventHref, /dmReturnFrom=/);
  assert.equal(resolveDmThreadBackHref({}), "/dm");

  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const bookingCardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dmPageSource, /parseDmThreadEntryContext/);
  assert.match(dmPageSource, /dmThreadEntryContext=\{dmThreadEntryContext\}/);
  assert.match(bookingCardSource, /dmThreadEntryContext/);
  assert.match(bookingCardSource, /buildEventDetailFromDmHref\([\s\S]*dmThreadEntryContext/);
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

function testPlannerCalendarPendingSentBookingEventLink() {
  const origin: import("../lib/bookings/gigsCalendarNavigation").CalendarOriginState = {
    calendarDate: "2026-07-14",
    calendarView: "event",
    calendarMonth: "2026-07-01",
  };
  const eventId = "11111111-1111-4111-8111-111111111111";
  const baseItemFields = {
    dateKey: "2026-07-14",
    venue: "Revolver",
    timeLabel: "9:00 PM",
    typeLabel: "Sent booking",
    startTimeSortKey: 1,
    endTimeSortKey: 2,
    createdAtSortKey: 3,
    eventFallbackColour: null,
  } satisfies Partial<CalendarItem>;
  const eventItem: CalendarItem = {
    ...baseItemFields,
    id: `event-${eventId}`,
    type: "event",
    title: "Warehouse Session",
    statusLabel: "Upcoming",
    statusKind: "event_upcoming",
    href: `/events/${eventId}`,
    eventId,
  };
  const pendingSentBooking: CalendarItem = {
    ...baseItemFields,
    id: "sent_booking-booking-1",
    type: "sent_booking",
    title: "Warehouse Session (DJ invite)",
    statusLabel: "Pending",
    statusKind: "pending",
    href: "/dm/conversation-1",
    eventId: null,
  };

  const linkedItems = linkPlannerCalendarSentBookingsToEvents([eventItem, pendingSentBooking]);
  const linkedPending = linkedItems.find((item) => item.id === pendingSentBooking.id);

  assert.ok(linkedPending);
  assert.equal(linkedPending.eventId, eventId);
  assert.equal(linkedPending.href, `/events/${eventId}`);
  assert.equal(
    resolvePlannerCalendarItemHref(linkedPending, origin),
    `/events/${eventId}?from=calendar&calendarDate=2026-07-14&calendarView=event&calendarMonth=2026-07-01`,
  );
}

function testPlannerCalendarAgendaChronologicalSort() {
  function makeAgendaItem(
    overrides: Partial<CalendarItem> & Pick<CalendarItem, "id">,
  ): CalendarItem {
    return {
      dateKey: "2026-07-14",
      type: "event",
      title: "Event",
      venue: null,
      timeLabel: null,
      statusLabel: "Upcoming",
      statusKind: "event_upcoming",
      href: "/events/test",
      eventId: "test",
      typeLabel: "Event",
      startTimeSortKey: 100,
      endTimeSortKey: 200,
      createdAtSortKey: 1000,
      eventFallbackColour: null,
      ...overrides,
    };
  }

  const byActionableGroups = sortPlannerCalendarAgendaItems([
    makeAgendaItem({ id: "past-early", startTimeSortKey: 100, statusKind: "event_completed" }),
    makeAgendaItem({ id: "pending-mid", startTimeSortKey: 200, statusKind: "pending" }),
    makeAgendaItem({ id: "today-late", startTimeSortKey: 300, statusKind: "event_today" }),
    makeAgendaItem({ id: "upcoming", startTimeSortKey: 150, statusKind: "event_upcoming" }),
    makeAgendaItem({ id: "today-early", startTimeSortKey: 50, statusKind: "event_today" }),
    makeAgendaItem({ id: "accepted", startTimeSortKey: 250, statusKind: "accepted" }),
  ]);

  assert.deepEqual(
    byActionableGroups.map((item) => item.id),
    ["today-early", "today-late", "pending-mid", "upcoming", "accepted", "past-early"],
  );

  const byEndTime = sortPlannerCalendarAgendaItems([
    makeAgendaItem({ id: "later-finish", startTimeSortKey: 100, endTimeSortKey: 400 }),
    makeAgendaItem({ id: "earlier-finish", startTimeSortKey: 100, endTimeSortKey: 250 }),
  ]);

  assert.deepEqual(
    byEndTime.map((item) => item.id),
    ["earlier-finish", "later-finish"],
  );

  const byStableTieBreaker = sortPlannerCalendarAgendaItems([
    makeAgendaItem({
      id: "item-b",
      startTimeSortKey: 100,
      endTimeSortKey: 200,
      createdAtSortKey: 1000,
    }),
    makeAgendaItem({
      id: "item-a",
      startTimeSortKey: 100,
      endTimeSortKey: 200,
      createdAtSortKey: 1000,
    }),
  ]);

  assert.deepEqual(
    byStableTieBreaker.map((item) => item.id),
    ["item-a", "item-b"],
  );
}

function testDjGigsCalendarAgendaSort() {
  const sorted = sortDjGigsCalendarAgendaBookings([
    makeDjGigBooking({
      id: "past-accepted",
      status: "accepted",
      event_date: "2020-01-15",
      set_time: "9:00 PM",
    }),
    makeDjGigBooking({
      id: "pending-late",
      status: "pending",
      event_date: "2030-06-15",
      set_time: "6:00 PM",
    }),
    makeDjGigBooking({
      id: "accepted-upcoming",
      status: "accepted",
      event_date: "2030-06-15",
      set_time: "8:00 PM",
    }),
    makeDjGigBooking({
      id: "pending-early",
      status: "pending",
      event_date: "2030-06-15",
      set_time: "3:00 PM",
    }),
  ]);

  assert.deepEqual(
    sorted.map((booking) => booking.id),
    ["pending-early", "pending-late", "accepted-upcoming", "past-accepted"],
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

function testDjGigsCalendarBulkSelectableDates() {
  const today = getTodayDateKey();

  assert.equal(isDjGigsCalendarBulkSelectableDateKey(today), true);
  assert.equal(isDjGigsCalendarBulkSelectableDateKey("2099-01-01"), true);
  assert.equal(isDjGigsCalendarBulkSelectableDateKey("2020-01-01"), false);
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
  assert.match(subNavSource, /readWorkspaceGigsBadgeDisplayCountForSubNav/);
  assert.match(subNavSource, /subscribeWorkspaceGigsSubNavBadgeDisplay/);
  assert.match(subNavSource, /useStableWorkspaceGigsSubNavCount/);
  const badgeCacheSource = readFileSync(
    new URL("../lib/navigationBadgeCache.ts", import.meta.url),
    "utf8",
  );
  assert.match(badgeCacheSource, /ftc-workspace-gigs-subnav-latch/);
  assert.match(subNavSource, /useSyncExternalStore/);
  assert.match(subNavSource, /badgeRole/);
  assert.doesNotMatch(subNavSource, /reserveSpace/);
  assert.doesNotMatch(subNavSource, /opacity-0[\s\S]*99\+/);
  const workspaceGigsBadgeSource = readFileSync(
    new URL("../app/components/planner/WorkspaceGigsPendingBadge.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspaceGigsBadgeSource, /WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS/);
  assert.match(workspaceGigsBadgeSource, /shouldRenderGigsTabCount/);
  assert.match(workspaceGigsBadgeSource, /return null;/);
  assert.doesNotMatch(workspaceGigsBadgeSource, /display \?\? ""/);
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
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /md:h-\[2\.375rem\]/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /max-h-\[1\.875rem\]/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /\bw-full\b/);

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
  assert.match(gigsChromeSource, /<PlannerWorkspaceSecondaryControls[\s\S]*<GigsWorkspaceTabRow/);
}

function testPlannerBookingCreateHidesGigsSubTabs() {
  const gigsChromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const bookingsSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const planDeepLinkSource = readFileSync(
    new URL("../lib/bookings/planDeepLink.ts", import.meta.url),
    "utf8",
  );

  assert.match(gigsChromeSource, /plannerBookingCreateOpen: boolean/);
  assert.match(gigsChromeSource, /plannerCreateActive/);
  assert.match(gigsChromeSource, /if \(plannerCreateActive\) \{\s*return null;/);
  assert.match(gigsChromeSource, /chromeState\.plannerBookingCreateOpen/);
  assert.match(bookingsSource, /plannerBookingCreateOpen: plannerCreateVisible/);
  assert.match(bookingsSource, /isPlannerBookingsCreateChromeActive/);
  assert.match(planDeepLinkSource, /export function isPlannerBookingsCreateChromeActive/);
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
  assert.match(EVENT_PLAN_USE_BUTTON_WRAP_CLASS, /hidden min-w-0 justify-end sm:flex/);
  assert.match(EVENT_PLANS_TOOLBAR_ROW_CLASS, /h-\[1\.875rem\]/);
  assert.match(EVENT_PLANS_TOOLBAR_ROW_CLASS, /md:h-\[2\.375rem\]/);
  assert.doesNotMatch(EVENT_PLAN_USE_BUTTON_WRAP_CLASS, /self-center/);
  assert.match(EVENT_PLAN_USE_BUTTON_CLASS, /min-h-11/);
  assert.match(EVENT_PLAN_USE_BUTTON_CLASS, /shrink-0/);
  assert.doesNotMatch(EVENT_PLAN_USE_BUTTON_CLASS, /w-full/);
  assert.doesNotMatch(EVENT_PLAN_USE_BUTTON_CLASS, /w-\[/);
  assert.match(EVENT_PLAN_USE_BUTTON_SELECTION_HIDDEN_CLASS, /pointer-events-none invisible/);

  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(pageSource, /mobileAction=\{renderUsePlanButton\(\)\}/);
  assert.match(pageSource, /EVENT_PLAN_USE_BUTTON_WRAP_CLASS\}\>\{renderUsePlanButton\(\)\}/);
  assert.match(pageSource, /EVENT_PLAN_USE_BUTTON_SELECTION_HIDDEN_CLASS/);
  assert.match(pageSource, /ring-inset ring-ftc-primary\/40/);
  assert.doesNotMatch(pageSource, /EVENT_PLAN_ACTION_RESERVE_CLASS/);
  assert.doesNotMatch(pageSource, /flex items-center gap-3 p-3/);
  assert.match(pageSource, /MobilePlanEventVenueRow[\s\S]*min-w-0 truncate text-sm text-ftc-text/);
  assert.match(pageSource, /PlanFieldLabel as="span" className="shrink-0"/);
  assert.match(pageSource, /PlanDetail[\s\S]*truncate text-ftc-text/);
  assert.match(pageSource, /block min-w-0 truncate text-\[1\.0625rem\]/);
}

function testGigsTabRowUsesCompactPillsWithoutCounts() {
  assert.match(GIGS_TAB_PILL_ROW_CLASS, /shrink-0/);
  assert.match(GIGS_TAB_PILL_ROW_CLASS, /gap-2/);
  assert.doesNotMatch(GIGS_TAB_PILL_ROW_CLASS, /flex-1/);
  assert.match(GIGS_TAB_PILL_MODIFIER_CLASS, /ftc-gigs-tab-pill/);
  assert.match(GIGS_TAB_PILL_WITH_COUNT_MODIFIER_CLASS, /ftc-gigs-tab-pill-with-count/);
  assert.equal(GIGS_TAB_PILL_GAP_CLASS, "gap-1.5");
  assert.match(GIGS_TAB_COUNT_SLOT_CLASS, /tabular-nums/);
  assert.match(GIGS_TAB_COUNT_SLOT_CLASS, /ftc-gigs-tab-count-slot/);
  assert.doesNotMatch(GIGS_TAB_COUNT_SLOT_CLASS, /w-\[2\.25ch\]/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /flex-nowrap/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /gap-2/);
  assert.match(GIGS_LIST_TAB_ROW_CLASS, /justify-between/);
  assert.doesNotMatch(GIGS_LIST_TAB_ROW_CLASS, /flex-wrap/);
}

function testGigsHistoryCardNavigation() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /View event[\s\S]*BookingHistoryCard/);
  assert.match(pageSource, /function BookingHistoryCard/);
  assert.match(
    pageSource,
    /showEventNavigation[\s\S]*<Link[\s\S]*href=\{eventHref\}/,
  );
  assert.match(pageSource, /showChevron=\{Boolean\(eventHref\)\}/);
  assert.match(pageSource, /GIG_CARD_OPEN_DM_BUTTON_CLASS/);
  assert.match(pageSource, /GIG_CARD_SECONDARY_ACTION_CLASS/);
  assert.match(
    pageSource,
    /renderOpenDmLink[\s\S]*event\.stopPropagation\(\)/,
  );
  assert.match(pageSource, /hidden min-w-0 justify-end sm:flex/);
}

function testIncomingGigsCardDesignSystem() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  const receivedCardSource = pageSource.slice(
    pageSource.indexOf("function ReceivedBookingCard"),
    pageSource.indexOf("function BookingHistoryCard"),
  );

  assert.match(receivedCardSource, /EventCoverImageListThumb/);
  assert.match(receivedCardSource, /GIG_CARD_ROW_CLASS/);
  assert.match(receivedCardSource, /showChevron=\{showChevron\}/);
  assert.match(pageSource, /GIG_CARD_OPEN_DM_BUTTON_CLASS/);
  assert.match(receivedCardSource, /GIG_CARD_SECONDARY_ACTION_CLASS/);
  assert.match(pageSource, /function GigCardHeader[\s\S]*variant="compact"/);
  assert.match(pageSource, /function GigCardChevronSlot[\s\S]*invisible pointer-events-none/);
  assert.match(pageSource, /GigCardChevronSlot showChevron=\{showChevron\}/);
  assert.doesNotMatch(receivedCardSource, /ftc-btn-primary/);
  assert.match(skeletonSource, /ReceivedBookingCardSkeleton[\s\S]*h-16 w-16/);
}

function testCancelledBookingCardHidesViewEvent() {
  const bookingCardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(bookingCardSource, /booking\.event_id && eventHref && !showAsCancelled/);
  assert.doesNotMatch(
    bookingCardSource,
    /isAccepted && !showAsCancelled \? \([\s\S]*View event[\s\S]*\) : \([\s\S]*View event/,
  );
}

function testGigsTabBookingsCacheForTabSwitching() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const cacheSource = readFileSync(
    new URL("../lib/bookings/gigsListTabBookingsCache.ts", import.meta.url),
    "utf8",
  );
  const prefetchSource = readFileSync(
    new URL("../lib/bookings/gigsListSnapshotPrefetch.ts", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /useDisplayedGigsListTab\(djGigsView\)/);
  assert.match(pageSource, /readGigsTabBookingsCache\(displayedGigsTab\)/);
  assert.match(pageSource, /writeGigsListSessionState/);
  assert.match(pageSource, /gigsLoadGenerationRef/);
  assert.match(pageSource, /showGigsListSkeleton/);
  assert.match(cacheSource, /writeGigsListSessionState/);
  assert.match(prefetchSource, /writeGigsListSessionState/);
  assert.match(prefetchSource, /getBookingRecipientProfilesByIds/);
  assert.match(prefetchSource, /senderProfiles/);
  assert.match(pageSource, /setSenderProfiles\(snapshot\.senderProfiles\)/);
  assert.doesNotMatch(pageSource, /setGigsListReady\(true\)[\s\S]*getBookingRecipientProfilesByIds/);
}

function testGigsPlannerNamesLoadWithBookingCards() {
  const prefetchSource = readFileSync(
    new URL("../lib/bookings/gigsListSnapshotPrefetch.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const cacheSource = readFileSync(
    new URL("../lib/bookings/gigsListTabBookingsCache.ts", import.meta.url),
    "utf8",
  );

  assert.match(prefetchSource, /loadGigsSenderProfiles/);
  assert.match(prefetchSource, /mergeGigsSenderProfiles/);
  assert.match(cacheSource, /mergeGigsSenderProfiles/);
  assert.match(pageSource, /memorySnapshot\.senderProfiles/);
  assert.doesNotMatch(
    pageSource,
    /const senderIds = \[\.\.\.new Set\(receivedResult\.map\(\(booking\) => booking\.sender_id\)\)\]/,
  );
}

function testIncomingGigsCardDetailsNavigation() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const receivedCardSource = pageSource.slice(
    pageSource.indexOf("function ReceivedBookingCard"),
    pageSource.indexOf("function BookingHistoryCard"),
  );

  assert.doesNotMatch(
    receivedCardSource,
    /if \(eventHref\) \{[\s\S]*absolute inset-0 z-0[\s\S]*pointer-events-none/,
  );
  assert.match(receivedCardSource, /showChevron = isConfirmed && Boolean\(eventHref\)/);
  assert.match(receivedCardSource, /if \(isConfirmed && eventHref\)/);
  assert.match(receivedCardSource, /event\.stopPropagation\(\)/);
}

function testGigsIncomingEventArtwork() {
  const prefetchSource = readFileSync(
    new URL("../lib/bookings/gigsListSnapshotPrefetch.ts", import.meta.url),
    "utf8",
  );
  const cacheSource = readFileSync(
    new URL("../lib/bookings/gigsListTabBookingsCache.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const receivedCardSource = pageSource.slice(
    pageSource.indexOf("function ReceivedBookingCard"),
    pageSource.indexOf("function BookingHistoryCard"),
  );

  assert.match(prefetchSource, /getEventArtworkByIds/);
  assert.match(prefetchSource, /loadGigsEventArtwork/);
  assert.match(prefetchSource, /mergeGigsEventArtwork/);
  assert.match(cacheSource, /mergeGigsEventArtwork/);
  assert.match(pageSource, /setEventArtworkById\(snapshot\.eventArtworkById\)/);
  assert.match(pageSource, /memorySnapshot\.eventArtworkById/);
  assert.match(receivedCardSource, /coverImageUrl=\{coverImageUrl\}/);
  assert.match(receivedCardSource, /fallbackColour=\{fallbackColour\}/);
}

function testGigsListTabPendingOptimisticSelection() {
  const tabsSource = readFileSync(
    new URL("../app/components/bookings/DjGigsTabs.tsx", import.meta.url),
    "utf8",
  );
  const chromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const pendingSource = readFileSync(
    new URL("../lib/bookings/gigsListTabPending.ts", import.meta.url),
    "utf8",
  );

  assert.match(tabsSource, /publishGigsListTabPending\(tab\.value\)/);
  assert.match(chromeSource, /useDisplayedGigsListTab/);
  assert.match(chromeSource, /syncGigsListTabPendingWithRoute/);
  assert.match(chromeSource, /clearGigsListTabPending/);
  assert.match(pendingSource, /resolveDisplayedGigsListTab/);
  assert.match(pendingSource, /routeTab === "pending" && pendingGigsListTab != null/);
}

function testGigsFreshWorkspaceEntryOpensIncoming() {
  const subNavLinkSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
    "utf8",
  );
  const navigationSource = readFileSync(
    new URL("../lib/bookings/gigsListNavigation.ts", import.meta.url),
    "utf8",
  );

  assert.equal(buildGigsWorkspaceIncomingHref(), "/bookings");
  assert.match(navigationSource, /isBookingsContextualReturnLocation/);
  assert.match(subNavLinkSource, /clearGigsListTabPending\(\)/);
  assert.match(subNavLinkSource, /href === EVENTS_AREA_SUB_NAV\.gigs\.href/);

  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "history",
      locationPathname: "/calendar",
      locationSearch: "?view=dj",
    }),
    "pending",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "history",
      locationPathname: "/booking-plans",
      locationSearch: "",
    }),
    "pending",
  );
}

function testGigsFilterTabCountsPersistDuringLoading() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const chromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const cacheSource = readFileSync(
    new URL("../lib/bookings/gigsTabCountsCache.ts", import.meta.url),
    "utf8",
  );
  const subNavSource = readFileSync(
    new URL("../app/components/PlannerEventsSubNav.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /gigsListReady/);
  assert.match(pageSource, /gigsTabCounts \?\? readGigsTabCountsCache\(\)/);
  assert.match(pageSource, /writeGigsTabCountsCache\(gigsTabCounts\)/);
  assert.match(pageSource, /counts: resolvedGigsTabCounts/);
  assert.match(pageSource, /loadGigsListSnapshot/);
  assert.match(subNavSource, /ensureGigsListSnapshotPrefetched/);
  assert.match(chromeSource, /readGigsTabCountsCache/);
  assert.match(cacheSource, /ftc-gigs-tab-counts-v1/);
}

function testGigsFilterTabsPolish() {
  const tabsSource = readFileSync(
    new URL("../app/components/bookings/DjGigsTabs.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(tabsSource, /showCountBadge: true/);
  assert.match(tabsSource, /showCountBadge: false/);
  assert.match(tabsSource, /showCountBadge && shouldRenderGigsTabCount/);
  assert.doesNotMatch(tabsSource, /showHistoryIcon/);
  assert.doesNotMatch(tabsSource, /HistoryIcon/);
  assert.match(tabsSource, /eventsListTabPillClass\(isActive\)/);
  assert.match(tabsSource, /shouldRenderGigsTabCount/);
  assert.match(tabsSource, /gigsTabPillClass\(isActive, showCount\)/);
  assert.match(tabsSource, /formatGigsTabCountDisplay/);
  assert.match(tabsSource, /GIGS_TAB_PILL_LABEL_CLASS/);
  assert.match(tabsSource, /showCount && countDisplay/);
  assert.doesNotMatch(tabsSource, /display \?\? ""/);
  assert.doesNotMatch(tabsSource, /DjGigsTabCount/);
  assert.match(cssSource, /\.ftc-filter-pill\.ftc-gigs-tab-pill[\s\S]*padding: 0\.375rem 0\.5rem/);
  assert.match(cssSource, /\.ftc-gigs-tab-count-slot[\s\S]*min-width: 2\.5ch/);
  assert.match(cssSource, /\.ftc-gigs-tab-count-slot[\s\S]*padding-right: 0\.25rem/);
  assert.match(cssSource, /\.ftc-gigs-tab-count-slot[\s\S]*box-sizing: border-box/);
  assert.doesNotMatch(cssSource, /\.ftc-gigs-tab-count-slot[\s\S]*min-width: 2\.75ch/);
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

  clearWorkspaceGigsDisplaySession();
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
    "authoritative zero must replace an empty session display",
  );

  clearNavigationBadgeCache();
  clearWorkspaceGigsDisplaySession();
  writeRuntimeGigsPendingCount("user-a", "dj", 0);
  resolveWorkspaceGigsPendingDisplayCount({
    canViewGigs: true,
    userId: "user-a",
    role: "dj",
    providerCount: 1,
    badgesReady: true,
  });
  writeRuntimeGigsPendingCount("user-a", "dj", 0);
  assert.equal(
    resolveWorkspaceGigsPendingDisplayCount({
      canViewGigs: true,
      userId: "user-a",
      role: "dj",
      providerCount: 0,
      badgesReady: true,
    }),
    1,
    "stale runtime zero must not clear session display",
  );
}

function testWorkspaceGigsSubNavCountSurvivesStaleRuntimeZero() {
  clearNavigationBadgeCache();
  clearWorkspaceGigsDisplaySession();
  clearWorkspaceGigsSubNavDisplayLatch();

  applyPersistedGigsPendingCount("user-a", "both", 2);
  assert.equal(
    readWorkspaceGigsBadgeDisplayCountForSubNav("user-a", "both"),
    2,
    "sub-nav should show persisted gigs count",
  );

  writeRuntimeGigsPendingCount("user-a", "both", 0);
  assert.equal(
    getCachedGigsPendingCount("user-a", "both"),
    2,
    "local gigs cache must win over stale runtime zero",
  );
  assert.equal(
    readWorkspaceGigsBadgeDisplayCountForSubNav("user-a", "both"),
    2,
    "sub-nav must not flash zero when runtime is stale during tab navigation",
  );
}

function testGigsTabCountDisplayCap() {
  assert.equal(GIGS_TAB_COUNT_MAX_DISPLAY, 99);
  assert.equal(formatGigsTabCountDisplay(0), null);
  assert.equal(formatGigsTabCountDisplay(12), "12");
  assert.equal(formatGigsTabCountDisplay(99), "99");
  assert.equal(formatGigsTabCountDisplay(100), "99+");
  assert.equal(formatGigsTabCountAriaCount(100), "more than 99");
  assert.equal(shouldRenderGigsTabCount(0), false);
  assert.equal(shouldRenderGigsTabCount(1), true);
  assert.equal(shouldRenderGigsTabCount(5, { countsReady: false }), false);
  assert.equal(shouldRenderGigsTabCount(5, { countsReady: true }), true);
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
  assert.match(eventsSource, /syncPlannerEventsHiddenFromHistoryClientCaches\(successes\)/);

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
  assert.doesNotMatch(rowSource, /HistoryTabRowFeedbackCell/);
  assert.doesNotMatch(rowSource, /feedbackMessage/);
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

function testWithdrawalOtherReasonInputLimits() {
  assert.equal(MAX_WITHDRAWAL_OTHER_REASON_LINES, 3);
  assert.equal(MAX_WITHDRAWAL_OTHER_REASON_LENGTH, 80);

  assert.equal(sanitizeWithdrawalOtherReasonValue(""), "");
  assert.equal(sanitizeWithdrawalOtherReasonValue("Line one"), "Line one");
  assert.equal(
    sanitizeWithdrawalOtherReasonValue("Line one\nLine two"),
    "Line one\nLine two",
  );
  assert.equal(
    sanitizeWithdrawalOtherReasonValue("Line one\nLine two\nLine three"),
    "Line one\nLine two\nLine three",
  );
  assert.equal(
    sanitizeWithdrawalOtherReasonValue("Line one\nLine two\nLine three\nLine four"),
    "Line one\nLine two\nLine three",
  );

  const fiveLines = ["one", "two", "three", "four", "five"].join("\n");
  assert.equal(
    sanitizeWithdrawalOtherReasonValue(fiveLines),
    ["one", "two", "three"].join("\n"),
  );

  const threeLongLines = ["a".repeat(50), "b".repeat(50), "c".repeat(50)].join("\n");
  const sanitizedThreeLongLines = sanitizeWithdrawalOtherReasonValue(threeLongLines);
  assert.equal(sanitizedThreeLongLines.length, 80);
  assert.ok(countWithdrawalOtherReasonLines(sanitizedThreeLongLines) <= 3);

  const overBothLimits = `${"x".repeat(40)}\n${"y".repeat(40)}\n${"z".repeat(40)}\nextra\nextra`;
  const sanitizedBoth = sanitizeWithdrawalOtherReasonValue(overBothLimits);
  assert.ok(countWithdrawalOtherReasonLines(sanitizedBoth) <= 3);
  assert.equal(sanitizedBoth.length, 80);

  assert.equal(sanitizeWithdrawalOtherReasonValue("Unavailable"), "Unavailable");
  assert.equal(sanitizeWithdrawalOtherReason, sanitizeWithdrawalOtherReasonValue);

  const fieldSource = readFileSync(
    new URL("../app/components/booking/WithdrawalReasonDetailsField.tsx", import.meta.url),
    "utf8",
  );
  assert.match(fieldSource, /sanitizeWithdrawalOtherReasonValue/);
  assert.match(fieldSource, /onChange=\{handleChange\}/);
  assert.doesNotMatch(fieldSource, /onBeforeInput/);
  assert.doesNotMatch(fieldSource, /onPaste/);
  assert.doesNotMatch(fieldSource, /onKeyDown/);
  assert.doesNotMatch(fieldSource, /measureWithdrawalReasonVisibleRows/);
  assert.match(fieldSource, /scrollWithdrawalReasonCaretIntoView/);

  const scrollSource = readFileSync(
    new URL("../lib/booking/scrollWithdrawalReasonCaretIntoView.ts", import.meta.url),
    "utf8",
  );
  assert.match(scrollSource, /scrollWithdrawalReasonCaretIntoView/);
  assert.match(scrollSource, /resetWithdrawalReasonTextareaScroll/);

  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(globalsSource, /\.ftc-fixed-scroll-textarea[\s\S]*overflow-y: auto !important/);
  assert.match(globalsSource, /\.ftc-fixed-scroll-textarea-3[\s\S]*height: calc\(3lh \+ 1rem \+ 2px\) !important/);
  assert.match(globalsSource, /\.ftc-withdrawal-reason-textarea[\s\S]*scroll-padding-bottom: 2rem/);
  assert.match(globalsSource, /\.ftc-withdrawal-reason-textarea[\s\S]*padding-bottom: 2rem !important/);

  assert.match(
    readFileSync(
      new URL("../app/components/booking/BookingCardCompactSummary.tsx", import.meta.url),
      "utf8",
    ),
    /DmBookingCardCancellationReason/,
  );
  assert.match(
    readFileSync(new URL("../app/components/booking/DmBookingCardLayout.tsx", import.meta.url), "utf8"),
    /ftc-dm-booking-cancellation-reason-text/,
  );
  assert.match(
    readFileSync(new URL("../app/components/booking/DmBookingCardLayout.tsx", import.meta.url), "utf8"),
    /min-w-0 w-full max-w-full overflow-hidden/,
  );
  assert.match(
    readFileSync(new URL("../app/components/BookingRequestCard.tsx", import.meta.url), "utf8"),
    /overflow-x-hidden/,
  );
  assert.match(
    readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
    /\.ftc-dm-booking-cancellation-reason-text[\s\S]*line-clamp: 3/,
  );
  assert.match(
    readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
    /\.ftc-dm-booking-cancellation-reason-text[\s\S]*white-space: pre-line/,
  );
  assert.match(
    readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
    /\.ftc-dm-booking-cancellation-reason-text[\s\S]*max-height:/,
  );
  assert.match(
    readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
    /\.ftc-event-detail-cancellation-reason-text[\s\S]*overflow-wrap: anywhere/,
  );
  assert.match(
    readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
    /\.ftc-event-detail-notes-text[\s\S]*white-space: pre-wrap[\s\S]*overflow-wrap: anywhere/,
  );
  assert.match(
    readFileSync(new URL("../app/events/[eventId]/page.tsx", import.meta.url), "utf8"),
    /EVENT_DETAIL_NOTES_TEXT_CLASS/,
  );
  assert.match(
    readFileSync(new URL("../app/events/[eventId]/page.tsx", import.meta.url), "utf8"),
    /EventDetailBookingCancellationDetails/,
  );
  assert.match(
    readFileSync(new URL("../app/events/[eventId]/page.tsx", import.meta.url), "utf8"),
    /min-w-0 flex-1/,
  );

  const cancelButtonSource = readFileSync(
    new URL("../app/components/booking/CancelAcceptedBookingButton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(cancelButtonSource, /sanitizeWithdrawalOtherReason\(otherReason\)/);

  const bookingRequestsSource = readFileSync(
    new URL("../lib/bookingRequests.ts", import.meta.url),
    "utf8",
  );
  assert.match(bookingRequestsSource, /sanitizeWithdrawalOtherReason\(trimmedReason\)/);
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

function testEventDetailMobileNavContentOffset() {
  const pageSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  const uiSource = readFileSync(
    new URL("../app/components/event-detail/eventDetailUi.ts", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );

  assert.match(uiSource, /EVENT_DETAIL_PAGE_CONTENT_CLASS/);
  assert.match(uiSource, /MOBILE_NAV_OFFSET_CLASS/);
  assert.match(uiSource, /ftc-mobile-nav-offset/);
  assert.match(uiSource, /getEventDetailPageContentBottomClass/);
  assert.match(pageSource, /EVENT_DETAIL_PAGE_SHELL_CLASS/);
  assert.match(pageSource, /EVENT_DETAIL_PAGE_CONTENT_CLASS/);
  assert.match(pageSource, /getEventDetailPageContentBottomClass\(showBottomBar\)/);
  assert.doesNotMatch(
    pageSource,
    /EVENT_DETAIL_PAGE_SHELL_CLASS[\s\S]*MOBILE_NAV_OFFSET_CLASS/,
  );
  assert.match(skeletonSource, /EVENT_DETAIL_PAGE_CONTENT_CLASS/);
  assert.match(skeletonSource, /EVENT_DETAIL_PAGE_SHELL_CLASS/);
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

function testFixedChatPageDocumentReset() {
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const prepareSource = readFileSync(
    new URL("../lib/navigation/prepareFixedChatPageMount.ts", import.meta.url),
    "utf8",
  );
  const hookSource = readFileSync(
    new URL("../lib/navigation/useFixedChatPageDocumentReset.ts", import.meta.url),
    "utf8",
  );
  const keyboardSource = readFileSync(
    new URL("../lib/navigation/mobileSoftwareKeyboard.ts", import.meta.url),
    "utf8",
  );
  const composerSource = readFileSync(
    new URL("../app/components/dm/DmComposer.tsx", import.meta.url),
    "utf8",
  );
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dmPageSource, /useFixedChatPageDocumentReset\(fixedChatRouteKey\)/);
  assert.match(dmPageSource, /FIXED_CHAT_PAGE_SHELL_CLASS/);
  assert.match(prepareSource, /lockFixedChatDocumentScroll/);
  assert.match(prepareSource, /html\.style\.overflow = "hidden"/);
  assert.match(prepareSource, /body\.style\.overflow = "hidden"/);
  assert.match(prepareSource, /readFixedChatLayoutDiagnostics/);
  assert.match(prepareSource, /h-\[100dvh\]/);
  assert.match(prepareSource, /scrollDocumentToTop/);
  assert.match(prepareSource, /resetMobileSoftwareKeyboardSession/);
  assert.match(prepareSource, /removeAttribute\(MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE\)/);
  assert.match(prepareSource, /history\.scrollRestoration = "manual"/);
  assert.match(hookSource, /useLayoutEffect/);
  assert.match(hookSource, /lockFixedChatDocumentScroll/);
  assert.match(hookSource, /runDoubleRafDocumentScrollToTop/);
  assert.match(hookSource, /pageshow/);
  assert.match(hookSource, /visibilitychange/);
  assert.match(keyboardSource, /resetMobileSoftwareKeyboardSession/);
  assert.match(composerSource, /placeholder="Message"/);
  assert.doesNotMatch(composerSource, /placeholder="Message\.\.\."/);
  assert.match(eventDetailSource, /router\.push\(eventsBackHref\)/);
  assert.doesNotMatch(eventDetailSource, /router\.push\(eventsBackHref, \{ scroll: false \}\)/);
}

function testDismissComposerKeyboardOnIntentionalScroll() {
  const hookSource = readFileSync(
    new URL("../lib/dm/dismissComposerKeyboardOnIntentionalScroll.ts", import.meta.url),
    "utf8",
  );
  const policySource = readFileSync(
    new URL("../lib/dm/composerKeyboardDismissPolicy.ts", import.meta.url),
    "utf8",
  );
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(policySource, /COMPOSER_KEYBOARD_DISMISS_AT_BOTTOM_VIEWPORT_RATIO = 0\.18/);
  assert.match(policySource, /UIScrollView\.keyboardDismissMode/);
  assert.match(policySource, /WebKit dismisses the software keyboard as soon as a/);
  assert.match(policySource, /computeManualMessageListScrollTop/);
  assert.match(policySource, /shouldDismissComposerKeyboardAtBottom/);

  assert.match(hookSource, /event\.preventDefault\(\)/);
  assert.match(hookSource, /applyManualMessageListScrollDelta/);
  assert.match(hookSource, /appendTouchSample/);
  assert.match(hookSource, /computeReleaseScrollVelocityPxPerMs/);
  assert.match(hookSource, /startMomentumScroll/);
  assert.match(hookSource, /cancelMomentumScroll/);
  assert.match(hookSource, /isValidMessageHistoryGestureStart/);
  assert.match(hookSource, /shouldStabilizeComposerTouchMove/);
  assert.match(hookSource, /onComposerTouchStart/);
  assert.match(hookSource, /composerRootRef/);
  assert.match(hookSource, /requestAnimationFrame\(stepMomentumScroll\)/);
  assert.match(hookSource, /shouldDismissComposerKeyboardAtBottom/);
  assert.match(hookSource, /input\.blur\(\)/);
  assert.match(hookSource, /syncMobileSoftwareKeyboardDocumentState/);
  assert.match(hookSource, /preserveScrollPositionDuringKeyboardDismiss/);
  assert.match(hookSource, /touchstart[\s\S]*passive: true/);
  assert.match(hookSource, /touchmove[\s\S]*passive: false/);
  assert.doesNotMatch(hookSource, /onTouchStart[\s\S]*?input\.blur\(\)/);
  assert.doesNotMatch(hookSource, /setTimeout/);
  assert.match(dmPageSource, /useDismissComposerKeyboardOnIntentionalScroll\(scrollRef, composerInputRef, composerRootRef\)/);
  assert.match(dmPageSource, /composerRootRef=\{composerRootRef\}/);
}

function testComposerKeyboardDismissPolicyMath() {
  const container = {
    scrollTop: 880,
    scrollHeight: 1000,
    clientHeight: 100,
  } as HTMLElement;

  assert.equal(isPinnedToNewestMessages(container), true);
  assert.equal(computeManualMessageListScrollTop(880, 200, 150, 900), 930);
  assert.equal(applyManualMessageListScrollDelta(880, 200, 150, 900), 930);
  assert.equal(computeManualMessageListScrollTop(500, 200, 250, 900), 450);
  assert.equal(applyManualMessageListScrollDelta(500, 200, 250, 900), 450);
  assert.equal(
    shouldDismissComposerKeyboardAtBottom({
      pinnedToNewest: true,
      downwardDragAtBottomPx: 80,
      visibleViewportHeight: 400,
      deltaX: 0,
      deltaY: 80,
    }),
    true,
  );
  assert.equal(
    shouldDismissComposerKeyboardAtBottom({
      pinnedToNewest: true,
      downwardDragAtBottomPx: 40,
      visibleViewportHeight: 400,
      deltaX: 0,
      deltaY: 40,
    }),
    false,
  );
  assert.equal(
    shouldDismissComposerKeyboardAtBottom({
      pinnedToNewest: false,
      downwardDragAtBottomPx: 120,
      visibleViewportHeight: 400,
      deltaX: 0,
      deltaY: 120,
    }),
    false,
  );
  assert.equal(
    shouldDismissComposerKeyboardAtBottom({
      pinnedToNewest: true,
      downwardDragAtBottomPx: 120,
      visibleViewportHeight: 400,
      deltaX: 100,
      deltaY: 20,
    }),
    false,
  );
}

function testMessageHistoryGestureTarget() {
  const scrollContainer = document.createElement("div");
  const composerRoot = document.createElement("div");
  const message = document.createElement("p");
  const button = document.createElement("button");
  const input = document.createElement("input");

  scrollContainer.append(message, button);
  composerRoot.append(input);

  assert.equal(
    isValidMessageHistoryGestureStart(message, scrollContainer, composerRoot),
    true,
  );
  assert.equal(
    isValidMessageHistoryGestureStart(button, scrollContainer, composerRoot),
    false,
  );
  assert.equal(
    isValidMessageHistoryGestureStart(input, scrollContainer, composerRoot),
    false,
  );
  composerRoot.className = "dm-composer";
  assert.equal(shouldStabilizeComposerTouchMove(button, composerRoot), true);
  assert.equal(shouldStabilizeComposerTouchMove(input, composerRoot), false);
}

function testComposerMessageListMomentumScroll() {
  const samples = [
    { y: 300, time: 0 },
    { y: 250, time: 50 },
  ];

  assert.equal(computeReleaseScrollVelocityPxPerMs(samples), 1);
  assert.equal(shouldStartMomentumScroll(1), true);
  assert.equal(shouldStartMomentumScroll(0.05), false);

  const frictionStep = applyMomentumFriction(1, 16);
  assert.ok(frictionStep > 0 && frictionStep < 1);

  const boundaryStep = applyMomentumScrollStep({
    scrollTop: 895,
    velocityPxPerMs: 2,
    frameDeltaMs: 16,
    maxScrollTop: 900,
  });
  assert.equal(boundaryStep.scrollTop, 900);
  assert.equal(boundaryStep.velocityPxPerMs, 0);
}

function testDmBookingTargetScrollUsesContainerOnly() {
  const bookingTargetSource = readFileSync(
    new URL("../lib/dm/chatBookingTarget.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(bookingTargetSource, /scrollIntoView/);
  assert.match(bookingTargetSource, /scrollChatBookingTargetIntoView/);
  assert.match(bookingTargetSource, /computeChatMessageCenterScrollTop/);
  assert.match(bookingTargetSource, /clampDmMessageScrollTop/);
  assert.match(bookingTargetSource, /traceDmChatLayout/);
}

function testDmBookingTargetCenterScrollTopMath() {
  const container = {
    scrollTop: 100,
    scrollHeight: 1000,
    clientHeight: 400,
    getBoundingClientRect: () => ({
      top: 80,
      bottom: 480,
      left: 0,
      right: 390,
      width: 390,
      height: 400,
      x: 0,
      y: 80,
      toJSON: () => ({}),
    }),
  } as HTMLElement;

  const messageElement = {
    getBoundingClientRect: () => ({
      top: 500,
      bottom: 540,
      left: 0,
      right: 390,
      width: 390,
      height: 40,
      x: 0,
      y: 500,
      toJSON: () => ({}),
    }),
  } as HTMLElement;

  assert.equal(computeChatMessageCenterScrollTop(container, messageElement), 340);
}

function testEventTitleClampLayout() {
  assert.equal(FTC_EVENT_TITLE_CLAMP_CLASS, "ftc-event-title-clamp-2");

  const cssSource = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(cssSource, /\.ftc-event-title-clamp-2[\s\S]*-webkit-line-clamp: 2/);
  assert.match(cssSource, /\.ftc-event-title-clamp-2[\s\S]*overflow-wrap: anywhere/);
  assert.match(eventsSource, /FTC_EVENT_TITLE_CLAMP_CLASS/);
  assert.doesNotMatch(eventsSource, /line-clamp-2 sm:text-base/);
  assert.match(eventDetailSource, /FTC_EVENT_TITLE_CLAMP_CLASS/);
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
  assert.match(controlsSource, /resolveEventsListCreateFlowChromeActive/);
  assert.match(controlsSource, /eventsListTabPillClass\(!createFlowChromeActive && !isHistoryTab\)/);
  assert.match(controlsSource, /eventsListTabPillClass\(!createFlowChromeActive && isHistoryTab\)/);
  assert.match(source, /<EventsListTabControls/);
  assert.match(source, /markEventsCreateFlowChromeOpen/);
  assert.match(source, /clearEventsCreateFlowChromeOpen/);
  assert.match(source, /resolveEventsListCreateBootstrapState/);
  assert.match(source, /getEventsCreateBootstrapState/);
  assert.match(source, /createBootstrap = calendarBootstrap \?\? eventsCreateBootstrap/);
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
  assert.match(source, /prepareEventsListEventNavigation\(listTab\)/);
  assert.doesNotMatch(source, /writeEventsListTabCache/);
  assert.match(source, /onTabLinkClick=\{handleEventsListTabLinkClick\}/);
  const appLoadingSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(appLoadingSource, /resolveEventsListCreateFlowChromeActive/);
  assert.match(
    readFileSync(
      new URL("../app/(planner-workspace)/events/EventsRouteLoadingShell.tsx", import.meta.url),
      "utf8",
    ),
    /useSearchParams/,
  );
  assert.doesNotMatch(
    readFileSync(
      new URL("../app/(planner-workspace)/events/EventsRouteLoadingShell.tsx", import.meta.url),
      "utf8",
    ),
    /useState\(readRouteSearchParams\)/,
  );
  assert.equal(resolveEventsListCreateBootstrapState("plan", "")?.createOpen, true);
  assert.equal(resolveEventsListCreateBootstrapState("plan", "")?.createStep, "pick-plan");
  assert.equal(resolveEventsListCreateBootstrapState("event", "2026-08-01")?.createStep, "source");
  assert.equal(resolveEventsListCreateBootstrapState("custom", "")?.createStep, "form");
  assert.equal(resolveEventsListCreateBootstrapState("booking", ""), null);
  assert.match(
    readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    ),
    /\.ftc-filter-pill\.ftc-events-list-tab-pill[\s\S]*transition: none/,
  );
  assert.equal(resolveEventsListCreateFlowChromeActive({ createOpen: true }), true);
  assert.equal(resolveEventsListCreateFlowChromeActive({ locationSearch: "?create=plan" }), true);
  assert.equal(isEventsListCreateDeepLinkParam("plan"), true);
  assert.equal(
    resolveEventDetailDmOriginConversationId({
      from: "dm",
      conversationId: "conv-1",
    }),
    "conv-1",
  );
  assert.equal(
    shouldHideEventDetailLineupMessageButton("conv-1", "conv-1"),
    true,
  );
  assert.equal(
    shouldHideEventDetailLineupMessageButton("conv-1", "conv-2"),
    false,
  );
}

function testEventsListTabParamRestoresHistoryWithoutActiveDefault() {
  assert.equal(resolveEventsListTabParam(null, "history", ""), "history");
  assert.equal(resolveEventsListTabParam(null, "history", "?"), "history");
  assert.equal(resolveEventsListTabParam(null, null, "?tab=history"), "history");
  assert.equal(resolveEventsListTabParam(null, null, ""), "active");
  assert.equal(resolveEventsListTabParam(null, null, "?"), "active");
  assert.equal(
    resolveEventDetailBackHref("history"),
    "/events?tab=history",
  );
}

function testEventsListTabIgnoresLegacySessionCacheWithoutUrlTab() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("ftc:events-list-tab", "history");
  }

  assert.equal(resolveEventsListTabParam(null, null, ""), "active");
  assert.equal(resolveEventsListTabParam(null, null, "/events"), "active");

  clearEventsListTabCache();
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
  assert.doesNotMatch(source, /SavedEventPlansSectionHeader[\s\S]*EVENT_PLANS_TOOLBAR_ROW_CLASS/);
  assert.match(source, /SavedEventPlansSectionHeader[\s\S]*<EventsListTabRow/);
  assert.match(source, /<EventsListTabPillWidthSpacer \/>/);
  assert.doesNotMatch(source, /SavedEventPlansSectionHeader[\s\S]*if \(selectionMode\)/);
  assert.doesNotMatch(
    source,
    /SavedEventPlansSectionHeader[\s\S]*flex w-\[1\.875rem\] shrink-0 items-center justify-start/,
  );
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
  assert.match(djCalendarSource, /isDjGigsCalendarBulkSelectableDateKey/);
  assert.match(
    djCalendarSource,
    /selectDisplayedDatesMatching[\s\S]*filter\(isDjGigsCalendarBulkSelectableDateKey\)/,
  );

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
  assert.match(subNavLinkSource, /shouldCommitNavigationGesture/);
}

function testBookingsUsePlanCancelReturnsToEventPlans() {
  const bookingsSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const planDeepLinkSource = readFileSync(
    new URL("../lib/bookings/planDeepLink.ts", import.meta.url),
    "utf8",
  );

  assert.match(bookingsSource, /eventPlansCreateReturnHrefRef/);
  assert.match(bookingsSource, /resolveEventPlansCreateReturnHref/);
  assert.match(bookingsSource, /navigateAwayFromEventPlansCreateFlow\(returnHref, router\)/);
  assert.match(
    bookingsSource,
    /function exitPlannerCreateFlow[\s\S]*?if \(returnHref\) \{[\s\S]*?navigateAwayFromEventPlansCreateFlow\(returnHref, router\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?resetCreateFlowState/,
  );
  assert.match(planDeepLinkSource, /export function resolveEventPlansCreateReturnHref/);
  assert.match(planDeepLinkSource, /router\.replace\(returnHref, \{ scroll: false \}\)/);
}

function testEventPlansCreateFormDeepLink() {
  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const bookingsSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const bookingPlansSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  const planDeepLinkSource = readFileSync(
    new URL("../lib/bookings/planDeepLink.ts", import.meta.url),
    "utf8",
  );

  assert.match(planDeepLinkSource, /buildEventPlansCreateFormHref/);
  assert.match(planDeepLinkSource, /resolveEventPlansPageCreateIntent/);
  assert.match(planDeepLinkSource, /buildEventsCreatePickPlanReturnHref/);
  assert.match(planDeepLinkSource, /buildBookingsCreatePickPlanReturnHref/);
  assert.match(planDeepLinkSource, /completeEventPlansCreateReturn/);
  assert.match(planDeepLinkSource, /appendPlanIdToCreateFlowReturnHref/);
  assert.match(planDeepLinkSource, /resolveCreateFlowReturnPlanId/);
  assert.match(bookingPlansSource, /resolveEventPlansPageCreateIntent\(searchParams\)/);
  assert.match(bookingPlansSource, /completeEventPlansCreateReturn/);
  assert.match(bookingPlansSource, /router\.replace\("\/booking-plans", \{ scroll: false \}\)/);
  assert.match(bookingPlansSource, /navigateAwayFromEventPlansCreateFlow\(returnHref, router\)/);
  assert.match(eventsSource, /resolveCreateFlowReturnPlanId/);
  assert.match(eventsSource, /loadBookingPlansForCreate\(\{ preselectPlanId/);
  assert.match(eventsSource, /buildEventPlansCreateFormHref/);
  assert.match(eventsSource, /Create event plan/);
  assert.doesNotMatch(eventsSource, /Create an event plan/);
  assert.match(bookingsSource, /buildEventPlansCreateFormHref/);
  assert.match(bookingsSource, /Create event plan/);
  assert.doesNotMatch(bookingsSource, /Create an event plan/);
  assert.equal(
    buildEventPlansCreateFormHref({
      returnHref: "/events?create=plan",
    }),
    "/booking-plans?create=plan&returnTo=%2Fevents%3Fcreate%3Dplan",
  );
  assert.equal(buildEventsCreatePickPlanReturnHref({ calendarOriginDateKey: null }), "/events?create=plan");
  assert.equal(
    buildEventsCreatePickPlanReturnHref({ calendarOriginDateKey: "2026-07-27" }),
    "/events?create=calendar-plans&eventDate=2026-07-27",
  );
  assert.equal(
    appendPlanIdToCreateFlowReturnHref("/events?create=plan", "plan-123"),
    "/events?create=plan&planId=plan-123",
  );
  assert.equal(
    completeEventPlansCreateReturn({
      returnHref: "/events?create=plan",
      planId: "plan-123",
    }),
    "/events?create=plan&planId=plan-123",
  );
}

function testEventPlanCardSelectionHighlight() {
  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const plannerUiSource = readFileSync(
    new URL("../app/components/planner/PlannerUi.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(eventsSource, /selected=\{selectedPlanId === plan\.id\}/);
  assert.match(plannerUiSource, /buttonRef\.current\?\.blur\(\)/);
  assert.match(plannerUiSource, /touch-manipulation ftc-option-card/);
  assert.match(plannerUiSource, /focus-visible:outline-ftc-primary/);
  assert.match(cssSource, /\.ftc-option-card:active:not\(:disabled\)/);
  assert.doesNotMatch(cssSource, /\.ftc-option-card:focus-within/);
}

function testBookingsUsePlanCreatesEventBeforeSend() {
  const bookingsSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const eventsSource = readFileSync(new URL("../lib/events.ts", import.meta.url), "utf8");

  assert.match(eventsSource, /eventInputFromBookingRequestInput/);
  assert.match(
    bookingsSource,
    /if \(!eventId\) \{[\s\S]*createEvent\([\s\S]*eventInputFromBookingRequestInput\(form, effectiveSelectedPlanId\)/,
  );
  assert.match(bookingsSource, /prependEventToEventsListCache\(true, createdWithStats\)/);
  assert.match(bookingsSource, /clearPlannerCalendarItemsCache\(\)/);
  assert.match(bookingsSource, /existingEventBookings: duplicateSource/);
}

function testPlannerCalendarEventDeletionSync() {
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  const calendarSource = readFileSync(new URL("../lib/calendar.ts", import.meta.url), "utf8");
  const lifecycleSource = readFileSync(
    new URL("../lib/events/plannerEventLifecycleClientSync.ts", import.meta.url),
    "utf8",
  );

  assert.match(calendarSource, /export function resolveSentBookingsLinkedToPlannerEvent/);
  assert.match(lifecycleSource, /cancelCalendarLinkedOrphanSentBookingsForEvent/);
  assert.match(lifecycleSource, /syncPlannerEventDeletedFromClientCaches/);
  assert.match(lifecycleSource, /syncPlannerEventsHiddenFromHistoryClientCaches/);
  assert.match(lifecycleSource, /removePlannerCalendarItemsForEvent/);
  assert.match(eventDetailSource, /cancelCalendarLinkedOrphanSentBookingsForEvent\(event\)/);
  assert.match(eventDetailSource, /syncPlannerEventDeletedFromClientCaches/);
  assert.match(eventDetailSource, /syncPlannerEventCancelledFromClientCaches/);
  assert.match(eventDetailSource, /resolveSentBookingsLinkedToPlannerEvent/);
}

function testPlannerCalendarScopesOwnedEventsOnly() {
  const calendarSource = readFileSync(new URL("../lib/calendar.ts", import.meta.url), "utf8");

  assert.match(
    calendarSource,
    /export async function loadPlannerCalendarItems[\s\S]*?const events = await listOwnedEvents\(\)/,
  );
  assert.doesNotMatch(
    calendarSource,
    /export async function loadPlannerCalendarItems[\s\S]*?listSentBookingRequests/,
  );
  assert.doesNotMatch(
    calendarSource,
    /export async function loadPlannerCalendarItems[\s\S]*?sent_booking/,
  );
  assert.match(
    calendarSource,
    /PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS = PLANNER_CALENDAR_LEGEND_ITEMS\.filter\([\s\S]*?event_today[\s\S]*?event_upcoming/,
  );
  assert.doesNotMatch(
    calendarSource,
    /PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS[\s\S]*?kind !== "declined"/,
  );
  assert.match(calendarSource, /isPlannerEventVisibleOnCalendar\(event\)/);
}

function testPlannerHistoryHideRemovesCalendarItems() {
  assert.equal(
    isPlannerEventVisibleOnCalendar({
      status: "upcoming",
      history_hidden_at: "2026-01-01T00:00:00.000Z",
    }),
    false,
  );
  assert.equal(
    isPlannerEventVisibleOnCalendar({
      status: "upcoming",
      history_hidden_at: null,
    }),
    true,
  );
  assert.equal(
    isPlannerEventVisibleOnCalendar({
      status: "cancelled",
      history_hidden_at: null,
    }),
    false,
  );
}

function testCalendarCreateWorkspaceTabNavigation() {
  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceLayout.tsx", import.meta.url),
    "utf8",
  );
  const subNavLinkSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
    "utf8",
  );

  assert.match(eventsSource, /blockWorkspaceTabsWhileCalendarCreateSaving/);
  assert.match(
    eventsSource,
    /isCalendarWorkspaceHost && isCalendarOriginCreateParam\(createParam\) && saving/,
  );
  assert.match(eventsSource, /prefetchCalendarCreateWorkspaceExitTargets/);
  assert.match(subNavLinkSource, /isCalendarCreateWorkspaceLocation/);
  assert.match(subNavLinkSource, /navigateAwayFromCalendarCreateWorkspace/);
  assert.match(subNavLinkSource, /shouldCommitNavigationGesture/);
  assert.match(layoutSource, /const workspaceIntercept = headerState\.interceptWorkspaceTabNavigation/);
  assert.doesNotMatch(
    layoutSource,
    /pathname === "\/calendar"[\s\S]*\? null[\s\S]*: headerState\.interceptWorkspaceTabNavigation/,
  );
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
  assert.doesNotMatch(skeletonSource, /InlineTabFeedbackMessage/);
  assert.match(pageSource, /const showEventPlansToolbar = !formOpen;/);
  assert.match(pageSource, /useSetPlannerWorkspaceHeaderState/);
  assert.match(pageSource, /titleFeedbackMessage: showTitleFeedback \? successMessage : null/);
  assert.match(pageSource, /saving \? "Saving" : editingPlanId \? "Save changes" : "Save event plan"/);
  assert.doesNotMatch(pageSource, /Saving\.\.\./);
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
  assert.match(plansSource, /useSetPlannerWorkspaceHeaderState/);
  assert.match(plansSource, /titleFeedbackMessage: showTitleFeedback \? successMessage : null/);
  assert.doesNotMatch(plansSource, /feedbackMessage=\{successMessage\}/);
  assert.doesNotMatch(
    plansSource,
    /rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary/,
  );
  assert.equal(HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS, 2700);
  assert.equal(HISTORY_REMOVAL_FEEDBACK_FADE_MS, 300);
  assert.equal(HISTORY_REMOVAL_FEEDBACK_CLEAR_MS, 3000);
  assert.equal(INLINE_TAB_FEEDBACK_FADE_MS, 2700);
  assert.equal(INLINE_TAB_FEEDBACK_CLEAR_MS, 3000);
  assert.match(eventsSource, /useInlineTabFeedbackDismiss/);
  assert.match(eventsSource, /useSetPlannerWorkspaceHeaderState/);
  assert.match(eventsSource, /titleFeedbackMessage: showTitleFeedback \? successMessage : null/);
  assert.doesNotMatch(eventsSource, /setHistoryFeedbackFading/);
  assert.doesNotMatch(eventsSource, /feedbackMessage=\{isHistoryTab \? successMessage/);
  assert.match(eventsSource, /saving \? "Saving" : "Save event"/);
  assert.doesNotMatch(eventsSource, /Saving\.\.\./);
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
  assert.match(loadingSource, /Suspense/);
  assert.match(loadingSource, /EventsListAreaLoading/);
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
      locationPathname: "/events/event-123",
      locationSearch: "?from=bookings&tab=history",
    }),
    "history",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "accepted",
      locationPathname: "/dm/conversation-1",
      locationSearch: "?from=bookings&tab=accepted&bookingRequestId=br-1",
    }),
    "accepted",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: null,
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
      searchParamsTab: "accepted",
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
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: null,
      locationPathname: "/bookings",
      locationSearch: "?tab=accepted",
    }),
    "accepted",
  );
  assert.equal(
    resolveGigsListTabForBookingsPage({
      nextPathname: "/bookings",
      searchParamsTab: "pending",
      locationPathname: "/bookings",
      locationSearch: "?tab=accepted",
    }),
    "accepted",
  );
}

function testGigsRouteTabUsesSharedHook() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const chromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /const djGigsView = useGigsListRouteTab\(\)/);
  assert.match(chromeSource, /export function useGigsListRouteTab/);
  assert.match(chromeSource, /const routeActiveView = useGigsListRouteTab\(\)/);
  assert.match(chromeSource, /searchParamsTab: searchParams\.get\("tab"\)/);
  assert.doesNotMatch(pageSource, /searchParamsTab: null/);
  assert.match(chromeSource, /useLayoutEffect/);
  assert.doesNotMatch(pageSource, /setLocationRevision/);
}

function testGigsEventDetailReturnPreservesTab() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const chromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const navigationSource = readFileSync(
    new URL("../lib/bookings/gigsListNavigation.ts", import.meta.url),
    "utf8",
  );

  assert.match(navigationSource, /ensureGigsListTabInBrowserHistory/);
  assert.match(navigationSource, /window\.history\.replaceState/);
  assert.match(pageSource, /ensureGigsListTabInBrowserHistory\(gigsTab\)/);
  assert.match(pageSource, /useGigsListRouteTab/);
  assert.doesNotMatch(chromeSource, /searchParamsTab: null/);
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
  const subNavLinkSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceSubNavLink.tsx", import.meta.url),
    "utf8",
  );
  assert.match(subNavSource, /href=\{tab\.href\}/);
  assert.match(subNavLinkSource, /clearEventsListTabCache/);
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
  const djCalendarSource = readFileSync(
    new URL("../app/components/DjAvailabilityCalendar.tsx", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
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
  assert.match(subNavLinkSource, /router\.push\(destinationHref/);
  assert.match(subNavLinkSource, /commitNavigation\(/);
  assert.match(subNavLinkSource, /shouldLeaveCalendarViaNativeLink/);
  assert.match(subNavLinkSource, /isCalendarWorkspacePath\(pathname\)/);
  assert.doesNotMatch(subNavLinkSource, /window\.location\.assign\(destinationHref\)/);
  assert.match(bothCalendarSource, /relative isolate z-0 flex flex-col/);
  assert.match(monthNavSource, /grid-cols-1 grid-rows-1/);
  assert.match(monthNavSource, /\[&_\*\]:pointer-events-none/);
  assert.match(djCalendarSource, /useSetPlannerWorkspaceHeaderState/);
  assert.match(djCalendarSource, /useInlineTabFeedbackDismiss/);
  assert.match(djCalendarSource, /formatGigsCalendarAvailabilityMarkedMessage/);
  assert.match(djCalendarSource, /formatGigsCalendarAvailabilityClearedMessage/);
  assert.match(
    djCalendarSource,
    /titleFeedbackMessage: showTitleFeedback \? availabilitySuccessMessage : null/,
  );
  assert.doesNotMatch(djCalendarSource, /GigCalendarUpdatePill/);
  assert.doesNotMatch(djCalendarSource, /monthNavOverlay/);
  assert.match(djCalendarSource, /const secondaryRowAction = useMemo/);
  assert.match(bothCalendarSource, /current\?\.secondaryRowAction === chrome\?\.secondaryRowAction/);
  assert.match(skeletonSource, /DjCalendarBodySkeleton[\s\S]*w-full shrink-0/);
  assert.doesNotMatch(
    skeletonSource,
    /export function DjCalendarBodySkeleton\(\) \{[\s\S]*?className="contents"/,
  );
  assert.equal(isCalendarWorkspacePath("/calendar"), true);
  assert.equal(isCalendarWorkspacePath("/calendar/foo"), true);
  assert.equal(isCalendarWorkspacePath("/events"), false);
}

function testGigsTabRowReservesManageSlotOnAllTabs() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const gigsChromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  const designSource = readFileSync(
    new URL("../lib/design/ftcDesignSystem.ts", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /const reserveGigsManageSlot = !showGigsManageButton && !gigsHistoryBulkManage\.selectionMode;/);
  assert.doesNotMatch(pageSource, /isGigsHistoryTab && !gigsHistoryBulkManage\.selectionMode && !showGigsManageButton/);
  assert.match(gigsChromeSource, /reserveManageSlot: true/);
  assert.doesNotMatch(
    gigsChromeSource,
    /activeView === "history" &&[\s\S]*reserveManageSlot/,
  );
  const djGigsTabRowSource = skeletonSource.slice(
    skeletonSource.indexOf("export function DjGigsTabRow"),
    skeletonSource.indexOf("export function EventsCalendarCreateLoadingShell"),
  );
  assert.match(djGigsTabRowSource, /GIGS_LIST_TAB_ACTION_CLASS/);
  assert.match(djGigsTabRowSource, /GIGS_MANAGE_BUTTON_PLACEHOLDER_CLASS/);
  assert.match(djGigsTabRowSource, /selectionMode \?/);
  assert.match(designSource, /GIGS_MANAGE_BUTTON_PLACEHOLDER_CLASS = FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS/);
}

function testGigsHistorySelectionToolbarEmbeddedInTabRow() {
  const pageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const gigsChromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const tabsSource = readFileSync(
    new URL("../app/components/bookings/DjGigsTabs.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /<HistorySelectionToolbar/);
  assert.match(pageSource, /historySelectionMode: gigsHistorySelectionMode/);
  assert.match(pageSource, /reserveGigsManageSlot = !showGigsManageButton && !gigsHistoryBulkManage\.selectionMode/);
  assert.match(pageSource, /gigsHistoryCancelSelectionRef/);
  assert.match(gigsChromeSource, /tabRowEmbedded/);
  assert.match(gigsChromeSource, /removeLabel="Delete"/);
  assert.match(gigsChromeSource, /selectAllLabel="ALL"/);
  assert.match(gigsChromeSource, /cancelVariant="backIcon"/);
  assert.match(gigsChromeSource, /hideHistoryTab=\{historySelectionMode\}/);
  assert.match(tabsSource, /hideHistoryTab/);
}

function testHistoryRemovalHeaderFeedbackUnified() {
  const gigsPageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  const eventsSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const gigsChromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );
  const skeletonSource = readFileSync(
    new URL("../app/components/skeleton/Skeleton.tsx", import.meta.url),
    "utf8",
  );
  const titleFeedbackSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceTitleFeedback.tsx", import.meta.url),
    "utf8",
  );
  const titleFeedbackProviderSource = readFileSync(
    new URL("../app/components/planner/PlannerTitleFeedbackProvider.tsx", import.meta.url),
    "utf8",
  );
  const titleFeedbackSlotSource = readFileSync(
    new URL("../app/components/planner/PlannerTitleFeedbackSlot.tsx", import.meta.url),
    "utf8",
  );
  const appProvidersSource = readFileSync(
    new URL("../app/components/AppProviders.tsx", import.meta.url),
    "utf8",
  );
  const rootLayoutSource = readFileSync(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );
  const onboardingGuardSource = readFileSync(
    new URL("../app/components/OnboardingGuard.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = readFileSync(
    new URL("../app/components/planner/PlannerWorkspaceLayout.tsx", import.meta.url),
    "utf8",
  );
  const eventsRowSource = readFileSync(
    new URL("../app/components/events/EventsListTabRow.tsx", import.meta.url),
    "utf8",
  );
  const eventsControlsSource = readFileSync(
    new URL("../app/components/events/EventsListTabControls.tsx", import.meta.url),
    "utf8",
  );
  const plansSource = readFileSync(
    new URL("../app/(planner-workspace)/booking-plans/page.tsx", import.meta.url),
    "utf8",
  );
  const feedbackMessageSource = readFileSync(
    new URL("../app/components/feedback/InlineTabFeedbackMessage.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(formatEventsHistoryRemoveSuccessMessage(1), "1 event removed from history");
  assert.equal(formatEventsHistoryRemoveSuccessMessage(3), "3 events removed from history");
  assert.equal(formatGigsHistoryRemoveSuccessMessage(1), "1 gig removed from history");
  assert.equal(formatGigsHistoryRemoveSuccessMessage(3), "3 gigs removed from history");
  assert.equal(formatGigsCalendarAvailabilityMarkedMessage(1, "available"), "1 date marked available");
  assert.equal(formatGigsCalendarAvailabilityMarkedMessage(6, "maybe"), "6 dates marked maybe");
  assert.equal(formatGigsCalendarAvailabilityMarkedMessage(6, "unavailable"), "6 dates marked unavailable");
  assert.equal(formatGigsCalendarAvailabilityClearedMessage(1), "Availability cleared for 1 date");
  assert.equal(formatGigsCalendarAvailabilityClearedMessage(6), "Availability cleared for 6 dates");
  assert.equal(BOOKING_REQUEST_CANCELLED_SUCCESS_MESSAGE, "Booking request cancelled");
  assert.equal(EVENT_UPDATED_SUCCESS_MESSAGE, "Event updated");
  assert.equal(buildBookingSendResultMessage(1, 0), "Sent booking request to 1 DJ");
  assert.equal(buildBookingSendResultMessage(3, 0), "Sent booking requests to 3 DJs");
  assert.equal(INLINE_TAB_FEEDBACK_FADE_MS, 2700);
  assert.equal(INLINE_TAB_FEEDBACK_CLEAR_MS, 3000);

  assert.match(gigsPageSource, /useInlineTabFeedbackDismiss/);
  assert.match(gigsPageSource, /formatGigsHistoryRemoveSuccessMessage/);
  assert.match(gigsPageSource, /titleFeedbackMessage: showTitleFeedback \? gigsHistorySuccessMessage : null/);
  assert.match(eventsSource, /useInlineTabFeedbackDismiss/);
  assert.match(eventsSource, /formatEventsHistoryRemoveSuccessMessage/);
  assert.match(eventsSource, /titleFeedbackMessage: showTitleFeedback \? successMessage : null/);
  assert.match(plansSource, /useInlineTabFeedbackDismiss/);
  assert.match(eventDetailSource, /useInlineTabFeedbackDismiss/);
  assert.match(eventDetailSource, /useSyncPlannerTitleFeedback/);
  assert.match(eventDetailSource, /PlannerTitleFeedbackSlot variant="header-controls"/);
  assert.match(eventDetailSource, /PLANNER_EVENT_DETAIL_HEADER_CONTROLS_ROW_CLASS/);
  assert.match(eventDetailSource, /PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_CELL_CLASS/);
  assert.doesNotMatch(eventDetailSource, /PLANNER_WORKSPACE_TITLE_FEEDBACK_BAND_CLASS/);
  assert.doesNotMatch(eventDetailSource, /variant="event-detail"/);
  assert.doesNotMatch(eventDetailSource, /PlannerTitleFeedbackViewportHost/);
  assert.doesNotMatch(eventDetailSource, /EventDateStatusBadge/);
  assert.doesNotMatch(eventDetailSource, /statusBadge=/);
  assert.doesNotMatch(eventDetailSource, /PlannerTitleFeedbackHeaderChrome/);
  assert.doesNotMatch(eventDetailSource, /PlannerWorkspaceTitleFeedback/);
  assert.match(
    eventDetailSource,
    /setHeaderFeedbackMessage\(BOOKING_REQUEST_CANCELLED_SUCCESS_MESSAGE\)/,
  );
  assert.match(
    eventDetailSource,
    /setHeaderFeedbackMessage\(buildBookingSendResultMessage\(successes\.length, skippedCount\)\)/,
  );
  assert.match(
    eventDetailSource,
    /setHeaderFeedbackMessage\([\s\S]*EVENT_UPDATED_SUCCESS_MESSAGE/,
  );
  assert.doesNotMatch(eventDetailSource, /setSuccessMessage\([\s\S]*EVENT_UPDATED_SUCCESS_MESSAGE/);
  assert.doesNotMatch(eventDetailSource, /setSuccessMessage\("Event updated"\)/);
  assert.match(eventDetailSource, /setHeaderFeedbackMessage\(inviteMessage\)/);
  assert.doesNotMatch(
    eventDetailSource,
    /setSuccessMessage\(buildBookingSendResultMessage/,
  );
  assert.doesNotMatch(eventDetailSource, /setSuccessMessage\("Booking request cancelled\.\."\)/);
  assert.match(feedbackMessageSource, /EVENTS_LIST_TAB_FEEDBACK_CLASS/);
  assert.match(feedbackMessageSource, /opacity-0/);
  assert.match(titleFeedbackSource, /InlineTabFeedbackMessage/);
  assert.doesNotMatch(gigsPageSource, /historyFeedbackMessage:/);
  assert.doesNotMatch(gigsChromeSource, /historyFeedbackMessage/);
  assert.doesNotMatch(eventsSource, /feedbackMessage=\{isHistoryTab/);
  assert.doesNotMatch(eventsControlsSource, /feedbackMessage/);

  const djGigsTabRowSource =
    skeletonSource.match(/export function DjGigsTabRow[\s\S]*?(?=\nexport function )/)?.[0] ?? "";
  assert.doesNotMatch(djGigsTabRowSource, /HistoryTabRowFeedbackCell/);
  assert.doesNotMatch(eventsRowSource, /HistoryTabRowFeedbackCell/);
  assert.match(EVENTS_LIST_TAB_ROW_CLASS, /justify-between/);
  assert.match(titleFeedbackSource, /PlannerWorkspaceTitleFeedback/);
  assert.match(titleFeedbackSource, /InlineTabFeedbackMessage/);
  assert.match(titleFeedbackSource, /if \(!message\)/);
  const plannerTokensSource = readFileSync(
    new URL("../lib/design/plannerWorkspaceTokens.ts", import.meta.url),
    "utf8",
  );
  assert.match(plannerTokensSource, /PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS/);
  assert.match(plannerTokensSource, /PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_SLOT_CLASS/);
  assert.match(plannerTokensSource, /PLANNER_EVENT_DETAIL_HEADER_CONTROLS_ROW_CLASS/);
  assert.match(titleFeedbackSlotSource, /PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_SLOT_CLASS/);
  assert.doesNotMatch(titleFeedbackSlotSource, /IN_ROW/);
  assert.doesNotMatch(titleFeedbackSlotSource, /createPortal/);
  assert.match(titleFeedbackSlotSource, /PlannerWorkspaceTitleFeedback/);
  assert.match(titleFeedbackSlotSource, /usePlannerTitleFeedbackState/);
  assert.doesNotMatch(titleFeedbackSource, /onAnimationEnd/);
  assert.doesNotMatch(titleFeedbackSource, /ftc-history-removal-feedback/);
  assert.match(layoutSource, /PLANNER_WORKSPACE_TITLE_ROW_CLASS} relative/);
  assert.match(layoutSource, /PlannerTitleFeedbackSlot/);
  assert.match(layoutSource, /setTitleFeedback/);
  assert.doesNotMatch(titleFeedbackProviderSource, /PlannerTitleFeedbackViewportHost/);
  assert.doesNotMatch(titleFeedbackProviderSource, /PlannerTitleFeedbackSlot/);
  assert.doesNotMatch(titleFeedbackProviderSource, /PlannerTitleFeedbackPortal/);
  assert.match(titleFeedbackProviderSource, /useSyncPlannerTitleFeedback/);
  assert.match(appProvidersSource, /PlannerTitleFeedbackProvider/);
  assert.match(rootLayoutSource, /AppProviders/);
  assert.doesNotMatch(onboardingGuardSource, /PlannerTitleFeedbackProvider/);
}

function testGigsListTabSwitchUsesClientHistoryWithoutRouterNavigation() {
  const tabsSource = readFileSync(
    new URL("../app/components/bookings/DjGigsTabs.tsx", import.meta.url),
    "utf8",
  );
  const pendingSource = readFileSync(
    new URL("../lib/bookings/gigsListTabPending.ts", import.meta.url),
    "utf8",
  );
  const chromeSource = readFileSync(
    new URL("../app/components/bookings/GigsWorkspaceChrome.tsx", import.meta.url),
    "utf8",
  );

  assert.match(tabsSource, /event\.preventDefault\(\)/);
  assert.match(tabsSource, /window\.history\.pushState\(window\.history\.state, "", href\)/);
  assert.match(tabsSource, /bumpGigsListRouteRevision\(\)/);
  assert.match(pendingSource, /export function bumpGigsListRouteRevision/);
  assert.match(chromeSource, /subscribeGigsListRouteRevision/);
  assert.match(chromeSource, /readGigsListRouteRevision/);
  assert.doesNotMatch(chromeSource, /setLocationRevision/);
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
  assert.match(mobileUiSource, /layout === "stacked"/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_HEADER_ROW_CLASS[\s\S]*CALENDAR_MOBILE_AGENDA_CARD_BADGE_SLOT_CLASS/);
  assert.doesNotMatch(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_STACKED_BADGE_SLOT_CLASS/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_VENUE_CLASS[\s\S]*text-xs text-ftc-text-secondary/);
  assert.doesNotMatch(mobileUiSource, /formatPlannerCalendarItemHeadline/);
  assert.doesNotMatch(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_ROW_CLASS/);
  assert.doesNotMatch(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_EVENT_CLASS/);
  assert.doesNotMatch(mobileUiSource, /formatCompactCalendarEventVenueTitle/);
  assert.match(mobileUiSource, /overflow-hidden text-ellipsis whitespace-nowrap/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_CLASS[\s\S]*w-full max-w-full min-w-0/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TITLE_SLOT_CLASS[\s\S]*min-w-0 w-0 flex-1/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_BADGE_SLOT_CLASS[\s\S]*basis-\[5\.75rem\]/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_TIME_CLASS[\s\S]*text-xs text-ftc-text-muted/);
  assert.match(mobileUiSource, /CALENDAR_MOBILE_AGENDA_CARD_STATUS_BADGE_BASE_CLASS/);
  assert.match(compactTitleSource, /formatPlannerCalendarItemHeadline/);
  assert.match(compactTitleSource, /doesFullCalendarTitleFit/);
  assert.doesNotMatch(compactTitleSource, /\.\.\./);
  assert.doesNotMatch(compactTitleSource, /slice\s*\(/);
  assert.doesNotMatch(plannerCalendarSource, /CompactCalendarEventVenueTitle/);
  assert.match(plannerCalendarSource, /layout="stacked"/);
  assert.match(plannerCalendarSource, /CALENDAR_MOBILE_AGENDA_CARD_VENUE_CLASS/);
  assert.match(plannerCalendarSource, /resolveCompactCalendarEventOnlyTitle/);
  assert.match(plannerCalendarSource, /CALENDAR_MOBILE_AGENDA_CARD_TIME_CLASS/);
  assert.match(plannerCalendarSource, /CALENDAR_MOBILE_AGENDA_CARD_STATUS_BADGE_BASE_CLASS/);
  assert.doesNotMatch(plannerCalendarSource, /getPlannerCalendarAgendaAccentClass/);
  assert.doesNotMatch(plannerCalendarSource, /CALENDAR_MOBILE_AGENDA_CARD_LEADING_CLASS/);

  const djCalendarSource = readFileSync(
    new URL("../app/components/DjAvailabilityCalendar.tsx", import.meta.url),
    "utf8",
  );
  assert.match(djCalendarSource, /CALENDAR_MOBILE_AGENDA_CARD_TIME_CLASS/);
  assert.match(djCalendarSource, /CALENDAR_MOBILE_AGENDA_CARD_STATUS_BADGE_BASE_CLASS/);
  assert.match(djCalendarSource, /CompactCalendarEventVenueTitle/);

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

function testDmComposerClearsPendingPhotoAfterSuccessfulSend() {
  const composerSource = readFileSync(
    new URL("../app/components/dm/DmComposer.tsx", import.meta.url),
    "utf8",
  );
  const bubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  const attachmentSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachment.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const helperSource = readFileSync(
    new URL("../lib/dm/composerPendingAttachment.ts", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(composerSource, /dm-composer-pending-photo-selected/);
  assert.doesNotMatch(composerSource, /ring-2 ring-ftc-primary/);
  assert.match(composerSource, /onStagePhoto/);
  assert.match(composerSource, /onClearPendingPhoto/);
  assert.match(composerSource, /pendingAttachmentPreviewUrl/);
  assert.match(composerSource, /disabled=\{busy \|\| !canSend\}/);
  assert.doesNotMatch(composerSource, /text-xs font-bold">…/);
  assert.doesNotMatch(composerSource, /placeholder="Message"[\s\S]*disabled=\{busy\}/);
  assert.match(composerSource, /onPointerDown/);
  assert.match(composerSource, /preventDefault/);
  assert.match(composerSource, /onInputBlurWhileBusy/);
  assert.match(composerSource, /inputRef/);
  assert.match(composerSource, /composerRootRef/);
  assert.match(composerSource, /ComposerMessageField/);
  assert.match(composerSource, /useComposerTextareaAutogrow/);
  assert.match(composerSource, /handleComposerNewlineKeyDown/);
  assert.doesNotMatch(composerSource, /event\.key === "Enter"[\s\S]*onSend/);
  assert.doesNotMatch(composerSource, /onPhotoSelected/);
  assert.doesNotMatch(composerSource, /leading-\[2\.75rem\]/);
  assert.doesNotMatch(composerSource, /min-w-\[5\.75rem\]/);
  assert.doesNotMatch(composerSource, /overflow-hidden/);
  assert.match(composerSource, /className="dm-composer shrink-0/);

  assert.match(pageSource, /composerInputRef/);
  assert.match(pageSource, /restoreComposerInputFocus/);
  assert.match(pageSource, /restoreComposerInputFocusElement/);
  assert.match(pageSource, /shouldKeepComposerFocusedAfterSend/);
  assert.match(pageSource, /captureComposerFocusIntentForSend/);
  assert.match(pageSource, /keepComposerFocusedAfterSendRef/);
  assert.match(pageSource, /onInputBlurWhileBusy=\{handleComposerInputBlurWhileBusy\}/);

  assert.match(globalsSource, /\.dm-composer-pending-photo-selected/);
  assert.match(globalsSource, /html\[data-mobile-keyboard-open\] \.dm-composer \.ftc-input:focus/);
  assert.match(bubbleSource, /const attachmentOnly = hasAttachments && !hasText;/);
  assert.match(bubbleSource, /const bubbleShellClass = attachmentOnly/);
  assert.doesNotMatch(attachmentSource, /dm-composer-pending-photo-selected/);
  assert.doesNotMatch(attachmentSource, /ring-ftc-primary/);

  assert.match(pageSource, /createPendingComposerAttachment/);
  assert.match(pageSource, /clearPendingAttachment/);
  assert.match(pageSource, /onStagePhoto=\{stagePendingPhoto\}/);
  assert.match(
    pageSource,
    /setInput\(""\);\s*clearPendingAttachment\(\);\s*if \(otherUserId\)/,
  );
  assert.doesNotMatch(
    pageSource,
    /onPhotoSelected=\{\(file\) => void sendAttachment\(file\)\}/,
  );

  assert.match(helperSource, /createPendingComposerAttachment/);
  assert.match(helperSource, /revokePendingComposerAttachment/);
}

function testComposerNewlineKeydown() {
  assert.equal(getComposerLineBeforeCursor("hello\nworld", 8), "wor");
  assert.equal(getComposerLineBeforeCursor("hello\nworld", 7), "");
  assert.equal(getComposerLineBeforeCursor("", 0), "");

  assert.equal(canComposerInsertNewline("", 0), false);
  assert.equal(canComposerInsertNewline("hello", 5), true);
  assert.equal(canComposerInsertNewline("hello\n", 6), false);
  assert.equal(canComposerInsertNewline("hello\n ", 7), false);
  assert.equal(canComposerInsertNewline("hello\nworld", 11), true);

  const autogrowSource = readFileSync(
    new URL("../lib/dm/useComposerTextareaAutogrow.ts", import.meta.url),
    "utf8",
  );

  assert.match(autogrowSource, /value\.length === 0/);
  assert.match(autogrowSource, /composerNeedsMultilineHeight/);
  assert.match(autogrowSource, /useLayoutEffect/);
}

function testDmComposerFocusSyncAfterSend() {
  const focusSource = readFileSync(
    new URL("../lib/dm/restoreComposerInputFocus.ts", import.meta.url),
    "utf8",
  );

  assert.match(focusSource, /shouldKeepComposerFocusedAfterSend/);
  assert.match(focusSource, /restoreComposerInputFocus/);
  assert.match(focusSource, /preventScroll: true/);
  assert.match(focusSource, /isMobileSoftwareKeyboardOpen/);
  assert.match(focusSource, /syncMobileSoftwareKeyboardDocumentState/);
  assert.doesNotMatch(focusSource, /syncComposerInputFocusState/);
  assert.doesNotMatch(focusSource, /input\.blur\(\)/);
}

function testDmMessageReactionGestureInteractions() {
  const bubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  const reactionsSource = readFileSync(
    new URL("../app/components/dm/DmMessageReactions.tsx", import.meta.url),
    "utf8",
  );
  const gestureSource = readFileSync(
    new URL("../lib/dm/useMessageReactionLongPress.ts", import.meta.url),
    "utf8",
  );
  const doubleTapSource = readFileSync(
    new URL("../lib/dm/useMessageReactionDoubleTap.ts", import.meta.url),
    "utf8",
  );
  const pickerPositionSource = readFileSync(
    new URL("../lib/dm/reactionPickerPosition.ts", import.meta.url),
    "utf8",
  );
  const groupBubbleSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatMessageBubble.tsx", import.meta.url),
    "utf8",
  );

  const shellSource = readFileSync(
    new URL("../app/components/chat/ChatMessageBubbleShell.tsx", import.meta.url),
    "utf8",
  );
  const groupLayoutSource = readFileSync(
    new URL("../lib/dm/chatMessageGroupLayout.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(reactionsSource, />React</);
  assert.doesNotMatch(reactionsSource, /prominentActions/);
  assert.match(reactionsSource, /if \(summaries\.length === 0\) \{\s*return null;/);
  assert.match(reactionsSource, /disabled:pointer-events-none/);
  assert.doesNotMatch(reactionsSource, /resolveChatMessageReactionsAnchorClass/);
  assert.match(reactionsSource, /CHAT_MESSAGE_REACTION_PILL_CLASS/);
  assert.match(reactionsSource, /hidden h-3\.5/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_SLOT_BASE_CLASS/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_SLOT_OVERLAP_CLASS = "-mt-3"/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_SLOT_OUTGOING_CLASS = "left-0"/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_SLOT_INCOMING_CLASS = "right-0"/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_BUBBLE_FRAME_CLASS/);
  assert.match(groupLayoutSource, /resolveMessageReactionSlotClass/);
  assert.doesNotMatch(groupLayoutSource, /FOOTER_OUTGOING_CLASS = "justify-end"/);
  assert.doesNotMatch(shellSource, /items-end/);
  assert.doesNotMatch(groupLayoutSource, /h-0 w-full overflow-visible/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_STACK_PAD_CLASS = ""/);
  assert.doesNotMatch(groupLayoutSource, /top-full -translate-y-\[3px\]/);
  assert.doesNotMatch(groupLayoutSource, /bottom-0 z-10/);
  assert.doesNotMatch(groupLayoutSource, /translate-y-\[calc\(100%/);
  assert.doesNotMatch(groupLayoutSource, /right-2\.5/);
  assert.doesNotMatch(groupLayoutSource, /-translate-x-1/);
  assert.match(groupLayoutSource, /CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1\.5"/);
  assert.match(shellSource, /resolveMessageReactionSlotClass\(isOwnMessage\)/);
  assert.doesNotMatch(shellSource, /CHAT_MESSAGE_REACTION_STACK_PAD_CLASS/);
  assert.match(shellSource, /useReactionOverlayLifecycle/);
  assert.doesNotMatch(shellSource, /CHAT_MESSAGE_REACTION_OVERLAP_RESERVE_CLASS/);
  assert.doesNotMatch(shellSource, /isolate/);
  assert.match(shellSource, /absolute/);
  assert.doesNotMatch(shellSource, /h-0/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_OVERLAP_RESERVE_CLASS = ""/);
  assert.match(groupLayoutSource, /resolveMessageReactionFooterClass/);
  assert.match(groupLayoutSource, /CHAT_SEEN_LABEL_WITH_REACTIONS_SPACING_CLASS/);
  assert.doesNotMatch(shellSource, /grid-participant/);
  assert.doesNotMatch(reactionsSource, /bg-ftc-primary/);
  assert.doesNotMatch(reactionsSource, /isOwnMessage/);
  assert.doesNotMatch(reactionsSource, /disabled:opacity-50/);
  assert.match(bubbleSource, /useMessageReactionLongPress/);
  assert.match(bubbleSource, /useMessageReactionDoubleTap/);
  assert.match(bubbleSource, /onContextMenu=\{handleContextMenu\}/);
  assert.doesNotMatch(bubbleSource, /aria-label="React to message"/);
  assert.doesNotMatch(groupBubbleSource, /aria-label="React to message"/);
  assert.match(bubbleSource, /ChatMessageBubbleShell/);
  assert.match(bubbleSource, /resetLongPressGesture/);
  assert.match(bubbleSource, /DM_DEFAULT_REACTION_EMOJI/);
  assert.match(bubbleSource, /scrollContainerRef/);
  assert.doesNotMatch(bubbleSource, /DmMessageReactions/);
  assert.match(shellSource, /DmReactionPicker/);
  assert.match(reactionsSource, /createPortal/);
  assert.match(reactionsSource, /fixed z-\[120\]/);
  assert.match(reactionsSource, /fixed inset-0/);
  assert.match(reactionsSource, /scale-\[0\.96\]/);
  assert.match(reactionsSource, /duration-\[175ms\]/);
  assert.doesNotMatch(reactionsSource, /Close reaction picker/);
  assert.match(reactionsSource, /data-dm-reaction-picker/);
  assert.match(reactionsSource, /pointerdown", handlePointerDown, true/);
  assert.match(reactionsSource, /pointermove", handlePointerMove/);
  assert.match(reactionsSource, /useReactionPickerPosition/);
  assert.match(gestureSource, /resetLongPressGesture: resetGesture/);
  assert.match(gestureSource, /wasLongPressActivated/);
  assert.match(gestureSource, /DM_MESSAGE_LONG_PRESS_MOVE_THRESHOLD_PX = 10/);
  assert.match(gestureSource, /consumeLongPressActivation/);
  assert.match(gestureSource, /prefersFinePointer/);
  assert.match(doubleTapSource, /DM_MESSAGE_DOUBLE_TAP_MS = 300/);
  assert.match(doubleTapSource, /isInteractiveMessageTarget/);
  assert.match(doubleTapSource, /prefersFinePointer/);
  assert.match(doubleTapSource, /onCancelCompetingGesture/);
  assert.match(doubleTapSource, /handleDoubleClick/);
  assert.match(bubbleSource, /onDoubleClick=\{handleDoubleTapDoubleClick\}/);
  assert.match(bubbleSource, /showAvatar/);
  assert.match(bubbleSource, /groupPosition/);
  assert.match(bubbleSource, /resolveMessageGroupLiClass/);
  assert.doesNotMatch(bubbleSource, /previousInGroupHadReactions/);
  assert.match(bubbleSource, /followedByTimeSeparator/);
  assert.match(bubbleSource, /precededByTimeSeparator/);
  assert.match(bubbleSource, /resolveSeenLabelSpacingClass/);
  assert.match(bubbleSource, /seenLabelSpacingClass/);
  assert.doesNotMatch(bubbleSource, /layout=\{shellLayout\}/);
  assert.match(bubbleSource, /ChatMessageBubbleShell/);
  assert.match(bubbleSource, /ChatProfileAvatarLink/);
  assert.match(bubbleSource, /DmIncomingMessageLayout/);
  assert.doesNotMatch(bubbleSource, /IncomingChatMessageLayout/);
  assert.doesNotMatch(bubbleSource, /DmMessageReactions/);
  assert.doesNotMatch(bubbleSource, /hasReactions=/);
  assert.match(bubbleSource, /resolveMessageGroupLiClass/);
  assert.match(bubbleSource, /shellLayout/);
  assert.doesNotMatch(bubbleSource, /resolveIncomingGroupLiClass/);
  assert.doesNotMatch(bubbleSource, /CHAT_INCOMING_GROUP_FOOTER_CLASS/);
  assert.doesNotMatch(bubbleSource, /Report message/);
  assert.match(groupBubbleSource, /onDoubleClick=\{handleDoubleTapDoubleClick\}/);
  assert.match(pickerPositionSource, /computeReactionPickerPosition/);
  assert.match(pickerPositionSource, /getReactionPickerViewportBounds/);
  assert.match(pickerPositionSource, /data-chat-composer/);
  assert.match(groupBubbleSource, /useMessageReactionDoubleTap/);
  assert.match(groupBubbleSource, /DmReactionPicker/);
  assert.match(groupBubbleSource, /ChatMessageBubbleShell/);
  assert.match(groupBubbleSource, /resolveOutgoingGroupLiClass/);
  assert.doesNotMatch(groupBubbleSource, /CHAT_OUTGOING_GROUP_TIGHT_PREVIOUS_CLASS/);

  const attachmentSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachment.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(attachmentSource, /aria-label="Open image"/);
  assert.match(attachmentSource, /ftc-dm-message-image-open/);
  assert.match(attachmentSource, /type="button"/);
  assert.match(attachmentSource, /pointer-events-none/);
  assert.match(attachmentSource, /onDragStart=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(
    attachmentSource,
    /onContextMenu=\{\(event\) => handleImageContextMenu\(event, onContextMenu\)\}/,
  );
  assert.match(
    attachmentSource,
    /if \(isDmImageAttachment\(attachment\.file_type\)\) \{\s*return \(\s*<button/,
  );
  assert.match(globalsSource, /\.ftc-bubble-other-stack/);
  assert.match(globalsSource, /\.ftc-bubble-own-stack-middle/);
  assert.match(globalsSource, /\.ftc-dm-message-image-open/);
  assert.match(globalsSource, /-webkit-touch-callout: none;/);
}

function testChatMessageGroupLayout() {
  const layout = buildChatMessageGroupLayout([
    { id: "a", user_id: "u1" },
    { id: "b", user_id: "u1" },
    { id: "c", user_id: "u2" },
  ]);

  assert.equal(layout.get("a")?.position, "first");
  assert.equal(layout.get("a")?.tightWithPrevious, false);
  assert.equal(layout.get("a")?.showAvatar, false);
  assert.equal(layout.get("b")?.position, "last");
  assert.equal(layout.get("b")?.tightWithPrevious, true);
  assert.equal(layout.get("b")?.showAvatar, true);
  assert.equal(layout.get("c")?.position, "standalone");
  assert.equal(layout.get("c")?.tightWithPrevious, false);
  assert.equal(layout.get("c")?.showAvatar, true);

  const brokenLayout = buildChatMessageGroupLayout([
    { id: "t1", user_id: "u1" },
    { id: "img", user_id: "u1", groupable: false },
    { id: "t2", user_id: "u1" },
  ]);

  assert.equal(brokenLayout.get("t2")?.tightWithPrevious, false);
  assert.equal(brokenLayout.get("img")?.position, "standalone");

  const baseTime = Date.parse("2026-01-01T10:00:00.000Z");
  const mediaGroupLayout = buildChatMessageGroupLayout([
    { id: "t1", user_id: "u1", created_at: new Date(baseTime).toISOString() },
    { id: "img", user_id: "u1", created_at: new Date(baseTime + 60_000).toISOString() },
    { id: "t2", user_id: "u1", created_at: new Date(baseTime + 120_000).toISOString() },
  ]);

  assert.equal(mediaGroupLayout.get("t1")?.position, "first");
  assert.equal(mediaGroupLayout.get("img")?.position, "middle");
  assert.equal(mediaGroupLayout.get("t2")?.position, "last");

  const timedLayout = buildChatMessageGroupLayout([
    { id: "early", user_id: "u1", created_at: new Date(baseTime).toISOString() },
    {
      id: "late",
      user_id: "u1",
      created_at: new Date(baseTime + DM_CHAT_MEANINGFUL_TIME_GAP_MS + 60_000).toISOString(),
    },
  ]);

  assert.equal(timedLayout.get("early")?.position, "standalone");
  assert.equal(timedLayout.get("late")?.position, "standalone");
  assert.equal(timedLayout.get("late")?.tightWithPrevious, false);

  assert.match(
    resolveMessageGroupLiClass({
      isOwnMessage: true,
      position: "first",
      isClusterEnd: false,
      followedByTimeSeparator: true,
    }),
    new RegExp(CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS),
  );
  assert.match(
    resolveMessageGroupLiClass({
      isOwnMessage: true,
      position: "last",
      isClusterEnd: true,
      followedByTimeSeparator: true,
    }),
    new RegExp(CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS),
  );
  assert.match(
    resolveMessageGroupLiClass({
      isOwnMessage: true,
      position: "last",
      isClusterEnd: true,
      followedByTimeSeparator: false,
    }),
    new RegExp(CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS),
  );
  assert.match(
    resolveMessageGroupLiClass({
      isOwnMessage: true,
      position: "first",
      isClusterEnd: false,
      followedByTimeSeparator: false,
    }),
    new RegExp(CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS),
  );
  assert.match(
    resolveMessageGroupLiClass({
      isOwnMessage: true,
      position: "standalone",
      isClusterEnd: true,
      precededByTimeSeparator: true,
    }),
    new RegExp(CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS),
  );
  assert.match(
    resolveMessageGroupLiClass({
      isOwnMessage: false,
      position: "middle",
      isClusterEnd: false,
    }),
    new RegExp(CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS),
  );

  const groupLayoutSource = readFileSync(
    new URL("../lib/dm/chatMessageGroupLayout.ts", import.meta.url),
    "utf8",
  );
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(groupLayoutSource, /CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1\.5"/);
  assert.match(groupLayoutSource, /CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS/);
  assert.match(groupLayoutSource, /CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS/);
  assert.match(
    groupLayoutSource,
    /CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS[\s\S]*CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS/,
  );
  assert.match(groupLayoutSource, /CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS/);
  assert.match(groupLayoutSource, /CHAT_SEEN_LABEL_SPACING_CLASS/);
  assert.match(groupLayoutSource, /followedByTimeSeparator/);
  assert.match(groupLayoutSource, /precededByTimeSeparator/);
  assert.doesNotMatch(groupLayoutSource, /previousInGroupHadReactions/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_PILL_CLASS/);
  assert.match(groupLayoutSource, /resolveMessageGroupLiClass/);
  assert.match(groupLayoutSource, /resolveOutgoingGroupLiClass/);
  assert.match(groupLayoutSource, /gap-x-1/);
  assert.match(groupLayoutSource, /gap-0/);
  assert.match(groupLayoutSource, /CHAT_TIME_SEPARATOR_SPACING_CLASS/);
  assert.match(groupLayoutSource, /DM_CHAT_MEANINGFUL_TIME_GAP_MS/);
  assert.match(groupLayoutSource, /CHAT_MESSAGE_SCROLLER_CLASS/);
  assert.match(groupLayoutSource, /DM_INCOMING_MESSAGE_COLUMN_CLASS/);
  assert.doesNotMatch(dmPageSource, /resolvePreviousInGroupHadReactions/);
  assert.doesNotMatch(dmPageSource, /previousInGroupHadReactions/);
  assert.match(dmPageSource, /resolveFollowedByTimeSeparator/);
  assert.match(dmPageSource, /followedByTimeSeparator/);
  assert.match(dmPageSource, /precededByTimeSeparator/);
  assert.match(dmPageSource, /CHAT_SEEN_LABEL_SPACING_CLASS/);
  assert.match(dmPageSource, /DmIncomingMessageLayout/);
  assert.match(dmPageSource, /showAvatar=\{messageGroupLayout\?\.showAvatar/);
  assert.doesNotMatch(dmPageSource, /IncomingChatMessageLayout/);
  assert.doesNotMatch(dmPageSource, /title="Report message"/);
  assert.doesNotMatch(dmPageSource, /submitDmMessageReport/);
}

function testChatMessageBubbleGeometry() {
  assert.equal(isCompactChatBubbleText("a"), true);
  assert.equal(isCompactChatBubbleText("OK"), true);
  assert.equal(isCompactChatBubbleText("❤️"), true);
  assert.equal(isCompactChatBubbleText("Hello\nworld"), false);
  assert.equal(isCompactChatBubbleText("a".repeat(43)), false);

  assert.match(
    resolveChatMessageBubbleShellClass({ isOwnMessage: true, text: "OK" }),
    /w-fit max-w-full/,
  );
  assert.match(
    resolveChatMessageBubbleShellClass({ isOwnMessage: true, text: "OK" }),
    /px-3\.5 py-1\.5/,
  );
  assert.match(
    resolveChatMessageBubbleShellClass({ isOwnMessage: true, text: "a" }),
    /min-w-\[2\.75rem\]/,
  );
  assert.match(
    resolveChatMessageBubbleShellClass({
      isOwnMessage: true,
      text: "OK",
      groupPosition: "middle",
    }),
    /ftc-bubble-own-stack-middle/,
  );
  assert.match(
    resolveChatMessageBubbleShellClass({
      isOwnMessage: false,
      text: "Longer single line that still wraps eventually",
    }),
    /px-4 py-2\.5/,
  );
}

function testQaEnvironmentResetScript() {
  const sql = readFileSync(new URL("./resetQaEnvironment.sql", import.meta.url), "utf8");
  assert.match(sql, /BEGIN QA ENVIRONMENT RESET/);
  assert.match(sql, /END QA ENVIRONMENT RESET/);
  assert.match(sql, /drop table if exists _qa_user_ids/);
  assert.match(sql, /create temp table _qa_user_ids/);
  assert.match(sql, /create temp table _qa_messages/);
  assert.match(sql, /m\.user_id in \(select user_id from _qa_user_ids\)/);
  assert.match(sql, /conversation_id in \(select conversation_id from _qa_only_conversations\)/);
  assert.match(sql, /set_config\('storage\.allow_delete_query', 'true', true\)/);
  assert.match(sql, /qa_booking_requests_mixed_remaining/);

  const cli = readFileSync(new URL("./reset-qa-environment.mts", import.meta.url), "utf8");
  assert.match(cli, /resetQaEnvironment\.sql/);
}

async function main() {
  testPastEventDatesAreBlocked();
  testFutureEventDatesAreAllowed();
  testIncompleteSetTimeIsBlocked();
  testEventSetTimeRangeValidation();
  testApplyEventSetTimeStartChangeClearsInvalidFinish();
  testBookingFieldTriggerPlaceholderStylingIsShared();
  testBookingFieldTriggerPlaceholderDetection();
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
  testBookingRateProposalPanelActionLayout();
  testAskForRateDeclineFlow();
  testDmBookingCardPendingEventPairedActions();
  testDmBookingCardExpandCollapseScrollAnchor();
  testDmBookingCardAlignScrollTopMath();
  testBookingCardExpandScrollContextCapture();
  testBookingCardPinnedBottomScrollTop();
  testBookingCardCollapseScrollHeightCompensation();
  testDmBookingSystemMessages();
  testDmConversationTimestampLayout();
  testDmBookingTimelineSuppression();
  testChatAppendedMessageIds();
  testDmBookingCardProposedRateCopy();
  testDmBookingCardNotesExpandAnimation();
  testDmBookingCardNotesRevealScroll();
  testDmBookingCardBookingTypePresentation();
  testProposeBookingRateNotesTextareaGrowth();
  testCappedMultilineInputLimit();
  testProposeRateHelperPreference();
  testAskForRateDmBookingCardOfferSummary();
  testUsernameBlockedTermChecks();
  testAuthRedirectUrlUsesLoginPath();
  testProfileEditDirtyDetection();
  testSoundCloudInputNormalization();
  testDmThreadCalendarBackHref();
  testActiveEventLineupStatsMatchVisibleLineupRules();
  testPlannerCancelledBookingExcludedFromActiveEventLineup();
  testSendBookingsModalLocksBackgroundInteraction();
  testModalScrollContainmentBlocksBoundaryOverscroll();
  testEventLineupBookingCardProfileNavigationAndActions();
  testDmThreadEventDetailBackHref();
  testProfileChatBackNavigation();
  testGigsIncomingDmEventDetailReturnChain();
  testGigsCalendarBookingNavigation();
  testPlannerCalendarItemHref();
  testPlannerCalendarPendingSentBookingEventLink();
  testPlannerCalendarAgendaChronologicalSort();
  testDjGigsCalendarAgendaSort();
  testAcceptedFutureGigAppearsInConfirmed();
  testAcceptedPastGigAppearsInHistory();
  testPendingGigAppearsOnlyInIncoming();
  testConfirmedListUpdatesAfterAcceptance();
  testTodaysFutureGigIsNotHistorical();
  testDjGigsCalendarBulkSelectableDates();
  testLegacyEventDatesResolveForGigTabs();
  testConfirmedTabAliasParsesFromUrl();
  testEventPlanUseButtonKeepsStableCardLayout();
  testGigsTabRowUsesCompactPillsWithoutCounts();
  testGigsFilterTabsPolish();
  testGigsHistoryCardNavigation();
  testIncomingGigsCardDesignSystem();
  testCancelledBookingCardHidesViewEvent();
  testGigsTabBookingsCacheForTabSwitching();
  testGigsPlannerNamesLoadWithBookingCards();
  testIncomingGigsCardDetailsNavigation();
  testGigsIncomingEventArtwork();
  testGigsListTabPendingOptimisticSelection();
  testGigsFreshWorkspaceEntryOpensIncoming();
  testGigsFilterTabCountsPersistDuringLoading();
  testWorkspaceGigsPendingDisplayCountPreservesLastKnown();
  testWorkspaceGigsSubNavCountSurvivesStaleRuntimeZero();
  testGigsTabCountDisplayCap();
  testEventsHistoryBulkSelectAllTogglesSelection();
  testResolvePlannerHistoryHideEventIds();
  testEventsHistorySelectionToolbarUsesDeleteLabel();
  testEventsCreateFlowTabPillNavigation();
  testEventsListTabParamRestoresHistoryWithoutActiveDefault();
  testEventsListTabIgnoresLegacySessionCacheWithoutUrlTab();
  testBookingsUsePlanWorkspaceTabNavigation();
  testBookingsUsePlanCancelReturnsToEventPlans();
  testEventPlansCreateFormDeepLink();
  testEventPlanCardSelectionHighlight();
  testBookingsUsePlanCreatesEventBeforeSend();
  testPlannerCalendarEventDeletionSync();
  testPlannerCalendarScopesOwnedEventsOnly();
  testPlannerHistoryHideRemovesCalendarItems();
  testCalendarCreateWorkspaceTabNavigation();
  testEventsListTabSwitchUsesClientHistoryWithoutRouterNavigation();
  testEventsCreateEventHiddenDuringHistorySelectionToolbar();
  testEventDetailLoadUsesParallelQueriesAndListCache();
  testEventDetailMobileNavContentOffset();
  testMobileSoftwareKeyboardHidesBottomNavigation();
  testFixedChatPageDocumentReset();
  testDismissComposerKeyboardOnIntentionalScroll();
  testComposerKeyboardDismissPolicyMath();
  testMessageHistoryGestureTarget();
  testComposerMessageListMomentumScroll();
  testDmBookingTargetScrollUsesContainerOnly();
  testDmBookingTargetCenterScrollTopMath();
  testEventTitleClampLayout();
  testEventsActiveStatusPillsSingleRowLayout();
  testEventCreateFormTextFieldMaxLength();
  testWithdrawalOtherReasonInputLimits();
  testDmComposerClearsPendingPhotoAfterSuccessfulSend();
  testComposerNewlineKeydown();
  testDmComposerFocusSyncAfterSend();
  testDmMessageReactionGestureInteractions();
  testChatMessageGroupLayout();
  testChatMessageBubbleGeometry();
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
  testGigsEventDetailReturnPreservesTab();
  testGigsRouteTabUsesSharedHook();
  testWorkspaceGigsTabOpensIncomingWithoutEventsQuery();
  testCalendarWorkspaceClearsStaleWorkspaceIntercept();
  testGigsTabRowReservesManageSlotOnAllTabs();
  testGigsHistorySelectionToolbarEmbeddedInTabRow();
  testHistoryRemovalHeaderFeedbackUnified();
  testGigsListTabSwitchUsesClientHistoryWithoutRouterNavigation();
  testGigsWorkspaceChromeStateSyncAvoidsNoOpUpdates();
  testBookingsRouteMountsPersistentGigsSecondaryBand();
  testPlannerBookingCreateHidesGigsSubTabs();
  testWorkspaceSubNavLayoutIsStable();
  testPlannerWorkspaceSecondaryRowRhythm();
  testWorkspaceNavRoleDoesNotDropEventPlansTab();
  testWorkspaceActiveHrefIgnoresStaleOverrides();
  testProfileIdentityPresentationHierarchy();
  testQaEnvironmentResetScript();
  await testEventsHistorySelectAllButtonInteraction();
  await testEventsHistoryRemoveConfirmInteraction();
  console.log("All regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
