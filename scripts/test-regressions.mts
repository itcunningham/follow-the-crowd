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
import { applyTextInputLimit, countUnicodeCharacters } from "../lib/textInputLimits";
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
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
import { formatEventGroupChatUpdateMessage } from "../lib/events/eventGroupChatUpdate";
import { parseEventGroupChatUpdateMessage } from "../lib/events/eventGroupChatUpdateMessage";
import {
  getAppendedMessageIds,
  resolveScrollTopPreservingDistanceFromBottom,
  shouldKeepChatPinnedAfterLayoutChange,
} from "../lib/useChatScroll";
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
  applyMomentumFriction,
  applyMomentumScrollStep,
  computeReleaseScrollVelocityPxPerMs,
  shouldStartMomentumScroll,
} from "../lib/dm/composerMessageListMomentumScroll";
import {
  buildDmConversationTimestampLayout,
  classifyDmConversationMessageKind,
  DM_CHAT_MEANINGFUL_TIME_GAP_MS,
  formatDmDaySeparatorLabel,
  shouldSuppressDmBookingTimelineNotice,
} from "../lib/dm/dmChatTimestampVisibility";
import {
  buildGroupChatTimestampLayout,
  isVisibleGroupChatMessage,
} from "../lib/groupChatTimestampVisibility";
import {
  buildChatMessageGroupLayout,
  CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS,
  CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS,
  CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS,
  CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS,
  GROUP_CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS,
  resolveMessageGroupLiClass,
  resolveSystemCardGroupLiClass,
} from "../lib/dm/chatMessageGroupLayout";
import { buildDmReactionNotificationBody } from "../lib/dm/dmReactionNotifications";
import {
  applyDmInboxRealtimeReaction,
  applyDmInboxRealtimeReactionRemoval,
  type DmInboxRow,
} from "../lib/dmInbox";
import {
  buildDmReactionInboxPreviewText,
  encodeDmReactionInboxPreview,
  parseDmReactionInboxPreview,
  shouldApplyDmReactionInboxActivity,
  shouldMarkDmReactionInboxUnread,
} from "../lib/dm/dmReactionInbox";
import {
  removeDmReactionFromRealtime,
  upsertDmReactionFromRealtime,
  type DmMessageReaction,
} from "../lib/dmReactions";
import {
  buildDmAttachmentInboxPreviewText,
  encodeDmAttachmentInboxPreview,
  isDmAttachmentInboxPreview,
  parseDmAttachmentInboxPreview,
  resolveDmAttachmentPreviewKind,
} from "../lib/dmAttachments";
import {
  mergePendingComposerAttachments,
  removePendingComposerAttachmentAt,
} from "../lib/dm/composerPendingAttachment";
import {
  DM_GALLERY_OVERVIEW_MIN_IMAGES,
  DM_MAX_VISIBLE_GRID_IMAGES,
  resolveVisibleGridImages,
} from "../lib/dm/dmImageLayout";
import { formatDmInboxMessagePreview, pickDmInboxPreviewMessage } from "../lib/dm/messagePreview";
import {
  canComposerInsertNewline,
  getComposerLineBeforeCursor,
} from "../lib/dm/composerNewlineKeydown";
import {
  isCompactChatBubbleText,
  resolveChatMessageBubbleShellClass,
  resolveChatMessageBubbleTextClass,
} from "../lib/dm/chatMessageBubbleGeometry";
import { buildCrewChatMessageGroups } from "../lib/groupChatMessageLayout";
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
import { resolveWorkspaceGigsPendingDisplayCount, readWorkspaceGigsBadgeDisplayCountForSubNav, resolveStableGigsPendingCount } from "../lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
import { applyCancelledEventStatus } from "../lib/bookings/gigsListSnapshotPrefetch";
import { buildCrewMemberList } from "../lib/events/crewChatMembers";
import { resolveCrewChatSeenLabel } from "../lib/events/crewChatReadReceipts";
import {
  computeRunSheetSetLabels,
  hasUnsavedRunSheetEdits,
  moveRunSheetRow,
  reorderRunSheetRows,
  type RunSheetRowInput,
} from "../lib/eventRunSheet";
import {
  applyPersistedGigsPendingCount,
  clearNavigationBadgeCache,
  clearWorkspaceGigsDisplaySession,
  clearWorkspaceGigsSubNavDisplayLatch,
  getCachedGigsPendingCount,
  writeRuntimeGigsPendingCount,
} from "../lib/navigationBadgeCache";
import { resolveEventsHistoryTrashVisible, resolveEventsListTabRowChrome, resolveEventsListActiveTabLabel, resolveEventsListActiveTabLabelForWorkspaceChrome, EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER, EVENTS_LIST_ACTIVE_TAB_LABEL_DJ } from "../lib/events/eventsListNavigation";
import {
  appendPlanIdToCreateFlowReturnHref,
  buildEventPlansCreateFormHref,
  buildEventsCreatePickPlanReturnHref,
  completeEventPlansCreateReturn,
} from "../lib/bookings/planDeepLink";
import { resolveHistoryBulkSelectAllToggle } from "../app/components/history/HistoryBulkManage";
import {
  ONBOARDING_ACCESS_CHECK_TIMEOUT_MS,
  withOnboardingAccessCheckTimeout,
} from "../app/components/OnboardingGuard";
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
import { getUsernameFormatError, normalizeSoundCloudInput, resolveProfileIdentityPresentation, addEventBrandTag, parseStoredEventBrands, serializeEventBrands, MAX_PROMOTER_EVENT_BRANDS, MAX_EVENT_BRAND_NAME_LENGTH, PROFILE_GENRE_OPTIONS, applyDisplayNameInputLimit, MAX_PROFILE_DISPLAY_NAME_LENGTH, applyBioInputLimit, MAX_PROFILE_BIO_LENGTH, MAX_PROFILE_BIO_LINES } from "../lib/user/profileFormUtils";
import { mapEventInputToRow, type EventInput } from "../lib/events";
import { markEventBrandColumnMissing, resetEventBrandColumnMissingFlag } from "../lib/events/eventQueryFields";
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
    "Finish time must be later than the start time",
  );
  assert.equal(
    getEventSetTimeValidationError(eventDate, zeroDuration),
    "Finish time must be later than the start time",
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
  assert.equal(formErrors.finishTime, "Finish time must be later than the start time");
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
  assert.equal(computeScrollTopAfterShrink(20, 900, 850, 100), 0);
  assert.equal(computeScrollTopAfterShrink(120, 900, 850, 100), 70);
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
  // Acceptance inserts the per-event form of the confirmed message; see
  // testBookingAcceptedDmMessageIsScopedToTheBooking for why the bare constant
  // could not be used here.
  assert.match(bookingRequestsSource, /formatBookingConfirmedDmMessage/);
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

  // Instagram-style day separator: same builder, new flag + label, and it must take
  // precedence over a same-boundary time separator rather than stacking both.
  assert.match(pageSource, /showDaySeparatorBefore/);
  assert.match(pageSource, /daySeparatorLabel/);

  // The root cause of "timestamp glued under the newest message": wrapWithTimeSeparator
  // used to render the separator AFTER the message it belonged to instead of before it,
  // so the last message in the conversation (if it started a new time cluster) ended up
  // with a trailing, unattached-looking timestamp beneath it with nothing following. Lock
  // in the fix structurally: within wrapWithTimeSeparator's own body, the separator JSX
  // must appear before the wrapped {node}, not after.
  const wrapWithTimeSeparatorSource = pageSource.slice(
    pageSource.indexOf("function wrapWithTimeSeparator"),
    pageSource.indexOf("function resolveFollowedByTimeSeparator"),
  );
  assert.ok(
    wrapWithTimeSeparatorSource.indexOf("<DmChatTimeSeparator") <
      wrapWithTimeSeparatorSource.indexOf("{node}"),
    "the separator must render before {node}, not trailing after it",
  );

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

function testDmChatDaySeparators() {
  // Local-time Date construction throughout (never UTC ISO strings) so this test is
  // correct in any timezone: "now"/"midnight"/etc. are computed against the machine's
  // own local calendar, matching how formatDmDaySeparatorLabel reads local date parts.
  const now = new Date(2026, 7, 2, 10, 0, 0); // Sun 2 Aug 2026

  // Day-label formatting: TODAY / YESTERDAY / weekday+day+month (same year) /
  // day+month+year, no weekday (different year) -- matches Instagram's own convention.
  assert.equal(formatDmDaySeparatorLabel(new Date(2026, 7, 2, 9, 0, 0), now), "TODAY");
  assert.equal(formatDmDaySeparatorLabel(new Date(2026, 7, 1, 9, 0, 0), now), "YESTERDAY");
  assert.equal(formatDmDaySeparatorLabel(new Date(2026, 0, 5, 9, 0, 0), now), "MON 5 JAN");
  assert.equal(formatDmDaySeparatorLabel(new Date(2025, 2, 14, 9, 0, 0), now), "14 MAR 2025");

  // Crossing midnight with only a few minutes' gap: the old gap-only logic (<5min)
  // would show no separator at all here. A day boundary must still surface one,
  // labelled by calendar day rather than the 5-minute gap threshold.
  const justBeforeMidnight = new Date(2026, 7, 1, 23, 58, 0).getTime();
  const shortGapAcrossMidnight = [
    { id: "before-midnight", created_at: new Date(justBeforeMidnight).toISOString(), text: "Night owl" },
    {
      id: "after-midnight",
      created_at: new Date(justBeforeMidnight + 4 * 60_000).toISOString(),
      text: "Still here",
    },
  ];
  const shortGapLayout = buildDmConversationTimestampLayout(shortGapAcrossMidnight, {
    bookings: [],
    conversationId: "conversation-1",
    now,
  });

  assert.equal(shortGapLayout.get("after-midnight")?.showDaySeparatorBefore, true);
  assert.equal(shortGapLayout.get("after-midnight")?.daySeparatorLabel, "TODAY");
  assert.equal(shortGapLayout.get("after-midnight")?.showTimeSeparatorBefore, false);

  // Crossing midnight with a gap that WOULD also trigger the ordinary time separator:
  // the day separator must take precedence -- never stack both for the same boundary.
  const longGapAcrossMidnight = [
    { id: "yesterday-late", created_at: new Date(justBeforeMidnight).toISOString(), text: "Night owl" },
    {
      id: "today-early",
      created_at: new Date(justBeforeMidnight + DM_CHAT_MEANINGFUL_TIME_GAP_MS + 60_000).toISOString(),
      text: "Morning",
    },
  ];
  const longGapLayout = buildDmConversationTimestampLayout(longGapAcrossMidnight, {
    bookings: [],
    conversationId: "conversation-1",
    now,
  });

  assert.equal(longGapLayout.get("today-early")?.showDaySeparatorBefore, true);
  assert.equal(longGapLayout.get("today-early")?.daySeparatorLabel, "TODAY");
  assert.equal(longGapLayout.get("today-early")?.showTimeSeparatorBefore, false);

  // Same-day messages with a meaningful gap keep the ordinary time separator, not a
  // redundant day separator.
  const sameDayBase = new Date(2026, 7, 2, 9, 0, 0).getTime();
  const sameDayMessages = [
    { id: "sd-1", created_at: new Date(sameDayBase).toISOString(), text: "Morning" },
    {
      id: "sd-2",
      created_at: new Date(sameDayBase + DM_CHAT_MEANINGFUL_TIME_GAP_MS + 60_000).toISOString(),
      text: "Later",
    },
  ];
  const sameDayLayout = buildDmConversationTimestampLayout(sameDayMessages, {
    bookings: [],
    conversationId: "conversation-1",
    now,
  });

  assert.equal(sameDayLayout.get("sd-2")?.showDaySeparatorBefore, false);
  assert.equal(sameDayLayout.get("sd-2")?.showTimeSeparatorBefore, true);

  // Opening an older conversation: the very first visible message in the loaded
  // history always carries a day separator, even alone, so history never opens with
  // undated messages sitting above the first "crossing".
  const singleOlderMessage = [
    { id: "only-one", created_at: new Date(2025, 2, 14, 9, 0, 0).toISOString(), text: "Old message" },
  ];
  const singleLayout = buildDmConversationTimestampLayout(singleOlderMessage, {
    bookings: [],
    conversationId: "conversation-1",
    now,
  });

  assert.equal(singleLayout.get("only-one")?.showDaySeparatorBefore, true);
  assert.equal(singleLayout.get("only-one")?.daySeparatorLabel, "14 MAR 2025");
  assert.equal(singleLayout.get("only-one")?.showTimeSeparatorBefore, false);
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
  assert.equal(shouldKeepChatPinnedAfterLayoutChange(true), true);
  assert.equal(shouldKeepChatPinnedAfterLayoutChange(false), false);
  assert.equal(shouldKeepChatPinnedAfterLayoutChange(true, true), false);

  const scrollSource = readFileSync(new URL("../lib/useChatScroll.ts", import.meta.url), "utf8");
  assert.match(scrollSource, /ResizeObserver/);
  assert.match(scrollSource, /data-chat-content-root/);
  assert.match(scrollSource, /pendingOwnAppendPinnedRef/);
  assert.match(scrollSource, /pendingIncomingAppendPinnedRef/);
  assert.match(scrollSource, /shouldKeepChatPinnedAfterLayoutChange/);
  assert.doesNotMatch(scrollSource, /setInterval/);
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

/**
 * Root-cause regression test for the same rows/CSS mismatch confirmed and
 * fixed on the profile bio field (commit 6de3208): the notes textarea had
 * `textareaRows={1}` (a one-line HTML hint) while its CSS class forced a
 * 3-line height with `!important` -- fixed by setting `textareaRows={3}`
 * to match directly, dropping the now-unnecessary `-3` height-override
 * class for this field only. The shared `.ftc-fixed-scroll-textarea-3`
 * CSS rule itself is untouched -- `WithdrawalReasonDetailsField.tsx`
 * still composes it with a matching `rows={3}`, so removing the rule
 * would regress that field for no reason.
 */
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
  assert.match(sheetSource, /textareaClassName="ftc-fixed-scroll-textarea"/);
  assert.doesNotMatch(sheetSource, /ftc-fixed-scroll-textarea-3/);
  assert.match(sheetSource, /textareaRows=\{3\}/);
  // The shared `-3` class stays defined and correct for its remaining
  // consumer (withdrawal reason field), just no longer applied here.
  assert.match(cssSource, /\.ftc-modal-textarea[\s\S]*height: calc\(3lh \+ 1rem \+ 2px\) !important/);
  assert.match(cssSource, /\.ftc-fixed-scroll-textarea-3[\s\S]*height: calc\(3lh \+ 1rem \+ 2px\) !important/);
  assert.match(cssSource, /\.ftc-fixed-scroll-textarea[\s\S]*overflow-y: auto !important/);
  assert.doesNotMatch(cssSource, /\.ftc-fixed-scroll-textarea-6/);
  // Root-cause fix for the older-iPhone border/outline clipping (see
  // ProfileBioText/EditProfileForm's identical shared base class): WebKit
  // promotes `-webkit-overflow-scrolling: touch` elements onto their own
  // compositing layer, whose paint boundary can clip the element's own
  // border on older iOS Safari. Modern WebKit applies native momentum
  // scrolling to any `overflow: auto` region without it, so it's safe to
  // drop entirely rather than work around.
  const baseTextareaRule = cssSource.match(/\.ftc-fixed-scroll-textarea \{[\s\S]*?\n\}/);
  assert.ok(baseTextareaRule, ".ftc-fixed-scroll-textarea rule not found in globals.css");
  assert.doesNotMatch(baseTextareaRule[0], /-webkit-overflow-scrolling/);
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
  assert.equal(applyCappedMultilineInputLimit("a\nb\nc", "a\nb\nc\nd", 3, 250), "a\nb\nc");

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
  const blockedMessage = "That username is not available";

  assert.equal(getUsernameFormatError("hitler"), blockedMessage);
  assert.equal(getUsernameFormatError("breaker_breakerfuck"), blockedMessage);
  assert.equal(getUsernameFormatError("breakerbreaker"), null);
}

function testUsernameValidationErrorNotDuplicated() {
  const source = readFileSync(
    new URL("../app/components/profile/EditProfileForm.tsx", import.meta.url),
    "utf8",
  );

  // The submit/server field error must not render when the live-validation
  // block is already showing an error for the same field -- otherwise the
  // same message renders twice underneath the username input.
  assert.match(
    source,
    /\{fieldErrors\.username && !\(usernameLiveMessage && usernameLiveTone === "error"\) \? \(/,
  );

  // Mirrors the two conditionals in EditProfileForm's username JSX exactly,
  // so a regression there (e.g. dropping the guard) is caught here too.
  function renderedUsernameErrors(
    liveMessage: string | null,
    liveTone: "muted" | "success" | "error",
    fieldError: string | undefined,
  ): string[] {
    const rendered: string[] = [];
    if (liveMessage) rendered.push(liveMessage);
    if (fieldError && !(liveMessage && liveTone === "error")) rendered.push(fieldError);
    return rendered;
  }

  const invalidUsername = "a!b";
  const formatError = getUsernameFormatError(invalidUsername);
  assert.ok(formatError, "expected an invalid username to produce a format error");
  assert.equal(formatError, "Use 3–30 lowercase letters, numbers, underscores, or dots");

  // Typing an invalid username: live validation shows exactly one error.
  assert.deepEqual(renderedUsernameErrors(formatError, "error", undefined), [formatError]);

  // Tapping Save without correcting it: submit-time validation reuses the
  // same slot instead of appending a second one.
  assert.deepEqual(renderedUsernameErrors(formatError, "error", formatError), [formatError]);

  // Repeated submits of the same invalid value must not duplicate it.
  assert.deepEqual(renderedUsernameErrors(formatError, "error", formatError), [formatError]);

  // Correcting the username clears the error.
  const validUsername = "gooduser123";
  assert.equal(getUsernameFormatError(validUsername), null);
  assert.deepEqual(renderedUsernameErrors(null, "success", undefined), []);

  // A genuinely different (e.g. server-side) username error, not mirrored by
  // the live block, must still render.
  assert.deepEqual(
    renderedUsernameErrors(null, "muted", "That username is already taken"),
    ["That username is already taken"],
  );
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
    /Enter a valid SoundCloud username/,
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
  const chatBackButtonSource = readFileSync(
    new URL("../app/components/chat/ChatBackButton.tsx", import.meta.url),
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
  assert.match(dmHeaderSource, /<ChatBackButton href=\{backHref\} label=\{backLabel\} replace=\{backReplace\} \/>/);
  assert.match(chatBackButtonSource, /scroll=\{false\}/);
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
    `/events/${eventId}?from=dm&conversationId=${conversationId}&bookingRequestId=${bookingRequestId}&restoreScroll=1&dmReturnFrom=bookings`,
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
  // The count stabilisation moved into a shared hook when the DJ main-nav Gigs
  // tab began showing the same number; the sub-nav consumes it rather than
  // keeping its own copy.
  const gigsCountHookSource = readFileSync(
    new URL("../lib/navigation/useWorkspaceGigsPendingCount.ts", import.meta.url),
    "utf8",
  );
  assert.match(subNavSource, /useWorkspaceGigsPendingCount/);
  assert.match(gigsCountHookSource, /readWorkspaceGigsBadgeDisplayCountForSubNav/);
  assert.match(gigsCountHookSource, /subscribeWorkspaceGigsSubNavBadgeDisplay/);
  const badgeCacheSource = readFileSync(
    new URL("../lib/navigationBadgeCache.ts", import.meta.url),
    "utf8",
  );
  assert.match(badgeCacheSource, /ftc-workspace-gigs-subnav-latch/);
  assert.match(gigsCountHookSource, /useSyncExternalStore/);
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

  const badgeSlotSource = readFileSync(
    new URL("../lib/design/workspaceSubNavBadge.ts", import.meta.url),
    "utf8",
  );

  // Selected-Gigs indicator dot: 0.75rem box (25% down from the original 1rem, which
  // out-shouted the tab label). Font and padding scale with the box so a single digit
  // still fits inside min-w and the dot stays circular rather than becoming an oval,
  // and "99+" is never clipped. Centring comes from the flex classes only -- no
  // absolute offsets -- so it holds for any label length or localisation, and the
  // 12px box stays well under the pill's 1.625rem min-height so pill geometry is
  // untouched.
  assert.match(badgeSlotSource, /\bh-3\b/);
  assert.match(badgeSlotSource, /\bmin-w-3\b/);
  assert.match(badgeSlotSource, /text-\[9px\]/);
  assert.match(badgeSlotSource, /items-center/);
  assert.match(badgeSlotSource, /justify-center/);
  assert.match(badgeSlotSource, /rounded-full/);
  assert.match(badgeSlotSource, /leading-none/);
  assert.match(badgeSlotSource, /tabular-nums/);
  // Must not regrow to the old size, and must not be positioned by hand.
  assert.doesNotMatch(badgeSlotSource, /\bh-4\b/);
  assert.doesNotMatch(badgeSlotSource, /\bmin-w-4\b/);
  assert.doesNotMatch(badgeSlotSource, /text-\[10px\]/);
  assert.doesNotMatch(badgeSlotSource, /absolute|translate-|top-|left-|right-|bottom-/);
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
  // DJ-only workspace is Gigs + Calendar -- Events is a planner surface, and Gigs
  // leads because that is where DJs land (getDefaultRouteForRole -> /bookings).
  assert.equal(getEventsAreaSubNavItems("dj").map((item) => item.href).join(","), "/bookings,/calendar");
  assert.equal(
    getEventsAreaSubNavItems("both").map((item) => item.href).join(","),
    "/events,/booking-plans,/bookings,/calendar",
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
    "Events|Event Plans|Gigs|Calendar",
  );
  assert.equal(WORKSPACE_SUB_NAV_TABS.map((tab) => tab.id).join(","), "events,bookingPlans,gigs,calendar");
  assert.equal(
    WORKSPACE_SUB_NAV_TABS.filter((tab) => isWorkspaceSubNavTabVisible(tab.id, null))
      .map((tab) => tab.label)
      .join("|"),
    "Events|Event Plans|Gigs|Calendar",
  );
  assert.equal(WORKSPACE_SUB_NAV_TABS[1].label, "Event Plans");
  assert.equal(WORKSPACE_SUB_NAV_TABS[2].label, "Gigs");
  assert.equal(mergeWorkspaceNavRole("dj", "both"), "both");
  assert.equal(mergeWorkspaceNavRole("both", "dj"), "both");
  assert.equal(mergeWorkspaceNavRole("dj", null), "dj");
  assert.equal(resolveEventsWorkspaceChromeRole("dj", "promoter"), "promoter");
  assert.equal(
    getEventsAreaSubNavItems(mergeWorkspaceNavRole("dj", "both")).map((item) => item.label).join("|"),
    "Events|Event Plans|Gigs|Calendar",
  );

  // Order has exactly one definition: the role-aware list is a filter over the
  // canonical row, so the two can never disagree about ordering.
  for (const role of ["promoter", "dj", "both", null] as const) {
    const canonicalOrder = WORKSPACE_SUB_NAV_TABS.map((tab) => tab.href);
    const roleOrder = getEventsAreaSubNavItems(role).map((item) => item.href);
    assert.deepEqual(roleOrder, canonicalOrder.filter((href) => roleOrder.includes(href)));
  }
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

  // promoter_brand_name now stores a "|"-joined list of brands (Event Brands
  // feature) — identity presentation must fall back to the FIRST brand, not the
  // raw delimited string.
  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: null,
      username: null,
      artist_name: null,
      promoter_brand_name: "Synergy|Warehouse Sessions|Pulse",
    }),
    { primary: "Synergy", secondaryUsername: null },
  );

  // A pre-existing single brand name (no separator) — the exact shape an
  // existing user's data has before ever touching the new chip UI.
  assert.deepEqual(
    resolveProfileIdentityPresentation({
      display_name: null,
      username: null,
      artist_name: null,
      promoter_brand_name: "Synergy",
    }),
    { primary: "Synergy", secondaryUsername: null },
  );
}

function testEventBrandsParsingAndSerialization() {
  // Existing users: a pre-existing single brand name has no separator, so it
  // must parse as a one-item list automatically — this is the entire "migration"
  // for existing data (see scripts/setupEventBrands.sql header comment).
  assert.deepEqual(parseStoredEventBrands("Synergy"), ["Synergy"]);
  assert.deepEqual(parseStoredEventBrands(null), []);
  assert.deepEqual(parseStoredEventBrands(""), []);
  assert.deepEqual(parseStoredEventBrands("   "), []);

  // Round trip.
  assert.deepEqual(
    parseStoredEventBrands(serializeEventBrands(["Synergy", "Warehouse Sessions", "Pulse"])),
    ["Synergy", "Warehouse Sessions", "Pulse"],
  );

  // Trim + collapse internal whitespace.
  assert.deepEqual(parseStoredEventBrands("  Synergy   Nights  "), ["Synergy Nights"]);
  assert.equal(serializeEventBrands(["  Synergy   Nights  "]), "Synergy Nights");

  // Case-insensitive de-duplication, first occurrence wins.
  assert.deepEqual(parseStoredEventBrands("Synergy|SYNERGY|synergy "), ["Synergy"]);
  assert.deepEqual(serializeEventBrands(["Synergy", "synergy", "SYNERGY"]), "Synergy");

  // Blank entries ignored.
  assert.deepEqual(parseStoredEventBrands("Synergy||Pulse|  |"), ["Synergy", "Pulse"]);

  // Max count enforced on both parse and serialize.
  const eleven = Array.from({ length: 11 }, (_, i) => `Brand ${i}`);
  assert.equal(parseStoredEventBrands(eleven.join("|")).length, MAX_PROMOTER_EVENT_BRANDS);
  assert.equal(serializeEventBrands(eleven).split("|").length, MAX_PROMOTER_EVENT_BRANDS);

  // The 40-char limit is enforced only at the point a brand is actively
  // added (see testAddEventBrandTag) -- parsing/serializing existing stored
  // data must NOT retroactively truncate a value that already exceeds the
  // limit (e.g. legacy data predating it), since a save triggered by an
  // unrelated field would otherwise silently and irreversibly shorten it.
  // Overlong values are instead handled safely at render time (chip
  // max-width + ellipsis truncation) rather than by mutating the data.
  const tooLong = "A".repeat(MAX_EVENT_BRAND_NAME_LENGTH + 20);
  assert.equal(parseStoredEventBrands(tooLong)[0].length, tooLong.length);
  assert.equal(parseStoredEventBrands(tooLong)[0], tooLong);
  assert.equal(serializeEventBrands([tooLong]).length, tooLong.length);
  assert.equal(serializeEventBrands([tooLong]), tooLong);

  // A round trip through parse -> serialize -> parse must not lose any of
  // an overlong legacy value's characters.
  assert.deepEqual(
    parseStoredEventBrands(serializeEventBrands([tooLong, "Synergy"])),
    [tooLong, "Synergy"],
  );
}

/**
 * Display Name: 30-character cap, enforced at typing time (not just on
 * save) via the same shared `applyTextInputLimit` primitive every other
 * capped profile field (bio, event brand names) already uses.
 */
function testDisplayNameInputLimit() {
  assert.equal(MAX_PROFILE_DISPLAY_NAME_LENGTH, 30);

  // Typing within the limit: unchanged.
  assert.equal(applyDisplayNameInputLimit("", "Jane Doe"), "Jane Doe");

  // Typing (or pasting) past the limit while previously within it: capped
  // to exactly 30, not rejected outright -- matches applyBioInputLimit /
  // applyEventBrandNameInputLimit's existing "truncate on grow" behaviour.
  const thirtyOne = "a".repeat(31);
  const capped = applyDisplayNameInputLimit("", thirtyOne);
  assert.equal(capped, "a".repeat(30));
  assert.equal(capped?.length, 30);

  // A pre-existing value already over the limit (legacy data predating this
  // cap) can still shrink...
  const legacyOverLimit = "b".repeat(35);
  assert.equal(
    applyDisplayNameInputLimit(legacyOverLimit, legacyOverLimit.slice(0, 34)),
    legacyOverLimit.slice(0, 34),
  );
  // ...but cannot grow further while still over the limit.
  assert.equal(applyDisplayNameInputLimit(legacyOverLimit, legacyOverLimit + "c"), null);
}

/**
 * Bio: unchanged 150-character limit, now ALSO capped by explicit newline
 * count (`MAX_PROFILE_BIO_LINES`) so a handful of blank lines (1 char each)
 * can't balloon the field before the fixed-height/scroll CSS gets a say.
 * Root-cause regression coverage for "multiple consecutive empty lines
 * should not create a giant bio field".
 */
function testBioInputLimit() {
  assert.equal(MAX_PROFILE_BIO_LENGTH, 150);
  assert.equal(MAX_PROFILE_BIO_LINES, 3);

  // Plain single-line growth within the character limit: unchanged.
  assert.equal(applyBioInputLimit("", "DJ based in Melbourne"), "DJ based in Melbourne");

  // A normal multi-line bio at exactly the line cap is preserved in full.
  const threeLineBio = "Line one\nLine two\nLine three";
  assert.equal(countExplicitLines(threeLineBio), 3);
  assert.equal(applyBioInputLimit("", threeLineBio), threeLineBio);

  // Typing a 4th newline is truncated back to 3 explicit lines -- this is
  // the exact "excessive blank lines" case: five consecutive blank lines
  // must not sail through just because they're cheap on character count.
  const fiveBlankLines = "\n\n\n\n";
  assert.ok(fiveBlankLines.length <= MAX_PROFILE_BIO_LENGTH, "sanity: well under the char cap");
  const limitedBlankLines = applyBioInputLimit("", fiveBlankLines);
  assert.ok(limitedBlankLines !== null);
  assert.ok(
    countExplicitLines(limitedBlankLines!) <= MAX_PROFILE_BIO_LINES,
    `expected at most ${MAX_PROFILE_BIO_LINES} lines, got ${countExplicitLines(limitedBlankLines!)}`,
  );

  // Enter is blocked once already at the line cap -- the textarea-level
  // guard `shouldBlockMultilineEnter` used by EditProfileForm's bio keydown
  // handler (mirrors the existing booking rate-notes field exactly).
  assert.equal(shouldBlockMultilineEnter(threeLineBio, MAX_PROFILE_BIO_LINES), true);
  assert.equal(shouldBlockMultilineEnter("Line one\nLine two", MAX_PROFILE_BIO_LINES), false);

  // The 150-character cap itself is untouched -- a single unbroken long
  // line (no newlines to trip the line cap) is still capped by length.
  const longSingleLine = "x".repeat(160);
  const cappedByLength = applyBioInputLimit("", longSingleLine);
  assert.equal(cappedByLength?.length, MAX_PROFILE_BIO_LENGTH);
}

/**
 * Root-cause regression test for "long words / multiple line breaks render
 * differently in Edit Profile vs the public Profile page". The Edit Profile
 * textarea already wraps unbroken long words natively (browsers force-wrap
 * textarea content) plus `.ftc-fixed-scroll-textarea` hides horizontal
 * overflow as a backstop -- but the public profile's `ProfileBioText` `<p>`
 * only had `whitespace-pre-wrap` (preserves line breaks, wraps at normal
 * word boundaries) with no `overflow-wrap` rule, so an unbroken long word
 * (or a long URL) overflowed the card horizontally instead of wrapping --
 * the exact same `[overflow-wrap:anywhere]` fix already applied to this
 * file's own heading/username lines, just missing from the bio itself.
 * The "See more"/"See less" expand toggle is restored (per spec) using the
 * same measured-height smooth-transition mechanism already proven in
 * `BookingCardExpandableNotes.tsx` (collapsed/full height measured via
 * `ResizeObserver` + a temporary `line-clamp-4` class toggle, animated via
 * a wrapper `transition-[height]`, `prefers-reduced-motion` respected) --
 * adapted here rather than duplicated blind, and self-contained in this
 * file since `BookingCardExpandableNotes.tsx` is an unrelated DM feature.
 * Also covers the older-iPhone Edit Profile textarea bug (single-line,
 * non-wrapping rendering, not just a height/clipping issue). Confirmed
 * root cause: the bio's `textareaRows` HTML attribute was hardcoded to
 * `1` while `.ftc-fixed-scroll-textarea-5`'s CSS forcibly overrode the
 * rendered height to 5 lines with `!important` -- a genuine mismatch
 * between what the browser is told the textarea *is* (a 1-line field)
 * and what CSS then *forces it to look like* (5 lines tall). Relying on
 * `!important` CSS to fight a contradictory `rows` value is inherently
 * fragile and version-sensitive (this is exactly the kind of mismatch
 * that renders inconsistently across WebKit versions); the CSS-only
 * height fix attempted first (a plain-pixel fallback for browsers
 * without the `lh` unit) did not resolve it, because the bug was never
 * about the `lh` unit specifically -- it was the `rows`/CSS disagreement
 * itself. Fixed by setting `textareaRows={5}` so the native HTML
 * attribute matches the intended size directly: `rows` is universally
 * supported (no unit/version dependency at all) and, combined with
 * `resize: none` + `overflow-y: auto` (both already on the shared
 * `.ftc-fixed-scroll-textarea` base class), a `<textarea rows="5">`
 * natively stays exactly 5 rows tall with internal scroll for overflow
 * -- no CSS height override needed at all. The now-unnecessary
 * `.ftc-fixed-scroll-textarea-5` class (and its `lh`-based override) was
 * removed entirely rather than patched again, per explicit instruction
 * not to keep blindly re-tuning the height.
 */
function testProfileBioTextRendering() {
  const bioTextSource = readFileSync(
    new URL("../app/components/profile/ProfileBioText.tsx", import.meta.url),
    "utf8",
  );

  // Line breaks preserved; long unbroken words/URLs wrap instead of
  // overflowing (matches ProfileHero's heading/username treatment exactly).
  assert.match(bioTextSource, /whitespace-pre-wrap/);
  assert.match(bioTextSource, /\[overflow-wrap:anywhere\]/);

  // Collapsed to 4 visible lines by default.
  assert.match(bioTextSource, /line-clamp-4/);

  // "See more" / "See less" toggle restored, with a smooth (non-abrupt)
  // height transition and reduced-motion support -- not an instant snap.
  assert.match(bioTextSource, /"See more"/);
  assert.match(bioTextSource, /"See less"/);
  assert.match(bioTextSource, /transition-\[height\]/);
  assert.match(bioTextSource, /motion-reduce:transition-none/);
  assert.match(bioTextSource, /prefersReducedMotion/);
  assert.doesNotMatch(bioTextSource, />\s*(More|Less)\s*</);

  // Toggle sits close to the bio (tightened further to `mt-0.5`, reads as
  // secondary via `font-normal` rather than `font-medium`) -- still `text-xs`
  // (the app's established minimum for this exact toggle pattern, matching
  // BookingCardExpandableNotes) so it stays legible and comfortably tappable.
  assert.match(bioTextSource, /mt-0\.5 text-xs font-normal text-ftc-primary/);
  assert.doesNotMatch(bioTextSource, /mt-1 text-xs font-medium/);
  assert.doesNotMatch(bioTextSource, /mt-2[^"]*font-semibold/);

  // The 150-character limit is a save-time/typing-time concern
  // (applyBioInputLimit / MAX_PROFILE_BIO_LENGTH), never re-implemented here.
  assert.doesNotMatch(bioTextSource, /MAX_PROFILE_BIO_LENGTH/);
  assert.doesNotMatch(bioTextSource, /\.slice\(/);

  // Sanity: the component still trims and hides entirely for a blank bio,
  // exactly as before.
  assert.match(bioTextSource, /bio\.trim\(\)/);
  assert.match(bioTextSource, /if \(!text\) \{\s*return null;/);

  // Edit Profile bio textarea: sized via the native `rows` HTML attribute
  // (universally supported, no CSS unit/version dependency), not a
  // dedicated CSS height-override class fighting a mismatched `rows`.
  const formSource = readFileSync(
    new URL("../app/components/profile/EditProfileForm.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  // Bio is hand-rolled directly in EditProfileForm.tsx (not routed through
  // ProfileFormField) specifically so its border/radius can live on a
  // `.ftc-input-shell` wrapper instead of on the textarea itself -- see the
  // appearance-reset root-cause block below for why. Scoped to bio only:
  // ProfileFormField and every other textarea are untouched.
  const bioFieldBlock = formSource.match(/<label className="block">[\s\S]*?<\/label>/);
  assert.ok(bioFieldBlock, "Bio field block not found in EditProfileForm.tsx");
  assert.doesNotMatch(formSource, /<ProfileFormField\s+label="Bio"/);
  assert.match(bioFieldBlock[0], /rows=\{5\}/);
  assert.match(bioFieldBlock[0], /className="ftc-fixed-scroll-textarea/);
  // The old, fragile `lh`-based height-override class must be gone --
  // dead CSS, not left behind as an unused/misleading rule.
  assert.doesNotMatch(bioFieldBlock[0], /ftc-fixed-scroll-textarea-5/);
  assert.doesNotMatch(globalsSource, /\.ftc-fixed-scroll-textarea-5/);

  // Root-cause fix for the older-iPhone outline clipping that survived the
  // rows fix, the -webkit-overflow-scrolling removal, and the appearance
  // reset: live computed styles on the actual rendered textarea showed
  // `overflow-y: auto` and `border-radius: 16px` on the *same* element --
  // WebKit is documented to fail to clip an element's own scrolling content
  // to that element's own border-radius, clipping the custom border at the
  // vertical (scroll-axis) edges. Fix: border/radius moved onto a
  // `.ftc-input-shell` wrapper (the same shared shell BookingRateField.tsx
  // already uses) that has no `overflow` of its own, while the textarea
  // keeps `overflow-y: auto` but is now borderless/radius-less --
  // `border-radius` and `overflow: auto` no longer share an element.
  assert.match(bioFieldBlock[0], /ftc-input-shell/);
  assert.match(bioFieldBlock[0], /rounded-\[var\(--ftc-radius-lg\)\]/);
  assert.match(bioFieldBlock[0], /border-0 bg-transparent/);
  const shellRule = globalsSource.match(/\.ftc-input-shell \{[\s\S]*?\n\}/);
  assert.ok(shellRule, ".ftc-input-shell rule not found in globals.css");
  assert.doesNotMatch(shellRule[0], /overflow/);

  // The shared base class (resize:none, overflow-y:auto for internal
  // scroll, no `lh`/height override) still applies -- this is what makes
  // `rows="5"` behave as "5 fixed visible rows, scroll for overflow"
  // rather than an auto-growing or resizable field.
  const baseRule = globalsSource.match(/\.ftc-fixed-scroll-textarea \{[\s\S]*?\n\}/);
  assert.ok(baseRule, ".ftc-fixed-scroll-textarea rule not found in globals.css");
  assert.match(baseRule[0], /resize: none/);
  assert.match(baseRule[0], /overflow-y: auto/);
  assert.doesNotMatch(baseRule[0], /white-space/);
  assert.doesNotMatch(baseRule[0], /word-break/);
  assert.doesNotMatch(baseRule[0], /appearance/);

  // Root-cause fix for the older-iPhone focus-outline clipping that survived
  // both the rows fix and the -webkit-overflow-scrolling removal: iOS Safari's
  // default native -webkit-appearance for textareas paints its own OS-level
  // border/corner chrome, which can fail to scale to a custom-height textarea
  // (e.g. this 5-row field) and clip the author's own border at the top/bottom
  // on older WebKit. Reset on the shared `.ftc-input`/`.ftc-textarea`/
  // `.ftc-field-trigger` rule -- not the fixed-scroll-textarea modifier -- so
  // every text input, textarea, and field-trigger button gets it once.
  const inputBaseRule = globalsSource.match(
    /\.ftc-input,\s*\n\.ftc-textarea,\s*\n\.ftc-field-trigger \{[\s\S]*?\n\}/,
  );
  assert.ok(inputBaseRule, ".ftc-input/.ftc-textarea/.ftc-field-trigger rule not found");
  assert.match(inputBaseRule[0], /appearance: none/);
  assert.match(inputBaseRule[0], /-webkit-appearance: none/);

  // The shared 3-line class stays defined for its remaining correct
  // consumer, the withdrawal reason field (rows={3}, already matched --
  // see WithdrawalReasonDetailsField.tsx). The booking rate notes field
  // no longer uses it (see testProposeBookingRateNotesTextareaGrowth):
  // it had the exact same rows/CSS mismatch bio did and was fixed the
  // same way in a follow-up pass, not left alone as this comment
  // originally assumed.
  const threeLineRule = globalsSource.match(/\.ftc-fixed-scroll-textarea-3 \{[\s\S]*?\n\}/);
  assert.ok(threeLineRule, ".ftc-fixed-scroll-textarea-3 rule not found in globals.css");
  assert.match(threeLineRule[0], /3lh/);

  // Trailing blank lines: investigated and confirmed already handled --
  // saveUserProfile() trims the bio before persisting (so nothing with
  // trailing blank lines is ever written), and ProfileBioText trims again
  // at render time as a second safety net. No new trimming logic needed;
  // this just locks in that both trims stay in place.
  const currentUserSource = readFileSync(
    new URL("../lib/user/currentUser.ts", import.meta.url),
    "utf8",
  );
  assert.match(currentUserSource, /bio: input\.bio\.trim\(\)/);
  assert.equal("Hello\n\n\n".trim(), "Hello");
  assert.equal("Hello\n\nWorld\n\n".trim(), "Hello\n\nWorld");

  // Role consistency: the bio textarea (Edit Profile) and ProfileBioText
  // (public profile) are rendered unconditionally, outside any
  // role === "dj"/"promoter"/"both" branch -- one shared implementation
  // for every role, not a per-role fork that could drift.
  assert.doesNotMatch(bioFieldBlock[0], /role ===/);
  const profileHeroSource = readFileSync(
    new URL("../app/components/profile/ProfileHero.tsx", import.meta.url),
    "utf8",
  );
  assert.match(profileHeroSource, /bio\?\.trim\(\) \? <ProfileBioText bio=\{bio\} \/> : null/);
  assert.doesNotMatch(profileHeroSource, /role ===/);
}

/**
 * Root-cause regression test for "the Display Name and Bio fields need
 * clearer limits/UX" -- verifies the actual wiring in EditProfileForm.tsx
 * and ProfileFormField.tsx (not just the pure-function primitives above):
 * the display name field enforces its cap via both the shared limiter AND
 * a native `maxLength` backstop, the save path also caps it server-side
 * (not just relying on the client), and the bio textarea uses the shared
 * fixed-height/scroll CSS (capped visible rows, no continuous growth) with
 * the same composition-safe IME handling the booking rate-notes field
 * already established, rather than a bespoke reimplementation.
 */
function testProfileDisplayNameAndBioFieldUx() {
  const formSource = readFileSync(
    new URL("../app/components/profile/EditProfileForm.tsx", import.meta.url),
    "utf8",
  );
  const fieldSource = readFileSync(
    new URL("../app/components/profile/ProfileFormField.tsx", import.meta.url),
    "utf8",
  );
  const currentUserSource = readFileSync(
    new URL("../lib/user/currentUser.ts", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // Display name: typing-time cap (not just a save-time check) and native
  // maxLength backstop -- no visible character counter (removed by design;
  // the limit is still enforced, just not displayed as "x/30").
  assert.match(formSource, /onChange=\{handleDisplayNameChange\}/);
  assert.match(formSource, /applyDisplayNameInputLimit\(form\.display_name, nextDisplayName\)/);
  assert.match(formSource, /maxLength=\{MAX_PROFILE_DISPLAY_NAME_LENGTH\}/);
  assert.doesNotMatch(
    formSource,
    /\{form\.display_name\.length\}\/\{MAX_PROFILE_DISPLAY_NAME_LENGTH\}/,
  );

  // Submit-time validation covers length too, not just "required".
  assert.match(
    formSource,
    /form\.display_name\.length > MAX_PROFILE_DISPLAY_NAME_LENGTH/,
  );

  // Bio keeps its own visible "x/150" counter untouched -- the display-name
  // counter removal is scoped to that one field only. Counted via
  // countUnicodeCharacters (Unicode code points), not raw `.length`, since
  // raw `.length` was the root cause of the "stops accepting input before
  // 150" bug -- see testProfileBioAcceptsFullLengthWithEmoji.
  assert.match(formSource, /\{countUnicodeCharacters\(form\.bio\)\}\/\{MAX_PROFILE_BIO_LENGTH\}/);
  assert.doesNotMatch(formSource, /\{form\.bio\.length\}\/\{MAX_PROFILE_BIO_LENGTH\}/);

  // Server-side (save-path) enforcement: saveUserProfile itself caps the
  // value it persists, independent of whatever the client already did --
  // a defence-in-depth guarantee for any other future caller.
  assert.match(
    currentUserSource,
    /display_name: input\.display_name\.trim\(\)\.slice\(0, MAX_PROFILE_DISPLAY_NAME_LENGTH\)/,
  );

  // Bio: reuses the shared fixed-height/internal-scroll textarea base class
  // (same one the booking rate-notes field uses) instead of a bespoke
  // fixed-pixel-height class -- the textarea can no longer grow past its
  // visible-row cap, and overflow scrolls internally rather than expanding.
  // Sized via the native `rows={5}` HTML attribute rather than a CSS
  // height-override modifier class (see testProfileBioTextRendering for the
  // full root-cause explanation of why `rows` and not CSS `-N`). Bio is
  // hand-rolled (not routed through ProfileFormField, see
  // testProfileBioTextRendering for why), so these are plain `rows`/
  // `className`/`onKeyDown`/etc props on the raw `<textarea>`, not the
  // `textareaRows`/`textareaClassName`/... prop names ProfileFormField
  // itself still exposes for every other field.
  assert.match(formSource, /className="ftc-fixed-scroll-textarea/);
  assert.match(formSource, /rows=\{5\}/);
  assert.ok(
    !formSource.includes("ftc-profile-bio-textarea"),
    "bio textarea should use the shared fixed-scroll classes, not a bespoke one-off class",
  );
  assert.ok(
    !globalsSource.includes(".ftc-profile-bio-textarea"),
    "the now-unused bespoke bio textarea class should be removed, not left as dead CSS",
  );

  // Line-cap enforcement wired through: keydown blocks a 4th newline,
  // composition-start/end handle IME safely (mirrors ProposeBookingRateSheet
  // exactly, not a parallel reimplementation).
  assert.match(formSource, /onKeyDown=\{handleBioKeyDown\}/);
  assert.match(formSource, /shouldBlockMultilineEnter\(form\.bio, MAX_PROFILE_BIO_LINES\)/);
  assert.match(formSource, /onCompositionStart=\{\(\) => \{/);
  assert.match(formSource, /onCompositionEnd=\{handleBioCompositionEnd\}/);
  assert.match(formSource, /isComposingBioRef/);

  // ProfileFormField itself is untouched -- it still exposes the same
  // textarea prop surface BookingFormField established, for every field
  // that still goes through it (display name, and every non-bio field).
  assert.match(fieldSource, /textareaRows\s*=\s*4/);
  assert.match(fieldSource, /textareaOnKeyDown\?:/);
  assert.match(fieldSource, /textareaOnCompositionStart\?:/);
  assert.match(fieldSource, /textareaOnCompositionEnd\?:/);
  assert.match(fieldSource, /maxLength\?:\s*number/);

  // The shared fixed-scroll CSS itself still guarantees a hard cap + internal
  // scroll (not just `resize:none`, which alone wouldn't stop programmatic/
  // content-driven growth).
  const fixedScrollRule = globalsSource.match(/\.ftc-fixed-scroll-textarea \{[\s\S]*?\n\}/);
  assert.ok(fixedScrollRule, ".ftc-fixed-scroll-textarea rule not found in globals.css");
  assert.match(fixedScrollRule[0], /resize: none/);
  assert.match(fixedScrollRule[0], /overflow-y: auto/);
  const threeRowRule = globalsSource.match(/\.ftc-fixed-scroll-textarea-3 \{[\s\S]*?\n\}/);
  assert.ok(threeRowRule, ".ftc-fixed-scroll-textarea-3 rule not found in globals.css");
  assert.match(threeRowRule[0], /height: calc\(3lh/);
  assert.match(threeRowRule[0], /max-height: calc\(3lh/);
}

/**
 * Root-cause regression test for "the Profile Bio field stops accepting
 * input at 148/150": `string.length` counts UTF-16 code units, not
 * characters as a user perceives them -- a single surrogate-pair emoji
 * (e.g. "🎧".length === 2) silently consumed two of the 150-character
 * budget. Both the typing-time limit (applyTextInputLimit /
 * applyCappedMultilineInputLimit, shared by every capped text field in the
 * app) and Bio's own displayed counter/submit validation now count Unicode
 * code points (countUnicodeCharacters) instead. This is a strict relaxation
 * for every other consumer of these shared primitives -- code-point count
 * is never greater than raw `.length`, so no previously-passing scenario
 * for display name, event brands, booking notes, or event notes can regress,
 * it can only stop rejecting input early for content containing emoji.
 */
function testProfileBioAcceptsFullLengthWithEmoji() {
  const textLimitsSource = readFileSync(
    new URL("../lib/textInputLimits.ts", import.meta.url),
    "utf8",
  );
  const multilineSource = readFileSync(
    new URL("../lib/cappedMultilineInput.ts", import.meta.url),
    "utf8",
  );
  const formSource = readFileSync(
    new URL("../app/components/profile/EditProfileForm.tsx", import.meta.url),
    "utf8",
  );

  assert.match(textLimitsSource, /export function countUnicodeCharacters/);
  assert.match(textLimitsSource, /Array\.from\(value\)\.length/);
  assert.match(multilineSource, /countUnicodeCharacters/);

  // A single emoji is 1 code point but 2 UTF-16 units -- the exact
  // discrepancy that caused the bug.
  assert.equal("🎧".length, 2);
  assert.equal(Array.from("🎧").length, 1);

  // A bio built almost entirely from headphone emoji, well past what raw
  // `.length` would allow (2 units each -> 75 emoji = 150 raw units, but
  // only 75 code points), must still be accepted up to the true 150-code-point
  // cap -- this is the concrete scenario that used to stop input early.
  const seventyFiveEmoji = "🎧".repeat(75);
  assert.equal(seventyFiveEmoji.length, 150);
  assert.equal(applyBioInputLimit("", seventyFiveEmoji), seventyFiveEmoji);
  assert.equal(countUnicodeCharacters(seventyFiveEmoji), 75);

  // One more emoji (76 code points, 152 raw units) must still be accepted --
  // proof the cap is genuinely 150 code points, not silently still 150 raw
  // units through some other path.
  const seventySixEmoji = "🎧".repeat(76);
  assert.equal(applyBioInputLimit(seventyFiveEmoji, seventySixEmoji), seventySixEmoji);

  // A plain-text bio at exactly the 150-character cap (no emoji) must be
  // completely unaffected -- code points equal raw length for ASCII, so
  // behaviour here is byte-identical to before the fix.
  const plain150 = "a".repeat(150);
  assert.equal(applyBioInputLimit("", plain150), plain150);
  assert.equal(applyBioInputLimit("", `${plain150}b`), plain150);

  // No native `maxLength` on bio's textarea: the DOM's own maxlength
  // enforcement counts raw UTF-16 units, so leaving it in place would
  // silently reintroduce the exact bug this fix removes, regardless of what
  // the JS-side limit now allows. Matches BookingFormField's textarea, which
  // never had one either.
  const bioFieldBlock = formSource.match(/<label className="block">[\s\S]*?<\/label>/);
  assert.ok(bioFieldBlock, "Bio field block not found in EditProfileForm.tsx");
  assert.doesNotMatch(bioFieldBlock[0], /maxLength=/);

  // Submit-time validation and the displayed counter both use the same
  // code-point count as the typing-time limit -- otherwise a bio that reads
  // exactly "150/150" while typing could still fail to save (or vice versa).
  assert.match(formSource, /countUnicodeCharacters\(form\.bio\) > MAX_PROFILE_BIO_LENGTH/);
  assert.match(formSource, /\{countUnicodeCharacters\(form\.bio\)\}\/\{MAX_PROFILE_BIO_LENGTH\}/);
  assert.doesNotMatch(formSource, /form\.bio\.length/);
}

/**
 * Long display names (now capped at 30 characters going forward, but
 * legacy profiles predating the cap could still exceed it) must not break
 * layouts on the surfaces the task calls out by name: profile heading, DM
 * inbox/chat header, event lineup cards, and discover/search cards.
 */
function testLongDisplayNameLayoutSafety() {
  const profileHeroSource = readFileSync(
    new URL("../app/components/profile/ProfileHero.tsx", import.meta.url),
    "utf8",
  );
  const inboxRowSource = readFileSync(
    new URL("../app/components/dm/MessagesInboxRow.tsx", import.meta.url),
    "utf8",
  );
  const chatHeaderSource = readFileSync(
    new URL("../app/components/dm/DmConversationHeader.tsx", import.meta.url),
    "utf8",
  );
  const lineupCardSource = readFileSync(
    new URL("../app/components/event-detail/EventLineupBookingCard.tsx", import.meta.url),
    "utf8",
  );
  const djInviteRowSource = readFileSync(
    new URL("../app/components/booking/SendBookingRequestsPanel.tsx", import.meta.url),
    "utf8",
  );
  const discoverFeaturedSource = readFileSync(
    new URL("../app/components/discover/DiscoverFeaturedProfileCard.tsx", import.meta.url),
    "utf8",
  );
  const discoverListSource = readFileSync(
    new URL("../app/components/discover/DiscoverProfileListRow.tsx", import.meta.url),
    "utf8",
  );

  // Profile heading: wraps instead of truncating (it's the page's own H1,
  // not a card in a list), but must never force horizontal overflow -- the
  // unbroken-word-safe `overflow-wrap: anywhere` plus `break-words`.
  assert.match(profileHeroSource, /break-words[\s\S]{0,80}\[overflow-wrap:anywhere\]/);

  // DM inbox row and chat header: single-line truncate inside a min-w-0
  // flex context (a chat list/header is exactly where a long name could
  // previously push the timestamp/actions off-screen).
  assert.match(inboxRowSource, /min-w-0 truncate/);
  assert.match(chatHeaderSource, /truncate text-base font-semibold text-ftc-text/);

  // Event lineup card: the DJ name link now truncates (previously had no
  // overflow protection at all -- confirmed by reproducing the gap before
  // fixing it).
  assert.match(lineupCardSource, /min-w-0 truncate text-base font-bold leading-snug/);

  // Shared DJ invite row (used by both Events and Event Plans DJ selection,
  // per the earlier DjInviteSelectionRow consolidation) -- the name itself
  // now truncates, not just its genre subtitle.
  assert.match(djInviteRowSource, /<p className="truncate text-sm font-bold leading-snug text-ftc-text">\{displayName\}<\/p>/);

  // Discover: the featured card's name heading now truncates (previously
  // had no overflow protection); the list row was already safe.
  assert.match(discoverFeaturedSource, /truncate text-lg font-bold leading-tight/);
  assert.match(discoverListSource, /truncate text-base font-bold text-ftc-text/);
}

function testAddEventBrandTag() {
  // Ignores blank entries (not an error) — spec: "Ignore blank entries."
  assert.deepEqual(addEventBrandTag(["Synergy"], "   "), { brands: ["Synergy"], error: null });

  // Trims and collapses whitespace before adding.
  assert.deepEqual(addEventBrandTag([], "  Warehouse   Sessions  "), {
    brands: ["Warehouse Sessions"],
    error: null,
  });

  // Enforces the 40-character limit when a brand is actively added --
  // exactly 40 chars is accepted unmodified; anything longer is truncated
  // to exactly 40 (not rejected as an error -- matches the live-typing
  // limiter in applyEventBrandNameInputLimit, which caps input the same way).
  const exactlyMax = "B".repeat(MAX_EVENT_BRAND_NAME_LENGTH);
  const overMax = "C".repeat(MAX_EVENT_BRAND_NAME_LENGTH + 25);
  assert.deepEqual(addEventBrandTag([], exactlyMax), { brands: [exactlyMax], error: null });
  assert.equal(exactlyMax.length, MAX_EVENT_BRAND_NAME_LENGTH);

  const overMaxResult = addEventBrandTag([], overMax);
  assert.equal(overMaxResult.error, null);
  assert.equal(overMaxResult.brands.length, 1);
  assert.equal(overMaxResult.brands[0].length, MAX_EVENT_BRAND_NAME_LENGTH);
  assert.equal(overMaxResult.brands[0], overMax.slice(0, MAX_EVENT_BRAND_NAME_LENGTH));

  // A single unbroken word (no spaces) is capped exactly the same way --
  // this is the shape that, without a rendered-chip max-width, would
  // overflow the container (no natural line-break point).
  const unbrokenWord = "x".repeat(MAX_EVENT_BRAND_NAME_LENGTH + 10);
  assert.equal(addEventBrandTag([], unbrokenWord).brands[0].length, MAX_EVENT_BRAND_NAME_LENGTH);

  // Prevents duplicates, case-insensitive.
  assert.deepEqual(addEventBrandTag(["Synergy"], "synergy"), {
    brands: ["Synergy"],
    error: "That brand has already been added",
  });
  assert.deepEqual(addEventBrandTag(["Synergy"], "SYNERGY"), {
    brands: ["Synergy"],
    error: "That brand has already been added",
  });

  // Enforces the 10-brand max.
  const tenBrands = Array.from({ length: MAX_PROMOTER_EVENT_BRANDS }, (_, i) => `Brand ${i}`);
  const atLimitResult = addEventBrandTag(tenBrands, "One more");
  assert.deepEqual(atLimitResult.brands, tenBrands);
  assert.ok(atLimitResult.error);

  // Successful add.
  assert.deepEqual(addEventBrandTag(["Synergy"], "Pulse"), {
    brands: ["Synergy", "Pulse"],
    error: null,
  });
}

/**
 * Root-cause regression test for "Event Brand chips overflow horizontally
 * on a long/unbroken brand name". The 40-char limit alone doesn't prevent
 * overflow -- a 40-character string with no spaces has no natural
 * line-break point, so without an explicit chip max-width the browser
 * can't wrap it and the chip (and page) gets forced wider than the
 * viewport instead. Every surface that renders a saved/selected brand as a
 * chip must apply the same shared max-width, and must let the browser
 * actually shrink/wrap below the unbroken word's natural width; a chip with
 * a trailing remove button must clip only the text, keeping the button
 * fully visible and tappable.
 *
 * The two chip families intentionally differ in HOW they stay inside that
 * cap, because they have different jobs: the read-only public-profile list
 * wraps to a second line (see `testPublicProfileEventBrandsAdaptiveChips`)
 * so a brand is readable without any interaction, while the *editable*
 * surfaces stay strictly single-line-with-ellipsis so a row of chips with
 * remove buttons keeps a predictable, uniform height while editing.
 */
function testEventBrandChipOverflowSafe() {
  const tagListSource = readFileSync(
    new URL("../app/components/profile/ProfileTagChipList.tsx", import.meta.url),
    "utf8",
  );
  const genrePickerSource = readFileSync(
    new URL("../app/components/profile/ProfileGenrePicker.tsx", import.meta.url),
    "utf8",
  );
  const brandsFieldSource = readFileSync(
    new URL("../app/components/profile/ProfileEventBrandsField.tsx", import.meta.url),
    "utf8",
  );

  // Shared max-width token, defined once and reused everywhere -- not a
  // per-surface, independently-drifting literal.
  assert.match(tagListSource, /export const PROFILE_TAG_CHIP_MAX_WIDTH_CLASS = "max-w-\[12rem\]"/);

  // Public/own profile display + Genre chips (same shared read-only list
  // component, used for both tag types): the chip carries the max-width and
  // an inner span carries the wrap/clamp treatment.
  assert.match(
    tagListSource,
    /PROFILE_TAG_CHIP_BASE_CLASS\}\s*\$\{PROFILE_TAG_CHIP_MAX_WIDTH_CLASS\}/,
  );

  // Profile edit form -- Genre picker's selected-tag chips (no remove
  // button, same plain-text shape as the read-only list).
  assert.match(genrePickerSource, /PROFILE_TAG_CHIP_MAX_WIDTH_CLASS/);
  assert.match(
    genrePickerSource,
    /PROFILE_TAG_CHIP_BASE_CLASS\}\s*\$\{PROFILE_TAG_CHIP_MAX_WIDTH_CLASS\}\s*min-w-0 truncate/,
  );

  // Profile edit form -- Event Brand chips have a trailing remove (x)
  // button, so only an inner text span truncates; the outer chip carries
  // the max-width and the button stays a separate `shrink-0` sibling (so
  // it's never the thing that gets clipped/hidden).
  assert.match(brandsFieldSource, /PROFILE_TAG_CHIP_MAX_WIDTH_CLASS/);
  assert.match(brandsFieldSource, /<span className="min-w-0 truncate">\{brand\}<\/span>/);
  assert.match(brandsFieldSource, /shrink-0 items-center justify-center rounded-full/);

  // The event-creation brand selector (former third editable surface) was
  // removed entirely in the beta Create Event simplification -- see
  // testCreateEventBrandRemovedFromUi. Nothing left to assert here for it.
}

/**
 * Beta Create Event simplification: the Event Brand selector is removed from
 * the create-event UI entirely (single-select chip row promoters used to tap
 * to choose among their saved brands), while event_brand is still submitted
 * automatically using the promoter's own saved brand data, and Event Brands
 * on the profile itself (the actual source of truth, editable via
 * ProfileEventBrandsField) are completely untouched -- this is a UI
 * simplification only, not a feature or data removal.
 */
function testCreateEventBrandRemovedFromUi() {
  const eventsPageSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );

  // The selector component itself is gone, not just unused -- dead code was
  // deleted rather than left orphaned.
  assert.ok(
    !existsSync(new URL("../app/components/events/EventBrandSelectField.tsx", import.meta.url)),
    "EventBrandSelectField.tsx should be deleted, not left as unused dead code",
  );
  assert.doesNotMatch(eventsPageSource, /EventBrandSelectField/);
  assert.doesNotMatch(eventsPageSource, /Event brand/);

  // event_brand is still submitted automatically: the promoter's first saved
  // brand is used as the default -- previously this only auto-filled when a
  // promoter had *exactly* one brand (ambiguous otherwise, since the removed
  // selector let them pick among several); now that there is no selector to
  // pick with, the first saved brand is used unconditionally, so promoters
  // with 2+ brands still get event_brand submitted rather than silently
  // losing it. Single-brand promoters see byte-identical behaviour to
  // before -- that was already the only case with a non-null default.
  assert.match(
    eventsPageSource,
    /const defaultEventBrand = promoterEventBrands\[0\] \?\? null;/,
  );
  assert.doesNotMatch(eventsPageSource, /promoterEventBrands\.length === 1/);

  // The default is still wired into every place the create form resets/
  // initialises (initial useState, openCreateFlow, handleSelectPlan, "From
  // scratch") and still flows into createEvent(...form) unchanged -- only
  // the UI for picking a *different* brand is gone, not the field itself or
  // its submission.
  assert.match(eventsPageSource, /eventBrand: defaultEventBrand/);
  const createEventCallBlock = eventsPageSource.match(
    /const created = await createEvent\(\{[\s\S]*?\}\);/,
  );
  assert.ok(createEventCallBlock, "createEvent(...) call not found");
  assert.match(createEventCallBlock[0], /\.\.\.form/);

  // event_brand remains optional at the data layer -- promoters with zero
  // saved brands still correctly submit no brand, exactly as before.
  const eventsLibSource = readFileSync(new URL("../lib/events.ts", import.meta.url), "utf8");
  assert.match(eventsLibSource, /event_brand: string \| null/);
  assert.match(eventsLibSource, /eventBrand && !isEventBrandColumnMissing\(\)/);

  // Event Brands on the profile itself -- the actual saved data this task
  // must not touch -- are completely untouched: still editable, still
  // rendered on the public profile, nothing here was scoped for removal.
  assert.ok(
    existsSync(new URL("../app/components/profile/ProfileEventBrandsField.tsx", import.meta.url)),
  );
  const profileSectionsSource = readFileSync(
    new URL("../app/components/profile/PromoterProfileSections.tsx", import.meta.url),
    "utf8",
  );
  assert.match(profileSectionsSource, /Event Brands|EventBrands/);
}

/**
 * Create Event validation UX (beta polish): errors must never appear while
 * the user is simply typing or before they attempt to save -- only a tapped
 * Save Event evaluates and shows them, exactly matching the pre-existing
 * `createSaveAttempted` gate this task builds on rather than replaces (see
 * getEventFormFieldErrors/hasEventFormFieldErrors, already gated correctly
 * before this task). What was missing and is added here: on a blocked save,
 * the browser scrolls to and focuses the first invalid field, and every
 * field the shared form components can render now actually shows the red
 * border + aria-invalid the design system's existing CSS already supports
 * (`.ftc-input[aria-invalid="true"]` in globals.css) -- PlannerFormField
 * previously computed an `error` message but never set `aria-invalid`, so
 * the shared red-border rule never actually triggered for Event
 * name/Venue/Notes.
 */
function testCreateEventValidationScrollsAndFocusesFirstInvalidField() {
  const eventsPageSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );
  const plannerUiSource = readFileSync(
    new URL("../app/components/planner/PlannerUi.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // Errors stay gated behind createSaveAttempted -- never live while typing.
  assert.match(
    eventsPageSource,
    /if \(!createOpen \|\| createStep !== "form" \|\| !createSaveAttempted\) \{\s*return \{\};/,
  );

  // A blocked save (either field errors or the notes validation error)
  // increments an attempt counter every time, not just the first -- so
  // repeated taps while still invalid each re-trigger scroll-to-first-invalid,
  // not just the initial one.
  const handleSaveEventBlock = eventsPageSource.match(
    /async function handleSaveEvent\([\s\S]*?\n  \}/,
  );
  assert.ok(handleSaveEventBlock, "handleSaveEvent not found");
  const setCreateSaveAttemptCountCalls =
    handleSaveEventBlock[0].match(/setCreateSaveAttemptCount\(\(count\) => count \+ 1\)/g) ?? [];
  assert.equal(
    setCreateSaveAttemptCountCalls.length,
    2,
    "expected both the field-errors and notes-error blocked-save paths to increment the attempt counter",
  );

  // The counter resets whenever the create flow (re)opens fresh, so a stale
  // count from a previous attempt can't fire the scroll/focus effect against
  // a brand-new, untouched form.
  assert.match(eventsPageSource, /setCreateSaveAttempted\(false\);\s*setCreateSaveAttemptCount\(0\);/);

  // The scroll/focus effect: fires on attempt-count change (not on every
  // keystroke), is a no-op on mount (count starts at 0), and queries for the
  // same aria-invalid attribute the field components now set -- one
  // mechanism drives both the visual red border and the focus target, so
  // they can never disagree about which field is "first invalid".
  assert.match(eventsPageSource, /const createFormRef = useRef<HTMLFormElement>\(null\);/);
  assert.match(eventsPageSource, /<form\s*\n\s*ref={createFormRef}\s*\n\s*onSubmit={handleSaveEvent}\s*\n\s*noValidate/);

  // Root-cause fix for "Save scrolls to the wrong section (e.g. Invite DJs)
  // instead of the first invalid field": PlannerFormField's Event
  // name/Venue inputs carry a native HTML `required` attribute, and without
  // `noValidate` the browser's own constraint validation intercepts the
  // submit *before* handleSaveEvent ever runs, performing its own
  // native scroll/focus to whichever control it finds invalid first
  // (including invisible helper inputs like FtcDatePicker's zero-size
  // required mirror) -- racing against and often winning over this effect.
  // `noValidate` removes that competing native path entirely, leaving this
  // effect as the single, deterministic source of scroll/focus behaviour.
  assert.match(eventsPageSource, /noValidate\s*\n\s*className="space-y-4"/);

  const scrollEffectBlock = eventsPageSource.match(
    /useEffect\(\(\) => \{\s*if \(createSaveAttemptCount === 0\)[\s\S]*?\}, \[createSaveAttemptCount\]\);/,
  );
  assert.ok(scrollEffectBlock, "scroll-to-first-invalid-field effect not found");
  assert.match(scrollEffectBlock[0], /querySelector<HTMLElement>\(\s*'\[aria-invalid="true"\]'/);

  // Focus is called BEFORE scroll, not after: `focus({ preventScroll: true })`
  // is not reliably honoured on older WebKit (it has historically scrolled
  // on focus regardless of the option), so a focus-then-scroll order doesn't
  // depend on that option working -- any native scroll focus triggers is
  // synchronous and happens first, and the explicit scrollIntoView
  // immediately after always overrides it as the final, deterministic
  // scroll position. `block: "start"` (not "center") plus the shared
  // `scroll-margin-top` on .ftc-input/.ftc-textarea/.ftc-field-trigger
  // (globals.css) gives comfortable clearance under the sticky desktop nav
  // bar without a second, manually-computed offset scroll call.
  const focusIndex = scrollEffectBlock[0].indexOf("firstInvalid.focus(");
  const scrollIndex = scrollEffectBlock[0].indexOf("firstInvalid.scrollIntoView(");
  assert.ok(focusIndex !== -1 && scrollIndex !== -1, "focus/scroll calls not found");
  assert.ok(focusIndex < scrollIndex, "focus must be called before scrollIntoView");
  assert.match(scrollEffectBlock[0], /\.focus\(\{ preventScroll: true \}\)/);

  // Root-cause fix for "Save still scrolls near Invite DJs on physical iPhone
  // after noValidate": confirmed via a faithful reproduction (the real
  // PlannerFormField/BookingDateField components, real
  // getEventFormFieldErrors, real querySelector target) that the DOM
  // targeting itself was always correct -- Venue's own visible input, not a
  // wrapper or hidden helper input. `behavior: "smooth"` was the actual
  // remaining bug: it's a multi-hundred-ms animation, and focusing a real
  // text input on iOS Safari opens the software keyboard, which triggers
  // WebKit's own separate "keep the focused element above the keyboard"
  // scroll adjustment -- distinct from the initial focus-scroll
  // `preventScroll` suppresses, so it still fires and can interrupt an
  // in-flight smooth scroll mid-animation. `behavior: "auto"` (instant)
  // completes synchronously in the same frame as focus, before the keyboard
  // has begun animating in, leaving no window to race against.
  assert.match(scrollEffectBlock[0], /scrollIntoView\(\{ behavior: "auto", block: "start" \}\)/);
  assert.doesNotMatch(scrollEffectBlock[0], /behavior: "smooth"/);

  const scrollMarginRule = globalsSource.match(
    /\.ftc-input,\s*\n\.ftc-textarea,\s*\n\.ftc-field-trigger \{[\s\S]*?\n\}/,
  );
  assert.ok(scrollMarginRule, ".ftc-input/.ftc-textarea/.ftc-field-trigger rule not found");
  assert.match(scrollMarginRule[0], /scroll-margin-top: 5rem/);

  // The Save button is never disabled by validation state -- only by
  // `saving` -- so every tap (not just the first) reaches handleSaveEvent
  // and can re-run validation + scroll/focus against whatever the user just
  // fixed. It stays the normal primary (blue) button; red is never applied
  // to it -- only to individual invalid fields.
  const saveButtonBlock = eventsPageSource.match(
    /<button\s+type="submit"[\s\S]*?<\/button>/,
  );
  assert.ok(saveButtonBlock, "Save event button not found");
  assert.match(saveButtonBlock[0], /disabled=\{saving\}/);
  assert.doesNotMatch(saveButtonBlock[0], /createFormHasValidationErrors/);
  assert.doesNotMatch(saveButtonBlock[0], /createFormHasFieldErrors/);
  assert.match(saveButtonBlock[0], /className="ftc-btn-primary/);
  assert.doesNotMatch(saveButtonBlock[0], /danger|red|ftc-btn-danger/i);

  // PlannerFormField (Event name, Venue, Notes) and PlannerFieldError now
  // wire aria-invalid/aria-describedby, reusing the design system's existing
  // `.ftc-input[aria-invalid="true"]` red-border rule (globals.css) instead
  // of introducing a parallel error-styling mechanism.
  assert.match(plannerUiSource, /aria-invalid=\{error \? true : undefined\}/);
  assert.match(plannerUiSource, /aria-describedby=\{error \? errorId : undefined\}/);
  assert.match(
    plannerUiSource,
    /export function PlannerFieldError\(\{ message, id \}: \{ message: string; id\?: string \}\)/,
  );

  // BookingDateField/BookingSetTimeRangeField (Event date, Start/Finish time)
  // already had aria-invalid wiring on their trigger buttons before this
  // task -- confirming that pre-existing wiring instead of duplicating it.
  const bookingDateTimeSource = readFileSync(
    new URL("../app/components/BookingDateTimeFields.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bookingDateTimeSource, /aria-invalid=\{error \? true : undefined\}/);
  const datePickerSource = readFileSync(
    new URL("../app/components/FtcDatePicker.tsx", import.meta.url),
    "utf8",
  );
  assert.match(datePickerSource, /aria-invalid=\{invalid \? true : undefined\}/);
}

/**
 * Root-cause regression test for "the Music genres sheet jumps vertically when
 * the second search character changes the filtered results" (iPhone Safari).
 *
 * Structural cause: the sheet is bottom-anchored (`items-end`) and was sized
 * with `max-h-[88dvh]` and NO definite height, so its height tracked its own
 * content. While the filtered list overflowed the cap the sheet stayed pinned
 * at the cap; the first keystroke that narrowed the list enough to fit under
 * the cap made the sheet shrink to content instead -- and because it is
 * anchored to the bottom, all of that shrinkage came off the TOP, dragging the
 * header and search input down mid-typing. Measured live before the fix at
 * 390x844: "d" (22 rows) kept the sheet clamped at 614px with the input at
 * y=161, then "de" (2 rows) collapsed it to 322px and moved the input to
 * y=453 -- a 292px jump on the second character.
 */
function testGenreSheetHeightDoesNotTrackFilteredContent() {
  const genrePickerSource = readFileSync(
    new URL("../app/components/profile/ProfileGenrePicker.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // The preconditions for the bug are still live: the genre list is long
  // enough to overflow the sheet unfiltered, yet a 2-character query can
  // collapse it to a handful of rows. If this ever stops being true the
  // stable-height class below stops being load-bearing -- but while it IS
  // true, removing it reintroduces the jump.
  assert.ok(PROFILE_GENRE_OPTIONS.length >= 40);
  const twoCharMatches = PROFILE_GENRE_OPTIONS.filter((genre) =>
    genre.toLowerCase().includes("de"),
  ).length;
  assert.ok(
    twoCharMatches <= 5,
    `expected a 2-character query to collapse the list, got ${twoCharMatches} matches`,
  );

  // The sheet must NOT be sized by content any more: no bare `max-h-*dvh`
  // (the exact shape that caused the jump), and it must carry the definite
  // height class instead.
  assert.doesNotMatch(genrePickerSource, /max-h-\[\d+dvh\]/);
  assert.match(genrePickerSource, /className="ftc-filter-sheet-panel flex w-full max-w-md flex-col/);

  // A definite height only helps if the list scrolls inside it rather than
  // overflowing -- `min-h-0` is what lets a flex child shrink below its
  // content and actually scroll, so it is part of the fix, not decoration.
  assert.match(genrePickerSource, /<ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain/);

  // Done stays pinned outside the scrolling list, so it stays reachable at
  // every result count.
  assert.match(
    genrePickerSource,
    /<\/ul>[\s\S]*?border-t border-ftc-border-subtle[\s\S]*?Done\s*<\/button>/,
  );

  // Background must not scroll behind the sheet -- reuses the shared lock
  // rather than a local overflow hack.
  assert.match(genrePickerSource, /import \{ useBodyScrollLock \} from "@\/lib\/ui\/useBodyScrollLock"/);
  assert.match(genrePickerSource, /useBodyScrollLock\(sheetOpen\)/);

  // The height itself: a `vh` base (so iOS Safari < 15.4, which has no `dvh`
  // and is inside the project's `ios_saf >= 14` browserslist range, still
  // gets a stable sheet) upgraded to `dvh` behind `@supports`.
  const panelRule = globalsSource.match(/\.ftc-filter-sheet-panel \{[^}]*\}/);
  assert.ok(panelRule, ".ftc-filter-sheet-panel rule not found in globals.css");
  assert.match(panelRule[0], /height: 88vh;/);

  // The `dvh` upgrade MUST stay inside `@supports`. Written as a second plain
  // `height` declaration instead, the CSS minifier collapses the duplicate
  // and deletes the `vh` fallback outright (confirmed in the built chunk),
  // which silently puts older iOS back into the content-height bug.
  assert.match(
    globalsSource,
    /@supports \(height: 1dvh\) \{[\s\S]*?\.ftc-filter-sheet-panel \{\s*height: 88dvh;\s*\}[\s\S]*?\}/,
  );
  const dvhOutsideSupports = globalsSource
    .replace(/@supports \(height: 1dvh\) \{[\s\S]*?\n\}/g, "")
    .includes("88dvh");
  assert.equal(
    dvhOutsideSupports,
    false,
    "88dvh must only appear inside @supports so the vh fallback survives minification",
  );
}

/**
 * The public profile's Event Brands went through two interactive
 * iterations -- a tap-to-reveal popover, then a tap-to-open bottom sheet --
 * both of which existed only to make a single-line-truncated chip readable.
 * Both are now gone: the chips themselves wrap to a second line, so a brand
 * is readable directly on the profile with no interaction at all. This
 * verifies the simplification actually holds, in both directions.
 *
 * Why the wrap treatment is what it is:
 *  - `line-clamp-2` caps a chip at two lines and adds an ellipsis ONLY when
 *    the text genuinely overflows those two lines (that is native
 *    `-webkit-line-clamp` behaviour), so short names stay one clean line and
 *    nothing shows a needless ellipsis.
 *  - `overflow-wrap: anywhere` -- NOT `break-word` -- is load-bearing.
 *    Only `anywhere` also shrinks the element's min-content width, which is
 *    what allows a single unbroken 40-character brand to wrap inside the
 *    12rem cap. With `break-word` the min-content width stays the width of
 *    the whole unbroken word, which is the exact mechanism that forced the
 *    chip (and the page) wider than the viewport in the original overflow
 *    bug this suite already guards against.
 */
function testPublicProfileEventBrandsAdaptiveChips() {
  const tagListSource = readFileSync(
    new URL("../app/components/profile/ProfileTagChipList.tsx", import.meta.url),
    "utf8",
  );
  const sectionsSource = readFileSync(
    new URL("../app/components/profile/PromoterProfileSections.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // The public profile's Event Brands render through the SAME shared
  // read-only chip list as Genre tags again -- one implementation, not a
  // parallel bespoke one.
  assert.match(sectionsSource, /<ProfileTagChipList tags=\{brands\} \/>/);
  assert.ok(!sectionsSource.includes("EventBrandsChips"));

  // The dedicated sheet component is gone from the tree entirely.
  assert.ok(
    !existsSync(new URL("../app/components/profile/EventBrandsChips.tsx", import.meta.url)),
    "EventBrandsChips.tsx should have been deleted with the bottom sheet",
  );

  // ...and so is the animation CSS that existed only for that sheet.
  assert.ok(!globalsSource.includes("ftc-event-brands-sheet-panel"));
  assert.ok(!globalsSource.includes("ftc-sheet-slide-up"));

  // No interaction of any kind left on the read-only chip: no sheet, no
  // popover, no tooltip, no client-side state. A profile is self-contained.
  assert.ok(!tagListSource.includes('"use client"'));
  assert.ok(!tagListSource.includes("useState"));
  assert.ok(!tagListSource.includes("<button"));
  assert.ok(!tagListSource.includes("onClick"));
  assert.ok(!tagListSource.includes('role="dialog"'));
  assert.ok(!tagListSource.includes('role="tooltip"'));
  assert.ok(!tagListSource.includes("title="));

  // Adaptive wrap treatment, defined once as a shared constant.
  assert.match(
    tagListSource,
    /export const PROFILE_TAG_CHIP_TEXT_CLASS = "line-clamp-2 \[overflow-wrap:anywhere\]"/,
  );
  assert.match(tagListSource, /<span className=\{PROFILE_TAG_CHIP_TEXT_CLASS\}>\{tag\}<\/span>/);

  // `truncate` (which sets `white-space: nowrap`) anywhere on this chip
  // would pin it back to a single line and defeat the wrap entirely.
  assert.ok(
    !tagListSource.includes("truncate"),
    "the read-only chip must not be single-line-truncated any more",
  );

  // The row still wraps with even spacing on both axes, and nothing pins a
  // height -- so the card grows naturally as chips wrap onto more rows.
  assert.match(tagListSource, /<div className="flex flex-wrap gap-2">/);
  assert.doesNotMatch(tagListSource, /\bh-\[|\bmax-h-|\bmin-h-/);

  // The EDITABLE surfaces are deliberately NOT changed by this: a row of
  // chips with remove buttons keeps a uniform single-line height while
  // editing. Guarding both directions here means a future "make them
  // consistent" refactor has to be a deliberate decision, not a silent one.
  const brandsFieldSource = readFileSync(
    new URL("../app/components/profile/ProfileEventBrandsField.tsx", import.meta.url),
    "utf8",
  );
  const genrePickerSource = readFileSync(
    new URL("../app/components/profile/ProfileGenrePicker.tsx", import.meta.url),
    "utf8",
  );
  assert.match(brandsFieldSource, /<span className="min-w-0 truncate">\{brand\}<\/span>/);
  assert.ok(!brandsFieldSource.includes("line-clamp-2"));
  assert.match(genrePickerSource, /min-w-0 truncate/);
  assert.ok(!genrePickerSource.includes("line-clamp-2"));
}

/**
 * Root-cause regression test for "only the original/first Event Brand
 * appears when reopening Edit Profile, even though all saved brands show
 * correctly on the public profile". The public profile page fetches via
 * getUserProfileById() (uncached), but the edit route hydrates from
 * getCurrentUserProfile(), which is cache-first (see currentUser.ts). If
 * saveUserProfile() never invalidates that cache after a successful write,
 * every later getCurrentUserProfile() call -- including the one the edit
 * page makes on reopen -- keeps serving the pre-save snapshot forever
 * (until sign-out), silently dropping any brands added/removed since.
 */
function testProfileCacheInvalidatedAfterSave() {
  const currentUserSource = readFileSync(
    new URL("../lib/user/currentUser.ts", import.meta.url),
    "utf8",
  );

  const saveUserProfileMatch = currentUserSource.match(
    /export async function saveUserProfile\([\s\S]*?\n}\n/,
  );
  assert.ok(saveUserProfileMatch, "saveUserProfile function not found in currentUser.ts");

  const saveUserProfileBody = saveUserProfileMatch[0];
  assert.match(
    saveUserProfileBody,
    /invalidateCurrentUserProfileCache\(\)/,
    "saveUserProfile must invalidate the cached profile after a successful write, or a later " +
      "getCurrentUserProfile() call (e.g. reopening Edit Profile) will keep serving the stale " +
      "pre-save snapshot indefinitely",
  );
}

/**
 * Full saved brand list must hydrate into the edit form's baseline state --
 * in original order, with no silent truncation to a subset (e.g. just the
 * first brand). This is the exact state EditProfileForm's brandTags/baseline
 * are initialized from.
 */
function testEventBrandEditFormHydration() {
  const tenBrands = [
    "Synergy",
    "Warehouse Sessions",
    "Pulse",
    "Nightfall",
    "Aurora",
    "Cascade",
    "Momentum",
    "Echo Chamber",
    "Afterglow",
    "Terminal",
  ];

  const baseline = createProfileEditBaseline({
    promoter_brand_name: serializeEventBrands(tenBrands),
  } as never);

  assert.deepEqual(baseline.brandTags, tenBrands);
  assert.equal(baseline.brandTags.length, MAX_PROMOTER_EVENT_BRANDS);

  // Legacy users: only the old single un-delimited value exists -- must
  // still hydrate as a one-item list, not be dropped or crash.
  const legacyBaseline = createProfileEditBaseline({
    promoter_brand_name: "Synergy",
  } as never);
  assert.deepEqual(legacyBaseline.brandTags, ["Synergy"]);

  // No stored value at all.
  const emptyBaseline = createProfileEditBaseline({ promoter_brand_name: null } as never);
  assert.deepEqual(emptyBaseline.brandTags, []);

  // Malformed/oversized legacy value (predates the 40-char cap) must still
  // hydrate safely -- no crash, no silent data loss.
  const oversizedLegacy = "Z".repeat(MAX_EVENT_BRAND_NAME_LENGTH + 100);
  const oversizedBaseline = createProfileEditBaseline({
    promoter_brand_name: oversizedLegacy,
  } as never);
  assert.deepEqual(oversizedBaseline.brandTags, [oversizedLegacy]);
}

/**
 * Saving must never overwrite the stored array with an incomplete editor
 * state: re-saving an unchanged brand list must round-trip losslessly, and
 * removing one chip must affect only that one brand.
 */
function testEventBrandSafeSave() {
  const tenBrands = Array.from({ length: MAX_PROMOTER_EVENT_BRANDS }, (_, i) => `Brand ${i}`);
  const stored = serializeEventBrands(tenBrands);
  const baseline = createProfileEditBaseline({ promoter_brand_name: stored } as never);

  // Save without changing anything: the serialized payload must be
  // byte-identical to what was already stored -- no brands dropped, added,
  // reordered, or deduped away.
  assert.equal(serializeEventBrands(baseline.brandTags), stored);
  assert.equal(
    hasUnsavedProfileEdits(baseline, {
      ...baseline,
      brandTags: [...baseline.brandTags],
    }),
    false,
  );

  // Removing one brand must remove only that one -- the rest survive in
  // original order.
  const afterRemoval = baseline.brandTags.filter((brand) => brand !== "Brand 3");
  assert.deepEqual(
    afterRemoval,
    tenBrands.filter((brand) => brand !== "Brand 3"),
  );
  assert.equal(afterRemoval.length, tenBrands.length - 1);
  assert.equal(
    hasUnsavedProfileEdits(baseline, { ...baseline, brandTags: afterRemoval }),
    true,
  );

  // The removal must not have touched any other brand.
  for (const brand of tenBrands) {
    if (brand === "Brand 3") {
      assert.ok(!afterRemoval.includes(brand));
    } else {
      assert.ok(afterRemoval.includes(brand));
    }
  }
}

function testMapEventInputToRowEventBrandFallback() {
  const baseInput: EventInput = {
    name: "Test Event",
    venue: "Test Venue",
    eventDate: "2026-08-01",
    setTime: "22:00-late",
    rate: "",
    notes: "",
  };

  resetEventBrandColumnMissingFlag();

  try {
    // No brand selected: event_brand key must be entirely absent (not sent as
    // null) — this is what keeps event creation working for the overwhelming
    // majority of users during the window before the column migration has run.
    assert.ok(!("event_brand" in mapEventInputToRow(baseInput)));
    assert.ok(!("event_brand" in mapEventInputToRow({ ...baseInput, eventBrand: null })));
    assert.ok(!("event_brand" in mapEventInputToRow({ ...baseInput, eventBrand: "" })));

    // Brand selected, column known to exist: key is present.
    const withBrand = mapEventInputToRow({ ...baseInput, eventBrand: "Synergy" });
    assert.equal(withBrand.event_brand, "Synergy");

    // Brand selected, but the column is now known to be missing (set by a prior
    // 42703 on this exact column) — the key must be dropped even though a brand
    // was selected. This is what breaks withEventFieldsFallback's retry loop:
    // without it, a retry would resubmit the same failing payload forever.
    markEventBrandColumnMissing();
    const withBrandColumnMissing = mapEventInputToRow({ ...baseInput, eventBrand: "Synergy" });
    assert.ok(!("event_brand" in withBrandColumnMissing));
  } finally {
    resetEventBrandColumnMissingFlag();
  }
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

function testBookingCardGroupChatIsANavigationRow() {
  const bookingCardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );

  const groupChatBlock = bookingCardSource.slice(
    bookingCardSource.indexOf("groupChatAccess.kind !== \"hidden\""),
    bookingCardSource.indexOf("{bookingLoading ?"),
  );

  assert.ok(groupChatBlock.length > 0, "expected to find the group chat section");

  // Group chat is navigation, not a third CTA: View event stays the primary
  // action and Cancel stays destructive, so this must reuse the shared
  // tappable nav row (icon + title + chevron) rather than a primary button.
  assert.match(
    bookingCardSource,
    /import \{ EventDetailSecondaryAction \} from "@\/app\/components\/event-detail\/EventDetailBottomBar"/,
  );
  assert.match(
    groupChatBlock,
    /<EventDetailSecondaryAction href=\{groupChatAccess\.href\}>\s*Open group chat/,
  );
  assert.doesNotMatch(
    groupChatBlock,
    /ftc-btn-primary/,
    "group chat must not compete with View event as a primary button",
  );

  // The bordered box that wrapped this section is gone -- the booking card is
  // already a card, so boxing a section inside it was pure nesting.
  assert.doesNotMatch(
    groupChatBlock,
    /rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3/,
    "the nested bordered container must stay removed",
  );

  // Label matches the card's own muted section-label convention (used by the
  // two "Booking request" labels in this same file), not the cyan planner one.
  assert.match(
    groupChatBlock,
    /text-\[10px\] font-semibold uppercase tracking-wide text-ftc-text-muted">\s*Group chat/,
  );
  assert.doesNotMatch(groupChatBlock, /ftc-planner-section-label/);

  // Behaviour preserved: same access states, same locked copy, same href.
  assert.match(groupChatBlock, /groupChatAccess\.kind === "open"/);
  assert.match(groupChatBlock, /Group chat unlocks after you accept\./);
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
  // Renamed from loadGigsEventArtwork when it also began reading event status
  // for cancelled-gig detection; it still owns the artwork fetch.
  assert.match(prefetchSource, /loadGigsEventLookup/);
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

/**
 * The nav Gigs count must follow Incoming down as well as up.
 *
 * The anti-flicker latch used to short-circuit on any latched value above zero,
 * so a genuine decrease to a non-zero count was ignored: three incoming, accept
 * one, and the badge kept reading 3 until the count hit 0. A known local count
 * is the freshest value there is (only applyPersistedGigsPendingCount writes
 * it, and every refresh — including the one fired on accept/decline/cancel —
 * goes through it), so it now wins outright. The latch still covers the case it
 * was written for, asserted by
 * testWorkspaceGigsSubNavCountSurvivesStaleRuntimeZero above: an unknown count
 * with a stale runtime zero must not blink the badge off.
 */
function testWorkspaceGigsCountFollowsIncomingDownwards() {
  // Three incoming, then one is accepted. The previous render held 3 and the
  // latch still reads 3, but the count is known to be 2 -- the badge must
  // follow it down rather than pin to the high-water mark.
  assert.equal(
    resolveStableGigsPendingCount({
      localCount: 2,
      latchedCount: 3,
      rawCount: 3,
      previousCount: 3,
    }),
    2,
    "accepting one of three incoming requests must drop the badge to 2",
  );

  // Still clears completely, and still rises.
  assert.equal(
    resolveStableGigsPendingCount({
      localCount: 0,
      latchedCount: 3,
      rawCount: 3,
      previousCount: 3,
    }),
    0,
  );
  assert.equal(
    resolveStableGigsPendingCount({
      localCount: 120,
      latchedCount: 0,
      rawCount: 0,
      previousCount: 0,
    }),
    120,
  );
  assert.equal(formatGigsTabCountDisplay(120), "99+");

  // Unknown count mid-navigation: hold the last value rather than blink off.
  assert.equal(
    resolveStableGigsPendingCount({
      localCount: null,
      latchedCount: 0,
      rawCount: 0,
      previousCount: 4,
    }),
    4,
    "a transient zero with no known count must not clear the badge",
  );
  assert.equal(
    resolveStableGigsPendingCount({
      localCount: null,
      latchedCount: 7,
      rawCount: 0,
      previousCount: 0,
    }),
    7,
  );

  // End-to-end through the real cache: the persisted count is what shows.
  clearNavigationBadgeCache();
  clearWorkspaceGigsDisplaySession();
  clearWorkspaceGigsSubNavDisplayLatch();
  applyPersistedGigsPendingCount("user-a", "dj", 3);
  assert.equal(readWorkspaceGigsBadgeDisplayCountForSubNav("user-a", "dj"), 3);
  applyPersistedGigsPendingCount("user-a", "dj", 2);
  assert.equal(readWorkspaceGigsBadgeDisplayCountForSubNav("user-a", "dj"), 2);
  applyPersistedGigsPendingCount("user-a", "dj", 0);
  assert.equal(readWorkspaceGigsBadgeDisplayCountForSubNav("user-a", "dj"), 0);
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

async function testDmChatReopenScroll() {
  const { runDmChatReopenScrollTest } = await import("./test-dm-chat-reopen-scroll.js");
  await runDmChatReopenScrollTest();
}

async function testDmChatGrowthScrollRace() {
  const { runDmChatGrowthScrollRaceTest } = await import("./test-dm-chat-growth-scroll-race.js");
  await runDmChatGrowthScrollRaceTest();
}

async function testDmImageAttachmentDimensions() {
  const { runDmImageAttachmentDimensionsTest } = await import(
    "./test-dm-image-attachment-dimensions.js"
  );
  await runDmImageAttachmentDimensionsTest();
}

async function testDmMessageOrderDeterminism() {
  const { runDmMessageOrderDeterminismTest } = await import(
    "./test-dm-message-order-determinism.js"
  );
  await runDmMessageOrderDeterminismTest();
}

async function testDmBookingReturnScroll() {
  const {
    testBookingReturnScrollPlumbing,
    testHasSavedDmChatScrollPositionIsNonDestructive,
    runDmBookingReturnScrollRuntimeTest,
  } = await import("./test-dm-booking-return-scroll.js");
  testBookingReturnScrollPlumbing();
  testHasSavedDmChatScrollPositionIsNonDestructive();
  await runDmBookingReturnScrollRuntimeTest();
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
  assert.match(bookingsSource, /getEventFormFieldErrors/);

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
  {
    const bookingRequestCardSource = readFileSync(
      new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
      "utf8",
    );
    // The card-expand panel's `overflow-x-hidden` (what stops the panel's
    // grid track being forced wide by long unbroken content while it's
    // animating open) now lives in the shared `AnimatedExpandPanel`, reused
    // by the Run Sheet's per-row accordion -- so this checks that it's wired
    // in here, not that the string is typed out again in this file.
    assert.match(bookingRequestCardSource, /AnimatedExpandPanel/);
    assert.doesNotMatch(bookingRequestCardSource, /overflow-x-hidden/);
    assert.match(
      readFileSync(
        new URL("../app/components/AnimatedExpandPanel.tsx", import.meta.url),
        "utf8",
      ),
      /overflow-x-hidden/,
    );
  }
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
    /const \[loadedEvent, bookings, unlock, sentBookings\] = await Promise\.all\(\[\s*getEventById\(eventId\),\s*listBookingRequestsForEvent\(eventId\),\s*getCrewChatUnlockStateForEvent\(eventId\),\s*listSentBookingRequests\(\),/,
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
  const plannerTokensSource = readFileSync(
    new URL("../lib/design/plannerWorkspaceTokens.ts", import.meta.url),
    "utf8",
  );

  assert.match(uiSource, /EVENT_DETAIL_PAGE_CONTENT_CLASS/);
  assert.match(uiSource, /MOBILE_NAV_OFFSET_CLASS/);
  // The literal `ftc-mobile-nav-offset` class now lives only in its single
  // source of truth (plannerWorkspaceTokens.ts) -- eventDetailUi.ts just
  // imports and reuses the MOBILE_NAV_OFFSET_CLASS constant (already
  // verified above) rather than duplicating the class name itself.
  assert.match(plannerTokensSource, /ftc-mobile-nav-offset/);
  assert.match(uiSource, /getEventDetailPageContentBottomClass/);
  assert.match(pageSource, /EVENT_DETAIL_PAGE_SHELL_CLASS/);
  assert.match(pageSource, /EVENT_DETAIL_PAGE_CONTENT_CLASS/);
  assert.match(pageSource, /getEventDetailPageContentBottomClass\(showBottomBar\)/);
  // The main content div (using EVENT_DETAIL_PAGE_CONTENT_CLASS) must rely on
  // getEventDetailPageContentBottomClass for its bottom offset, not also
  // hardcode a raw MOBILE_NAV_OFFSET_CLASS in the same template literal
  // (which would double up the offset). Scoped to that one template (no
  // backtick in between) so it doesn't false-flag the separate, simpler
  // "event not found" branch, which legitimately uses plain
  // MOBILE_NAV_OFFSET_CLASS since it has no bottom-bar offset to account for.
  assert.doesNotMatch(
    pageSource,
    /`\$\{EVENT_DETAIL_PAGE_CONTENT_CLASS\}[^`]*MOBILE_NAV_OFFSET_CLASS/,
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
  assert.equal(computeManualMessageListScrollTop(880, 200, 150, 900), 900);
  assert.equal(applyManualMessageListScrollDelta(880, 200, 150, 900), 900);
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

async function testMessageHistoryGestureTarget() {
  const { runMessageHistoryGestureTargetTest } = await import(
    "./test-message-history-gesture-target.js"
  );
  await runMessageHistoryGestureTargetTest();
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
  // The loading-shell skeleton's planner stat pills are wired to the same
  // role-resolved `isPlanner` used for the tab label — never hardcoded true.
  assert.match(
    appLoadingSource,
    /export function EventsPageLoadingShell[\s\S]*const isPlanner = canManageEvents\(resolvedRole\)[\s\S]*showPlannerStats=\{isPlanner\}/,
  );
  assert.match(controlsSource, /FTC_EVENTS_LIST_TAB_PILL_ROW_CLASS/);
  assert.match(controlsSource, /eventsListTabPillClass/);
  assert.match(controlsSource, /resolveEventsListActiveTabLabelForWorkspaceChrome\(isPlanner/);
  assert.match(controlsSource, /loadingShell/);

  // Regression guard: the loading shell must never force the planner label for a DJ.
  // A DJ's own resolved role (isPlannerFromParent=false, no guardRole override) must
  // show the DJ label whether or not the events list has finished loading — the label
  // is driven purely by role, not by loading state.
  const navigationSource = readFileSync(
    new URL("../lib/events/eventsListNavigation.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(navigationSource, /options\?\.loadingShell/);
  assert.doesNotMatch(controlsSource, /resolveEventsListActiveTabLabelForWorkspaceChrome\([^)]*loadingShell/);
  assert.equal(
    resolveEventsListActiveTabLabelForWorkspaceChrome(false, {}),
    EVENTS_LIST_ACTIVE_TAB_LABEL_DJ,
  );
  assert.equal(
    resolveEventsListActiveTabLabelForWorkspaceChrome(false, { guardRole: "dj" }),
    EVENTS_LIST_ACTIVE_TAB_LABEL_DJ,
  );
  assert.equal(
    resolveEventsListActiveTabLabelForWorkspaceChrome(true, {}),
    EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER,
  );
  assert.equal(
    resolveEventsListActiveTabLabelForWorkspaceChrome(false, {
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
  // `relative` positioning (needed for the feedback slot's absolute overlay)
  // now lives inside the shared PLANNER_WORKSPACE_TITLE_ROW_CLASS constant
  // itself, rather than being appended in this component's own template
  // literal -- check the constant's own definition instead.
  assert.match(layoutSource, /PLANNER_WORKSPACE_TITLE_ROW_CLASS/);
  assert.match(plannerTokensSource, /PLANNER_WORKSPACE_TITLE_ROW_CLASS =\s*\n?\s*"relative/);
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

async function testOnboardingAccessCheckNeverHangsForever() {
  // Root-cause regression test for "app never leaves the splash screen on a
  // brand-new device": nothing in the Supabase client's fetch calls has a
  // timeout, so a stalled network request (most likely on a device's very
  // first, cold-DNS/cold-TLS connection to the Supabase domain) never
  // rejects on its own -- it just never resolves, and OnboardingGuard's
  // checkAccess() try/catch only handles rejections. withOnboardingAccessCheckTimeout
  // is the safety net: it guarantees the awaited promise settles (by
  // rejecting) even when the underlying work never does, so the existing
  // catch block (redirect to login) can actually run.
  const neverResolves = new Promise<void>(() => {});
  await assert.rejects(
    () => withOnboardingAccessCheckTimeout(neverResolves, 20),
    /took too long/,
  );

  // A normal, successfully-resolving check is completely unaffected.
  assert.equal(await withOnboardingAccessCheckTimeout(Promise.resolve("ok"), 20), "ok");

  // A normal, promptly-rejecting check still rejects with its own error,
  // not a timeout error -- the race doesn't mask real failures.
  await assert.rejects(
    () => withOnboardingAccessCheckTimeout(Promise.reject(new Error("boom")), 20),
    /boom/,
  );

  assert.equal(ONBOARDING_ACCESS_CHECK_TIMEOUT_MS, 15_000);

  const onboardingGuardSource = readFileSync(
    new URL("../app/components/OnboardingGuard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    onboardingGuardSource,
    /await withOnboardingAccessCheckTimeout\(\s*\(async \(\) => \{/,
  );
}

/**
 * Root-cause regression test for the *actual* splash-hang bug: the 15s
 * OnboardingGuard timeout above never ran, because React never hydrated in
 * the first place. Next.js falls back to its own MODERN_BROWSERSLIST_TARGET
 * (`safari 16.4` minimum — see node_modules/next/dist/shared/lib/modern-browserslist-target.js)
 * whenever a project has no `browserslist` config, and ships its own
 * `ErrorBoundaryHandler` (node_modules/next/dist/client/components/error-boundary.js)
 * using an ES2022 class static initialization block (`static { this.contextType = ... }`)
 * — syntax Safari didn't support until 16.4. On a classic (non-module)
 * `<script>`, on the exact chunk that bootstraps React hydration, a
 * SyntaxError fails the whole script silently: no hydration, no effects, no
 * OnboardingGuard, no timeout — the server-rendered splash HTML for `/` (it's
 * a static-prerendered route) just sits there forever on iOS 16.1.2 and any
 * other pre-16.4 engine.
 */
function testBrowserslistSupportsPreSafari164Devices() {
  const packageJsonSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const packageJson = JSON.parse(packageJsonSource) as { browserslist?: unknown };

  assert.ok(
    Array.isArray(packageJson.browserslist) && packageJson.browserslist.length > 0,
    "package.json must declare a browserslist so Next.js/SWC doesn't fall back to its " +
      "MODERN_BROWSERSLIST_TARGET default (safari 16.4+), which excludes iOS 16.1-16.3",
  );

  const browserslist = packageJson.browserslist as unknown[];
  const safariEntries = browserslist.filter(
    (entry): entry is string =>
      typeof entry === "string" && /^(ios_saf|safari)\b/.test(entry),
  );

  assert.ok(
    safariEntries.length > 0,
    "browserslist must explicitly constrain the Safari/iOS floor -- otherwise it's " +
      "unclear whether pre-16.4 Safari is actually covered",
  );

  for (const entry of safariEntries) {
    const versionMatch = entry.match(/(\d+(?:\.\d+)?)/);
    assert.ok(versionMatch, `could not parse a version out of browserslist entry "${entry}"`);
    const floorVersion = Number.parseFloat(versionMatch[1]);
    assert.ok(
      floorVersion < 16.4,
      `browserslist entry "${entry}" has a floor of ${floorVersion}, which is >= 16.4 and ` +
        "would silently re-exclude iOS 16.1-16.3 (the exact version that hit this bug)",
    );
  }

  // If a production build is already present (this project's own workflow always
  // runs `rm -rf .next && npm run build` immediately before `npm run test:regressions`),
  // also prove the compiled output itself no longer contains the untranspiled
  // syntax -- confirming the browserslist config actually changes SWC's output,
  // not just that the config field exists.
  const chunksDir = new URL("../.next/static/chunks/", import.meta.url);

  if (existsSync(chunksDir)) {
    const chunkFiles = readdirSync(chunksDir).filter((name) => name.endsWith(".js"));
    assert.ok(chunkFiles.length > 0, "expected at least one compiled chunk in .next/static/chunks");

    const chunkWithStaticBlock = chunkFiles.find((name) => {
      const source = readFileSync(new URL(name, chunksDir), "utf8");
      return /static\s*\{/.test(source);
    });

    assert.equal(
      chunkWithStaticBlock,
      undefined,
      `found an untranspiled ES2022 class static initialization block in ${chunkWithStaticBlock} -- ` +
        "Safari < 16.4 (including iOS 16.1.2) cannot parse this and will fail to hydrate silently",
    );
  }
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
  assert.match(composerSource, /onStagePhotos/);
  // "Clear all" removed — individual photos are removed via the × button only.
  assert.doesNotMatch(composerSource, /onClearPendingPhoto/);
  assert.doesNotMatch(composerSource, /Clear all/);
  assert.match(composerSource, /onRemovePendingPhoto/);
  assert.match(composerSource, /pendingPhotos/);
  // Every pending-photo thumbnail is the same fixed size (no per-item
  // variation) — 3.75rem (60px), ~16.7% shorter than the previous 4.5rem
  // (72px) pass, tucking the strip closer to iMessage/WhatsApp proportions.
  assert.match(composerSource, /h-\[3\.75rem\] w-\[3\.75rem\]/);
  assert.doesNotMatch(composerSource, /h-\[4\.5rem\] w-\[4\.5rem\]/);
  // Remove (×) button: ~10% smaller (1.125rem/18px, was 1.25rem/20px) and
  // tucked tighter into the corner (right-0.5/top-0.5, was right-1/top-1) to
  // match the smaller thumbnail; fill/glyph contrast and interaction unchanged.
  assert.match(
    composerSource,
    /absolute right-0\.5 top-0\.5 flex h-\[1\.125rem\] w-\[1\.125rem\] items-center justify-center rounded-full bg-ftc-bg text-xs leading-none text-ftc-text shadow transition disabled:cursor-not-allowed disabled:opacity-40/,
  );
  assert.doesNotMatch(composerSource, /bg-ftc-bg\/90/);
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
  assert.match(composerSource, /className="ftc-chat-composer shrink-0/);

  // Multi-select photo picker: native `multiple` input, capped at
  // DM_MAX_PHOTOS_PER_MESSAGE, single selection still works (N === 1).
  assert.match(composerSource, /type="file"[\s\S]*multiple/);
  assert.match(composerSource, /DM_MAX_PHOTOS_PER_MESSAGE/);
  assert.match(composerSource, /validateDmAttachmentFile/);

  assert.match(pageSource, /composerInputRef/);
  assert.match(pageSource, /restoreComposerInputFocus/);
  assert.match(pageSource, /restoreComposerInputFocusElement/);
  assert.match(pageSource, /shouldKeepComposerFocusedAfterSend/);
  assert.match(pageSource, /captureComposerFocusIntentForSend/);
  assert.match(pageSource, /keepComposerFocusedAfterSendRef/);
  assert.match(pageSource, /onInputBlurWhileBusy=\{handleComposerInputBlurWhileBusy\}/);

  assert.match(globalsSource, /\.dm-composer-pending-photo-selected/);
  // Selected-thumbnail ring: thinner (1px, not 2px) and the softer subtle
  // primary-border token (not the solid, full-opacity primary colour) —
  // reuses the same token already used elsewhere for low-emphasis borders.
  assert.match(
    globalsSource,
    /\.dm-composer-pending-photo-selected \{\s*box-shadow: 0 0 0 1px var\(--ftc-color-primary-border\);\s*\}/,
  );
  assert.match(
    globalsSource,
    /html\[data-mobile-keyboard-open\] \.ftc-chat-composer \.ftc-input:focus/,
  );
  assert.match(bubbleSource, /const attachmentOnly = hasAttachments && !hasText;/);
  assert.match(bubbleSource, /const bubbleShellClass = resolveChatMessageBubbleShellClass\(/);
  assert.doesNotMatch(attachmentSource, /dm-composer-pending-photo-selected/);
  assert.doesNotMatch(attachmentSource, /ring-ftc-primary/);

  assert.match(pageSource, /mergePendingComposerAttachments/);
  assert.match(pageSource, /removePendingComposerAttachmentAt/);
  assert.match(pageSource, /clearPendingAttachments/);
  assert.match(pageSource, /onStagePhotos=\{stagePendingPhotos\}/);
  assert.match(pageSource, /onRemovePendingPhoto=\{removePendingPhotoAt\}/);
  assert.match(
    pageSource,
    /setInput\(""\);\s*\/\/[\s\S]{0,220}\s*clearPendingAttachments\(\);\s*if \(otherUserId\)/,
  );
  assert.doesNotMatch(
    pageSource,
    /onPhotoSelected=\{\(file\) => void sendAttachment\(file\)\}/,
  );

  // Selection must not clear until send succeeds: the pending state is only
  // reset inside the success path of sendAttachments, never eagerly.
  assert.doesNotMatch(pageSource, /setUploading\(true\);[\s\S]{0,40}clearPendingAttachments/);

  assert.match(helperSource, /createPendingComposerAttachment/);
  assert.match(helperSource, /revokePendingComposerAttachment/);
  assert.match(helperSource, /mergePendingComposerAttachments/);
  assert.match(helperSource, /removePendingComposerAttachmentAt/);
}

function testDmComposerRowAlignment() {
  const composerSource = readFileSync(
    new URL("../app/components/dm/DmComposer.tsx", import.meta.url),
    "utf8",
  );
  const fieldSource = readFileSync(
    new URL("../app/components/chat/ComposerMessageField.tsx", import.meta.url),
    "utf8",
  );
  const iconButtonSource = readFileSync(
    new URL("../app/components/chat/ComposerIconButton.tsx", import.meta.url),
    "utf8",
  );

  // The composer band (divider + row together) sits a few px lower than
  // before -- the gap between the message list and the divider no longer
  // reads as disproportionately tight. Within the requested ~4-8px range
  // (mt-1.5 = 6px), applied to the whole bordered container so the divider
  // (its own border-t) moves down together with the row inside it.
  assert.match(composerSource, /className="ftc-chat-composer shrink-0 mt-1\.5 border-t/);

  // Button sizes and tap targets are unchanged -- only their alignment moved.
  assert.match(iconButtonSource, /h-10 w-10 shrink-0/); // photo button, unchanged
  assert.match(
    composerSource,
    /"flex h-9 w-9 shrink-0 mb-1 items-center justify-center rounded-full bg-ftc-primary text-ftc-bg transition hover:bg-ftc-primary-dim disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10 sm:mb-0\.5"/,
  );

  // Photo button and send button each carry a small margin-bottom nudge so
  // their centres line up with the text field's single-line height (min-h-11
  // = 44px), while the row still bottom-anchors (items-end) as the textarea
  // grows for multi-line messages -- not a blanket items-center switch, which
  // would leave the buttons floating mid-height once the field grows tall.
  assert.match(composerSource, /className="mb-0\.5"/); // photo button nudge
  assert.match(composerSource, /items-end gap-2/);
  assert.doesNotMatch(composerSource, /items-center gap-2/);

  // Text field height is untouched.
  assert.match(fieldSource, /min-h-11/);

  // A <textarea> defaults to display: inline-block, which reserves a few
  // extra px of inline-baseline "descender" space below it inside its block
  // wrapper -- the wrapper (the actual flex/items-end sibling) ends up
  // taller than the textarea itself, throwing off the centring math even
  // with correct margin nudges on the buttons. `block` removes that
  // reserved gap so the wrapper's box exactly matches the textarea's own
  // 44px, shared by both DmComposer and GroupChatComposer (same component).
  assert.match(fieldSource, /className="ftc-input block w-full min-h-11/);

  // The centring math itself: with items-end (bottom-anchored) and a
  // margin-bottom nudge of half the height difference against the 44px
  // single-line text field, every element's vertical centre lands on the
  // same line, at every breakpoint.
  const fieldHeightPx = 44; // min-h-11
  function assertCentred(buttonHeightPx: number, nudgePx: number) {
    const gapAboveWhenFlush = fieldHeightPx - buttonHeightPx;
    assert.equal(nudgePx * 2, gapAboveWhenFlush);
  }

  assertCentred(40, 2); // photo button, mb-0.5 = 2px, every breakpoint
  assertCentred(36, 4); // send button mobile, mb-1 = 4px
  assertCentred(40, 2); // send button sm+, sm:mb-0.5 = 2px
}

function testDmMultiPhotoSend() {
  const attachmentsSource = readFileSync(
    new URL("../lib/dmAttachments.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const groupSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachmentGroup.tsx", import.meta.url),
    "utf8",
  );
  const bubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );

  // sendDmMessageWithAttachments reuses the existing messages +
  // message_attachments architecture: one message row, N attachment rows —
  // no schema change is needed since message_attachments.message_id already
  // had no uniqueness constraint.
  assert.match(attachmentsSource, /export async function sendDmMessageWithAttachments/);
  assert.match(attachmentsSource, /export const DM_MAX_PHOTOS_PER_MESSAGE = 10/);
  assert.match(
    attachmentsSource,
    /files\.length > DM_MAX_PHOTOS_PER_MESSAGE/,
  );
  // Uploads are attempted for every file before any DB write, and a batched
  // (atomic) insert is used for the attachment rows so a partial failure
  // never leaves some — but not all — attachment rows behind.
  assert.match(attachmentsSource, /Promise\.allSettled/);
  assert.match(attachmentsSource, /uploaded\.map\(\(item\) => \(\{/);
  assert.match(attachmentsSource, /cleanupOrphanedDmAttachmentFiles/);
  // The singular single-photo API still exists and simply delegates, so the
  // original single-photo call sites/behaviour are unchanged.
  assert.match(attachmentsSource, /export async function sendDmMessageWithAttachment\(/);
  assert.match(attachmentsSource, /files: \[input\.file\]/);

  assert.match(pageSource, /sendDmMessageWithAttachments/);
  assert.match(pageSource, /async function sendAttachments\(files: File\[\]\)/);
  assert.doesNotMatch(pageSource, /async function sendAttachment\(file: File\)/);

  // Message rendering: single attachment keeps the original component
  // untouched; 2+ render through the grid group component instead of a
  // vertical stack.
  assert.match(bubbleSource, /DmMessageAttachmentGroup/);
  assert.doesNotMatch(bubbleSource, /attachments\.map\(\(attachment\) => \(/);
  assert.match(groupSource, /attachments\.length <= 1/);
  assert.match(groupSource, /aria-label="Open image"/);
  // The grid uses a fixed (not max-) width — an explicit width, unlike
  // max-width, gives the sender-alignment flex chain a real footprint to
  // right/left-align against instead of collapsing to the full row width.
  assert.match(groupSource, /DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS/);
  const attachmentViewSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachment.tsx", import.meta.url),
    "utf8",
  );
  assert.match(attachmentViewSource, /DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS/);
  assert.match(attachmentViewSource, /DM_IMAGE_BUBBLE_MAX_HEIGHT_CLASS/);
}

function testDmImageGridLayout() {
  // Visible-tile capping + hidden count for the "+N" overlay.
  assert.deepEqual(resolveVisibleGridImages([1, 2]), { visible: [1, 2], hiddenCount: 0 });
  assert.deepEqual(resolveVisibleGridImages([1, 2, 3, 4]), {
    visible: [1, 2, 3, 4],
    hiddenCount: 0,
  });
  assert.deepEqual(resolveVisibleGridImages([1, 2, 3, 4, 5]), {
    visible: [1, 2, 3, 4],
    hiddenCount: 1,
  });
  assert.deepEqual(resolveVisibleGridImages([1, 2, 3, 4, 5, 6, 7]), {
    visible: [1, 2, 3, 4],
    hiddenCount: 3,
  });
  assert.equal(DM_MAX_VISIBLE_GRID_IMAGES, 4);
}

/**
 * Regression coverage for the portrait-photo-cropped-in-DM bug: the
 * multi-image grid used to force every tile into a fixed `aspect-square` (or
 * `aspect-[2/1]` for the first tile of a 3-image message) box with
 * `object-fit: cover`, which crops any photo whose real shape doesn't match
 * that box — most visibly a portrait camera photo squeezed into a square or
 * wide tile. Confirmed live against real uploaded 400x600 portrait images:
 * they rendered as 142x142 cropped squares before this fix.
 */
function testDmImageGridNoCropping() {
  const groupSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachmentGroup.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = readFileSync(
    new URL("../lib/dm/dmImageLayout.ts", import.meta.url),
    "utf8",
  );

  // No forced-crop box class and no object-fit: cover anywhere in the grid.
  assert.doesNotMatch(groupSource, /aspect-square/);
  assert.doesNotMatch(groupSource, /aspect-\[2\/1\]/);
  assert.doesNotMatch(groupSource, /object-cover/);
  assert.doesNotMatch(layoutSource, /resolveImageGridCellClass/);

  // Each tile is capped by max-width/max-height only (never a fixed
  // width+height pair, which is what makes the browser preserve the image's
  // own intrinsic ratio instead of stretching or cropping it), and reuses
  // the same known-aspect-ratio cache the single-image bubble already uses
  // to avoid layout jump on a second render.
  assert.match(groupSource, /DM_IMAGE_GRID_CELL_MAX_HEIGHT_CLASS/);
  assert.match(groupSource, /DM_IMAGE_GRID_CELL_MAX_WIDTH_CLASS/);
  assert.match(groupSource, /getKnownDmImageAspectRatio\(attachment\.id\)/);
  assert.match(groupSource, /recordDmImageAspectRatio\(attachment\.id, image\.naturalWidth, image\.naturalHeight\)/);
  assert.match(layoutSource, /max-w-36/);
  assert.match(layoutSource, /max-h-40/);
  // A percentage max-width (e.g. calc(50%-...)) on a flex-wrap child fights
  // the flex shrink pass and under-sizes every tile well below its actual
  // cap — confirmed live (rendered 51x77 against a 142x160 cap). The cap
  // must be a fixed pixel value, and the tile itself must opt out of
  // flex-shrink so the fixed cap is never squeezed smaller than intended.
  assert.doesNotMatch(layoutSource, /max-w-\[calc/);
  assert.match(groupSource, /shrink-0/);

  // Tiles wrap in a flex layout (not a row-locking CSS grid, which would
  // force mismatched-ratio neighbours to share a row height) and are never
  // stretched to fill their box (no h-full/w-full on the image itself).
  assert.match(groupSource, /flex flex-wrap items-start/);
  assert.doesNotMatch(groupSource, /h-full w-full/);

  // The known-aspect-ratio behavioural math itself: given real intrinsic
  // dimensions and the shared max caps, the browser's own replaced-element
  // sizing algorithm (max-width/max-height with auto width/height, no
  // object-fit) always preserves the source ratio exactly, never crops,
  // never stretches. Model that algorithm here for portrait, landscape,
  // square, and extreme cases, mirroring what max-h-40 / max-w-36 resolve to.
  const cellMaxWidthPx = 144; // max-w-36 = 9rem
  const cellMaxHeightPx = 160; // max-h-40

  function fitWithinBox(naturalWidth: number, naturalHeight: number) {
    const widthScale = cellMaxWidthPx / naturalWidth;
    const heightScale = cellMaxHeightPx / naturalHeight;
    const scale = Math.min(widthScale, heightScale, 1);
    return { width: naturalWidth * scale, height: naturalHeight * scale };
  }

  function assertRatioPreserved(naturalWidth: number, naturalHeight: number) {
    const { width, height } = fitWithinBox(naturalWidth, naturalHeight);
    const naturalRatio = naturalWidth / naturalHeight;
    const renderedRatio = width / height;
    assert.ok(
      Math.abs(naturalRatio - renderedRatio) < 0.001,
      `expected ${naturalWidth}x${naturalHeight} to keep its ratio, got ${width}x${height}`,
    );
    assert.ok(width <= cellMaxWidthPx + 0.01 && height <= cellMaxHeightPx + 0.01);
  }

  assertRatioPreserved(400, 600); // portrait camera photo
  assertRatioPreserved(600, 400); // landscape camera photo
  assertRatioPreserved(500, 500); // square
  assertRatioPreserved(200, 2000); // unusually tall
  assertRatioPreserved(2000, 200); // unusually wide
}

function testDmImageGroupFullViewerAndOwnershipAlignment() {
  const groupSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachmentGroup.tsx", import.meta.url),
    "utf8",
  );
  const lightboxSource = readFileSync(
    new URL("../app/components/dm/DmImageLightbox.tsx", import.meta.url),
    "utf8",
  );
  const bubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );

  // Tapping any grid tile opens the shared lightbox (not a per-tile
  // window.open) with every image in the message, in upload order.
  assert.match(groupSource, /DmImageLightbox/);
  assert.doesNotMatch(groupSource, /window\.open/);
  assert.match(groupSource, /imageAttachments\.map\(\(attachment\) => \(\{/);
  assert.match(groupSource, /initialIndex=\{view\.index\}/);

  // The "+N" overlay tile opens the first HIDDEN image (index ===
  // visibleImages.length), not the last visible tile it's drawn over.
  assert.match(groupSource, /isOverlayTile \? visibleImages\.length : index/);

  // Full-group viewer: swipe navigation, pinch/double-tap zoom, and
  // Escape/backdrop dismiss are all present (not just an open-in-new-tab
  // replacement). Dismissal is close-button/Escape/backdrop only — no
  // swipe-to-dismiss (see testDmImageLightboxLocksGestureDirectionVerticalDoesNotDrift).
  assert.match(lightboxSource, /goToIndex\(index [+-] 1\)/);
  assert.match(lightboxSource, /DOUBLE_TAP_ZOOM_SCALE/);
  assert.match(lightboxSource, /MAX_PINCH_ZOOM_SCALE/);
  assert.match(lightboxSource, /requestClose/);
  assert.match(lightboxSource, /ArrowLeft/);
  assert.match(lightboxSource, /ArrowRight/);

  // Single-image messages are untouched — they keep the original
  // window.open-in-a-new-tab viewer, not the new lightbox.
  const attachmentViewSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachment.tsx", import.meta.url),
    "utf8",
  );
  assert.match(attachmentViewSource, /window\.open\(attachment\.file_url/);
  assert.doesNotMatch(attachmentViewSource, /DmImageLightbox/);

  // Ownership alignment: DmTextMessageBubble still owns left/right alignment
  // for every message shape (text and attachment groups alike), via the same
  // resolveMessageGroupLiClass used by plain text bubbles — this fix lives
  // entirely in the grid's own width, not in a new alignment wrapper.
  assert.match(bubbleSource, /DmMessageAttachmentGroup/);
  assert.match(bubbleSource, /resolveMessageGroupLiClass/);
}

function testDmImageGalleryOverviewForLargeGroups() {
  const groupSource = readFileSync(
    new URL("../app/components/dm/DmMessageAttachmentGroup.tsx", import.meta.url),
    "utf8",
  );
  const overviewSource = readFileSync(
    new URL("../app/components/dm/DmImageGalleryOverview.tsx", import.meta.url),
    "utf8",
  );

  // Threshold: 5+ images (one more than the "+N" overlay's own
  // DM_MAX_VISIBLE_GRID_IMAGES cap of 4) route through the overview; 1-4
  // still skip straight to the lightbox, unchanged.
  assert.equal(DM_GALLERY_OVERVIEW_MIN_IMAGES, DM_MAX_VISIBLE_GRID_IMAGES + 1);
  assert.equal(DM_GALLERY_OVERVIEW_MIN_IMAGES, 5);

  // The grid's tap handler branches on the same threshold: 5+ opens the
  // overview (ignoring which tile was actually tapped — the overview shows
  // every photo regardless), 1-4 opens the lightbox directly on that image.
  assert.match(groupSource, /DmImageGalleryOverview/);
  assert.match(
    groupSource,
    /hasGalleryOverview = imageAttachments\.length >= DM_GALLERY_OVERVIEW_MIN_IMAGES/,
  );
  assert.match(
    groupSource,
    /setView\(hasGalleryOverview \? \{ mode: "overview" \} : \{ mode: "lightbox", index \}\)/,
  );

  // Closing the lightbox returns to the overview when one exists in this
  // message's flow (5+), and closes straight to the chat otherwise (1-4) —
  // never the other way around.
  assert.match(
    groupSource,
    /function closeLightbox\(\) \{\s*setView\(hasGalleryOverview \? \{ mode: "overview" \} : \{ mode: "closed" \}\);/,
  );

  // Closing the overview itself always returns to the chat.
  assert.match(groupSource, /onClose=\{\(\) => setView\(\{ mode: "closed" \}\)\}/);

  // Selecting a thumbnail in the overview opens the lightbox on that exact
  // photo (upload order — the same imageAttachments array the grid uses,
  // never re-sorted for the overview).
  assert.match(groupSource, /onSelect=\{\(index\) => setView\(\{ mode: "lightbox", index \}\)\}/);
  assert.match(overviewSource, /onSelect: \(index: number\) => void/);
  assert.match(overviewSource, /onClick=\{\(\) => onSelect\(index\)\}/);

  // Gallery Overview requirements: dark fullscreen overlay matching the
  // lightbox's existing dim style, close control, a count label, a
  // responsive no-horizontal-scroll grid, and no image reordering.
  assert.match(overviewSource, /fixed inset-0 z-50/);
  assert.match(overviewSource, /bg-black\/90/);
  assert.match(overviewSource, /label="Close gallery"/);
  assert.match(overviewSource, /Photo/);
  assert.match(overviewSource, /grid-cols-3/);
  assert.doesNotMatch(overviewSource, /overflow-x-auto|overflow-x-scroll/);
  assert.match(overviewSource, /aspect-square/);
  assert.match(overviewSource, /rounded-md/);
  assert.match(overviewSource, /object-cover/);

  // Shared dismiss behaviour (Escape + body-scroll lock) is reused between
  // the lightbox and the overview, not copy-pasted a third time.
  assert.match(overviewSource, /useDmMediaViewerDismiss/);
  const lightboxSource = readFileSync(
    new URL("../app/components/dm/DmImageLightbox.tsx", import.meta.url),
    "utf8",
  );
  assert.match(lightboxSource, /useDmMediaViewerDismiss/);
}

function testDmMediaViewerCloseButtonConsistentAndClickable() {
  const closeButtonSource = readFileSync(
    new URL("../app/components/dm/DmMediaViewerCloseButton.tsx", import.meta.url),
    "utf8",
  );
  const lightboxSource = readFileSync(
    new URL("../app/components/dm/DmImageLightbox.tsx", import.meta.url),
    "utf8",
  );
  const overviewSource = readFileSync(
    new URL("../app/components/dm/DmImageGalleryOverview.tsx", import.meta.url),
    "utf8",
  );

  // One shared close control, not two independently-drifting per-screen
  // copies — both the lightbox and the overview render the same component.
  assert.match(closeButtonSource, /export default function DmMediaViewerCloseButton/);
  assert.match(lightboxSource, /import DmMediaViewerCloseButton/);
  assert.match(lightboxSource, /<DmMediaViewerCloseButton onClose=\{requestClose\} label="Close photo viewer" \/>/);
  assert.match(overviewSource, /import DmMediaViewerCloseButton/);
  assert.match(overviewSource, /<DmMediaViewerCloseButton onClose=\{requestClose\} label="Close gallery" \/>/);

  // Neither screen still has its own inline "×" button markup — they only
  // render the shared component, so the two can't silently drift apart
  // again (different size/spacing/icon on one screen but not the other).
  assert.doesNotMatch(lightboxSource, /aria-label="Close photo viewer"/);
  assert.doesNotMatch(overviewSource, /aria-label="Close gallery"/);

  // 44x44 minimum hit area (h-11 w-11 = 2.75rem = 44px), applied once in
  // the shared component so both screens get it identically.
  assert.match(closeButtonSource, /h-11 w-11/);

  // Both screens lay the close button out as the LAST child of a
  // `justify-between` header row — i.e. top-right on both, not top-left on
  // one and top-right on the other.
  assert.match(
    lightboxSource,
    /justify-between p-4 text-white">\s*<span[^]*?<\/span>\s*<DmMediaViewerCloseButton/,
  );
  assert.match(
    overviewSource,
    /justify-between p-4 text-white">\s*<span[^]*?<\/span>\s*<DmMediaViewerCloseButton/,
  );

  // Root cause of the non-responsive lightbox "×": the header bar and the
  // touch-handling image layer are both `absolute` siblings with no
  // z-index, so whichever renders later in the DOM (the image layer, which
  // covers the full screen including the header's own screen area) paints
  // on top and swallows clicks meant for the header underneath it — the
  // button was visually present but never actually the hit-tested element
  // outside the exact bounds of the rendered <img>. Fix: the header now
  // explicitly stacks above that layer instead of relying on incidental
  // DOM order (a real, deterministic fix — not a bigger hit area or a
  // duplicate handler elsewhere papering over the same broken stacking).
  assert.match(lightboxSource, /inset-x-0 top-0 z-10 flex items-center justify-between/);
}

/**
 * Root-cause regression test for "swiping between images shows a floating
 * card over empty black space instead of a native paged gallery".
 *
 * Structural cause: the old implementation mounted exactly ONE `<img>`,
 * keyed by `currentImage.url`, and applied the live swipe delta directly to
 * that single element's `transform`. There was no second image anywhere in
 * the DOM to represent the adjacent page, so dragging the current image away
 * exposed the plain black backdrop behind it; on release, changing `index`
 * unmounted that `<img>` (different `key`) and mounted a brand new one,
 * which cross-faded in from the CENTRE via `opacity` rather than sliding in
 * from the edge — the "floating card sliding away, black gap, image
 * fades/detaches in place" failure exactly as reported.
 *
 * Fix: every image is mounted once as a persistent slide inside a single
 * flex "track"; the track (not an individual image) is what translates
 * during paging, so the next slide is already sitting in the adjacent
 * position before a swipe even starts, and paging between mounted images
 * never remounts or reloads them.
 */
function testDmImageLightboxUsesPagedTrackNotFloatingCard() {
  const lightboxSource = readFileSync(
    new URL("../app/components/dm/DmImageLightbox.tsx", import.meta.url),
    "utf8",
  );

  // The old floating-card shape must be gone: no single img keyed by the
  // current image's own url, and no live drag delta applied directly to an
  // <img>'s transform (that IS the single-transformed-element bug).
  assert.doesNotMatch(lightboxSource, /key=\{currentImage\.url\}/);
  assert.doesNotMatch(lightboxSource, /const currentImage = images\[index\]/);

  // Every image renders as its own persistent slide (`images.map`, keyed by
  // that image's own url) inside one flex track — not a single swapped
  // element — so paging never unmounts/remounts/reloads an image.
  assert.match(lightboxSource, /\{images\.map\(\(image, i\) => \{/);
  assert.match(lightboxSource, /key=\{image\.url\}/);
  assert.match(
    lightboxSource,
    /className="flex h-full shrink-0 items-center justify-center"/,
  );

  // The track spans every slide and is translated by index, so the next/
  // previous image already occupies the adjacent page before any drag —
  // this is the one line that actually fixes the reported bug.
  assert.match(lightboxSource, /width: `\$\{images\.length \* 100\}%`/);
  assert.match(
    lightboxSource,
    /translate3d\(calc\(\$\{-index \* slicePercent\}% \+ \$\{dragOffset\.x\}px\), 0, 0\)/,
  );

  // Pan/zoom (only ever applied to the current slide) and page-track drag
  // (the whole track) are separate transforms — panning a zoomed image must
  // never also drag the track, and vice versa.
  assert.match(lightboxSource, /panOffset\.x/);
  assert.match(lightboxSource, /setDragOffset\(\{ x: pageDeltaX \}\)/);
  assert.match(lightboxSource, /if \(drag\.mode === "pan"\) \{\s*setPanOffset/);

  // Requirement 4: swiping only pages when NOT zoomed — pan mode is chosen
  // up front from the current scale, and zooming back to exactly 1 (e.g. by
  // pinching back out, not just double-tap) clears any leftover pan so
  // paging is genuinely restored, not just re-enabled with a stale offset.
  assert.match(lightboxSource, /mode: scale > 1 \? "pan" : "none"/);
  assert.match(lightboxSource, /if \(nextScale <= 1\) \{\s*setPanOffset\(\{ x: 0, y: 0 \}\);/);

  // Requirement 5: rubber-band only at the true edges (first image can't
  // drag further right, last image can't drag further left), never an
  // unbounded/infinite scroll — resistance is applied via a bounded
  // diminishing-returns formula, not a hard stop.
  assert.match(lightboxSource, /function applyRubberBandResistance/);
  assert.match(
    lightboxSource,
    /if \(\(atFirstImage && pageDeltaX > 0\) \|\| \(atLastImage && pageDeltaX < 0\)\) \{/,
  );

  // Requirement 6: no transition while a finger is actively down (1:1
  // tracking, no lag/jank), but transition re-enabled on release so the
  // track/image settle with a real animation instead of snapping instantly.
  assert.match(lightboxSource, /const isDragging = dragStateRef\.current !== null/);
  assert.match(lightboxSource, /transition: isDragging\s*\n\s*\? "none"/);

  // goToIndex (used by prev/next buttons and arrow keys, unchanged
  // call sites) still just updates index/resets zoom — it now benefits from
  // the same track transition automatically, no separate animation path.
  assert.match(lightboxSource, /function goToIndex\(nextIndex: number\) \{/);
  assert.match(lightboxSource, /setIndex\(nextIndex\);\s*resetZoom\(\);/);
}

/**
 * Root-cause regression test for "the active photo can be dragged vertically
 * while paging horizontally between DM images".
 *
 * Structural cause: the "swipe" branch of `handleTouchMove` set
 * `dragOffset.y` to 40% of the raw vertical finger delta
 * (`setDragOffset({ x: pageDeltaX, y: rawDeltaY * 0.4 })`), and that value
 * was added directly into the current slide's own `transform`
 * (`translate(panOffset.x, panOffset.y + dragOffset.y)`) — so any vertical
 * component of a swipe, however small or accidental, visibly moved the
 * photo up/down at the same time it paged left/right. There was no
 * direction decision at all: `handleTouchMove` picked `mode = "swipe"` the
 * moment total movement (`Math.hypot(dx, dy)`) crossed 10px, regardless of
 * which axis actually dominated, and direction (swipe vs. the old
 * swipe-down-to-dismiss) was only resolved later, at `touchend`, by which
 * point the vertical drift had already been visible on screen for the
 * whole gesture.
 *
 * Fix: `dragOffset` no longer has a `y` field at all (nothing to apply even
 * by mistake), and gesture direction is decided ONCE, the moment raw
 * movement crosses `GESTURE_LOCK_THRESHOLD_PX`, by comparing `|dx|` vs
 * `|dy|` at that exact instant. A gesture locked "swipe" never touches `y`
 * again; a gesture locked "vertical" never touches the track or the image
 * again for the rest of that same gesture (no re-evaluation mid-drag).
 */
function testDmImageLightboxLocksGestureDirectionVerticalDoesNotDrift() {
  const lightboxSource = readFileSync(
    new URL("../app/components/dm/DmImageLightbox.tsx", import.meta.url),
    "utf8",
  );

  // dragOffset has no `y` field anywhere — the page-track offset is
  // horizontal-only by construction, not just by convention.
  assert.match(lightboxSource, /const \[dragOffset, setDragOffset\] = useState\(\{ x: 0 \}\);/);
  assert.doesNotMatch(lightboxSource, /dragOffset\.y/);
  assert.doesNotMatch(lightboxSource, /y: rawDeltaY \* 0\.4/);

  // The current slide's own transform only ever carries panOffset (zoomed
  // panning) — no drag-offset term left to reintroduce vertical drift.
  assert.match(
    lightboxSource,
    /transform: `translate\(\$\{panOffset\.x\}px, \$\{panOffset\.y\}px\) scale\(\$\{scale\}\)`,/,
  );

  // Direction is a real three-way lock (none -> swipe | vertical), decided
  // once from whichever axis dominates at the lock threshold, not just a
  // magnitude check that ignores which way the drag actually went.
  assert.match(lightboxSource, /mode: "none" \| "swipe" \| "vertical" \| "pan"/);
  assert.match(lightboxSource, /GESTURE_LOCK_THRESHOLD_PX = 10/);
  assert.match(
    lightboxSource,
    /drag\.mode = Math\.abs\(rawDeltaX\) >= Math\.abs\(rawDeltaY\) \? "swipe" : "vertical";/,
  );

  // Once locked vertical, a gesture is fully inert: no track movement, no
  // image movement, and (requirement 3) no dismiss-on-swipe either — both
  // handleTouchMove and handleTouchEnd bail out immediately for it.
  assert.match(
    lightboxSource,
    /if \(drag\.mode === "vertical"\) \{\s*\/\/ Direction already locked to vertical/,
  );
  assert.match(lightboxSource, /if \(drag\.mode === "pan" \|\| drag\.mode === "vertical"\) \{\s*return;\s*\}/);

  // The old swipe-down-to-dismiss branch is gone entirely, along with its
  // now-dead threshold constant — dismissal is the close button only.
  assert.doesNotMatch(lightboxSource, /SWIPE_DISMISS_THRESHOLD_PX/);
  assert.doesNotMatch(lightboxSource, /requestClose\(\);\s*\} else if \(Math\.abs\(deltaX\)/);

  // Pan mode (zoomed, scale > 1) is untouched by the lock — still free
  // horizontal + vertical panning, still chosen up front from scale at
  // touchstart, unaffected by the new "none" -> "swipe"/"vertical" branch.
  assert.match(lightboxSource, /setPanOffset\(\{ x: rawDeltaX, y: rawDeltaY \}\);/);
  assert.match(lightboxSource, /mode: scale > 1 \? "pan" : "none"/);

  // Horizontal navigation threshold and rubber-band/edge behaviour are
  // unchanged — only the vertical axis and the dead dismiss path moved.
  assert.match(lightboxSource, /SWIPE_NAV_THRESHOLD_PX = 50/);
  assert.match(lightboxSource, /if \(Math\.abs\(deltaX\) > SWIPE_NAV_THRESHOLD_PX\) \{/);
}

/**
 * Root-cause regression test for "the opened full-screen photo is cropped".
 *
 * Confirmed cause: the lightbox `<img>` capped itself with `max-h-[90vh]`
 * (a static viewport-height unit). On mobile Safari/Chrome, `vh` resolves
 * against the browser's large viewport even while the address bar/toolbar
 * is on-screen, so the image could size itself taller than what's actually
 * visible and get cut off behind browser chrome -- a real cropped-looking
 * result even though `object-contain` itself was never wrong. Every other
 * full-screen/near-full-screen mobile overlay in this codebase already uses
 * `dvh` (the dynamic viewport unit) for exactly this reason (see
 * `min-h-[100dvh]` page shells and `max-h-[90dvh]` sheets/modals throughout
 * app/); this lightbox was the one exception still using plain `vh`.
 *
 * Fix: `max-h-[90vh]` -> `max-h-[90dvh]`. This test locks in both halves of
 * that fix -- the corrected unit AND the underlying contain-style sizing
 * approach (object-contain + independent max-width/max-height, never a
 * forced/cropped aspect-ratio box) -- so a future edit can't silently
 * reintroduce either the vh regression or an object-fit: cover-style crop.
 */
function testDmImageLightboxOpensFullyContainedNotCropped() {
  const lightboxSource = readFileSync(
    new URL("../app/components/dm/DmImageLightbox.tsx", import.meta.url),
    "utf8",
  );

  // The full image must render at its own natural aspect ratio -- capped
  // independently on each axis, never forced into a fixed/aspect-locked box.
  assert.match(lightboxSource, /object-contain/);
  assert.match(lightboxSource, /max-h-\[90dvh\]/);
  assert.match(lightboxSource, /max-w-\[92vw\]/);

  // The confirmed root cause must never come back: a plain (non-dynamic)
  // vh unit on the image's own height cap.
  assert.doesNotMatch(lightboxSource, /max-h-\[90vh\]/);

  // Crop-style sizing must never appear anywhere in this component --
  // neither on the photo itself nor reintroduced via a background-image
  // trick, and no fixed/forced aspect-ratio box for the open image.
  assert.doesNotMatch(lightboxSource, /object-cover/);
  assert.doesNotMatch(lightboxSource, /background-size:\s*cover/);
  assert.doesNotMatch(lightboxSource, /bg-cover/);
  assert.doesNotMatch(lightboxSource, /aspect-square/);
  assert.doesNotMatch(lightboxSource, /aspect-\[/);

  // The image is centred both axes within its slide (contain, not
  // top/left-anchored crop) -- same wrapper class already covered above,
  // asserted again here scoped to this specific regression's intent.
  assert.match(
    lightboxSource,
    /className="flex h-full shrink-0 items-center justify-center"/,
  );

  // Root container is a true full-viewport overlay (not a scrollable-page
  // pattern that would need its own dvh) -- fixed + inset-0 tracks the
  // visual viewport directly in modern browsers, same pattern already used
  // by every other DM/profile media overlay in this codebase.
  assert.match(lightboxSource, /className="fixed inset-0 z-50"/);
}

function testDmComposerPendingPhotoGroupHelpers() {
  const makeFile = (name: string, size = 100, lastModified = 1) =>
    new File([new Uint8Array(size)], name, { type: "image/jpeg", lastModified });

  // Dedupe: re-selecting the same file (same name/size/lastModified) does
  // not add a second copy, even though a fresh <input> selection always
  // produces a new File object (so reference equality can't be used).
  const firstFile = makeFile("a.jpg");
  const firstMerge = mergePendingComposerAttachments([], [firstFile], 10);
  assert.equal(firstMerge.attachments.length, 1);
  assert.equal(firstMerge.addedCount, 1);

  const duplicateFile = makeFile("a.jpg");
  const dedupeMerge = mergePendingComposerAttachments(
    firstMerge.attachments,
    [duplicateFile],
    10,
  );
  assert.equal(dedupeMerge.attachments.length, 1);
  assert.equal(dedupeMerge.addedCount, 0);
  assert.equal(dedupeMerge.skippedDuplicateCount, 1);

  // Cap at max: selecting 10 photos succeeds; an 11th is rejected/skipped.
  const tenFiles = Array.from({ length: 10 }, (_, index) => makeFile(`photo-${index}.jpg`));
  const tenMerge = mergePendingComposerAttachments([], tenFiles, 10);
  assert.equal(tenMerge.attachments.length, 10);
  assert.equal(tenMerge.skippedLimitCount, 0);

  const elevenFiles = Array.from({ length: 11 }, (_, index) => makeFile(`photo-${index}.jpg`));
  const elevenMerge = mergePendingComposerAttachments([], elevenFiles, 10);
  assert.equal(elevenMerge.attachments.length, 10);
  assert.equal(elevenMerge.skippedLimitCount, 1);

  // Attempting to add more once already at the cap skips all new files.
  const overCapMerge = mergePendingComposerAttachments(
    tenMerge.attachments,
    [makeFile("eleventh.jpg")],
    10,
  );
  assert.equal(overCapMerge.attachments.length, 10);
  assert.equal(overCapMerge.skippedLimitCount, 1);

  // Removing an individual photo before sending leaves the rest untouched
  // and preserves order.
  const threeFiles = [makeFile("one.jpg"), makeFile("two.jpg"), makeFile("three.jpg")];
  const threeMerge = mergePendingComposerAttachments([], threeFiles, 10);
  const afterRemoveMiddle = removePendingComposerAttachmentAt(threeMerge.attachments, 1);
  assert.equal(afterRemoveMiddle.attachments.length, 2);
  assert.equal(afterRemoveMiddle.attachments[0]?.file.name, "one.jpg");
  assert.equal(afterRemoveMiddle.attachments[1]?.file.name, "three.jpg");
  assert.equal(afterRemoveMiddle.removed?.file.name, "two.jpg");

  // Cancelling the entire selection empties the group.
  assert.equal(threeMerge.attachments.length, 3);
}

function testComposerNewlineKeydown() {
  assert.equal(getComposerLineBeforeCursor("hello\nworld", 8), "wo");
  assert.equal(getComposerLineBeforeCursor("hello\nworld", 7), "w");
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
  // Scoped to ReactionEmojiButton (the sent-reaction pill/badge) rather than
  // the whole file: DmReactionPicker (a separate component in this same
  // file, for choosing which emoji to react with) legitimately still uses
  // `isOwnMessage` for picker positioning and `disabled:opacity-50` on its
  // own quick-reaction buttons -- neither is the pill/badge this check cares
  // about, so a file-wide scan would false-flag those unrelated usages.
  const reactionEmojiButtonSource =
    reactionsSource.match(/function ReactionEmojiButton\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(reactionEmojiButtonSource, "ReactionEmojiButton function should be found in source");
  assert.doesNotMatch(reactionEmojiButtonSource, /isOwnMessage/);
  assert.doesNotMatch(reactionEmojiButtonSource, /disabled:opacity-50/);
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
  assert.match(reactionsSource, /useDoubleTapGesture/);
  assert.match(reactionsSource, /ReactionEmojiButton/);
  assert.doesNotMatch(reactionsSource, /onClick=\{\(\) => onToggleReaction\(summary\.emoji\)\}/);
  assert.match(reactionsSource, /onDoubleClick=\{handleDoubleClick\}/);
  assert.match(doubleTapSource, /export function useDoubleTapGesture/);
  assert.match(bubbleSource, /onDoubleClick: handleDoubleTapDoubleClick/);
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
  // `shellLayout` was later renamed/consolidated into a `bubbleHandlers`
  // prop passed to the shared ChatMessageBubbleShell (see the doesNotMatch
  // above -- the old `layout={shellLayout}` wiring is gone entirely, not
  // just renamed inline).
  assert.match(bubbleSource, /bubbleHandlers/);
  assert.doesNotMatch(bubbleSource, /resolveIncomingGroupLiClass/);
  assert.doesNotMatch(bubbleSource, /CHAT_INCOMING_GROUP_FOOTER_CLASS/);
  assert.doesNotMatch(bubbleSource, /Report message/);
  assert.match(groupBubbleSource, /onDoubleClick: handleDoubleTapDoubleClick/);
  assert.match(pickerPositionSource, /computeReactionPickerPosition/);
  assert.match(pickerPositionSource, /getReactionPickerViewportBounds/);
  assert.match(pickerPositionSource, /data-chat-composer/);
  assert.match(groupBubbleSource, /useMessageReactionDoubleTap/);
  // DmReactionPicker itself now lives only inside the shared
  // ChatMessageBubbleShell (verified above via shellSource) -- individual
  // bubble components no longer reference it directly, just the shell.
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
    /if \(isDmImageAttachment\(attachment\.file_type\)\) \{[\s\S]*?return \(\s*<button/,
  );
  assert.match(globalsSource, /\.ftc-bubble-other-stack/);
  assert.match(globalsSource, /\.ftc-bubble-own-stack-middle/);
  assert.match(globalsSource, /\.ftc-dm-message-image-open/);
  assert.match(globalsSource, /-webkit-touch-callout: none;/);
}

function testDmReactionNotifications() {
  assert.equal(
    buildDmReactionNotificationBody("Isaac", "❤️"),
    "Isaac reacted ❤️ to your message.",
  );

  const helperSource = readFileSync(
    new URL("../lib/dm/dmReactionNotifications.ts", import.meta.url),
    "utf8",
  );
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(helperSource, /createNotification/);
  assert.match(helperSource, /"message"/);
  assert.match(helperSource, /\/dm\/\$\{conversationId\}/);
  assert.match(helperSource, /recipientUserId === reactorUserId/);
  assert.match(helperSource, /message\.conversation_id !== conversationId/);
  assert.match(dmPageSource, /notifyDmReactionRecipient/);
  assert.match(dmPageSource, /if \(nextReaction && conversationId\)/);
  // Notify only after the server toggle resolves, never from the optimistic path.
  const toggleBody = dmPageSource.slice(dmPageSource.indexOf("async function handleToggleReaction"));
  assert.ok(
    toggleBody.indexOf("await toggleDmMessageReaction") <
      toggleBody.indexOf("notifyDmReactionRecipient"),
  );

  // Reaction notification lifecycle: keyed by reaction id, updated on change, revoked on remove.
  const migrationSource = readFileSync(
    new URL("../supabase/migrations/20250730120000_reaction_notification_lifecycle.sql", import.meta.url),
    "utf8",
  );

  assert.match(helperSource, /revokeDmReactionNotification/);
  assert.match(helperSource, /revoke_reaction_notification/);
  assert.match(dmPageSource, /reactionId: nextReaction\.id/);
  assert.match(dmPageSource, /revokeDmReactionNotification\(previousReactionId\)/);
  assert.match(migrationSource, /add column if not exists reaction_id uuid/);
  assert.match(migrationSource, /where reaction_id = p_reaction_id/);
  assert.match(migrationSource, /create or replace function public\.revoke_reaction_notification/);
  // An emoji change must not reset `read`, so unread is not re-triggered.
  assert.doesNotMatch(migrationSource, /set title = p_title,\s*body = p_body,\s*read = false/);
}

function testDmReactionInboxActivity() {
  assert.equal(
    buildDmReactionInboxPreviewText("❤️", "Isaac"),
    "Isaac reacted ❤️ to your message",
  );
  assert.equal(buildDmReactionInboxPreviewText("❤️", null), "❤️ Reacted to your message");

  const encoded = encodeDmReactionInboxPreview("reaction-1", "❤️", "user-a");
  assert.equal(parseDmReactionInboxPreview(encoded)?.reactionId, "reaction-1");
  assert.equal(parseDmReactionInboxPreview(encoded)?.emoji, "❤️");
  assert.equal(parseDmReactionInboxPreview(encoded)?.reactorUserId, "user-a");

  assert.equal(
    shouldApplyDmReactionInboxActivity({
      currentUserId: "user-b",
      messageAuthorUserId: "user-b",
      reactorUserId: "user-a",
    }),
    true,
  );
  assert.equal(
    shouldApplyDmReactionInboxActivity({
      currentUserId: "user-a",
      messageAuthorUserId: "user-b",
      reactorUserId: "user-a",
    }),
    false,
  );
  assert.equal(
    shouldMarkDmReactionInboxUnread({
      eventType: "INSERT",
      currentUserId: "user-b",
      messageAuthorUserId: "user-b",
      reactorUserId: "user-a",
    }),
    true,
  );
  assert.equal(
    shouldMarkDmReactionInboxUnread({
      eventType: "UPDATE",
      currentUserId: "user-b",
      messageAuthorUserId: "user-b",
      reactorUserId: "user-a",
    }),
    false,
  );

  const rows: DmInboxRow[] = [
    {
      conversationId: "conv-1",
      latestActivityAt: "2026-01-01T10:00:00.000Z",
      latestPreview: "Hello",
      latestMessageUserId: "user-a",
    },
  ];

  const insertResult = applyDmInboxRealtimeReaction(rows, {
    conversationId: "conv-1",
    reactionId: "reaction-1",
    emoji: "❤️",
    reactorUserId: "user-a",
    activityAt: "2026-01-02T10:00:00.000Z",
    messageAuthorUserId: "user-b",
  });

  assert.equal(insertResult.updated, true);
  assert.equal(insertResult.rows[0]?.latestMessageUserId, "user-a");
  assert.match(insertResult.rows[0]?.latestPreview ?? "", /^__ftc_dm_reaction__:/);

  const duplicateResult = applyDmInboxRealtimeReaction(insertResult.rows, {
    conversationId: "conv-1",
    reactionId: "reaction-1",
    emoji: "❤️",
    reactorUserId: "user-a",
    activityAt: "2026-01-02T10:00:00.000Z",
    messageAuthorUserId: "user-b",
  });

  assert.equal(duplicateResult.updated, false);

  const updateResult = applyDmInboxRealtimeReaction(insertResult.rows, {
    conversationId: "conv-1",
    reactionId: "reaction-1",
    emoji: "🔥",
    reactorUserId: "user-a",
    activityAt: "2026-01-02T10:00:00.000Z",
    messageAuthorUserId: "user-b",
  });

  assert.equal(updateResult.updated, true);
  assert.match(updateResult.rows[0]?.latestPreview ?? "", /\|🔥\|/);

  const removalResult = applyDmInboxRealtimeReactionRemoval(updateResult.rows, {
    conversationId: "conv-1",
    reactionId: "reaction-1",
    fallback: {
      latestActivityAt: "2026-01-01T10:00:00.000Z",
      latestPreview: "Hello",
      latestMessageUserId: "user-b",
    },
  });

  assert.equal(removalResult.removed, true);
  assert.equal(removalResult.rows[0]?.latestPreview, "Hello");
  assert.equal(removalResult.rows[0]?.latestActivityAt, "2026-01-01T10:00:00.000Z");

  const olderRemovalResult = applyDmInboxRealtimeReactionRemoval(updateResult.rows, {
    conversationId: "conv-1",
    reactionId: "older-reaction",
    fallback: {
      latestActivityAt: "2026-01-01T10:00:00.000Z",
      latestPreview: "Hello",
      latestMessageUserId: "user-b",
    },
  });

  assert.equal(olderRemovalResult.removed, false);
  assert.match(olderRemovalResult.rows[0]?.latestPreview ?? "", /\|🔥\|/);

  const inboxPageSource = readFileSync(new URL("../app/dm/page.tsx", import.meta.url), "utf8");
  assert.match(inboxPageSource, /dm-inbox:reactions/);
  assert.match(inboxPageSource, /applyDmInboxRealtimeReaction/);
  assert.match(inboxPageSource, /applyDmInboxRealtimeReactionRemoval/);
  assert.match(inboxPageSource, /message_reactions/);
  assert.match(inboxPageSource, /event: "DELETE"[\s\S]*message_reactions/);

  // Proven root cause: Supabase Realtime's DELETE payload for
  // message_reactions only ever carries the primary key `id`, never
  // message_id/user_id/emoji, even under replica identity full. The removal
  // handler must not gate on message_id (that silently no-oped every
  // removal) and must resolve the affected conversation from local inbox
  // state via the encoded reaction id instead of a message_id lookup.
  assert.doesNotMatch(inboxPageSource, /!reaction\.id \|\| !reaction\.message_id/);
  assert.match(inboxPageSource, /dmInboxRowsRef/);
  assert.match(
    inboxPageSource,
    /handleDmReactionInboxRemoval[\s\S]{0,1200}dmInboxRowsRef\.current\.find/,
  );
}

function testDmInboxSearchEmptyStateCopy() {
  const inboxPageSource = readFileSync(new URL("../app/dm/page.tsx", import.meta.url), "utf8");

  // No trailing full stop on either equivalent empty-search message — matches
  // the app-wide short-message convention (e.g. "No DJs match your search"
  // in bookings/page.tsx).
  assert.match(inboxPageSource, />\s*No conversations match your search\s*</);
  assert.doesNotMatch(inboxPageSource, /No conversations match your search\./);
  assert.match(inboxPageSource, />\s*No group chats match your search\s*</);
  assert.doesNotMatch(inboxPageSource, /No group chats match your search\./);
}

type TestInboxMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

function decorateTestMessageWithAttachmentPreview(
  message: TestInboxMessage,
  attachmentTypesByMessageId: Map<string, "image" | "file">,
): TestInboxMessage {
  if (message.text.trim()) {
    return message;
  }

  const attachmentKind = attachmentTypesByMessageId.get(message.id);

  if (!attachmentKind) {
    return message;
  }

  return { ...message, text: encodeDmAttachmentInboxPreview(attachmentKind) };
}

function decorateTestMessageWithAttachmentGroupPreview(
  message: TestInboxMessage,
  attachmentInfoByMessageId: Map<string, { kind: "image" | "file"; count: number }>,
): TestInboxMessage {
  if (message.text.trim()) {
    return message;
  }

  const attachmentInfo = attachmentInfoByMessageId.get(message.id);

  if (!attachmentInfo) {
    return message;
  }

  return {
    ...message,
    text: encodeDmAttachmentInboxPreview(attachmentInfo.kind, attachmentInfo.count),
  };
}

function testDmInboxImageMessagePreview() {
  // Root cause: image/file-only messages store an empty `messages.text`
  // (the file lives in a separate message_attachments row). The inbox
  // preview pipeline reads `message.text` directly as `latestPreview`, so
  // an empty string is indistinguishable from "no messages" and falls
  // through to the "No messages yet" placeholder.
  assert.equal(resolveDmAttachmentPreviewKind("image/jpeg"), "image");
  assert.equal(resolveDmAttachmentPreviewKind("image/png"), "image");
  assert.equal(resolveDmAttachmentPreviewKind("application/pdf"), "file");

  const encodedImage = encodeDmAttachmentInboxPreview("image");
  assert.equal(isDmAttachmentInboxPreview(encodedImage), true);
  assert.equal(parseDmAttachmentInboxPreview(encodedImage)?.kind, "image");
  assert.equal(buildDmAttachmentInboxPreviewText("image"), "📷 Photo");
  assert.equal(buildDmAttachmentInboxPreviewText("file"), "📎 File");
  assert.equal(parseDmAttachmentInboxPreview("plain text"), null);
  assert.equal(parseDmAttachmentInboxPreview(null), null);

  // formatDmInboxMessagePreview must render the encoded token, and must
  // never itself resolve an empty string to anything but null (encoding
  // happens upstream, at message-load time, not inside the formatter).
  assert.equal(formatDmInboxMessagePreview(""), null);
  assert.equal(formatDmInboxMessagePreview(encodedImage), "📷 Photo");
  assert.equal(
    formatDmInboxMessagePreview(encodeDmAttachmentInboxPreview("file")),
    "📎 File",
  );

  // Test: first message is an image (empty text) — must decorate, not fall
  // through to null/"No messages yet".
  const conversationId = "conv-1";
  const imageOnlyMessages: TestInboxMessage[] = [
    {
      id: "msg-image-1",
      conversation_id: conversationId,
      user_id: "user-a",
      text: "",
      created_at: "2026-01-01T10:00:00.000Z",
    },
  ];
  const imageAttachmentTypes = new Map([["msg-image-1", "image" as const]]);
  const decoratedImageMessages = imageOnlyMessages.map((message) =>
    decorateTestMessageWithAttachmentPreview(message, imageAttachmentTypes),
  );
  const imagePreviewMessage = pickDmInboxPreviewMessage(decoratedImageMessages, conversationId);
  assert.equal(
    formatDmInboxMessagePreview(imagePreviewMessage?.text ?? null),
    "📷 Photo",
  );

  // Test: first message is text — unaffected, unchanged behaviour.
  const textOnlyMessages: TestInboxMessage[] = [
    {
      id: "msg-text-1",
      conversation_id: conversationId,
      user_id: "user-a",
      text: "Hey there",
      created_at: "2026-01-01T10:00:00.000Z",
    },
  ];
  const decoratedTextMessages = textOnlyMessages.map((message) =>
    decorateTestMessageWithAttachmentPreview(message, new Map()),
  );
  const textPreviewMessage = pickDmInboxPreviewMessage(decoratedTextMessages, conversationId);
  assert.equal(formatDmInboxMessagePreview(textPreviewMessage?.text ?? null), "Hey there");

  // Test: mixed text + image (a caption) — caption wins over the
  // attachment token, since decoration only applies to empty text.
  const captionedMessage: TestInboxMessage = {
    id: "msg-captioned-1",
    conversation_id: conversationId,
    user_id: "user-a",
    text: "Check this out",
    created_at: "2026-01-01T10:05:00.000Z",
  };
  const decoratedCaptioned = decorateTestMessageWithAttachmentPreview(
    captionedMessage,
    new Map([[captionedMessage.id, "image"]]),
  );
  assert.equal(decoratedCaptioned.text, "Check this out");
  assert.equal(
    formatDmInboxMessagePreview(decoratedCaptioned.text),
    "Check this out",
  );

  // Test: conversation with only a genuinely empty/no message (no
  // attachment mapping either) must still fall through to null, so "No
  // messages yet" only appears when there truly is no activity.
  assert.equal(pickDmInboxPreviewMessage([], conversationId), null);

  // Test: an older image message must not override a newer text message
  // as the picked preview (sorting/ordering preserved).
  const mixedTimelineMessages: TestInboxMessage[] = [
    {
      id: "msg-older-image",
      conversation_id: conversationId,
      user_id: "user-a",
      text: "",
      created_at: "2026-01-01T09:00:00.000Z",
    },
    {
      id: "msg-newer-text",
      conversation_id: conversationId,
      user_id: "user-b",
      text: "Sounds good",
      created_at: "2026-01-01T09:05:00.000Z",
    },
  ];
  const decoratedMixedTimeline = mixedTimelineMessages.map((message) =>
    decorateTestMessageWithAttachmentPreview(
      message,
      new Map([["msg-older-image", "image"]]),
    ),
  );
  const mixedTimelinePreview = pickDmInboxPreviewMessage(decoratedMixedTimeline, conversationId);
  assert.equal(mixedTimelinePreview?.id, "msg-newer-text");
  assert.equal(formatDmInboxMessagePreview(mixedTimelinePreview?.text ?? null), "Sounds good");

  const inboxPageSource = readFileSync(new URL("../app/dm/page.tsx", import.meta.url), "utf8");
  assert.match(inboxPageSource, /decorateMessageWithAttachmentPreview/);
  assert.match(inboxPageSource, /resolveDmInboxAttachmentPreview/);
  assert.match(inboxPageSource, /message_attachments/);
  // The image-received-live path must resolve via a direct, bounded lookup
  // rather than relying on message_attachments realtime (not in the
  // Supabase Realtime publication) or open-ended polling.
  assert.doesNotMatch(inboxPageSource, /setInterval/);
  assert.match(inboxPageSource, /messageAttachmentTypesRef/);
}

function testDmInboxMultiPhotoPreview() {
  // A single photo keeps rendering "📷 Photo" (singular) — the count suffix
  // is only appended for groups of 2+ so single-attachment tokens/behaviour
  // are byte-for-byte unchanged.
  const singleEncoded = encodeDmAttachmentInboxPreview("image", 1);
  assert.equal(singleEncoded, encodeDmAttachmentInboxPreview("image"));
  assert.equal(parseDmAttachmentInboxPreview(singleEncoded)?.count, 1);
  assert.equal(buildDmAttachmentInboxPreviewText("image", 1), "📷 Photo");

  // Multiple photos with no caption render "📷 Photos" (plural).
  const groupEncoded = encodeDmAttachmentInboxPreview("image", 3);
  assert.match(groupEncoded, /:3$/);
  assert.equal(isDmAttachmentInboxPreview(groupEncoded), true);
  const parsedGroup = parseDmAttachmentInboxPreview(groupEncoded);
  assert.equal(parsedGroup?.kind, "image");
  assert.equal(parsedGroup?.count, 3);
  assert.equal(buildDmAttachmentInboxPreviewText("image", 3), "📷 Photos");
  assert.equal(formatDmInboxMessagePreview(groupEncoded), "📷 Photos");

  // File attachments never pluralize the label (only the photo picker
  // supports multi-select in this beta).
  assert.equal(buildDmAttachmentInboxPreviewText("file", 5), "📎 File");

  // Malformed/legacy tokens without a count default to singular.
  assert.equal(parseDmAttachmentInboxPreview("__ftc_dm_attachment__:image")?.count, 1);
  assert.equal(
    parseDmAttachmentInboxPreview("__ftc_dm_attachment__:image:not-a-number")?.count,
    1,
  );

  // Ten photos with no caption — the inbox preview pipeline for a
  // conversation whose first/latest message is a 10-photo group.
  const conversationId = "conv-multi-photo";
  const tenPhotoMessage: TestInboxMessage = {
    id: "msg-ten-photos",
    conversation_id: conversationId,
    user_id: "user-a",
    text: "",
    created_at: "2026-01-01T10:00:00.000Z",
  };
  const decoratedTenPhotos = decorateTestMessageWithAttachmentGroupPreview(
    tenPhotoMessage,
    new Map([[tenPhotoMessage.id, { kind: "image", count: 10 }]]),
  );
  const tenPhotoPreview = pickDmInboxPreviewMessage([decoratedTenPhotos], conversationId);
  assert.equal(formatDmInboxMessagePreview(tenPhotoPreview?.text ?? null), "📷 Photos");

  // A caption on a multi-photo group always wins over the "📷 Photos" token.
  const captionedGroupMessage: TestInboxMessage = {
    id: "msg-captioned-group",
    conversation_id: conversationId,
    user_id: "user-a",
    text: "Look at these!",
    created_at: "2026-01-01T10:05:00.000Z",
  };
  const decoratedCaptionedGroup = decorateTestMessageWithAttachmentGroupPreview(
    captionedGroupMessage,
    new Map([[captionedGroupMessage.id, { kind: "image", count: 4 }]]),
  );
  assert.equal(decoratedCaptionedGroup.text, "Look at these!");
  assert.equal(
    formatDmInboxMessagePreview(decoratedCaptionedGroup.text),
    "Look at these!",
  );

  const attachmentsSource = readFileSync(
    new URL("../lib/dmAttachments.ts", import.meta.url),
    "utf8",
  );
  assert.match(attachmentsSource, /DM_MAX_PHOTOS_PER_MESSAGE/);
  assert.match(attachmentsSource, /sendDmMessageWithAttachments/);
}

function testDmReactionRealtime() {
  const migrationSource = readFileSync(
    new URL("../supabase/migrations/20250729100000_message_reactions_realtime.sql", import.meta.url),
    "utf8",
  );
  const setupSource = readFileSync(
    new URL("../scripts/setupDmAttachmentsAndReactions.sql", import.meta.url),
    "utf8",
  );
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(migrationSource, /alter publication supabase_realtime add table public\.message_reactions/);
  assert.match(migrationSource, /replica identity full/);
  assert.match(setupSource, /alter publication supabase_realtime add table public\.message_reactions/);
  assert.match(dmPageSource, /upsertDmReactionFromRealtime/);
  assert.match(dmPageSource, /removeDmReactionFromRealtime/);
  // Realtime reaction payloads must never be dropped by a local message-id gate:
  // reactions can arrive before the message is present in local state.
  assert.doesNotMatch(dmPageSource, /conversationMessageIdsRef/);

  const baseReaction: DmMessageReaction = {
    id: "reaction-1",
    message_id: "message-1",
    user_id: "user-a",
    emoji: "❤️",
    created_at: "2026-01-02T10:00:00.000Z",
  };

  const firstUpsert = upsertDmReactionFromRealtime([], baseReaction);
  assert.equal(firstUpsert.length, 1);

  const duplicateUpsert = upsertDmReactionFromRealtime(firstUpsert, baseReaction);
  assert.equal(duplicateUpsert.length, 1);

  const optimisticReaction: DmMessageReaction = {
    ...baseReaction,
    id: "optimistic-message-1-user-a",
  };
  const reconciled = upsertDmReactionFromRealtime([optimisticReaction], baseReaction);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0]?.id, "reaction-1");

  const removed = removeDmReactionFromRealtime(reconciled, baseReaction);
  assert.equal(removed.length, 0);
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
  // `previousInGroupHadReactions` was intentionally kept as a typed prop
  // (not removed outright) for source-compat with existing callers, but
  // must stay a no-op -- every declaration is marked @deprecated and the
  // functions that accept it never read it in their logic.
  const previousInGroupHadReactionsDeclarations = [
    ...groupLayoutSource.matchAll(
      /@deprecated[^\n]*\n\s*previousInGroupHadReactions\?: boolean/g,
    ),
  ];
  assert.ok(
    previousInGroupHadReactionsDeclarations.length > 0,
    "previousInGroupHadReactions should still be declared, marked @deprecated",
  );
  const outgoingGroupLiClassSource =
    groupLayoutSource.match(/export function resolveOutgoingGroupLiClass\([\s\S]*?\n}\n/)?.[0] ??
    "";
  const incomingGroupLiClassSource =
    groupLayoutSource.match(/export function resolveIncomingGroupLiClass\([\s\S]*?\n}\n/)?.[0] ??
    "";
  assert.ok(outgoingGroupLiClassSource, "resolveOutgoingGroupLiClass should be found in source");
  assert.ok(incomingGroupLiClassSource, "resolveIncomingGroupLiClass should be found in source");
  assert.doesNotMatch(
    outgoingGroupLiClassSource.match(/return resolveMessageGroupLiClass\(\{[\s\S]*?\}\)/)?.[0] ??
      "",
    /previousInGroupHadReactions/,
  );
  assert.doesNotMatch(
    incomingGroupLiClassSource.match(/return resolveMessageGroupLiClass\(\{[\s\S]*?\}\)/)?.[0] ??
      "",
    /previousInGroupHadReactions/,
  );
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
    /px-3 py-1/,
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
  assert.match(sql, /FTC QA Environment Reset/);
  assert.match(sql, /drop table if exists _qa_user_ids/);
  assert.match(sql, /create temp table _qa_user_ids/);
  assert.match(sql, /create temp table _qa_messages/);
  assert.match(sql, /m\.user_id in \(select user_id from _qa_user_ids\)/);
  assert.match(sql, /conversation_id in \(select conversation_id from _qa_only_conversations\)/);
  assert.match(sql, /set_config\('storage\.allow_delete_query', 'true', true\)/);
  // Script must stay minimal for a single paste-and-run: no permanent
  // logging tables and no diagnostic-only sections beyond short verification.
  assert.doesNotMatch(sql, /create table if not exists public\.qa_reset_log/);
  assert.doesNotMatch(sql, /_qa_pre_delete_snapshot/);

  const cli = readFileSync(new URL("./reset-qa-environment.mts", import.meta.url), "utf8");
  assert.match(cli, /resetQaEnvironment\.sql/);
}

function testLoginScreenPolish() {
  const loginSource = readFileSync(
    new URL("../app/login/page.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  // Heading: "Welcome" (not "Welcome back"), supporting text unchanged. Recovery mode's
  // own heading/copy is a separate flow and must stay untouched.
  assert.match(loginSource, /\{recoveryMode \? "Set a new password" : "Welcome"\}/);
  assert.doesNotMatch(loginSource, /Welcome back/);
  assert.match(loginSource, /"Sign in to continue"/);

  // Primary Log in button renders in title case (no forced text-transform: uppercase) --
  // scoped to the login submit button specifically; the recovery ("Update password") button
  // keeps its existing uppercase styling untouched, matching every other .ftc-btn-primary
  // in the app (password reset flow must not change).
  assert.doesNotMatch(
    loginSource,
    /className="w-full ftc-btn-primary px-4 py-3 text-sm uppercase tracking-wide[^"]*"\s*>\s*\{submitting \? "Logging in" : "Log in"\}/,
  );
  assert.match(
    loginSource,
    /className="w-full ftc-btn-primary px-4 py-3 text-sm tracking-wide[^"]*"\s*>\s*\{submitting \? "Logging in" : "Log in"\}/,
  );
  assert.match(
    loginSource,
    /className="w-full ftc-btn-primary px-4 py-3 text-sm uppercase tracking-wide[^"]*"\s*>\s*\{submitting \? "Saving" : "Update password"\}/,
  );

  // Browser/page title has no AI marketing wording -- single global metadata source for
  // the whole app (no other route defines its own `metadata`), so this also covers the
  // login page's own browser tab title.
  assert.match(layoutSource, /title: "Follow The Crowd"/);
  assert.doesNotMatch(layoutSource, /Plan Better Events with AI/);
  assert.doesNotMatch(layoutSource, /AI-powered/);

  // Email/password fields already had correct autocomplete/type/keyboard attributes --
  // locked in here so they can't silently regress.
  assert.match(loginSource, /type="email"[\s\S]{0,200}autoComplete="email"/);
  assert.match(loginSource, /type="password"[\s\S]{0,200}autoComplete="current-password"/);

  // Sign up link: only "Sign up" itself is a link, the surrounding sentence is plain text.
  assert.match(loginSource, /Don&apos;t have an account\?\{" "\}/);
  assert.match(loginSource, /<Link[\s\S]{0,80}href=\{SIGNUP_PATH\}[\s\S]{0,120}>\s*Sign up\s*<\/Link>/);

  // Login submit is guarded against duplicate submission (e.g. re-triggering the form via
  // Enter while a request is already in flight, which bypasses the disabled submit button).
  assert.match(
    loginSource,
    /async function handleLoginSubmit[\s\S]{0,120}if \(submitting\) \{\s*return;\s*\}/,
  );

  // Auth errors are translated to plain-English copy instead of raw Supabase wording
  // (e.g. "Invalid login credentials") for the two most common login failures, while still
  // falling back to the underlying message for anything unmapped.
  assert.match(loginSource, /import \{ isAuthApiError \} from "@supabase\/supabase-js"/);
  assert.match(loginSource, /error\.code === "invalid_credentials"/);
  assert.match(loginSource, /"Incorrect email or password"/);
  assert.match(loginSource, /error\.code === "email_not_confirmed"/);

  // Obsolete floating decorative tile stack (the old AI-themed mockup cards) must stay
  // removed from the login screen -- background is just the dark bg plus the centered card.
  assert.doesNotMatch(loginSource, /FtcBrandMotionLazy/);
}

/**
 * Root-cause regression test for "Event Plan Notes with a lot of text can't be
 * scrolled — text near the bottom is clipped and unreachable" (iPhone Safari).
 *
 * The Notes textarea is height-capped at 8 rows (`max-height`) and auto-grows
 * from 4 rows via `useBoundedAutoGrowTextarea`. It also had
 * `overflow-y: hidden !important`, so everything past the cap was painted out
 * of existence with no way to scroll to it. Worse, the hook re-applied
 * `textarea.style.overflowY = "hidden"` inline on every value change and every
 * resize, so the two enforced it independently.
 *
 * A capped-height textarea must scroll internally; `hidden` + `max-height` is
 * always a content-loss bug, never a valid combination. This locks in that
 * neither half can reintroduce it, and that touch scrolling at either end of
 * the field doesn't chain to the page behind it.
 */
/**
 * Run Sheet save UX: the Save button appears only when there is something to
 * save, and the confirmation is the shared top notification rather than a
 * message parked inside the card.
 *
 * The dirty check is a signature of everything a planner can change — which
 * DJs are on the sheet, the order they run in, and each row's editable fields.
 * `sort_order` is excluded on purpose: `reorderRunSheetRows` derives it from
 * array position, so including it would only restate the order.
 */
/**
 * Initial-load dirty state: opening an event that already has an accepted DJ on
 * the run sheet, touching nothing, must NOT show the Save button.
 *
 * The invariant that guarantees this is in `syncAcceptedDjs`: every path that
 * ends with the rows actually being in the database returns the *same* value
 * for `rows` and `persistedRows`, so `hasUnsavedRunSheetEdits(savedRows, rows)`
 * compares a value with itself and is necessarily false. The one path that
 * deliberately returns different values is the `catch` -- the accepted-DJ
 * auto-add failed to persist, so the rows really are local-only and must read
 * as unsaved so the planner can save them by hand.
 *
 * These assertions pin both halves of that: the value-level dirty check for the
 * row shapes each path produces, and the structural shape of the sync function
 * itself, so a future refactor can't quietly start returning two separately
 * built arrays (which would false-dirty on load even when they're equal today).
 */
function testRunSheetInitialLoadIsNotDirty() {
  const persistedRow = (id: string, overrides: Partial<RunSheetRowInput> = {}): RunSheetRowInput => ({
    id,
    sort_order: 0,
    artist_name: `DJ ${id}`,
    start_time: "9:00 PM",
    finish_time: "10:00 PM",
    stage_area: "Main",
    notes: "",
    booking_request_id: `br-${id}`,
    booking_recipient_id: `u-${id}`,
    ...overrides,
  });

  // (1) Existing persisted run sheet, nothing edited. Both sides come from the
  // same load, so the button stays hidden.
  const loaded = reorderRunSheetRows([persistedRow("a")]);
  assert.equal(
    hasUnsavedRunSheetEdits(loaded, loaded),
    false,
    "a persisted accepted DJ must not read as unsaved on first load",
  );

  // (2) Accepted DJ auto-added AND successfully persisted during the initial
  // sync: the DB round-trip result becomes both the displayed rows and the
  // baseline, so it is still clean.
  const persistedAfterAutoAdd = reorderRunSheetRows([persistedRow("a"), persistedRow("b")]);
  assert.equal(
    hasUnsavedRunSheetEdits(persistedAfterAutoAdd, persistedAfterAutoAdd),
    false,
    "an accepted DJ that auto-persisted during sync must not read as unsaved",
  );

  // (3) Auto-add failed to persist: the extra row exists only in the browser,
  // so it must stay dirty and keep the Save button available.
  const localOnly = reorderRunSheetRows([
    persistedRow("a"),
    { ...persistedRow("b"), id: undefined },
  ]);
  assert.equal(
    hasUnsavedRunSheetEdits(loaded, localOnly),
    true,
    "a local-only accepted DJ after a failed auto-add must read as unsaved",
  );

  // (4) Normalisation must never manufacture a dirty state. Same content, but
  // nullish where the other side has "" (the two row producers differ:
  // mapRunSheetRowsFromDb passes the column through, createEmptyRunSheetRow
  // always uses ""), plus a differing derived sort_order.
  const nullish = [
    {
      ...persistedRow("a"),
      notes: null as unknown as string,
      stage_area: null as unknown as string,
      start_time: undefined as unknown as string,
      finish_time: undefined as unknown as string,
      sort_order: 99,
    },
  ];
  const emptyStrings = [
    {
      ...persistedRow("a"),
      notes: "",
      stage_area: "",
      start_time: "",
      finish_time: "",
      sort_order: 0,
    },
  ];
  assert.equal(
    hasUnsavedRunSheetEdits(nullish, emptyStrings),
    false,
    "null/undefined vs empty string is a storage detail, not a planner edit",
  );

  // Real differences in those same fields must still register, so the
  // coalescing above can't be masking genuine edits.
  assert.equal(
    hasUnsavedRunSheetEdits(emptyStrings, [{ ...emptyStrings[0], notes: "load in at 8" }]),
    true,
    "a real note is still an edit",
  );

  const sectionSource = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Structural half: the sync contract. Both success paths hand back one value
  // used for both fields; only the catch builds them separately.
  assert.match(sectionSource, /return \{ rows: unchanged, persistedRows: unchanged \}/);
  assert.match(sectionSource, /return \{ rows: persisted, persistedRows: persisted \}/);
  assert.match(sectionSource, /persistedRows: currentFiltered\(\)/);

  // The baseline is seeded from the sync's persisted result, never from the
  // displayed rows -- seeding it from `synced.rows` would make a failed
  // auto-add look saved and silently drop the planner's only way to retry.
  assert.match(sectionSource, /setRows\(synced\.rows\);\s*setSavedRows\(synced\.persistedRows\);/);
}

/**
 * Run Sheet Notes: capped at 500 characters and 6 visible rows, scrolling
 * inside the field beyond that, so one set's notes can't stretch its card down
 * the page.
 *
 * The 6-row ceiling is measured from the element's own computed line-height in
 * JS rather than a CSS `max-height: calc(6lh ...)`: `lh` needs Safari 16.4+,
 * and on older iOS the declaration is dropped entirely, which would restore the
 * unbounded growth this cap exists to prevent (the same trap that produced the
 * profile bio bug).
 */
/**
 * Run Sheet Stage / Area and Notes share one sizing architecture: a base class
 * plus a row-count modifier that pins height, min-height and max-height to the
 * same value. Stage / Area is 2 rows and 50 characters; Notes is 4 rows and 500.
 *
 * Pinning, not capping, is the point. Earlier attempts set only `max-height`
 * and left an auto-grow effect free to write an inline `height` beneath it, so
 * the rendered row count depended on that JS agreeing with the CSS. It didn't:
 * the JS built its ceiling by measuring `line-height` at runtime and skipped
 * the clamp entirely when the measurement wasn't numeric, which is exactly what
 * happened above the 639px breakpoint with no line-height source applying -- it
 * computed to `normal`, `parseFloat` returned NaN, and the field grew to fit
 * its text. There is now no JS sizing at all, so nothing can disagree.
 */
function testRunSheetTextareasArePinnedToTheirRowCounts() {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  const base = css.match(/\.ftc-run-sheet-textarea \{[^}]*\}/)?.[0] ?? "";
  assert.ok(base, "the shared Run Sheet textarea rule must exist");

  // One declared line-height, as a length. Tailwind's `leading-*` multipliers
  // and the <=639px zoom-prevention rule were competing for this, so the row
  // advance differed by breakpoint and by engine.
  assert.match(base, /line-height: 1\.5rem !important/);
  assert.match(base, /overflow-y: auto !important/);
  assert.match(base, /overscroll-behavior: contain/);
  assert.match(base, /resize: none !important/);
  assert.match(base, /box-sizing: border-box !important/);
  // font-size stays with the <=639px rule so iOS keeps not zooming on focus.
  assert.doesNotMatch(base, /font-size/);

  for (const rows of [2, 4]) {
    const rule =
      css.match(new RegExp("\\.ftc-run-sheet-textarea-" + rows + " \\{[^}]*\\}"))?.[0] ?? "";
    assert.ok(rule, `the ${rows}-row modifier must exist`);

    // Exact border-box arithmetic: N rows x 1.5rem + py-1.5 + the 1px borders.
    // Asserted as the literal calc so a future edit cannot quietly change the
    // row count. Plain calc(), never `Nlh`: that unit needs Safari 16.4+ and
    // older iOS drops the whole declaration, taking the pin with it.
    const value = `calc(${rows} * 1.5rem + 0.75rem + 2px)`;
    // Compared as whole declarations, not substrings: `min-height: ...` ends
    // with `height: ...`, so a substring check would let a wrong `height` pass
    // on the strength of its own `min-height` line.
    const declarations = rule.split("\n").map((line) => line.trim());
    for (const property of ["height", "min-height", "max-height"]) {
      assert.ok(
        declarations.includes(`${property}: ${value} !important;`),
        `the ${rows}-row modifier must pin ${property} to the ${rows}-row value`,
      );
    }
    // `!important` is load-bearing: an author !important declaration outranks
    // an inline style.height, so nothing can lift the field off its row count.
    assert.ok((rule.match(/!important/g) ?? []).length >= 3);
    assert.doesNotMatch(rule, /lh\b/);
  }

  // Both fields compose the same base with their own modifier.
  const stageClass = section.match(/const stageAreaTextareaClassName = `[^`]*`/)?.[0] ?? "";
  const notesClass = section.match(/const notesTextareaClassName = `[^`]*`/)?.[0] ?? "";
  assert.ok(stageClass.includes("ftc-run-sheet-textarea-2"));
  assert.ok(notesClass.includes("ftc-run-sheet-textarea-4"));
  assert.match(section, /"ftc-textarea ftc-run-sheet-textarea /);

  // No second opinion about the height may ride along on either field.
  assert.doesNotMatch(stageClass, /min-h-\[/);
  assert.doesNotMatch(stageClass, /leading-/);
  assert.doesNotMatch(notesClass, /min-h-\[/);
  assert.doesNotMatch(notesClass, /leading-/);

  // The pinned-height/scroll-box treatment now applies ONLY to the editable
  // textareas asserted above. A later polish pass deliberately moved the
  // read-only side of Stage / Area onto the same show-more/less, no-scroll
  // component as Notes (see testRunSheetAccordionRestructure for that half);
  // `RunSheetReadOnlyText`, the component that used to compose this pair for
  // read-only Stage / Area, is gone rather than left unused, so it can't
  // quietly come back into service.
  assert.doesNotMatch(section, /function RunSheetReadOnlyText\(/);
  assert.doesNotMatch(section, /RunSheetReadOnlyText/);

  // The auto-grow machinery is gone, not merely bypassed: no inline height, no
  // runtime line-height measurement, no silent path that skips the cap.
  assert.doesNotMatch(section, /RunSheetAutoGrowTextarea/);
  assert.doesNotMatch(section, /expandWhenWrapped/);
  assert.doesNotMatch(section, /style\.height/);
  assert.doesNotMatch(section, /RUN_SHEET_TEXTAREA_LINE_HEIGHT_PX/);
  assert.doesNotMatch(section, /lineHeight/);

  // One shared field component owns the cap and the counter for both fields.
  assert.match(section, /function RunSheetCappedTextarea\(/);
  assert.match(section, /countUnicodeCharacters\(value\)/);
  assert.match(section, /ftc-form-notes-counter/);

  // Row counts and character caps.
  assert.match(section, /const RUN_SHEET_NOTES_VISIBLE_ROWS = 4;/);
  assert.match(section, /const RUN_SHEET_STAGE_AREA_VISIBLE_ROWS = 2;/);
  assert.match(section, /const RUN_SHEET_STAGE_AREA_MAX_LENGTH = 50;/);
  assert.match(section, /maxLength=\{MAX_EVENT_NOTES_LENGTH\}/);
  assert.match(section, /maxLength=\{RUN_SHEET_STAGE_AREA_MAX_LENGTH\}/);

  const notesLib = readFileSync(new URL("../lib/events/eventNotes.ts", import.meta.url), "utf8");
  assert.match(notesLib, /MAX_EVENT_NOTES_LENGTH = 500/);
}

/**
 * Hard line caps: Stage / Area holds 2 explicit lines, Notes holds 4 — the same
 * counts those fields display, so neither can hide a line the user has to
 * scroll to find. Internal scrolling still exists for wrapped long lines.
 *
 * Both entry routes are covered because both exist. Return has to be stopped
 * before it inserts (truncating afterwards would leave the caret on a line that
 * then vanishes); everything that replaces the value wholesale — paste,
 * drag-and-drop, dictation, autofill — is truncated in `onChange`. A cap on one
 * route only is not a cap.
 *
 * This reuses `applyCappedMultilineInputLimit`/`shouldBlockMultilineEnter`,
 * already behind the booking rate note and the profile bio, rather than a
 * fourth copy of split/slice/join.
 */
function testRunSheetFieldsEnforceHardLineLimits() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Wired to the shared helper, not a local reimplementation.
  assert.match(section, /from "@\/lib\/cappedMultilineInput"/);
  assert.match(section, /shouldBlockMultilineEnter\(value, rows\)/);
  assert.match(
    section,
    /applyCappedMultilineInputLimit\(\s*value,\s*event\.target\.value,\s*rows,\s*maxLength,?\s*\)/,
  );
  assert.doesNotMatch(section, /split\("\\n"\)/);

  // The Return guard must sit behind the IME check: mid-composition Return
  // commits a candidate rather than inserting a newline.
  assert.match(
    section,
    /event\.key !== "Enter" \|\| event\.nativeEvent\.isComposing/,
  );

  // `rows` is both the displayed row count and the line cap, so the two cannot
  // drift apart; the row counts themselves are asserted above.
  assert.match(section, /rows=\{RUN_SHEET_NOTES_VISIBLE_ROWS\}/);
  assert.match(section, /rows=\{RUN_SHEET_STAGE_AREA_VISIBLE_ROWS\}/);

  const stage = { maxLines: 2, maxLength: 50 };
  const notes = { maxLines: 4, maxLength: 500 };

  for (const [label, caps] of [
    ["Stage / Area", stage],
    ["Notes", notes],
  ] as const) {
    const { maxLines, maxLength } = caps;

    // Return does nothing once the field already holds its maximum lines.
    const atCap = Array.from({ length: maxLines }, (_, index) => `line ${index}`).join("\n");
    assert.equal(shouldBlockMultilineEnter(atCap, maxLines), true, `${label}: Enter at cap`);
    assert.equal(
      shouldBlockMultilineEnter(atCap.split("\n").slice(0, -1).join("\n"), maxLines),
      false,
      `${label}: Enter below cap`,
    );

    // A paste of far more lines keeps the first `maxLines`, rather than being
    // rejected outright — silently dropping the whole paste reads as a bug.
    const pasted = Array.from({ length: maxLines * 3 }, (_, index) => `l${index}`).join("\n");
    const limited = applyCappedMultilineInputLimit("", pasted, maxLines, maxLength);
    assert.equal(countExplicitLines(limited ?? ""), maxLines, `${label}: pasted line count`);
    assert.equal(
      limited,
      pasted.split("\n").slice(0, maxLines).join("\n"),
      `${label}: pasted content is the FIRST lines`,
    );

    // The character cap still applies, and applies after truncation: lines are
    // dropped first so the budget is spent on text the user keeps.
    const overLong = "x".repeat(maxLength + 20);
    assert.equal(
      countUnicodeCharacters(applyCappedMultilineInputLimit("", overLong, maxLines, maxLength) ?? ""),
      maxLength,
      `${label}: character cap`,
    );
    const longLines = Array.from({ length: maxLines + 2 }, () => "y".repeat(maxLength)).join("\n");
    const both = applyCappedMultilineInputLimit("", longLines, maxLines, maxLength) ?? "";
    assert.equal(countUnicodeCharacters(both), maxLength, `${label}: both caps`);
    assert.ok(both.startsWith("y"), `${label}: kept the first line, not a later one`);

    // Content saved before the cap existed is not rewritten on load or on the
    // first keystroke; it can only be reduced.
    const legacy = Array.from({ length: maxLines + 2 }, (_, index) => `old ${index}`).join("\n");
    assert.equal(
      applyCappedMultilineInputLimit(legacy, `${legacy}\nmore`, maxLines, maxLength),
      null,
      `${label}: legacy value cannot grow`,
    );
    const reduced = legacy.split("\n").slice(0, -1).join("\n");
    assert.equal(
      applyCappedMultilineInputLimit(legacy, reduced, maxLines, maxLength),
      reduced,
      `${label}: legacy value can be reduced`,
    );
  }
}

/**
 * `computeRunSheetSetLabels` is the grouping/numbering behind the "SET 1" /
 * "SET 2" badges: null for a DJ with one entry (nothing to disambiguate),
 * "Set N" in the sheet's own running order for a DJ with several, grouped
 * by resolved profile id and falling back to the typed artist name (case-
 * insensitively) for legacy/unassigned rows -- the same identity rule
 * `mergeAcceptedDjsIntoRunSheetRows` already uses to avoid double-adding a
 * DJ, so a row that looks like a duplicate to one is treated as a duplicate
 * by the other.
 */
function testRunSheetSetLabelGrouping() {
  const row = (
    id: string,
    overrides: Partial<RunSheetRowInput> = {},
  ): RunSheetRowInput => ({
    id,
    sort_order: 0,
    artist_name: "",
    start_time: "",
    finish_time: "",
    stage_area: "",
    notes: "",
    ...overrides,
  });

  // A single set gets no label at all -- the label exists only to
  // disambiguate, and one entry needs no disambiguating.
  const single = [row("a", { booking_recipient_id: "u-1" })];
  assert.deepEqual(
    [...computeRunSheetSetLabels(single, [], new Map()).values()],
    [null],
  );

  // Two different DJs, one entry each: both null, not "Set 1" twice.
  const twoDjsOneEach = [
    row("a", { booking_recipient_id: "u-1" }),
    row("b", { booking_recipient_id: "u-2" }),
  ];
  const twoDjsLabels = computeRunSheetSetLabels(twoDjsOneEach, [], new Map());
  assert.equal(twoDjsLabels.get("a"), null);
  assert.equal(twoDjsLabels.get("b"), null);

  // The same DJ (by profile id) three times, numbered in array order.
  const sameDjThrice = [
    row("a", { booking_recipient_id: "u-1" }),
    row("b", { booking_recipient_id: "u-1" }),
    row("c", { booking_recipient_id: "u-1" }),
  ];
  const thriceLabels = computeRunSheetSetLabels(sameDjThrice, [], new Map());
  assert.equal(thriceLabels.get("a"), "Set 1");
  assert.equal(thriceLabels.get("b"), "Set 2");
  assert.equal(thriceLabels.get("c"), "Set 3");

  // Another DJ interleaved between the repeated one's sets must not disturb
  // their numbering, and must itself stay unlabelled.
  const interleaved = [
    row("a", { booking_recipient_id: "u-1" }),
    row("x", { booking_recipient_id: "u-9" }),
    row("b", { booking_recipient_id: "u-1" }),
  ];
  const interleavedLabels = computeRunSheetSetLabels(interleaved, [], new Map());
  assert.equal(interleavedLabels.get("a"), "Set 1");
  assert.equal(interleavedLabels.get("x"), null);
  assert.equal(interleavedLabels.get("b"), "Set 2");

  // Legacy rows with no linked booking group by artist name, case-
  // insensitively -- the same fallback `runSheetRowMatchesAcceptedBooking`
  // uses, so a row this treats as "the same DJ" is one the merge logic
  // would also recognise as already present.
  const legacySameName = [
    row("a", { artist_name: "Nova" }),
    row("b", { artist_name: "NOVA" }),
  ];
  const legacyLabels = computeRunSheetSetLabels(legacySameName, [], new Map());
  assert.equal(legacyLabels.get("a"), "Set 1");
  assert.equal(legacyLabels.get("b"), "Set 2");

  // Two legacy rows with DIFFERENT names must not be grouped together.
  const legacyDifferentNames = [
    row("a", { artist_name: "Nova" }),
    row("b", { artist_name: "Solstice" }),
  ];
  const legacyDifferentLabels = computeRunSheetSetLabels(legacyDifferentNames, [], new Map());
  assert.equal(legacyDifferentLabels.get("a"), null);
  assert.equal(legacyDifferentLabels.get("b"), null);

  // A fully empty row (no booking, no artist name -- an as-yet-unassigned
  // slot) groups with other equally-empty rows via the row-id fallback key,
  // which is unique per row, so empty rows never label each other.
  const twoEmpty = [row("a"), row("b")];
  const emptyLabels = computeRunSheetSetLabels(twoEmpty, [], new Map());
  assert.equal(emptyLabels.get("a"), null);
  assert.equal(emptyLabels.get("b"), null);
}

/**
 * The polish pass that turned the Run Sheet's always-expanded table (desktop)
 * and card list (mobile) into one accordion list, used identically at every
 * viewport:
 *
 * - No "DJ" field label -- the avatar and name already say what it is.
 * - "Set N" only rendered when `setLabel` is non-null (asserted by logic in
 *   testRunSheetSetLabelGrouping above).
 * - Collapsed, the header shows only a one-line Stage / Area preview (no
 *   Set Time, no Notes) alongside the avatar, name and chevron, unconditional
 *   -- NOT inside the `AnimatedExpandPanel` -- so it is visible collapsed and
 *   expanded alike. See testRunSheetChromeReduction for the follow-up polish
 *   pass that dropped Set Time from this line entirely.
 * - Each entry is one `AnimatedExpandPanel` (the same primitive extracted
 *   from `BookingRequestCard` for its own card-level expand, reused here
 *   rather than a second smooth-collapse implementation), and the section
 *   holds exactly one `expandedRowId`, so opening one entry collapses
 *   whatever else was open.
 * - Read-only Notes hides completely when empty and shows a real show-
 *   more/less control when it doesn't, by reusing `BookingCardExpandableNotes`
 *   -- the same component already behind DM booking notes and the rate
 *   proposal panel -- rather than a second implementation of that pattern.
 *   Editing keeps the original pinned-height, internally-scrolling textarea:
 *   requirement 6 asks to remove scrolling from the read-only view
 *   specifically, not from editing, where the scroll is load-bearing for the
 *   row cap.
 * - The desktop `<table>` and the separate `lg:hidden` mobile card block are
 *   both gone; there is exactly one render path.
 */
function testRunSheetAccordionRestructure() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // No standalone "DJ" field label. (`RunSheetRowDjDisplay`/`dj.displayName`
  // etc. are excluded by requiring the label to be alone between tags.)
  assert.doesNotMatch(section, />\s*DJ\s*</);

  // One list, not a desktop table plus a separate mobile block.
  assert.doesNotMatch(section, /<table/);
  assert.doesNotMatch(section, /table-fixed/);
  assert.doesNotMatch(section, /lg:hidden/);
  assert.doesNotMatch(section, /lg:block/);

  // The collapsed header no longer previews Stage / Area on its own -- that
  // bare preview duplicated the value one tap away in the expanded panel
  // (see testRunSheetVisualHierarchyPolish). It now carries a combined
  // collapsed-only summary plus the "Run Sheet details pending" fallback for
  // a read-only, incomplete row (see testRunSheetDensityAndSummaryPolish).
  // What this test still pins is placement: both live in the header, before
  // the expand panel in source, never inside it.
  const entryFn = section.match(/function RunSheetEntry\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(entryFn, "RunSheetEntry must exist");
  assert.doesNotMatch(entryFn, /stagePreview \|\|/);
  const panelIndex = entryFn.indexOf("<AnimatedExpandPanel");
  // Searched by regex, not a single-line `indexOf`: the surrounding ternary
  // is multi-line and its exact wrapping is a formatting detail.
  const fallbackIndex = entryFn.search(/"Run Sheet details pending"/);
  const summaryIndex = entryFn.search(/collapsedSummary\s*$/m);
  assert.ok(fallbackIndex > -1 && panelIndex > -1 && fallbackIndex < panelIndex);
  assert.ok(summaryIndex > -1 && summaryIndex < panelIndex);

  // Exactly one row open at a time when browsing: toggling the open row
  // closes it, toggling any other row replaces it -- not additive. Overridden
  // wholesale during editing -- see testRunSheetEditMode.
  assert.match(section, /const \[expandedRowId, setExpandedRowId\] = useState<string \| null>\(null\)/);
  assert.match(
    section,
    /setExpandedRowId\(\(current\) => \(current === rowId \? null : rowId\)\)/,
  );
  assert.match(section, /isExpanded=\{isEditing \|\| expandedRowId === row\.id\}/);

  // Editable Notes keeps its pinned-height, internally-scrolling textarea --
  // this task removes read-only scrolling, not editing's.
  assert.match(
    section,
    /\{canEdit \? \(\s*<label className="block">[\s\S]{0,220}Notes[\s\S]{0,220}<RunSheetCappedTextarea/,
  );

  // Read-only Notes: hidden entirely when empty, otherwise the shared
  // show-more/less component, reset by the row's own expanded state.
  assert.match(
    section,
    /: row\.notes\.trim\(\) \? \(\s*<BookingCardExpandableNotes notes=\{row\.notes\} label="Notes" detailsOpen=\{isExpanded\} \/>\s*\) : null/,
  );
  assert.match(section, /import BookingCardExpandableNotes from "@\/app\/components\/booking\/BookingCardExpandableNotes"/);

  // The animated panel is the shared primitive, not a local reimplementation.
  assert.match(section, /import AnimatedExpandPanel from "@\/app\/components\/AnimatedExpandPanel"/);
  assert.match(section, /<AnimatedExpandPanel open=\{isExpanded\}>/);

  // The expanded panel's field list is plain block flow (`space-y-3`), not a
  // CSS grid. Caught live, not by a regex: with `grid`, `BookingCardExpandable
  // Notes`'s root becomes an unconstrained grid item, sized by its content's
  // min-content width -- and a Notes value with no natural wrap point (one
  // long unbroken run) has no upper bound on that width. Measured directly:
  // the notes `<p>` rendered 3086px wide in a 317px panel, silently CLIPPED
  // by the panel's own `overflow-x-hidden` rather than wrapping, and because
  // an unwrapped single line never exceeds its own line-clamp, the "Show
  // more" control never appeared either -- content past the visible edge was
  // simply gone, not truncated-with-an-escape-hatch. A block box's width
  // comes from its containing block, not its content, so it cannot be pulled
  // wide by anything inside it -- which is also why `BookingRequestCard`'s
  // own existing use of the same `BookingCardExpandableNotes` component,
  // inside a plain block wrapper rather than a grid, was never at risk.
  // Exact spacing is owned by testRunSheetHeaderAlignmentAndDensity; what
  // matters here is only that it stays a `space-y-*` block stack and never
  // becomes a grid, for the clipping reason above. Matched generically so a
  // future density tweak doesn't have to touch this test at all.
  assert.match(section, /className="space-y-[\d.]+ pt-[\d.]+"/);
  assert.doesNotMatch(section, /className="grid gap-[\d.]+ pt-[\d.]+"/);

  // Tightened spacing: the collapsed card and the list gap are both smaller
  // than the pre-restructure values (`p-4` card, `space-y-3` list). The card
  // class is now a template literal (an incomplete row conditionally adds
  // `opacity-75`; see testRunSheetProductionPolish), so match the base
  // classes rather than a single literal string.
  // Card padding is now per-axis (`px-3 pt-2.5 pb-2`, see
  // testRunSheetHeaderAlignmentAndDensity) rather than a uniform `p-3`; the
  // enduring rule is that it is tighter than the pre-restructure `p-4`.
  assert.match(
    section,
    /`ftc-card px-3 pt-[\d.]+ pb-[\d.]+ \$\{isReadOnlyAndIncomplete \? "opacity-75" : ""\}`/,
  );
  assert.match(section, /"mt-5 space-y-2"/);
  assert.doesNotMatch(section, /"ftc-card p-4"/);

  // The chevron rotates with expanded state and is marked decorative.
  assert.match(section, /function RunSheetExpandChevron/);
  assert.match(section, /expanded \? "rotate-180" : ""/);
  assert.match(section, /aria-hidden="true"/);

  const animatedExpandPanelSource = readFileSync(
    new URL("../app/components/AnimatedExpandPanel.tsx", import.meta.url),
    "utf8",
  );
  // Reused by BookingRequestCard too -- not duplicated for the Run Sheet.
  assert.match(animatedExpandPanelSource, /export default function AnimatedExpandPanel/);
  const bookingRequestCardSource = readFileSync(
    new URL("../app/components/BookingRequestCard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bookingRequestCardSource, /<AnimatedExpandPanel open=\{expanded\}/);
}

/**
 * Second polish pass on the accordion above: strip remaining chrome so the
 * read-only view reads as event information rather than an editable form,
 * and compact the collapsed row further.
 *
 * - The "Read-only view for accepted crew" subtitle, and the `readOnlyHint`
 *   prop that controlled it, are gone outright rather than defaulted to
 *   empty -- it had exactly one caller and no purpose once the copy under
 *   it is deleted, so keeping the prop around would just be a second way to
 *   spell "do nothing" that a future edit could rediscover and populate.
 * - The collapsed header preview is Stage / Area alone: Set Time moved to
 *   be expanded-only content, on the reasoning that a DJ scanning a large
 *   sheet is looking for their own name and where they're playing, not
 *   comparing times across dozens of rows at a glance.
 * - Stage / Area read-only reuses `BookingCardExpandableNotes` exactly like
 *   Notes -- same show-more/less, same no-scrollbar guarantee, same
 *   hide-when-empty -- rather than the pinned-height scroll box it used to
 *   compose (`RunSheetReadOnlyText`, removed; see
 *   testRunSheetTextareasArePinnedToTheirRowCounts). It asks for a 2-line
 *   preview via the component's new `previewLines` prop instead of the
 *   3-line default, added specifically for this: a template-literal class
 *   name (`` `line-clamp-${previewLines}` ``) would not be visible to
 *   Tailwind's static scan, so both `line-clamp-2` and `line-clamp-3` are
 *   written as literal strings in a lookup rather than interpolated.
 * - Set Time read-only drops its bordered/background box for plain
 *   typography -- it's a single short fixed string that can't overflow two
 *   lines, so unlike Stage / Area and Notes it needs no show-more pattern,
 *   just less chrome. `readOnlyTextClassName`, the prop that supplied that
 *   box (and, before this pass, was reused for Stage / Area and DJ identity
 *   too), no longer has a consumer and is removed rather than left unused.
 * - Information order when expanded stays Stage / Area, then Set Time, then
 *   Notes -- the order a DJ actually consumes it in before playing.
 */
function testRunSheetChromeReduction() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // The subtitle and everything that controlled it are gone, not merely
  // defaulted away.
  assert.doesNotMatch(section, /Read-only view for accepted crew/);
  assert.doesNotMatch(section, /readOnlyHint/);
  assert.doesNotMatch(section, /EVENT_DETAIL_SECTION_SUBTITLE_CLASS/);

  const pageSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(pageSource, /readOnlyHint/);

  // The unused chrome class is gone, not just unreferenced.
  assert.doesNotMatch(section, /readOnlyTextClassName/);

  // This pass moved Set Time out of the collapsed header and left Stage /
  // Area alone there. Both halves were later reworked again: the bare Stage /
  // Area preview went away (it duplicated the expanded panel), and Set Time
  // came *back* deliberately, as one half of the combined
  // "Front room · 9:00 PM – 1:00 AM" summary line -- see
  // testRunSheetDensityAndSummaryPolish, which owns that behaviour now. What
  // survives from this pass is the narrower rule that still holds: Notes is
  // never surfaced in the collapsed header, only where and when.
  const entryFn = section.match(/function RunSheetEntry\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(entryFn, "RunSheetEntry must exist");
  assert.match(entryFn, /const stagePreview = row\.stage_area\.trim\(\);/);
  const headerButton = entryFn.match(/<button[\s\S]*?onToggleExpanded[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.ok(headerButton, "the collapsed header toggle button must exist");
  assert.doesNotMatch(headerButton, /row\.notes/);

  // Stage / Area read-only: same pattern as Notes, 2-line preview, hidden
  // when empty, no pinned-height scroll box.
  assert.match(
    section,
    /stagePreview \? \(\s*<BookingCardExpandableNotes\s*\n\s*notes=\{row\.stage_area\}\s*\n\s*label="Stage \/ Area"\s*\n\s*detailsOpen=\{isExpanded\}\s*\n\s*previewLines=\{2\}\s*\n\s*\/>\s*\) : null/,
  );

  // Set Time read-only is plain typography -- no bordered/background box.
  // Exact size/weight/colour were dialled back a tier by
  // testRunSheetVisualHierarchyPolish; still no border/background.
  assert.match(section, /\{hasValue \? readOnlyDisplay : "—"\}/);
  assert.doesNotMatch(section, /rounded-lg border border-ftc-border bg-ftc-bg-elevated\/30/);

  // Information order in the expanded panel: Stage / Area, then Set Time,
  // then Notes.
  const panelBody = entryFn.match(/<div className="space-y-[\d.]+ pt-[\d.]+">([\s\S]*?)<\/AnimatedExpandPanel>/)?.[1] ?? "";
  const stageIndex = panelBody.indexOf("Stage / Area");
  const setTimeIndex = panelBody.indexOf("RunSheetSetTimeField");
  const notesIndex = panelBody.lastIndexOf("Notes");
  assert.ok(
    stageIndex > -1 && stageIndex < setTimeIndex && setTimeIndex < notesIndex,
    "expanded panel must present Stage / Area, then Set Time, then Notes",
  );

  // BookingCardExpandableNotes' preview length is configurable without a
  // template-literal class name, which Tailwind's static scan can't see.
  const notesComponentSource = readFileSync(
    new URL("../app/components/booking/BookingCardExpandableNotes.tsx", import.meta.url),
    "utf8",
  );
  assert.match(notesComponentSource, /previewLines\s*=\s*3/);
  assert.match(
    notesComponentSource,
    /const lineClampClass = previewLines === 2 \? "line-clamp-2" : "line-clamp-3";/,
  );
}

/**
 * A hard line cap and a character cap say nothing about a single long
 * unbroken token -- a pasted URL, a run of the same character, a venue name
 * with no spaces. That still needs to wrap inside the fixed-height box rather
 * than either growing it or overflowing it horizontally, in the editable
 * textarea (the only remaining consumer of this class -- the read-only path
 * now goes through `BookingCardExpandableNotes`'s own wrap handling instead;
 * see testRunSheetChromeReduction).
 *
 * `.ftc-run-sheet-textarea` carries the fix, reusing the exact
 * `min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break:
 * break-word;` combination already used by `.ftc-event-detail-notes-text`
 * and its siblings for the same problem elsewhere in the app, rather than a
 * fifth copy of it. `overflow-wrap: anywhere` (not `break-word` alone, which
 * `className` also carries via Tailwind's `break-words`) is load-bearing: a
 * `break-word` value does not reduce an element's min-content contribution,
 * so a flex/grid/table-cell ancestor sized by content can still be pulled
 * wide by the unbroken token even though the text itself would wrap once
 * space ran out. `anywhere` does reduce it, which is what stops the
 * ancestor -- the summary line's `flex-1` cell, a `grid` field wrapper in the
 * expanded panel -- from being forced wider in the first
 * place.
 */
function testRunSheetFieldsWrapLongUnbrokenTokens() {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const base = css.match(/\.ftc-run-sheet-textarea \{[^}]*\}/)?.[0] ?? "";

  assert.match(base, /min-width: 0;/);
  assert.match(base, /max-width: 100%;/);
  assert.match(base, /overflow-wrap: anywhere;/);
  assert.match(base, /word-break: break-word;/);
  // These are layout safety, not the row pin -- they must not fight it or
  // require `!important` to win, since nothing else sets them on this class.
  assert.doesNotMatch(base, /overflow-wrap: anywhere !important/);
}

function testRunSheetDirtyStateAndSaveFeedback() {
  const row = (id: string, overrides: Partial<RunSheetRowInput> = {}): RunSheetRowInput => ({
    id,
    sort_order: 0,
    artist_name: `DJ ${id}`,
    start_time: "9:00 PM",
    finish_time: "10:00 PM",
    stage_area: "Main",
    notes: "",
    booking_request_id: `br-${id}`,
    booking_recipient_id: `u-${id}`,
    ...overrides,
  });

  const saved = reorderRunSheetRows([row("a"), row("b")]);

  assert.equal(hasUnsavedRunSheetEdits(saved, saved), false);
  assert.equal(hasUnsavedRunSheetEdits(saved, [...saved]), false, "a fresh array of the same rows is clean");

  for (const patch of [
    { stage_area: "Terrace" },
    { notes: "b2b set" },
    { start_time: "10:00 PM" },
    { finish_time: "11:30 PM" },
    { artist_name: "Renamed" },
  ]) {
    const next = saved.map((current, index) => (index === 0 ? { ...current, ...patch } : current));
    assert.equal(
      hasUnsavedRunSheetEdits(saved, next),
      true,
      `editing ${Object.keys(patch)[0]} must show the Save button`,
    );
  }

  assert.equal(hasUnsavedRunSheetEdits(saved, moveRunSheetRow(saved, "b", "up")), true, "reorder is a change");
  assert.equal(
    hasUnsavedRunSheetEdits(saved, reorderRunSheetRows([...saved, row("c")])),
    true,
    "DJ added is a change",
  );
  assert.equal(
    hasUnsavedRunSheetEdits(saved, reorderRunSheetRows([saved[0]])),
    true,
    "DJ removed is a change",
  );
  assert.equal(
    hasUnsavedRunSheetEdits(saved, saved.map((current) => ({ ...current, sort_order: current.sort_order + 10 }))),
    false,
    "sort_order is derived from position, not an edit of its own",
  );

  // Saving rebases the baseline, which is what hides the button again.
  const edited = saved.map((current, index) => (index === 0 ? { ...current, notes: "x" } : current));
  assert.equal(hasUnsavedRunSheetEdits(saved, edited), true);
  assert.equal(hasUnsavedRunSheetEdits(edited, edited), false);

  const sectionSource = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  // `hasUnsavedRunSheetEdits` was unwired from the component for a period (the
  // Run Sheet briefly moved from "Save is hidden until something changes" to
  // Save simply being whatever button was on screen while editing) -- see
  // testRunSheetHeaderCancelAndSave for the pass that reintroduced dirty-gated
  // Save. It stayed exported and tested here throughout (and in
  // testRunSheetInitialLoadIsNotDirty) as a general-purpose comparison util
  // regardless of whether this component happened to call it at the time.
  assert.match(sectionSource, /hasUnsavedRunSheetEdits/);
  // `showSaveButton` (the old invisible/aria-hidden/tabIndex mechanic this
  // replaced) has not returned -- the current variable is `hasUnsavedChanges`,
  // and Save mounts/unmounts rather than toggling visibility on a persistent
  // element.
  assert.doesNotMatch(sectionSource, /showSaveButton/);

  // The header cluster CONTAINER is still rendered whenever saving is
  // possible at all -- `showRunSheetHeaderActions`, unrelated to dirty state
  // -- so the header keeps its height and nothing below it moves when Edit
  // swaps for Cancel. Save specifically, inside that container, is now
  // additionally gated on dirty state -- see testRunSheetHeaderCancelAndSave.
  assert.match(sectionSource, /\{showRunSheetHeaderActions \? \(/);

  // Baseline is rebased on save, which is also what a later Cancel would
  // revert to.
  assert.match(sectionSource, /setSavedRows\(persistedRows\)/);

  // No success message left inside the card; the shared top notification owns it.
  assert.doesNotMatch(sectionSource, /setSuccessMessage/);
  assert.doesNotMatch(sectionSource, /successMessage \?/);
  assert.match(sectionSource, /onSaved\?\.\("Run sheet saved"\)/);
  assert.match(eventDetailSource, /onSaved=\{setHeaderFeedbackMessage\}/);

  // setHeaderFeedbackMessage is the same channel "Event updated" uses, so it
  // inherits that styling, animation and timed fade.
  assert.match(eventDetailSource, /setHeaderFeedbackMessage\([\s\S]{0,240}EVENT_UPDATED_SUCCESS_MESSAGE/);
  assert.match(eventDetailSource, /useInlineTabFeedbackDismiss\(\s*headerFeedbackMessage/);
  assert.match(
    eventDetailSource,
    /useSyncPlannerTitleFeedback\(headerFeedbackMessage, headerFeedbackFading, true\)/,
  );
}

/**
 * View -> Edit -> Save -> View: the Run Sheet opens read-only, editing is the
 * deliberate result of tapping Edit, and every editable affordance -- textarea
 * borders, character counters, move-up/down, Stage / Area and Notes editing,
 * Set Time editing -- is one prop (`canEdit && isEditing`) away from being on
 * or off, because `RunSheetEntry` already branched on `canEdit` for all of
 * them (see testRunSheetAccordionRestructure / testRunSheetChromeReduction).
 * This test pins the state machine around that prop, not the branches
 * themselves.
 */
function testRunSheetEditMode() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Read-only by default: the row-level flags are permission AND edit-mode,
  // never permission alone. A viewer without permission can never make
  // `canEdit && isEditing` true regardless of local state, since the Edit
  // button (the only way to set `isEditing`) is itself gated on `canEdit`.
  assert.match(section, /const \[isEditing, setIsEditing\] = useState\(false\)/);
  assert.match(section, /canEdit=\{canEdit && isEditing\}/);

  // Editing force-expands every card -- no extra taps to reach a field --
  // while view mode keeps the single-open accordion (see
  // testRunSheetAccordionRestructure).
  assert.match(section, /isExpanded=\{isEditing \|\| expandedRowId === row\.id\}/);

  // Entering edit mode is the only thing `handleEnterEditMode` does, so
  // tapping Edit can't have some other side effect on the sheet's data.
  assert.match(
    section,
    /function handleEnterEditMode\(\) \{\s*setError\(null\);\s*setIsEditing\(true\);\s*\}/,
  );

  // Cancel is local-state only: it reverts to the last persisted rows rather
  // than calling the save path, so it cannot touch the database.
  const cancelFn = section.match(/function handleCancelEdit\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(cancelFn, "handleCancelEdit must exist");
  assert.match(cancelFn, /setRows\(savedRows\)/);
  assert.match(cancelFn, /setIsEditing\(false\)/);
  assert.match(cancelFn, /setExpandedRowId\(null\)/);
  assert.doesNotMatch(cancelFn, /saveEventRunSheet/);

  // A successful save returns to view mode, collapsed -- not just whichever
  // row happened to be expanded before Save was pressed.
  const saveFn = section.match(/async function handleSave\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(saveFn, "handleSave must exist");
  const trySection = saveFn.slice(saveFn.indexOf("try {"), saveFn.indexOf("} catch"));
  assert.match(trySection, /setIsEditing\(false\)/);
  assert.match(trySection, /setExpandedRowId\(null\)/);

  // A failed save must NOT force the planner back to read-only -- they would
  // lose sight of the error and their edited rows. The reset calls live only
  // in the try block, not in `finally` alongside `setSaving(false)`.
  const catchAndFinally = saveFn.slice(saveFn.indexOf("} catch"));
  assert.doesNotMatch(catchAndFinally, /setIsEditing\(false\)/);
  assert.doesNotMatch(catchAndFinally, /setExpandedRowId\(null\)/);
  assert.match(catchAndFinally, /finally \{\s*setSaving\(false\);\s*\}/);

  // Header cluster: Edit when not editing, Cancel always visible while
  // editing, Save only while dirty -- see testRunSheetHeaderCancelAndSave for
  // the full "Cancel in header, Save gated on dirty" behaviour this task
  // introduced. Matched against `section` directly rather than an extracted
  // substring: with Save now conditionally nested a level deeper than Cancel,
  // a single non-greedy "up to the next `) : null}`" extraction would stop at
  // the *innermost* one and truncate before reaching Save, so there is no
  // substring boundary worth extracting here -- these handler names are each
  // unique to one call site in the file regardless.
  assert.match(section, /onClick=\{handleCancelEdit\}/);
  assert.match(section, />\s*Cancel\s*</);
  assert.match(section, /onClick=\{handleSave\}/);
  assert.match(section, /\{saving \? "Saving" : "Save"\}/);
  assert.match(section, /onClick=\{handleEnterEditMode\}/);
  assert.doesNotMatch(section, /EventDetailEditButton/);

  // Disabled while a save is in flight, so a second tap can't fire a second
  // request or cancel out from under it.
  assert.match(section, /onClick=\{handleCancelEdit\}\s*\n\s*disabled=\{saving\}/);
  assert.match(section, /onClick=\{handleSave\}\s*\n\s*disabled=\{saving\}/);

  const eventDetailSourceForEditButton = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    eventDetailSourceForEditButton,
    /<EventDetailEditHeaderSlot state=\{editHeaderState\} onEditClick=\{openEditForm\} \/>/,
  );
}

/**
 * The production-polish pass on top of testRunSheetEditMode: proper empty
 * states for a sheet nobody has filled in, per-DJ completeness signalling,
 * a lightweight progress line that becomes a completion badge, running-order
 * numbering, a reading hierarchy inside expanded cards, and the Edit
 * affordance moved onto the standard secondary button.
 */
function testRunSheetProductionPolish() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Completeness is "has the essentials" -- stage AND a set time -- not
  // "has everything including Notes", which stays optional supplementary
  // detail and never gates completeness either way.
  const completeFn =
    section.match(/function isRunSheetRowComplete\(row: RunSheetRowInput\): boolean \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(completeFn, "isRunSheetRowComplete must exist");
  assert.match(completeFn, /row\.stage_area\.trim\(\)/);
  assert.match(completeFn, /row\.start_time\.trim\(\) \|\| row\.finish_time\.trim\(\)/);
  assert.doesNotMatch(completeFn, /row\.notes/);

  // Running order is one function so a future named-sets feature only has
  // to change this, not RunSheetEntry or its caller.
  assert.match(section, /function formatRunSheetOrderLabel\(index: number\): string \{\s*return `#\$\{index \+ 1\}`;\s*\}/);
  assert.match(section, /orderLabel=\{formatRunSheetOrderLabel\(index\)\}/);

  // Dedicated empty state for "DJs exist but nobody has anything filled in" --
  // distinct from rows.length === 0 (no DJs at all), which keeps its existing
  // dashed empty state untouched. Only shown in the read-only presentation:
  // while editing, the planner needs the real rows on screen to fill in.
  assert.match(section, /!isEditing && allRowsIncomplete \? \(/);
  assert.match(section, /<RunSheetNotCompletedEmptyState canEdit=\{canEdit\} onEditClick=\{handleEnterEditMode\} \/>/);
  assert.doesNotMatch(section, /rows\.length === 0 \? \(\s*<RunSheetNotCompletedEmptyState/);

  const emptyStateFn =
    section.match(/function RunSheetNotCompletedEmptyState\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(emptyStateFn, "RunSheetNotCompletedEmptyState must exist");
  assert.match(emptyStateFn, /if \(!canEdit\) \{/);
  assert.match(
    emptyStateFn,
    /The promoter hasn&apos;t published the Run Sheet yet\. Check back later\./,
  );
  // No heading of its own in either branch: the section title above already
  // says "Run Sheet", so a second "Run Sheet"/"Create your Run Sheet" line
  // here would repeat what the planner already knows. Just one supporting
  // sentence, and a CTA that names the action ("Create", not "Create Run
  // Sheet" -- the planner already knows which section they are in).
  assert.doesNotMatch(emptyStateFn, /Create your Run Sheet/);
  assert.doesNotMatch(emptyStateFn, /Run Sheet not completed/);
  assert.match(emptyStateFn, /Add set times, stages and notes for your DJs\./);
  assert.doesNotMatch(
    emptyStateFn,
    /Add set times, stages and notes for each DJ so everyone knows where they need to be\./,
  );
  assert.doesNotMatch(
    emptyStateFn,
    /Add each DJ&apos;s set time, stage and notes before the event\./,
  );
  assert.match(emptyStateFn, /onClick=\{onEditClick\}/);
  assert.match(emptyStateFn, />\s*Create\s*</);
  assert.doesNotMatch(emptyStateFn, />\s*Create Run Sheet\s*</);
  assert.doesNotMatch(emptyStateFn, />\s*Edit Run Sheet\s*</);

  // No dashed card, no icon: typography and spacing carry the state, not a
  // bordered box -- the thing that made it read as an unfinished placeholder
  // rather than a deliberate first-run moment.
  assert.doesNotMatch(emptyStateFn, /ftc-card-empty/);
  assert.doesNotMatch(emptyStateFn, /<svg/);

  // Neither branch repeats "Run Sheet" as its own heading -- the section
  // title immediately above already says that. Checked per-branch (not just
  // "the whole function contains no heading") so a future edit can't
  // reintroduce one in just the planner half and slip past a whole-function
  // check.
  const djBranch = emptyStateFn.match(/if \(!canEdit\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(djBranch, "the !canEdit branch must exist");
  assert.doesNotMatch(djBranch, />\s*Run Sheet\s*</);
  // Everything after the !canEdit branch's own closing brace is the canEdit
  // (planner) branch -- derived from djBranch's match boundary rather than a
  // hardcoded offset, so this stays correct if the source is reformatted.
  const plannerBranch = emptyStateFn.slice(
    emptyStateFn.indexOf(djBranch) + djBranch.length,
  );
  assert.ok(plannerBranch.includes("Add set times"), "the canEdit branch must exist");
  assert.doesNotMatch(plannerBranch, />\s*Run Sheet\s*</);
  assert.doesNotMatch(plannerBranch, />\s*Create your Run Sheet\s*</);

  // Progress: derived from `rows` (live during editing), hidden exactly when
  // the dedicated all-incomplete empty state replaces the list so the same
  // fact isn't stated twice.
  assert.match(
    section,
    /const completedRowCount = useMemo\(\s*\(\) => rows\.filter\(isRunSheetRowComplete\)\.length,\s*\[rows\],\s*\);/,
  );
  assert.match(section, /const isFullyComplete = rows\.length > 0 && completedRowCount === rows\.length;/);
  assert.match(section, /const allRowsIncomplete = rows\.length > 0 && completedRowCount === 0;/);
  // Progress is view-mode only as of testRunSheetHeaderCancelAndSave -- it
  // used to also show live during editing, deliberately reversed since it
  // duplicated what Save/"Unsaved changes" already say once those exist.
  assert.match(
    section,
    /const showRunSheetProgress = !isEditing && rows\.length > 0 && !allRowsIncomplete;/,
  );
  // "Run Sheet Complete" copy stands alone -- the leading emoji dot was
  // removed by testRunSheetVisualHierarchyPolish.
  assert.match(section, /"Run Sheet Complete"/);
  assert.match(section, /\$\{completedRowCount\} of \$\{rows\.length\} DJs completed/);
  // Not visually dominant: still small text under the title, not a colourful
  // banner. Colour/weight were lifted one step (muted -> secondary, normal ->
  // semibold) by testRunSheetDensityAndSummaryPolish, which owns those now;
  // the size cap is what this pass still guarantees.
  assert.match(section, /<p className="mt-0\.5 text-xs [^"]*">\s*\n\s*\{isFullyComplete/);

  // Edit moved off the separate icon+pill control it used to reuse, onto the
  // standard secondary button at the time -- since replaced by the
  // lightweight text-link treatment from testRunSheetVisualHierarchyPolish.
  assert.doesNotMatch(section, /EventDetailEditButton/);
  // No pencil icon: the visible label is the whole affordance. aria-label
  // stays "Edit Run Sheet" (more descriptive than the bare visible "Edit")
  // even though the visible text is now just "Edit".
  assert.match(
    section,
    /<button\s*\n\s*type="button"\s*\n\s*onClick=\{handleEnterEditMode\}\s*\n\s*aria-label="Edit Run Sheet"\s*\n/,
  );
  assert.doesNotMatch(section, /✏️/);

  // The header cluster (Edit, or Cancel + Save) is suppressed for exactly the
  // window the "Create your Run Sheet" empty state owns -- Create Run Sheet
  // is the one obvious action on screen, not a duplicate of a top-right Edit
  // button. It reappears the instant editing starts, or the instant any row
  // is complete, so the progression from creation to editing is automatic.
  assert.match(
    section,
    /const showRunSheetHeaderActions =\s*canEdit && rows\.length > 0 && \(isEditing \|\| !allRowsIncomplete\);/,
  );

  const layoutSource = readFileSync(
    new URL("../app/components/event-detail/EventDetailLayout.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(layoutSource, /ariaLabel/);
  assert.match(
    layoutSource,
    /export function EventDetailEditButton\(\{ onClick \}: \{ onClick: \(\) => void \}\)/,
  );

  // Incomplete-row styling: only in the read-only presentation (never while
  // actively editing that same row), a muted card and a helper-text fallback
  // that only appears when there is genuinely nothing else to preview.
  const entryFn = section.match(/function RunSheetEntry\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(entryFn, "RunSheetEntry must exist");
  assert.match(
    entryFn,
    /const isReadOnlyAndIncomplete = !canEdit && !isRunSheetRowComplete\(row\);/,
  );
  assert.match(entryFn, /isReadOnlyAndIncomplete \? "opacity-75" : ""/);
  // The fallback text's placement is asserted by
  // testRunSheetAccordionRestructure; it no longer sits alongside a
  // `stagePreview ||` (see testRunSheetVisualHierarchyPolish), and its
  // ternary is now multi-line, so match across whitespace rather than
  // pinning one line's exact wrapping.
  assert.match(
    entryFn,
    /isReadOnlyAndIncomplete\s*\n?\s*\? "Run Sheet details pending"\s*\n?\s*: ""/,
  );

  // Hierarchy inside expanded cards: DJ name is the largest/boldest thing in
  // the card, Set Time is sized up a tier below it, and Stage / Area / Notes
  // (both routed through the same BookingCardExpandableNotes, untouched) stay
  // the existing muted "supporting information" tier -- ranked below Set Time
  // by weight/colour, and ordered Stage before Notes in the DOM to reflect
  // "then... finally".
  const djIdentityFn =
    section.match(/function RunSheetDjIdentity\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(djIdentityFn, "RunSheetDjIdentity must exist");
  assert.match(djIdentityFn, /min-w-0 truncate text-base font-bold text-ftc-text/);
  assert.doesNotMatch(section, /font-medium text-ftc-text transition hover:text-ftc-primary/);

  // Numbering badge sits inline with the identity row, small and muted so it
  // never competes with the name for emphasis.
  assert.match(
    entryFn,
    /<span className="shrink-0 text-xs font-semibold tabular-nums text-ftc-text-muted">\s*\{orderLabel\}\s*<\/span>/,
  );
}

/**
 * Cancel moves into the header (matching the Edit Event screen's
 * `PlannerFormCard` pattern exactly: `.ftc-form-cancel-link`, a small
 * uppercase text link, not a full button); Save is gated on dirty state and
 * appears/disappears with the sheet's actual save-worthiness rather than
 * unconditionally alongside Cancel; progress hides while editing since it
 * would otherwise restate what the new Save/Unsaved-changes affordance
 * already says. Reorder controls, placeholders and disabled styling round
 * out the presentation-only requirements from this pass.
 */
function testRunSheetHeaderCancelAndSave() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Cancel: the exact Edit Event header treatment, not a large standalone
  // button. `.ftc-form-cancel-link` is `PlannerFormCard`'s own class (see
  // globals.css) -- reused rather than reinvented, so "the exact same visual
  // treatment" is literally the same CSS rule, not a lookalike copy of it.
  assert.match(
    section,
    /className="ftc-form-cancel-link disabled:cursor-not-allowed disabled:opacity-50"/,
  );
  // The large Cancel button (EVENT_DETAIL_BTN_SECONDARY, alongside Save) is
  // gone -- Cancel is not styled as an equal-weight button any more.
  assert.doesNotMatch(
    section,
    /onClick=\{handleCancelEdit\}[\s\S]{0,80}className=\{`\$\{EVENT_DETAIL_BTN_SECONDARY\}/,
  );

  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(globalsSource, /\.ftc-form-cancel-link,\s*\n\.ftc-form-back-link \{/);

  // Save is dirty-gated: `hasUnsavedRunSheetEdits` reintroduced specifically
  // to drive this (it was removed from the component, but never from
  // lib/eventRunSheet.ts, when the View/Edit/Save workflow first shipped --
  // see testRunSheetDirtyStateAndSaveFeedback for why it stayed exported and
  // tested even with no caller at the time).
  assert.match(section, /import \{[\s\S]*?hasUnsavedRunSheetEdits,[\s\S]*?\} from "@\/lib\/eventRunSheet"/);
  assert.match(
    section,
    /const hasUnsavedChanges = useMemo\(\s*\(\) => hasUnsavedRunSheetEdits\(savedRows, rows\),\s*\[savedRows, rows\],\s*\);/,
  );
  // Save's mount/visibility mechanic (always mounted while editing, dirty
  // only toggles a CSS class) is covered by testRunSheetSaveButtonPolish.

  // Progress hides during editing -- see testRunSheetProductionPolish for the
  // exact `showRunSheetProgress` formula this pass reversed.

  // Placeholders guide an empty field rather than leaving it blank, using
  // copy that clearly reads as an instruction, not saved content.
  assert.match(section, /placeholder\?: string;/);
  assert.match(section, /placeholder="Enter stage"/);
  assert.match(section, /placeholder="Add notes"/);
  assert.doesNotMatch(section, /placeholder="Main Stage"/);
  assert.doesNotMatch(section, /placeholder="e\.g\./);

  // Reorder controls: disabled state is visibly flatter (softer border,
  // transparent background, muted text, lower opacity than before), not
  // merely a slightly-faded copy of the active control, and the control
  // itself -- size, position -- is unchanged; only colour/opacity respond to
  // `disabled`.
  const iconButtonClass =
    section.match(/const iconButtonBaseClassName =\s*\n?\s*"([^"]*)"/)?.[1] ?? "";
  assert.ok(iconButtonClass, "iconButtonBaseClassName must exist");
  assert.match(iconButtonClass, /disabled:opacity-30/);
  assert.doesNotMatch(iconButtonClass, /disabled:opacity-40/);
  assert.match(iconButtonClass, /disabled:border-ftc-border-subtle/);
  assert.match(iconButtonClass, /disabled:bg-transparent/);
  assert.match(iconButtonClass, /disabled:text-ftc-text-muted/);
  assert.match(iconButtonClass, /h-8 w-8/);
  assert.match(section, /disabled=\{!canMoveUp\}/);
  assert.match(section, /disabled=\{!canMoveDown\}/);
}

/**
 * The polish pass on top of testRunSheetHeaderCancelAndSave: Save is now
 * always mounted for the whole editing session (not only while dirty), its
 * row reserves its own height from the moment Cancel appears, and its
 * appear/disappear is a CSS `transition` on that one persistent element
 * rather than a mount-triggered `@keyframes` -- so there is no instant where
 * the DJ cards below can shift. The "Unsaved changes" label is gone (the
 * button itself already communicates that edits exist), the button reads
 * "Save" instead of "Save run sheet", and it sits narrower and left of
 * Cancel's edge rather than sharing Cancel's exact right-aligned column.
 */
function testRunSheetSaveButtonPolish() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // "Unsaved changes" label removed entirely -- the Save button appearing is
  // the only signal now.
  assert.doesNotMatch(section, /Unsaved changes/);

  // Copy: "Save", not "Save run sheet" (checked again here, alongside the
  // structural assertions it's bound up with).
  assert.match(section, /\{saving \? "Saving" : "Save"\}/);
  assert.doesNotMatch(section, /Save run sheet/);

  // Always mounted for the whole editing session -- not conditioned on
  // `hasUnsavedChanges` the way the previous mount-triggered approach was.
  // Visibility is driven by toggling a class on the persistent button
  // instead. It was moved into the same row as Cancel by
  // testRunSheetVisualHierarchyPolish; the layout assertion for that lives
  // there.
  assert.doesNotMatch(section, /\{isEditing && hasUnsavedChanges \? \(/);
  assert.match(
    section,
    /className=\{`\$\{RUN_SHEET_SAVE_BUTTON_CLASS\} ftc-run-sheet-save-btn \$\{\s*hasUnsavedChanges \? "ftc-run-sheet-save-btn--visible" : ""\s*\}`\}/,
  );

  // Invisible while not dirty means genuinely unreachable, not just
  // transparent -- both mouse (pointer-events, in CSS) and keyboard
  // (tabIndex, here) are gated on the same `hasUnsavedChanges` flag.
  assert.match(section, /aria-hidden=\{!hasUnsavedChanges\}/);
  assert.match(section, /tabIndex=\{hasUnsavedChanges \? 0 : -1\}/);

  // Narrower than the standard primary button (`px-3` vs. `px-4`).
  assert.match(section, /const RUN_SHEET_SAVE_BUTTON_CLASS =\s*\n\s*"ftc-btn-primary[^"]*\bpx-3\b[^"]*"/);

  // Cancel's own row/column layout was superseded by
  // testRunSheetVisualHierarchyPolish, which pairs it with Save in one row.

  // The transition (not a keyframe animation) toggles opacity and a small
  // upward nudge -- two states of the one persistent `.ftc-run-sheet-save-btn`
  // element -- within the 180-200ms ease-out range the rest of the app's
  // reveal animations use, and respects reduced motion.
  const hiddenRule = globalsSource.match(/\.ftc-run-sheet-save-btn \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(hiddenRule, "the Save button's hidden-state rule must exist");
  assert.match(hiddenRule, /opacity: 0;/);
  assert.match(hiddenRule, /transform: translateY\(7px\);/);
  assert.match(hiddenRule, /pointer-events: none;/);
  // The transition now also carries the collapse geometry (see
  // testRunSheetHeaderAlignmentAndDensity); opacity and transform are still
  // the two that own the fade-and-nudge, at the same 190ms ease-out.
  assert.match(hiddenRule, /transition: opacity 190ms ease-out, transform 190ms ease-out/);
  assert.doesNotMatch(globalsSource, /@keyframes ftc-run-sheet-save-reveal/);

  const visibleRule =
    globalsSource.match(/\.ftc-run-sheet-save-btn\.ftc-run-sheet-save-btn--visible \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(visibleRule, "the Save button's visible-state rule must exist");
  assert.match(visibleRule, /opacity: 1;/);
  assert.match(visibleRule, /transform: translateY\(0\);/);
  assert.match(visibleRule, /pointer-events: auto;/);

  assert.match(
    globalsSource,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.ftc-run-sheet-save-btn \{\s*transition: none;\s*\}\s*\}/,
  );

  // No scale, no bounce -- opacity and a single-axis translate only.
  assert.doesNotMatch(hiddenRule, /scale/);
  assert.doesNotMatch(visibleRule, /scale/);
}

/**
 * Presentation-only polish pass on top of testRunSheetSaveButtonPolish: fixes
 * five specific hierarchy/redundancy complaints without touching any
 * behaviour, handler, or state.
 *
 * - Save and Cancel move into one row together (Save primary, Cancel
 *   secondary) instead of Save floating alone in its own row below Cancel --
 *   the "lone floating Save button" the pass exists to remove. Save keeps
 *   its existing dirty-gated CSS-transition visibility
 *   (`.ftc-run-sheet-save-btn`/`--visible`, `aria-hidden`/`tabIndex`); only
 *   the surrounding layout changes.
 * - The collapsed-header Stage / Area preview (`stagePreview ||`) is gone --
 *   it duplicated the same value one tap away in the expanded panel under
 *   the "Stage / Area" label. The "Run Sheet details pending" fallback for a
 *   read-only incomplete row is untouched.
 * - Read-only Set Time drops a tier in size/weight/colour (`text-base
 *   font-semibold text-ftc-text` -> `text-sm font-medium
 *   text-ftc-text-secondary`) so it no longer outweighs the DJ name above
 *   it, while staying comfortably readable (`tabular-nums` kept).
 * - The green-dot emoji is gone from "Run Sheet Complete"; the text alone
 *   still communicates completion, styled identically to the "N of M DJs
 *   completed" sibling state (no colour coding added).
 * - Edit drops the bordered `EVENT_DETAIL_BTN_SECONDARY` pill for the same
 *   lightweight `.ftc-form-cancel-link` text-link Cancel already uses --
 *   still easily tappable, no longer competing with the "Run Sheet" title.
 *   `EVENT_DETAIL_BTN_SECONDARY` is no longer imported by this component.
 */
function testRunSheetVisualHierarchyPolish() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Save and Cancel share one row -- not Cancel in its own row with Save
  // stacked below it.
  const headerActions =
    section.match(/\{showRunSheetHeaderActions \? \(([\s\S]*?)\) : null\}\n\s*<\/div>/)?.[1] ?? "";
  assert.ok(headerActions, "the Run Sheet header actions cluster must exist");
  // The container lost its `gap-3` in testRunSheetHeaderAlignmentAndDensity
  // (the gap moved onto Save so it collapses with the button); what this pass
  // still owns is that Cancel and Save share one flex row.
  assert.match(headerActions, /<div className="flex items-center justify-end">/);
  assert.doesNotMatch(headerActions, /flex-col items-end/);
  assert.doesNotMatch(headerActions, /justify-end pr-3/);

  // Cancel then Save, both inside the same editing branch, no wrapping div
  // between them.
  const cancelIndex = headerActions.indexOf("onClick={handleCancelEdit}");
  const saveIndex = headerActions.indexOf("onClick={handleSave}");
  assert.ok(cancelIndex > -1 && saveIndex > -1 && cancelIndex < saveIndex);

  // Edit reuses the exact same lightweight text-link class as Cancel, not
  // the bordered secondary-button pill.
  assert.doesNotMatch(section, /EVENT_DETAIL_BTN_SECONDARY/);
  const editButton =
    headerActions.match(/onClick=\{handleEnterEditMode\}[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.ok(editButton, "the Edit button must exist");
  assert.match(editButton, /className="ftc-form-cancel-link disabled:cursor-not-allowed disabled:opacity-50"/);

  // Save's dirty-gated visibility mechanic is unchanged -- only the layout
  // around it moved (covered above and by testRunSheetSaveButtonPolish).
  assert.match(section, /aria-hidden=\{!hasUnsavedChanges\}/);
  assert.match(section, /tabIndex=\{hasUnsavedChanges \? 0 : -1\}/);

  // No bare collapsed-header Stage / Area duplicate. (A combined
  // stage-and-time summary line was later added in its place, shown only
  // while collapsed so it still never coexists with the labelled values --
  // see testRunSheetDensityAndSummaryPolish.)
  const entryFn = section.match(/function RunSheetEntry\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(entryFn, "RunSheetEntry must exist");
  assert.doesNotMatch(entryFn, /stagePreview \|\|/);

  // Set Time read-only: a tier lighter than the DJ name, still readable.
  // The exact weight was nudged back up one step (medium -> semibold) by
  // testRunSheetDensityAndSummaryPolish, which owns that value now; what
  // this pass still guarantees is that it is not the original oversized
  // bright treatment.
  assert.doesNotMatch(
    section,
    /<p className="text-base font-semibold tabular-nums text-ftc-text">/,
  );

  // No emoji-style completion dot.
  assert.doesNotMatch(section, /🟢/);
  assert.match(section, /isFullyComplete\s*\n\s*\? "Run Sheet Complete"/);
}

/**
 * Final presentation pass on top of testRunSheetVisualHierarchyPolish. That
 * pass over-corrected in two places (the completion line and Set Time both
 * ended up too faint); this one re-balances them, tightens the expanded
 * card, and gives the collapsed card back a useful one-line summary --
 * without reintroducing any duplication or touching behaviour.
 *
 * - "Run Sheet Complete" / "N of M DJs completed" lifts from
 *   `text-ftc-text-muted` at normal weight to `text-ftc-text-secondary
 *   font-semibold`, staying `text-xs` so it remains clearly subordinate to
 *   the "Run Sheet" title. Still no emoji, still no colour coding.
 * - Read-only Set Time goes `font-medium` -> `font-semibold`, keeping
 *   `text-sm` and `text-ftc-text-secondary`. Ranking by weight alone is what
 *   produces the intended DJ name > Set Time > Stage / Area > labels ladder:
 *   Stage / Area and Notes both render at `text-sm` normal weight via
 *   `BookingCardExpandableNotes`, so a heavier weight at the same size lifts
 *   Set Time one tier without going back to the oversized bright treatment.
 * - The expanded panel tightens `space-y-3` (12px) -> `space-y-2.5` (10px),
 *   a ~17% reduction, inside the requested 15-20% band. It stays a
 *   `space-y-*` block stack rather than becoming a grid -- see
 *   testRunSheetAccordionRestructure for the clipping bug a grid reintroduces.
 * - The collapsed card regains a single summary line under the DJ name:
 *   "Front room · 9:00 PM – 1:00 AM", either half alone if that's all there
 *   is. Joined with ` · `, the separator already used for compact metadata
 *   elsewhere in the app (BookingRequestCard, DmBookingUpdateRow,
 *   EventDjSendOfferControls), rather than adding a second bullet glyph.
 *   It carries no labels, and it is rendered only while collapsed -- expanded,
 *   both values are already on screen under their own labels, which is
 *   exactly the duplication the previous pass removed. Editing force-expands
 *   every row, so it is absent there too with no separate check.
 *   `formatRunSheetSetTimeDisplay` is reused for the time half but gated on a
 *   time actually existing, since it returns the "TBC" placeholder for an
 *   empty pair -- that would read as real content in a summary line.
 */
function testRunSheetDensityAndSummaryPolish() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );

  // Completion/progress line: more prominent, still small, still no emoji.
  assert.match(
    section,
    /<p className="mt-0\.5 text-xs font-semibold text-ftc-text-secondary">/,
  );
  assert.doesNotMatch(section, /🟢/);

  // Set Time: one weight step up, same size and colour -- and explicitly not
  // back to the original oversized bright treatment.
  assert.match(
    section,
    /<p className="text-sm font-semibold tabular-nums text-ftc-text-secondary">\s*\{hasValue \? readOnlyDisplay : "—"\}\s*<\/p>/,
  );
  assert.doesNotMatch(section, /text-base font-semibold tabular-nums text-ftc-text/);

  // Set Time must outrank Stage / Area, which renders at normal weight via
  // BookingCardExpandableNotes -- assert that component really is the
  // lighter tier, so this ladder can't silently invert if it restyles.
  const notesComponentSource = readFileSync(
    new URL("../app/components/booking/BookingCardExpandableNotes.tsx", import.meta.url),
    "utf8",
  );
  assert.match(notesComponentSource, /text-sm leading-snug text-ftc-text-secondary/);
  assert.doesNotMatch(notesComponentSource, /font-semibold text-ftc-text-secondary/);

  // Expanded panel density: ~17% tighter, still a block stack not a grid.
  // Tightened again by testRunSheetHeaderAlignmentAndDensity, which owns the
  // exact values now; what this pass still guarantees is that it never goes
  // back to the looser pre-density spacing.
  assert.doesNotMatch(section, /<div className="space-y-3 pt-2">/);
  assert.doesNotMatch(section, /<div className="space-y-2\.5 pt-2">/);

  const entryFn = section.match(/function RunSheetEntry\([\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(entryFn, "RunSheetEntry must exist");

  // Collapsed summary: built from stage + set time, joined with the app's
  // existing ` · ` metadata separator, with the time half gated on a real
  // value so the "TBC" placeholder never leaks in.
  assert.match(entryFn, /const hasSetTime = Boolean\(row\.start_time\.trim\(\) \|\| row\.finish_time\.trim\(\)\);/);
  assert.match(
    entryFn,
    /const collapsedSummary = \[\s*stagePreview,\s*hasSetTime \? formatRunSheetSetTimeDisplay\(row\.start_time, row\.finish_time\) : "",\s*\]\s*\.filter\(Boolean\)\s*\.join\(" · "\);/,
  );
  // The app's separator, not a second bullet glyph.
  assert.doesNotMatch(entryFn, /join\(" • "\)/);

  // Rendered only while collapsed, so it never coexists with the labelled
  // Stage / Area and Set Time in the expanded panel.
  const headerButton = entryFn.match(/<button[\s\S]*?onToggleExpanded[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.ok(headerButton, "the collapsed header toggle button must exist");
  assert.match(headerButton, /!isExpanded && collapsedSummary/);
  // Falls back to the pending helper text, and carries no labels or Notes.
  assert.match(headerButton, /isReadOnlyAndIncomplete\s*\n?\s*\? "Run Sheet details pending"/);
  assert.doesNotMatch(headerButton, /row\.notes/);
  assert.doesNotMatch(headerButton, /STAGE \/ AREA|SET TIME|Stage \/ Area|Set Time/);
  // One line, truncated rather than wrapped.
  assert.match(headerButton, /truncate/);

  // Behaviour untouched: the toggle is still the same handler and a11y
  // wiring, and editing still force-expands every row (which is what keeps
  // the summary out of edit mode without a separate check).
  assert.match(headerButton, /onClick=\{onToggleExpanded\}/);
  assert.match(headerButton, /aria-expanded=\{isExpanded\}/);
  assert.match(headerButton, /aria-controls=\{panelId\}/);
  assert.match(section, /isExpanded=\{isEditing \|\| expandedRowId === row\.id\}/);
}

/**
 * Header-action alignment + expanded-card density. Presentation only: no
 * handler, state, validation, reorder, expand/collapse or save-logic change.
 *
 * ALIGNMENT. The top-right control previously jumped sideways the moment Edit
 * was pressed. Save is permanently mounted while editing (so the row's height
 * is reserved and the DJ cards below never shift), but it was still occupying
 * its full width while invisible, which pushed Cancel ~73px left of the slot
 * Edit occupies -- 61px of button plus the container's own 12px `gap-3`.
 * Fixed entirely in CSS, without touching the mount/`aria-hidden`/`tabIndex`
 * mechanic: the hidden button collapses `max-width` and horizontal padding to
 * 0, and the 12px separation moved from a container `gap` onto Save's own
 * `margin-left` so it collapses with the button instead of surviving as a
 * phantom offset. Measured live at 390px and 1280px: Edit and Cancel share an
 * identical right edge, and with unsaved changes Save owns that edge with
 * Cancel 12px to its left.
 *
 * `min-height` is deliberately NOT collapsed -- that is what keeps the row
 * reserved at 40px in both edit states.
 *
 * DENSITY. ~10% shorter expanded card (measured 233.5px -> 209.5px at 390px)
 * from whitespace only. Touch targets, inputs and textarea heights are all
 * untouched: the toggle keeps its `py-1`, and only the margin above it
 * tightens. Card padding became per-axis so the bottom can be tighter than
 * the top, since the DJ header needs breathing room above it and the last
 * field does not need as much below it.
 */
function testRunSheetHeaderAlignmentAndDensity() {
  const section = readFileSync(
    new URL("../app/components/EventRunSheetSection.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // --- Alignment ---------------------------------------------------------
  // No container gap: it would survive the collapse as a phantom offset.
  assert.match(section, /<div className="flex items-center justify-end">/);
  assert.doesNotMatch(section, /<div className="flex items-center gap-3">/);

  const hiddenRule = globalsSource.match(/\.ftc-run-sheet-save-btn \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(hiddenRule, "the Save button's hidden-state rule must exist");
  // Zero horizontal footprint while hidden.
  assert.match(hiddenRule, /max-width: 0;/);
  assert.match(hiddenRule, /padding-left: 0;/);
  assert.match(hiddenRule, /padding-right: 0;/);
  assert.match(hiddenRule, /margin-left: 0;/);
  assert.match(hiddenRule, /overflow: hidden;/);
  // Height is NOT collapsed -- the row must stay reserved.
  assert.doesNotMatch(hiddenRule, /min-height/);
  assert.doesNotMatch(hiddenRule, /height: 0/);
  assert.doesNotMatch(hiddenRule, /display: none/);
  // The collapse is animated, not a snap.
  assert.match(hiddenRule, /transition:[\s\S]*max-width 190ms ease-out/);
  assert.match(hiddenRule, /transition:[\s\S]*margin-left 190ms ease-out/);

  const visibleRule =
    globalsSource.match(/\.ftc-run-sheet-save-btn\.ftc-run-sheet-save-btn--visible \{[\s\S]*?\n\}/)?.[0] ??
    "";
  assert.ok(visibleRule, "the Save button's visible-state rule must exist");
  // Restored geometry, and the gap to Cancel rides on Save itself.
  assert.match(visibleRule, /max-width: 8rem;/);
  assert.match(visibleRule, /margin-left: 0\.75rem;/);
  assert.match(visibleRule, /padding-left: 0\.75rem;/);
  assert.match(visibleRule, /padding-right: 0\.75rem;/);

  // Cancel before Save in source, so Save owns the right edge.
  const headerActions =
    section.match(/\{showRunSheetHeaderActions \? \(([\s\S]*?)\) : null\}/)?.[1] ?? "";
  assert.ok(headerActions, "the header actions cluster must exist");
  assert.ok(
    headerActions.indexOf("onClick={handleCancelEdit}") <
      headerActions.indexOf("onClick={handleSave}"),
    "Cancel must precede Save so Save sits furthest right",
  );

  // The mount/a11y mechanic is untouched by the alignment fix.
  assert.match(section, /aria-hidden=\{!hasUnsavedChanges\}/);
  assert.match(section, /tabIndex=\{hasUnsavedChanges \? 0 : -1\}/);
  assert.doesNotMatch(section, /\{isEditing && hasUnsavedChanges \? \(/);

  // --- Density -----------------------------------------------------------
  // Per-axis card padding, bottom tighter than top.
  assert.match(section, /`ftc-card px-3 pt-2\.5 pb-2 \$\{isReadOnlyAndIncomplete/);
  // Panel stack tightened, still a block stack (never a grid -- see
  // testRunSheetAccordionRestructure for the clipping bug that causes).
  assert.match(section, /<div className="space-y-1\.5 pt-0\.5">/);
  // Margin above the toggle tightened, but its `py-1` tap padding is intact.
  assert.match(section, /className="mt-0\.5 flex w-full items-center gap-2 rounded-md py-1 text-left"/);

  // Nothing that would shrink a touch target, an input, or a textarea.
  assert.match(section, /const RUN_SHEET_NOTES_VISIBLE_ROWS = 4;/);
  assert.match(section, /const RUN_SHEET_STAGE_AREA_VISIBLE_ROWS = 2;/);
  assert.match(section, /min-h-\[2\.25rem\]/);
  const runSheetTextareaRules = globalsSource.match(/\.ftc-run-sheet-textarea-[24] \{[\s\S]*?\n\}/g) ?? [];
  assert.equal(runSheetTextareaRules.length, 2, "both pinned textarea heights must still exist");
  assert.match(runSheetTextareaRules.join("\n"), /2 \* 1\.5rem/);
  assert.match(runSheetTextareaRules.join("\n"), /4 \* 1\.5rem/);
}

function testEventNotesTextareaScrollsWhenContentExceedsCap() {
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const autoGrowSource = readFileSync(
    new URL("../lib/useBoundedAutoGrowTextarea.ts", import.meta.url),
    "utf8",
  );

  const notesRule = globalsSource.match(/\.ftc-event-notes-textarea \{[\s\S]*?\n\}/);
  assert.ok(notesRule, ".ftc-event-notes-textarea rule not found in globals.css");

  // The cap is what makes internal scrolling mandatory -- keep them together so
  // a future edit can't drop one and silently resurrect the clipping bug.
  assert.match(notesRule[0], /max-height: calc\(8lh/);
  assert.match(notesRule[0], /overflow-y: auto !important/);
  assert.doesNotMatch(notesRule[0], /overflow-y: hidden/);

  // Touch scroll reaching either end must not scroll the page behind the field.
  assert.match(notesRule[0], /overscroll-behavior: contain/);

  // The auto-grow hook sets height ONLY -- it must never set overflow again.
  assert.doesNotMatch(autoGrowSource, /style\.overflowY/);
  assert.match(autoGrowSource, /textarea\.style\.height = `\$\{nextHeight\}px`/);

  // The shared multiline field still routes Notes through that class + hook
  // (all four Notes surfaces -- Event Plan create/edit, Create Event, Edit
  // Event -- render via this one component, so they're fixed together).
  const plannerUiSource = readFileSync(
    new URL("../app/components/planner/PlannerUi.tsx", import.meta.url),
    "utf8",
  );
  assert.match(plannerUiSource, /ftc-event-notes-textarea/);
  assert.match(plannerUiSource, /useBoundedAutoGrowTextarea\(\{ value \}\)/);

  // Character cap and counter are untouched by this fix.
  const notesLibSource = readFileSync(
    new URL("../lib/events/eventNotes.ts", import.meta.url),
    "utf8",
  );
  assert.match(notesLibSource, /MAX_EVENT_NOTES_LENGTH = 500/);
  assert.match(plannerUiSource, /ftc-form-notes-counter/);
}

function testAppSplashScreenSlogan() {
  const splashSource = readFileSync(
    new URL("../app/components/brand/FtcAppSplashScreen.tsx", import.meta.url),
    "utf8",
  );

  // Slogan renders once, between the app name and the loading dots, exactly as written
  // (no quotation marks, no italics, no trailing full stop) -- "For the culture", not
  // "For the culture." (dropped the trailing period) and not the earlier
  // "For the culture, not the clout" wording.
  const nameIndex = splashSource.indexOf("Follow The Crowd");
  const sloganIndex = splashSource.indexOf("For the culture");
  const dotsIndex = splashSource.indexOf("ftc-app-splash-dot");
  assert.ok(nameIndex !== -1 && sloganIndex !== -1 && dotsIndex !== -1);
  assert.ok(nameIndex < sloganIndex && sloganIndex < dotsIndex);
  assert.equal(
    splashSource.indexOf("For the culture", sloganIndex + 1),
    -1,
  );
  assert.doesNotMatch(splashSource, /For the culture\./);
  assert.doesNotMatch(splashSource, /not the clout/);
  assert.doesNotMatch(splashSource, /["'“”]For the culture/);
  assert.doesNotMatch(splashSource, /italic/);

  // Small, muted, centered styling -- smaller and lighter than the bold uppercase app name.
  assert.match(
    splashSource,
    /className="mt-3 text-center text-xs font-light tracking-wide text-ftc-text-secondary"/,
  );
}

function testRoleAwareWorkspaceNavigation() {
  const currentUserSource = readFileSync(
    new URL("../lib/user/currentUser.ts", import.meta.url),
    "utf8",
  );
  const profileNavigationSource = readFileSync(
    new URL("../lib/profileNavigation.ts", import.meta.url),
    "utf8",
  );
  const profileSetupSource = readFileSync(
    new URL("../app/profile/setup/page.tsx", import.meta.url),
    "utf8",
  );
  const appNavigationSource = readFileSync(
    new URL("../app/components/AppNavigation.tsx", import.meta.url),
    "utf8",
  );
  const plannerEventsNavSource = readFileSync(
    new URL("../lib/plannerEventsNav.ts", import.meta.url),
    "utf8",
  );
  const eventsPageSource = readFileSync(
    new URL("../app/(planner-workspace)/events/EventsPageClient.tsx", import.meta.url),
    "utf8",
  );

  // Events is a planner surface. A DJ-only workspace is Gigs + Calendar (Gigs
  // first -- it is the DJ's primary surface and their post-login landing page);
  // "both" is a planner too and keeps everything. Role null (unresolved, e.g. a
  // hard refresh before the profile lands) keeps showing Events rather than
  // flashing it away.
  assert.equal(getEventsAreaSubNavItems("dj").map((item) => item.href).join(","), "/bookings,/calendar");
  assert.equal(
    getEventsAreaSubNavItems("both").map((item) => item.href).join(","),
    "/events,/booking-plans,/bookings,/calendar",
  );
  assert.equal(
    getEventsAreaSubNavItems("promoter").map((item) => item.href).join(","),
    "/events,/booking-plans,/calendar",
  );
  assert.match(
    plannerEventsNavSource,
    /export function canViewEventsSubNav\(role: UserRole \| null\): boolean \{\s*return role !== "dj";\s*\}/,
  );

  // Gigs gating is unchanged.
  assert.match(plannerEventsNavSource, /gigs: \{ href: "\/bookings", label: "Gigs" \}/);
  assert.match(
    plannerEventsNavSource,
    /export function canViewGigsSubNav\(role: UserRole \| null\): boolean \{\s*return role === "dj" \|\| role === "both";\s*\}/,
  );

  // The shared default-workspace resolver (post-login, onboarding, profile
  // setup, guard fallbacks) sends DJs to Gigs -- their workspace entry point --
  // and everyone else to Events. It must never resolve to Messages again.
  assert.match(
    currentUserSource,
    /export function getDefaultRouteForRole\(role: UserRole \| null\): string \{\s*return role === "dj" \? "\/bookings" : "\/events";\s*\}/,
  );
  assert.doesNotMatch(currentUserSource, /getDefaultRouteForRole[\s\S]{0,160}"\/dm"/);
  assert.match(
    currentUserSource,
    /export async function getPostAuthRedirectPath[\s\S]{0,400}return getDefaultRouteForRole\(profile\?\.role \?\? null\);/,
  );

  // One workspace-selector nav item, role-selected. Both variants use the
  // whole-area isActive check, so the tab highlights across the workspace and
  // no-ops when tapped from inside it; tapping from Messages/Profile navigates.
  assert.match(
    appNavigationSource,
    /function getNavItems\(currentUserId: string \| null, role: UserRole \| null\)/,
  );
  assert.match(appNavigationSource, /return \[workspace, messages, profile\];/);
  assert.match(appNavigationSource, /const workspace: NavItem = canViewEventsSubNav\(role\)/);
  assert.match(
    appNavigationSource,
    /href: "\/events"[\s\S]{0,140}isActive: \(pathname\) => isPlannerEventsAreaPath\(pathname\)[\s\S]{0,60}isWorkspaceSelector: true/,
  );
  assert.match(
    appNavigationSource,
    /href: "\/bookings"[\s\S]{0,140}isActive: \(pathname\) => isPlannerEventsAreaPath\(pathname\)[\s\S]{0,60}isWorkspaceSelector: true/,
  );
  assert.doesNotMatch(appNavigationSource, /isGigsAreaPath/);

  // /events is not a DJ destination any more, so a stale link or history entry
  // lands them in their own workspace instead of an orphaned list.
  assert.match(eventsPageSource, /if \(!roleReady \|\| canViewEventsSubNav\(resolvedRole\)\) \{\s*return;\s*\}/);
  assert.match(eventsPageSource, /router\.replace\(getDefaultRouteForRole\(resolvedRole\)\)/);

  // Back-navigation labels track where the href actually goes.
  assert.match(
    profileNavigationSource,
    /const fallbackLabel = role === "dj" \? "Back to Gigs" : "Back to Events";/,
  );
  assert.match(profileSetupSource, /return role === "dj" \? "Back to Gigs" : "Back to Events";/);
  assert.doesNotMatch(profileNavigationSource, /Back to Messages/);
  assert.doesNotMatch(profileSetupSource, /Back to Messages/);
}

/**
 * Removing the DJ Events tab must not take a cancelled gig with it.
 *
 * `cancel_event` (scripts/updateEventCancellationCancelsBookings.sql) only
 * cancels *pending* booking_requests, so after a planner cancels an event the
 * DJ's accepted booking still reads `status = 'accepted'`. The gigs list reads
 * booking_requests alone, so it used to keep that gig under Confirmed as though
 * it were still going ahead -- the DJ Events tab, which reads the event's own
 * status, was the only place the cancellation showed up in a list.
 *
 * The gigs snapshot now presents accepted bookings on cancelled events as
 * cancelled, which routes them to History and out of the Confirmed count
 * through the existing filters. Pending bookings are left alone: the database
 * already cancels those, and re-deriving them here would change what Incoming
 * means.
 */
function testCancelledEventGigsAreSurfacedInGigs() {
  const base: BookingRequest = {
    id: "booking-1",
    created_at: "2026-07-06T10:00:00.000Z",
    sender_id: "planner-1",
    recipient_id: "dj-1",
    conversation_id: "conversation-1",
    event_id: "event-1",
    event_name: "Summer party",
    venue: "Venue",
    event_date: "Saturday, 12 July 2099",
    set_time: "9:00 PM",
    fee: "500",
    notes: "",
    status: "accepted",
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
  const otherEvent: BookingRequest = { ...base, id: "booking-2", event_id: "event-2" };
  const pendingOnCancelled: BookingRequest = {
    ...base,
    id: "booking-3",
    status: "pending",
  };

  const received = [base, otherEvent, pendingOnCancelled];
  const cancelled = new Set(["event-1"]);
  const applied = applyCancelledEventStatus(received, cancelled);

  // Accepted booking on the cancelled event is presented as cancelled; the
  // accepted booking on a live event and the pending one are untouched.
  assert.equal(applied[0].status, "cancelled");
  assert.equal(applied[1].status, "accepted");
  assert.equal(applied[2].status, "pending");

  // No cancelled events means the original array is handed straight back.
  assert.equal(applyCancelledEventStatus(received, new Set()), received);

  // It lands where a DJ can still reach it: History, not Confirmed.
  const counts = countDjGigsByTab(applied);
  assert.equal(counts.accepted, 1);
  assert.equal(counts.history, 1);
  assert.equal(counts.pending, 1);
  assert.equal(
    filterDjGigsByTab(applied, "history").map((booking) => booking.id).join(","),
    "booking-1",
  );
  assert.equal(
    filterDjGigsByTab(applied, "accepted").map((booking) => booking.id).join(","),
    "booking-2",
  );

  // The event rows are already fetched for cover artwork, so this costs no
  // extra request -- the status simply stops being discarded.
  const prefetchSource = readFileSync(
    new URL("../lib/bookings/gigsListSnapshotPrefetch.ts", import.meta.url),
    "utf8",
  );
  assert.match(prefetchSource, /artwork\.status === "cancelled"/);
  assert.match(prefetchSource, /applyCancelledEventStatus\(received, eventLookup\.cancelledEventIds\)/);
  assert.equal((prefetchSource.match(/getEventArtworkByIds\(/g) ?? []).length, 1);
}

/**
 * The DJ main-nav Gigs tab shows the pending-incoming count.
 *
 * It must be the same number as the Gigs Incoming tab and the workspace sub-nav
 * pill -- all three read countDjGigsByTab(...).pending through the shared
 * stabilised hook and the shared gigsTabCountDisplay formatter, so 0 hides the
 * badge, 1-99 shows the value, and anything above 99 shows "99+".
 */
function testDjMainNavGigsCountBadge() {
  const appNavigationSource = readFileSync(
    new URL("../app/components/AppNavigation.tsx", import.meta.url),
    "utf8",
  );

  // Shared formatter, not a second copy of the capping rules.
  assert.match(appNavigationSource, /formatGigsTabCountDisplay/);
  assert.match(appNavigationSource, /formatGigsTabCountAriaCount/);
  assert.match(appNavigationSource, /shouldRenderGigsTabCount/);
  assert.equal(formatGigsTabCountDisplay(0), null);
  assert.equal(formatGigsTabCountDisplay(1), "1");
  assert.equal(formatGigsTabCountDisplay(2), "2");
  assert.equal(formatGigsTabCountDisplay(99), "99");
  assert.equal(formatGigsTabCountDisplay(100), "99+");
  assert.equal(formatGigsTabCountAriaCount(100), "more than 99");

  // Same stabilised source as the workspace sub-nav pill.
  assert.match(appNavigationSource, /useWorkspaceGigsPendingCount/);

  // Only the DJ workspace tab carries it.
  assert.match(appNavigationSource, /showGigsPendingCount: true/);
  assert.equal((appNavigationSource.match(/showGigsPendingCount: true/g) ?? []).length, 1);

  // Absolutely positioned, so appearing/changing width/clearing never reflows
  // the tab row, and tabular-nums keeps digits the same width.
  const badgeSource = appNavigationSource.slice(
    appNavigationSource.indexOf("function GigsNavCountBadge"),
    appNavigationSource.indexOf("function getBadgeCount"),
  );
  assert.match(badgeSource, /pointer-events-none absolute/);
  assert.match(badgeSource, /tabular-nums/);
  assert.match(badgeSource, /aria-label=\{`\$\{formatGigsTabCountAriaCount\(count\)\} incoming gig/);
}

/**
 * The Event Plans "Use Plan" flow (bookings/page.tsx) must not carry its own
 * copy of the send-booking-requests confirm UI.
 *
 * History: commit bf0dd9e changed the confirm-step copy ("Send summary" ->
 * "Summary", dynamic "Confirm N DJs" -> fixed "Send Requests") in the shared
 * SendBookingRequestsPanel.tsx only. bookings/page.tsx had an independent,
 * hand-written implementation of the identical UI that the fix never touched,
 * so the live Event Plans screen still showed the old copy and the fix looked
 * like it had failed to deploy (it hadn't -- it shipped to the other
 * component). 464cd37 patched the same two strings into the duplicate.
 *
 * Patching strings in two places is what this test used to lock in, and that
 * only ever guarded against the second copy going stale, never against the
 * duplication itself. The Summary card and the button-label state machine are
 * now a shared component + helper, so the assertion is that bookings/page.tsx
 * *delegates* rather than that its own literals happen to match: the copy
 * lives in exactly one file, and re-forking it fails here.
 */
function testEventPlansSendPanelReusesSharedConfirmUi() {
  const bookingsPageSource = readFileSync(
    new URL("../app/(planner-workspace)/bookings/page.tsx", import.meta.url),
    "utf8",
  );
  const panelSource = readFileSync(
    new URL("../app/components/booking/SendBookingRequestsPanel.tsx", import.meta.url),
    "utf8",
  );

  // The shared component/helper owns every string in this UI.
  assert.match(panelSource, /export function SendBookingRequestsSummary\(/);
  assert.match(panelSource, /export function resolveSendButtonLabel\(/);
  assert.doesNotMatch(panelSource, /Send summary/);
  assert.match(panelSource, /\s+Summary\s*\n\s*<\/p>/);
  assert.match(panelSource, /return "Send Requests";/);
  assert.match(panelSource, /return "No DJs selected";/);
  assert.match(panelSource, /"No new DJs to confirm" : "No new DJs to send"/);
  assert.match(panelSource, /\? "Confirming" : "Sending"/);

  // Event Plans imports and renders it instead of re-implementing it.
  assert.match(
    bookingsPageSource,
    /import \{[^}]*\bresolveSendButtonLabel\b[^}]*\bSendBookingRequestsSummary\b[^}]*\} from "@\/app\/components\/booking\/SendBookingRequestsPanel";/,
  );
  assert.match(bookingsPageSource, /<SendBookingRequestsSummary\s/);
  assert.match(bookingsPageSource, /\{resolveSendButtonLabel\(\{/);

  // No second copy of any of it left behind on the page.
  assert.doesNotMatch(bookingsPageSource, /Send summary/);
  assert.doesNotMatch(bookingsPageSource, /\s+Summary\s*\n\s*<\/p>/);
  assert.doesNotMatch(bookingsPageSource, /"Send Requests"/);
  assert.doesNotMatch(bookingsPageSource, /"No new DJs to confirm"/);
  assert.doesNotMatch(bookingsPageSource, /"Confirming"/);
  assert.doesNotMatch(bookingsPageSource, /Confirm \$\{sendableSelectedDjIds\.length\}/);

  // Same class of gap, found while consolidating: the touch-scroll containment
  // the panel's DJ list carries (so the list doesn't trap touch-scroll on
  // phones) had never been applied to this page's own list markup.
  assert.match(bookingsPageSource, /overflow-y-auto overscroll-contain[^"`]*touch-pan-y/);
}

/**
 * Rate-mode ("Fixed offer" / "Ask for rate") explanatory copy must read
 * identically in BOTH production pickers -- they are separate components and
 * have drifted before:
 *   1. BookingRateModeField.tsx  -- the "Rate type" cards (Booking Request modal)
 *   2. EventDjSendOfferControls.tsx -- the compact pills + "?" help panel used
 *      by the Create Event and Event Plans DJ-invite rows
 * Asserting one canonical string against both is the whole point of this test:
 * updating only one file is exactly the failure mode that shipped stale copy to
 * production before (see testEventPlansSendPanelCopyMatchesSendBookingRequestsPanel).
 *
 * Copy rules encoded here:
 *  - The "Ask for rate" wording must hold whether or not the optional suggested
 *    amount is filled in, so it must NOT mention keeping an "original offer"
 *    (there may not be one).
 *  - No trailing full stop (house style). The sentence-internal stop stays,
 *    since each description is two sentences.
 *  - The help panel names the mode it explains, as a small heading on its own
 *    line above the body. It has been all three ways: a run-in "Fixed offer.
 *    You set..." lead (read as one sentence), omitted entirely on the grounds
 *    that the pill above already says it (left the panel unidentifiable once
 *    open), and now a heading. `label` stays optional and crew chat still
 *    passes its own, asserted below so neither caller can silently lose it.
 */
const RATE_MODE_FIXED_DESCRIPTION = "You set the amount. The DJ can accept or decline";
const RATE_MODE_OPEN_DESCRIPTION =
  "The DJ tells you what they'd charge. You can accept it or make your own offer";

function testBookingRateModeDescriptionsAreUnified() {
  const cardSource = readFileSync(
    new URL("../app/components/booking/BookingRateModeField.tsx", import.meta.url),
    "utf8",
  );
  const pillSource = readFileSync(
    new URL("../app/components/booking/EventDjSendOfferControls.tsx", import.meta.url),
    "utf8",
  );
  const helpPanelSource = readFileSync(
    new URL("../app/components/booking/InlineOptionHelp.tsx", import.meta.url),
    "utf8",
  );
  const eventDetailSource = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  // One canonical wording, byte-identical in both pickers.
  assert.ok(cardSource.includes(`description: "${RATE_MODE_FIXED_DESCRIPTION}",`));
  assert.ok(cardSource.includes(`description: "${RATE_MODE_OPEN_DESCRIPTION}",`));
  assert.ok(pillSource.includes(`help: "${RATE_MODE_FIXED_DESCRIPTION}",`));
  assert.ok(pillSource.includes(`help: "${RATE_MODE_OPEN_DESCRIPTION}",`));

  // No trailing full stop on either description.
  assert.doesNotMatch(RATE_MODE_FIXED_DESCRIPTION, /\.$/);
  assert.doesNotMatch(RATE_MODE_OPEN_DESCRIPTION, /\.$/);

  // Superseded wording gone from both pickers -- including the "original offer"
  // phrasing that was wrong whenever no suggested amount had been entered.
  for (const source of [cardSource, pillSource]) {
    assert.doesNotMatch(source, /DJ can accept or decline your rate/);
    assert.doesNotMatch(source, /DJ sends their price/);
    assert.doesNotMatch(source, /exact amount/);
    assert.doesNotMatch(source, /original offer/);
    assert.doesNotMatch(source, /before accepting/);
  }

  // The help panel names the mode it is explaining, as a small heading on its
  // own line above the body -- not the run-in "Fixed offer. You set..." lead,
  // which read as one undifferentiated sentence, and not omitted entirely,
  // which left the panel with nothing identifying which mode it described.
  assert.match(
    pillSource,
    /<InlineOptionHelpPanel label=\{activeHelp\.label\} help=\{activeHelp\.help\} \/>/,
  );
  assert.match(
    helpPanelSource,
    /\{label \? <p className="font-semibold text-ftc-text">\{label\}<\/p> : null\}\s*\n\s*<p className=\{label \? "mt-0\.5" : undefined\}>\{help\}<\/p>/,
  );
  assert.doesNotMatch(helpPanelSource, /\{label\}\. </);

  // `label` stays optional, and crew chat still passes its own.
  assert.match(helpPanelSource, /label\?: string;/);
  assert.match(
    eventDetailSource,
    /<InlineOptionHelpPanel label=\{CREW_CHAT_HELP\.label\} help=\{CREW_CHAT_HELP\.help\} \/>/,
  );

  // The heading is not repeated anywhere else: the pills already carry the mode
  // names, and the summary card keeps its own concise wording.
  assert.match(pillSource, /`Fixed offer · \$\{formatRateDisplay\(offer\.fee\)\}`/);
  assert.match(pillSource, /`Ask for rate · suggested \$\{formatRateDisplay\(offer\.fee\)\}`/);
}

/**
 * Beta-blocking realtime regression: accepting a booking (from the DM, the only
 * place the Accept action exists) left every other view stale until a hard
 * refresh -- the planner, a "both" account, and the accepting DJ's own Gigs list.
 *
 * Two independent defects, both covered here:
 *
 * 1. CLIENT CACHE. The mutation only fired the `ftc-notifications-updated`
 *    window event, which refreshes views that are *mounted*. The Gigs list is
 *    unmounted while the user is in the DM, so nothing dropped the module-scoped
 *    `memorySnapshot` in gigsListSnapshotPrefetch; the next mount re-read it
 *    (`force: false`) and rendered the gig under its old tab with old counts.
 *    Only a full page load cleared the module. Fixed by invalidating through one
 *    shared entry point, `notifyBookingRequestsChanged`, which every booking
 *    status mutation now calls.
 *
 * 2. DATABASE. booking_requests was never in the `supabase_realtime`
 *    publication, so no booking event has ever been delivered to any client --
 *    the pre-existing dm-bookings subscription included. Fixed by
 *    scripts/setupBookingRequestsRealtime.sql, asserted below so the migration
 *    cannot be dropped from the repo.
 */
function testBookingStatusChangesReconcileEverywhere() {
  const syncSource = readFileSync(
    new URL("../lib/bookings/bookingRequestsSync.ts", import.meta.url),
    "utf8",
  );
  const bookingRequestsSource = readFileSync(
    new URL("../lib/bookingRequests.ts", import.meta.url),
    "utf8",
  );
  const prefetchSource = readFileSync(
    new URL("../lib/bookings/gigsListSnapshotPrefetch.ts", import.meta.url),
    "utf8",
  );
  const navBadgeSource = readFileSync(
    new URL("../app/components/navigation/NavBadgeProvider.tsx", import.meta.url),
    "utf8",
  );
  const realtimeSql = readFileSync(
    new URL("../scripts/setupBookingRequestsRealtime.sql", import.meta.url),
    "utf8",
  );

  // Every status mutation reconciles through the one shared entry point --
  // accept, decline, rate-proposal accept, and cancel (which previously did not
  // notify at all, so a cancellation went just as stale as an acceptance).
  assert.doesNotMatch(bookingRequestsSource, /notifyNavigationBadgesRefresh\(\)/);
  assert.ok(
    (bookingRequestsSource.match(/notifyBookingRequestsChanged\(\)/g) ?? []).length >= 4,
    "every booking status mutation should reconcile through notifyBookingRequestsChanged",
  );

  // The gigs snapshot cache registers itself as an invalidator rather than the
  // notifier importing it (that import direction would close a cycle back
  // through bookingRequests).
  assert.match(prefetchSource, /registerBookingRequestsChangeListener\(invalidateGigsListSnapshot\)/);
  assert.match(prefetchSource, /export function invalidateGigsListSnapshot/);
  assert.match(prefetchSource, /memorySnapshot = null;[\s\S]{0,80}inFlightSnapshot = null;/);
  assert.ok(
    !syncSource
      .split("\n")
      .some((line) => line.startsWith("import") && line.includes("gigsListSnapshotPrefetch")),
    "bookingRequestsSync must not import the gigs cache (that closes an import cycle)",
  );

  // Local mutations and remote events both land on the same function.
  assert.match(syncSource, /export function notifyBookingRequestsChanged/);
  assert.match(syncSource, /notifyNavigationBadgesRefresh\(\)/);

  // Subscription covers BOTH sides of a booking: without the sender_id
  // registration the planner never hears that their DJ accepted. Realtime
  // filters match one column, so two registrations are required.
  assert.match(syncSource, /filter: `recipient_id=eq\.\$\{userId\}`/);
  assert.match(syncSource, /filter: `sender_id=eq\.\$\{userId\}`/);
  assert.match(syncSource, /table: "booking_requests"/);
  assert.match(syncSource, /event: "\*"/);

  // Mounted app-wide (NavBadgeProvider renders for every signed-in user on every
  // page) rather than per-screen, and wired to the shared notifier.
  assert.match(navBadgeSource, /subscribeToBookingRequestChanges\(userId, notifyBookingRequestsChanged\)/);

  // No banned workarounds: no polling, no forced reloads, no arbitrary timeouts.
  for (const source of [syncSource, prefetchSource]) {
    assert.doesNotMatch(source, /setInterval|router\.refresh|location\.reload/);
  }

  // The database half must ship with the client half, or the subscription is silent.
  assert.match(realtimeSql, /alter publication supabase_realtime add table public\.booking_requests/);
  assert.match(realtimeSql, /alter table public\.booking_requests replica identity full/);
  assert.match(realtimeSql, /pg_publication_tables/);
}

function testBookingAcceptedDmMessageIsScopedToTheBooking() {
  const bookingRequestsSource = readFileSync(
    new URL("../lib/bookingRequests.ts", import.meta.url),
    "utf8",
  );
  const systemMessagesSource = readFileSync(
    new URL("../lib/dm/dmBookingSystemMessages.ts", import.meta.url),
    "utf8",
  );

  // The acceptance system message carries the event name. The bare
  // "Booking confirmed" constant is identical for every booking, so a
  // conversation-scoped dedupe on it allowed exactly ONE acceptance message per
  // DM: every later acceptance between the same planner and DJ inserted nothing,
  // and with no message row there was no realtime event, no unread state, no
  // inbox preview change and no notification.
  assert.match(
    bookingRequestsSource,
    /const messageText = formatBookingConfirmedDmMessage\(booking\.event_name\)/,
  );
  assert.match(systemMessagesSource, /export function formatBookingConfirmedDmMessage/);
  assert.match(systemMessagesSource, /export function parseBookingConfirmedDmEventName/);

  // Dedupe now matches that per-event text, so it identifies the booking rather
  // than the whole conversation.
  assert.match(
    bookingRequestsSource,
    /\.in\("text", \[messageText, activityText, legacyMessageText\]\)/,
  );

  // The per-event form is still recognised as a booking system message, and
  // still displays as the concise canonical copy.
  assert.match(
    systemMessagesSource,
    /parseBookingConfirmedDmEventName\(trimmed\) !== null/,
  );

  // The planner's acceptance notification is a booking outcome, and is no longer
  // gated on the DM insert -- that gate meant a skipped system message silently
  // swallowed the only notification the planner would have received.
  assert.match(bookingRequestsSource, /"booking_update",\s*\n\s*"Booking accepted"/);
  // (Other DM flows still gate their "New message" notification on the insert;
  // only the acceptance branch must not, so this checks that branch specifically.)
  assert.doesNotMatch(
    bookingRequestsSource,
    /const dmResult = await insertBookingAcceptedDmMessageIfNeeded/,
  );
  assert.match(bookingRequestsSource, /await insertBookingAcceptedDmMessageIfNeeded\(booking\);/);
}

function testTemporaryDebugInstrumentationIsFullyRemoved() {
  // Two investigations — booking-acceptance realtime, and the Run Sheet
  // textarea row caps — each shipped temporary opt-in diagnostics behind a
  // `?ftcdebug=` flag plus an on-screen panel. Neither may reach production,
  // and the pattern is easy to leave behind because it is inert without its
  // flag: nothing in normal use would reveal that it is still mounted.
  for (const relativePath of [
    "../lib/bookings/bookingRequestsSync.ts",
    "../lib/bookings/gigsListSnapshotPrefetch.ts",
    "../app/dm/page.tsx",
    "../app/components/OnboardingGuard.tsx",
    "../app/components/navigation/NavBadgeProvider.tsx",
    "../app/(planner-workspace)/events/EventsPageClient.tsx",
    "../app/(planner-workspace)/bookings/page.tsx",
    "../app/events/[eventId]/page.tsx",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /rtLog|realtimeDiagnostics|RealtimeDebugPanel|RunSheetTextareaDebugPanel|ftcdebug|ftc-debug-realtime/,
      `${relativePath} still references temporary debug instrumentation`,
    );
  }

  assert.ok(
    !existsSync(new URL("../lib/diagnostics/realtimeDiagnostics.ts", import.meta.url)),
    "the temporary realtime diagnostics module must be deleted",
  );
  // The whole directory, not the two known filenames: both panels lived here,
  // so anything left in it is the same mistake with a different name.
  assert.ok(
    !existsSync(new URL("../app/components/debug", import.meta.url)),
    "app/components/debug must not exist — temporary debug panels are not shipped",
  );
}

function testIosOverscrollDoesNotClipFixedChrome() {
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const navSource = readFileSync(
    new URL("../app/components/AppNavigation.tsx", import.meta.url),
    "utf8",
  );

  // The document must not rubber-band. The bottom nav is position:fixed, so it
  // is anchored to the layout viewport; an iOS bounce moves the visual viewport
  // past it and the bar stops tracking the screen edge, reading as clipped.
  // The shorthand (not the `-y` longhand) is what's actually declared -- see
  // testRootOverscrollContainmentIsDeclaredOnHtmlAndBody for why.
  assert.match(globalsSource, /html \{[\s\S]*?overscroll-behavior: none;[\s\S]*?\n\}/);

  // Suppressing the bounce must not turn the root into a second scroll
  // container, which would double-scroll the whole app.
  assert.doesNotMatch(globalsSource, /html \{[\s\S]*?overflow-y: (auto|scroll|hidden);[\s\S]*?\n\}/);

  // The fixed mobile bar paints solid: a translucent background plus a backdrop
  // blur has to resample the content behind it every frame of the bounce, which
  // is what flashes through on older GPUs.
  assert.match(
    globalsSource,
    /\.ftc-mobile-nav-bar \{\s*background: var\(--ftc-color-bg-base\);\s*backdrop-filter: none;\s*\}/,
  );

  // The desktop bar is sticky, never rubber-bands, and keeps its blur.
  assert.match(globalsSource, /\.ftc-nav-bar \{[\s\S]*?backdrop-filter: blur\(16px\);[\s\S]*?\n\}/);

  // Safe-area handling stays on the bar itself, so its background extends behind
  // the home indicator instead of leaving a strip the bounce can expose.
  assert.match(navSource, /pb-\[env\(safe-area-inset-bottom\)\]/);
  assert.match(navSource, /ftc-mobile-nav-bar fixed inset-x-0 bottom-0/);
}

/**
 * Root-level overscroll containment is declared as the `overscroll-behavior`
 * shorthand on BOTH `html` and `body`, and the page is never wider than the
 * viewport (`overflow-x: clip`, never the `overflow-x: hidden` band-aid).
 *
 * IMPORTANT -- what this does NOT claim. Two earlier passes added
 * `overscroll-behavior-x` here believing it would stop iOS Safari's
 * edge-swipe back gesture from sliding the previous screen into view. It does
 * not, and no CSS can: the CSSWG has that open as an unresolved question
 * (w3c/csswg-drafts#7878), which records that "as of now, none of browsers
 * respect overscroll-behavior for swipe navigation". A later investigation
 * proved the duplicated screens are never in FTC's DOM at all -- rAF plus
 * MutationObserver sampling across forward and back navigations found at most
 * ONE mobile nav mounted and `scrollWidth` never above `innerWidth` -- so the
 * side-by-side effect is Safari compositing a history snapshot, outside the
 * document. The declaration below is kept purely for the bounce/scroll-chaining
 * reasons in testIosOverscrollDoesNotClipFixedChrome and globals.css. Do not
 * re-file the swipe gesture as a CSS bug.
 */
function testRootOverscrollContainmentIsDeclaredOnHtmlAndBody() {
  const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  const htmlRule = globalsSource.match(/html \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(htmlRule, "the html {} rule must exist");
  assert.match(htmlRule, /overflow-x: clip;/);
  assert.match(htmlRule, /overscroll-behavior: none;/);
  // The shorthand, not the per-axis longhands -- see the doc comment above.
  assert.doesNotMatch(htmlRule, /overscroll-behavior-x:/);
  assert.doesNotMatch(htmlRule, /overscroll-behavior-y:/);
  // Not the band-aid the task explicitly ruled out.
  assert.doesNotMatch(htmlRule, /overflow-x: hidden/);

  const bodyRule = globalsSource.match(/body \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(bodyRule, "the body {} rule must exist");
  assert.match(bodyRule, /overflow-x: clip;/);
  assert.match(bodyRule, /overscroll-behavior: none;/);
  assert.doesNotMatch(bodyRule, /overflow-x: hidden/);
}

function testBookingsResultsAreaMatchesOneBookingCard() {
  const source = readFileSync(
    new URL("../app/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  // The empty state and the list share one wrapper, so a filter that matches
  // nothing cannot move the section's bottom edge or the Cancel Event button.
  assert.match(source, /className="mt-3 flex min-h-\[7\.5rem\] flex-col justify-center"/);
  assert.match(source, /style=\{\s*lineupCardHeight \? \{ minHeight: `\$\{lineupCardHeight\}px` \} : undefined/);

  // Sized from a real rendered card rather than a fixed value: the baseline is
  // the same for pending/accepted/declined, but an optional genre line or
  // cancellation detail makes a card taller, so no constant can match them all.
  assert.match(source, /const \[lineupCardHeight, setLineupCardHeight\] = useState<number \| null>\(null\)/);
  assert.match(source, /new ResizeObserver\(measure\)/);
  assert.match(source, /observer\.disconnect\(\)/);

  // Sub-pixel: a rounded value would leave the empty state up to 1px short.
  assert.match(source, /node\.getBoundingClientRect\(\)\.height/);

  // Only the first card is measured, and the list itself is unstyled so extra
  // cards still grow the section naturally.
  assert.match(source, /bookingIndex === 0 \? firstLineupCardRef : undefined/);
  assert.match(source, /<ul className="space-y-2\.5">/);
}

/**
 * Crew Chat "premium polish" pass: event-context card, member sheet, header
 * hierarchy, tighter (crew-chat-only) spacing, tappable sender names, and
 * read receipts derived from the existing message_reads high-water mark.
 *
 * Two things this specifically guards against regressing silently:
 *  - The tighter message spacing is scoped to crew chat's own wrapper
 *    functions (resolveIncomingGroupLiClass/resolveOutgoingGroupLiClass).
 *    DM calls resolveMessageGroupLiClass directly and never passes `spacing`,
 *    so its constants and default behaviour must be byte-for-byte unchanged.
 *  - Venue/date are shown once each (event-context card only), not repeated
 *    in the header, which now states only the event name and crew count.
 */
function testCrewChatPremiumPolish() {
  // buildCrewMemberList: owner first, DJs in participant order, role derived
  // (not stored) from ownerId comparison, missing profile falls back cleanly.
  const profiles = new Map([
    ["dj-1", { user_id: "dj-1", display_name: "Sarah", avatar_url: null }],
    ["owner-1", { user_id: "owner-1", display_name: "Isaac", avatar_url: null }],
    ["dj-3", { user_id: "dj-3", display_name: "Marlowe", avatar_url: null }],
  ]);
  const members = buildCrewMemberList(["dj-1", "owner-1", "dj-2"], profiles, "owner-1");
  assert.deepEqual(
    members.map((member) => member.userId),
    ["owner-1", "dj-1", "dj-2"],
    "owner sorts first regardless of participant order",
  );
  assert.equal(members[0].role, "promoter");
  assert.equal(members[1].role, "dj");
  assert.equal(members[2].displayName, "Member", "no profile falls back, not a raw id");
  // Owner id absent from the participant list (edge case) must not inject a phantom row.
  const noOwnerInList = buildCrewMemberList(["dj-1"], profiles, "owner-1");
  assert.equal(noOwnerInList.length, 1);
  assert.equal(noOwnerInList[0].userId, "dj-1");

  // resolveCrewChatSeenLabel: sender excluded from their own "seen by"; the
  // promoter is named by role, a lone DJ reader by name, several by count.
  const seenBase = {
    messageCreatedAt: "2026-01-01T10:00:00.000Z",
    messageSenderId: "dj-1",
    participantIds: ["owner-1", "dj-1", "dj-2", "dj-3"],
    ownerId: "owner-1",
    profiles,
  };
  assert.equal(
    resolveCrewChatSeenLabel({ ...seenBase, lastReadAtByUserId: new Map() }),
    null,
    "nobody has read it yet",
  );
  assert.equal(
    resolveCrewChatSeenLabel({
      ...seenBase,
      lastReadAtByUserId: new Map([["owner-1", "2026-01-01T10:05:00.000Z"]]),
    }),
    "Seen by Promoter",
  );
  assert.equal(
    resolveCrewChatSeenLabel({
      ...seenBase,
      lastReadAtByUserId: new Map([["dj-3", "2026-01-01T10:05:00.000Z"]]),
    }),
    "Seen by Marlowe",
  );
  assert.equal(
    resolveCrewChatSeenLabel({
      ...seenBase,
      lastReadAtByUserId: new Map([
        ["owner-1", "2026-01-01T10:05:00.000Z"],
        ["dj-2", "2026-01-01T10:05:00.000Z"],
      ]),
    }),
    "Seen by 2 members",
  );
  assert.equal(
    resolveCrewChatSeenLabel({
      ...seenBase,
      lastReadAtByUserId: new Map([["dj-1", "2026-01-01T10:05:00.000Z"]]),
    }),
    null,
    "the sender's own read-through never counts as a reader of their own message",
  );

  const groupLayoutSource = readFileSync(
    new URL("../lib/dm/chatMessageGroupLayout.ts", import.meta.url),
    "utf8",
  );
  const headerSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatHeader.tsx", import.meta.url),
    "utf8",
  );
  const eventCardSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatEventContextCard.tsx", import.meta.url),
    "utf8",
  );
  const announcementBandSource = readFileSync(
    new URL("../app/components/group-chat/CrewChatAnnouncementBand.tsx", import.meta.url),
    "utf8",
  );
  const memberSheetSource = readFileSync(
    new URL("../app/components/group-chat/CrewMemberListSheet.tsx", import.meta.url),
    "utf8",
  );
  const emptyStateSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatEmptyState.tsx", import.meta.url),
    "utf8",
  );
  const bubbleSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  const eventCrewChatSource = readFileSync(
    new URL("../lib/eventCrewChat.ts", import.meta.url),
    "utf8",
  );
  const readReceiptsSource = readFileSync(
    new URL("../lib/events/crewChatReadReceipts.ts", import.meta.url),
    "utf8",
  );
  const chatPageSource = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );

  // DM's rhythm is untouched -- same constant, same value, and its own direct
  // calls to resolveMessageGroupLiClass never request the compact variant.
  assert.match(groupLayoutSource, /CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1\.5"/);
  assert.match(groupLayoutSource, /GROUP_CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1"/);
  assert.match(
    groupLayoutSource,
    /GROUP_CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS = "mb-2\.5"/,
  );
  assert.match(
    groupLayoutSource,
    /export function resolveOutgoingGroupLiClass\({[\s\S]{0,900}spacing: "compact"/,
  );
  assert.match(
    groupLayoutSource,
    /export function resolveIncomingGroupLiClass\({[\s\S]{0,900}spacing: "compact"/,
  );
  const dmBubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    dmBubbleSource,
    /resolveMessageGroupLiClass\([\s\S]{0,200}spacing/,
    "DM must never request the compact variant",
  );

  // Header states the event name and crew count only -- venue/date/View Event
  // moved to the card, so nothing is shown twice on screen at once.
  assert.doesNotMatch(headerSource, /Crew chat •/);
  assert.doesNotMatch(headerSource, /showEventDetailsLink/);
  assert.doesNotMatch(headerSource, /VIEW_EVENT_BUTTON_CLASS/);
  assert.match(headerSource, /Crew Members/);
  assert.match(headerSource, /onOpenMemberSheet/);

  // Event-context card owns venue/date/time + the View Event action, and
  // collapses via the shared AnimatedExpandPanel primitive (not bespoke
  // height/opacity logic).
  assert.match(eventCardSource, /AnimatedExpandPanel/);
  assert.match(eventCardSource, /open=\{!collapsed\}/);
  assert.match(eventCardSource, /FtcVenueIcon/);
  assert.match(eventCardSource, /FtcCalendarIcon/);
  assert.match(eventCardSource, /FtcClockIcon/);
  assert.match(eventCardSource, /View Event/);
  assert.doesNotMatch(eventCardSource, />\s*\{eventName\}/, "name is not repeated here -- header already shows it, permanently");

  // Announcement slot is real and positioned, but renders nothing today.
  assert.match(announcementBandSource, /return null/);
  assert.match(chatPageSource, /<CrewChatAnnouncementBand \/>/);

  // Member sheet reuses the shared modal primitive rather than duplicating
  // its chrome, and both avatar and name are the same profile link.
  assert.match(memberSheetSource, /BookingSheetDialog/);
  assert.match(memberSheetSource, /buildProfileHref/);

  assert.match(emptyStateSource, /Welcome to your Crew Chat/);
  assert.match(
    emptyStateSource,
    /Coordinate set times, arrivals, equipment and event updates with your crew\./,
  );

  // Bubble: memoised, messageId-first callbacks (so memo is actually
  // effective for hundreds of messages), sender name is a profile link.
  assert.match(bubbleSource, /export default memo\(GroupChatMessageBubble\)/);
  assert.match(bubbleSource, /onToggleReaction: \(messageId: string, emoji: string\) => void/);
  assert.match(bubbleSource, /onOpenReactionPicker: \(messageId: string\) => void/);
  assert.match(bubbleSource, /onCloseReactionPicker: \(messageId: string\) => void/);
  assert.match(bubbleSource, /buildProfileHref\(senderUserId, \{ returnTo: profileReturnTo \}\)/);

  // Page passes the stable handlers straight through -- no per-row closure
  // recreating a new function for every message on every render.
  assert.match(chatPageSource, /onToggleReaction=\{handleToggleReaction\}/);
  assert.match(chatPageSource, /onOpenReactionPicker=\{handleOpenReactionPicker\}/);
  assert.match(chatPageSource, /onCloseReactionPicker=\{handleCloseReactionPicker\}/);
  assert.doesNotMatch(chatPageSource, /onToggleReaction=\{\(emoji\) => void handleToggleReaction/);

  // Seen label is computed once for the latest message only, not per message.
  assert.match(
    chatPageSource,
    /seenLabel=\{message\.id === lastMessage\?\.id \? latestMessageSeenLabel : null\}/,
  );

  // eventCrewChat access carries the two new fields on every return path
  // (type declaration + denied/owner/accepted-DJ outcomes = 4 occurrences).
  assert.equal((eventCrewChatSource.match(/ownerId:/g) ?? []).length, 4);
  assert.equal((eventCrewChatSource.match(/eventSetTime:/g) ?? []).length, 4);

  // Read receipts reuse the existing per-message comparison rather than
  // reimplementing it, and read from message_reads -- no new table/column.
  assert.match(readReceiptsSource, /isMessageSeenByReader/);
  assert.match(readReceiptsSource, /from\("message_reads"\)/);
  assert.doesNotMatch(readReceiptsSource, /\.from\("(?!message_reads)/);

  // No virtualisation dependency was added for the "hundreds of messages"
  // scalability item -- the fix here is cheaper re-renders, not a new library.
  const packageJsonSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  assert.doesNotMatch(packageJsonSource, /react-window|react-virtual|virtuoso/i);
}

function testCrewChatTimestampSeparators() {
  // buildGroupChatTimestampLayout: same clustering rhythm as DM's timestamp
  // layout, but flat -- no booking-card/timeline classification, since crew
  // chat messages are always plain chat or a system notice.
  // Local-time Date construction throughout (never UTC ISO strings) so this
  // test is correct in any timezone -- see testDmChatDaySeparators above.
  const baseTime = new Date(2026, 7, 2, 10, 0, 0).getTime();
  const quickGapMs = 60_000;
  const longGapMs = DM_CHAT_MEANINGFUL_TIME_GAP_MS + 60_000;
  const messages = [
    { id: "msg-1", created_at: new Date(baseTime).toISOString(), text: "hey" },
    { id: "msg-2", created_at: new Date(baseTime + quickGapMs).toISOString(), text: "again" },
    { id: "msg-3", created_at: new Date(baseTime + longGapMs).toISOString(), text: "later" },
  ];
  const layout = buildGroupChatTimestampLayout(messages, { now: new Date(baseTime + longGapMs) });

  assert.equal(layout.get("msg-1")?.showDaySeparatorBefore, true, "first message always gets a day marker");
  assert.equal(layout.get("msg-2")?.showDaySeparatorBefore, false);
  assert.equal(layout.get("msg-2")?.showTimeSeparatorBefore, false, "gap too short for a time separator");
  assert.equal(layout.get("msg-3")?.showDaySeparatorBefore, false);
  assert.equal(layout.get("msg-3")?.showTimeSeparatorBefore, true, "gap crosses the meaningful-gap threshold");

  const justBeforeMidnight = new Date(2026, 7, 1, 23, 58, 0).getTime();
  const crossMidnight = [
    { id: "before", created_at: new Date(justBeforeMidnight).toISOString(), text: "late" },
    {
      id: "after",
      created_at: new Date(justBeforeMidnight + 4 * 60_000).toISOString(),
      text: "early",
    },
  ];
  const dayLayout = buildGroupChatTimestampLayout(crossMidnight, {
    now: new Date(2026, 7, 2, 10, 0, 0),
  });

  assert.equal(dayLayout.get("after")?.showDaySeparatorBefore, true);
  assert.equal(
    dayLayout.get("after")?.showTimeSeparatorBefore,
    false,
    "day separator takes precedence -- never stack both for the same boundary",
  );

  // Page wiring: the reversed (newest-first) message list means the separator
  // for a message must render AFTER it in the DOM, not before like DM's
  // non-reversed list -- see wrapWithTrailingTimeSeparator in the page.
  const chatPageSourceForSeparators = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chatPageSourceForSeparators, /function wrapWithTrailingTimeSeparator/);
  assert.match(chatPageSourceForSeparators, /followedByTimeSeparator=\{followedByTimeSeparator\}/);
  assert.match(chatPageSourceForSeparators, /precededByTimeSeparator=\{precededByTimeSeparator\}/);

  /* ---- separators mark boundaries between VISIBLE groups only ---- */

  // A row that paints nothing must not claim a separator slot. Clustering
  // over invisible rows is what produced runs of centred timestamps with no
  // message between them (the reported 10:33 / 10:55 / 11:17 stack).
  const invisibleRun = [
    { id: "seen-1", created_at: new Date(baseTime).toISOString(), text: "morning" },
    // Neither text nor attachments -> GroupChatMessageBubble returns null.
    { id: "ghost-1", created_at: new Date(baseTime + longGapMs).toISOString(), text: "   " },
    { id: "ghost-2", created_at: new Date(baseTime + 2 * longGapMs).toISOString(), text: "" },
    // A legacy crew-roster notice, hidden at read time.
    {
      id: "ghost-3",
      created_at: new Date(baseTime + 3 * longGapMs).toISOString(),
      text: "Nadia joined the event crew. Crew chat is now open.",
    },
    { id: "seen-2", created_at: new Date(baseTime + 4 * longGapMs).toISOString(), text: "evening" },
  ];
  const invisibleLayout = buildGroupChatTimestampLayout(invisibleRun, {
    now: new Date(baseTime + 4 * longGapMs),
  });

  for (const ghostId of ["ghost-1", "ghost-2", "ghost-3"]) {
    assert.equal(
      invisibleLayout.has(ghostId),
      false,
      `${ghostId} paints nothing, so it must not get a separator`,
    );
  }
  // Exactly one separator survives, between the two rows that actually paint.
  assert.equal(invisibleLayout.get("seen-2")?.showTimeSeparatorBefore, true);
  assert.equal(
    [...invisibleLayout.values()].filter(
      (entry) => entry.showTimeSeparatorBefore || entry.showDaySeparatorBefore,
    ).length,
    2,
    "one day marker on the first visible row + one time separator between the two visible rows",
  );

  // Image rows carry no text but are visible, so they still cluster.
  const imageRun = [
    { id: "img-1", created_at: new Date(baseTime).toISOString(), text: "", hasAttachments: true },
    {
      id: "img-2",
      created_at: new Date(baseTime + longGapMs).toISOString(),
      text: "",
      hasAttachments: true,
    },
  ];
  const imageLayout = buildGroupChatTimestampLayout(imageRun, {
    now: new Date(baseTime + longGapMs),
  });
  assert.equal(imageLayout.get("img-1")?.showDaySeparatorBefore, true);
  assert.equal(
    imageLayout.get("img-2")?.showTimeSeparatorBefore,
    true,
    "an image-only row is a visible message and still separates groups",
  );

  // Event-update cards and system notices are visible too.
  assert.equal(isVisibleGroupChatMessage({ text: "Event details updated:\n• Venue: A → B" }), true);
  assert.equal(isVisibleGroupChatMessage({ text: "Booking update: run sheet changed" }), true);
  assert.equal(isVisibleGroupChatMessage({ text: "" }), false);
  assert.equal(isVisibleGroupChatMessage({ text: "", hasAttachments: true }), true);

  // Page must feed visibility (text + attachments) into the builder, not the
  // raw message list -- otherwise the filter above can never apply.
  assert.match(chatPageSourceForSeparators, /buildGroupChatTimestampLayout\(\s*\n?\s*messages\.map/);
  assert.match(chatPageSourceForSeparators, /hasAttachments: \(attachmentsByMessageId\.get/);

  /* ---- no per-message timestamps anywhere: exact DM parity ---- */

  // DM renders every per-message <time> hidden/sr-only and shows time only in
  // the centred separators. Crew chat must not diverge, in any of its rows.
  for (const relativePath of [
    "../app/components/group-chat/GroupChatMessageBubble.tsx",
    "../app/components/group-chat/GroupChatSystemNotice.tsx",
    "../app/components/chat/IncomingChatMessageLayout.tsx",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    // Requires at least one attribute, matching the convention in
    // testIncomingChatMessagesHaveNoAvatarTimestamp, so prose mentions of
    // `<time>` in doc comments aren't mistaken for rendered elements.
    const timeTags = source.match(/<time\s[^>]*>/g) ?? [];

    assert.ok(timeTags.length > 0, `${relativePath} should still emit a machine-readable <time>`);
    for (const tag of timeTags) {
      assert.match(
        tag,
        /\bhidden\b|sr-only/,
        `${relativePath} must not render a visible per-message timestamp`,
      );
    }
  }

  assert.doesNotMatch(chatPageSourceForSeparators, /showTimestamp/);

  const bubbleSourceForSeparators = readFileSync(
    new URL("../app/components/group-chat/GroupChatMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bubbleSourceForSeparators, /followedByTimeSeparator = false/);
  assert.match(bubbleSourceForSeparators, /precededByTimeSeparator = false/);

  // The prop that used to gate per-message timestamps is gone, exactly as DM
  // has none (see the showTimestamp assertions in the DM timestamp tests).
  assert.doesNotMatch(bubbleSourceForSeparators, /showTimestamp/);
}

function testCrewChatEventCardToggleScrollCompensation() {
  // The scroller is flex-1 in a fixed-height column, so expanding the event
  // card above it shrinks clientHeight rather than changing scrollHeight.
  // Holding distance-from-the-live-edge constant must move scrollTop by
  // exactly the height the card gained, cancelling the visual slide.
  const scrollHeight = 2000;
  const distanceFromBottom = 400;

  const beforeExpand = resolveScrollTopPreservingDistanceFromBottom(
    { scrollHeight, clientHeight: 600 },
    distanceFromBottom,
  );
  // Card grew by 57px -> scroller lost 57px of clientHeight.
  const afterExpand = resolveScrollTopPreservingDistanceFromBottom(
    { scrollHeight, clientHeight: 543 },
    distanceFromBottom,
  );

  assert.equal(beforeExpand, 1000);
  assert.equal(
    afterExpand - beforeExpand,
    57,
    "scrollTop must move by exactly the height the card added",
  );

  // Collapsing is the same arithmetic in reverse -- back to the original.
  assert.equal(
    resolveScrollTopPreservingDistanceFromBottom(
      { scrollHeight, clientHeight: 600 },
      distanceFromBottom,
    ),
    beforeExpand,
  );

  // Pinned at the live edge (distance 0) stays pinned rather than drifting.
  assert.equal(
    resolveScrollTopPreservingDistanceFromBottom({ scrollHeight, clientHeight: 543 }, 0),
    scrollHeight - 543,
  );

  // Never returns a negative scrollTop when the content is shorter than the
  // viewport, or when the captured distance exceeds what is now scrollable.
  assert.equal(
    resolveScrollTopPreservingDistanceFromBottom({ scrollHeight: 300, clientHeight: 600 }, 0),
    0,
  );
  assert.equal(
    resolveScrollTopPreservingDistanceFromBottom({ scrollHeight: 800, clientHeight: 600 }, 9999),
    0,
  );

  const chatPageSource = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );

  // Compensation must be captured BEFORE the state flips, or it measures the
  // card's post-toggle height and corrects by the wrong amount.
  assert.match(
    chatPageSource,
    /preserveScrollAcrossEventCardToggle\(\);\s*\n\s*setEventCardCollapsed\(/,
    "compensation must run before the collapsed state changes",
  );

  // Opens collapsed: the conversation is why anyone opens this screen, so it
  // gets the viewport and the details sit one tap away.
  assert.match(
    chatPageSource,
    /const \[eventCardCollapsed, setEventCardCollapsed\] = useState\(true\);/,
    "event details must start collapsed",
  );

  // The card is owned solely by the Details/Hide toggle. A scroll-driven
  // version existed and was removed: it re-opened and re-closed the card as
  // the reader crossed its threshold, which felt unstable and took control
  // away from the user. Exactly three references are legitimate -- the
  // useState declaration, the toggle's own onClick, and the per-event reset
  // in loadAccess. A fourth means something new is driving the card.
  assert.equal(
    (chatPageSource.match(/setEventCardCollapsed/g) ?? []).length,
    3,
    "only the Details/Hide toggle and the per-event reset may change the card's state",
  );

  // Entering a chat is always a fresh start, including when React reuses this
  // component instance across two different events rather than remounting.
  assert.match(
    chatPageSource,
    /setMemberSheetOpen\(false\);[\s\S]{0,320}setEventCardCollapsed\(true\);/,
    "switching events must reset the card to collapsed",
  );
  assert.doesNotMatch(
    chatPageSource,
    /EVENT_CARD_COLLAPSE_THRESHOLD_PX/,
    "the scroll-distance collapse threshold must stay removed",
  );
  assert.doesNotMatch(
    chatPageSource,
    /addEventListener\("scroll"/,
    "no scroll listener may drive event-card state on this page",
  );

  // Already-at-the-bottom is owned by useChatScroll's own re-pin; writing
  // scrollTop from both places would fight.
  assert.match(
    chatPageSource,
    /distanceFromBottom <= CHAT_NEAR_BOTTOM_THRESHOLD_PX[\s\S]{0,40}return;/,
    "must defer to useChatScroll's re-pin when already at the live edge",
  );

  // A ResizeObserver (not a one-shot correction) is required because the card
  // animates its height over 200ms rather than resizing in a single step.
  assert.match(chatPageSource, /new ResizeObserver\(\(\) => \{[\s\S]{0,200}resolveScrollTopPreservingDistanceFromBottom/);
  assert.match(chatPageSource, /observer\.disconnect\(\)/, "observer must be torn down");
}

function testEventUpdateMessagePresentation() {
  // Round-trip: the stored format and the render-time parser must not drift.
  // This is the real guarantee that presentation can be changed without
  // touching generation -- if the writer's shape ever changes, this fails.
  const stored = formatEventGroupChatUpdateMessage([
    { label: "Event name", from: "Test 1", to: "Test 2" },
    { label: "Venue", from: "Old Venue", to: "New Venue" },
    // Values legitimately contain colons and en dashes.
    { label: "Set time", from: "10:51 PM – 11:46 PM", to: "9:51 PM – 11:46 PM" },
  ]);

  assert.match(
    stored,
    /^Event details updated:/,
    "the stored message text must not change -- notifications and history read it",
  );

  assert.deepEqual(parseEventGroupChatUpdateMessage(stored), [
    // "Event name" displays as "Name": the heading already says "Event".
    { label: "Name", from: "Test 1", to: "Test 2" },
    { label: "Venue", from: "Old Venue", to: "New Venue" },
    { label: "Set time", from: "10:51 PM – 11:46 PM", to: "9:51 PM – 11:46 PM" },
  ]);

  // Only changed fields are ever present, because the parser reports exactly
  // the rows the generator wrote.
  assert.deepEqual(
    parseEventGroupChatUpdateMessage(
      formatEventGroupChatUpdateMessage([{ label: "Venue", from: "A", to: "B" }]),
    ),
    [{ label: "Venue", from: "A", to: "B" }],
  );

  // Anything unrecognised falls back to the plain-text bubble rather than
  // rendering an empty card.
  for (const notAnUpdate of [
    "Just a normal message",
    "Event details updated:",
    "Event details updated:\n• no arrow here",
    "Booking update: someone joined the crew",
    "",
  ]) {
    assert.equal(parseEventGroupChatUpdateMessage(notAnUpdate), null);
  }

  const noticeSource = readFileSync(
    new URL("../app/components/group-chat/EventUpdateMessageContent.tsx", import.meta.url),
    "utf8",
  );
  const bubbleSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  const geometrySource = readFileSync(
    new URL("../lib/dm/chatMessageBubbleGeometry.ts", import.meta.url),
    "utf8",
  );

  // Heading reads "Event updated" as a small uppercase accent label, not a
  // message-sized heading.
  assert.match(noticeSource, /EVENT_GROUP_CHAT_UPDATE_HEADING/);
  assert.match(noticeSource, /text-\[10px\] font-semibold uppercase[^"]*text-ftc-primary/);
  assert.doesNotMatch(noticeSource, /font-bold|text-base|text-lg/);

  // The new value is the point of the message: old value takes the muted
  // token, new value keeps full-strength text plus a medium weight.
  assert.match(noticeSource, /text-ftc-text-muted">\{change\.from\}/);
  assert.match(noticeSource, /font-medium text-ftc-text">\{change\.to\}/);

  // Colour tokens are correct here (unlike the previous shared-background
  // treatment) because the card owns a single known background.
  assert.doesNotMatch(
    noticeSource,
    /className="[^"]*opacity-\d0/,
    "the card has a fixed background, so opacity hacks are no longer needed",
  );

  // THE core requirement: an app-generated notice must not wear sender
  // styling. No primary fill, no speech-bubble tail, always left-aligned,
  // no avatar and no sender name -- for the planner who triggered it too.
  assert.match(geometrySource, /export function resolveChatSystemCardShellClass/);
  assert.match(geometrySource, /resolveChatSystemCardShellClass[\s\S]{0,400}rounded-xl/);
  assert.match(
    geometrySource,
    /resolveChatSystemCardShellClass[\s\S]{0,400}bg-\[var\(--ftc-color-bg-surface-raised\)\]/,
  );
  assert.doesNotMatch(
    geometrySource.slice(geometrySource.indexOf("export function resolveChatSystemCardShellClass")),
    /ftc-bubble-own|shadow-/,
    "the system card must not reuse the outgoing bubble fill or add shadows",
  );

  assert.match(bubbleSource, /const systemAuthored = isEventUpdate;/);
  assert.match(bubbleSource, /systemAuthored\s*\n?\s*\?\s*resolveChatSystemCardShellClass\(\)/);
  assert.match(
    bubbleSource,
    /isOwnMessage=\{systemAuthored \? false : isOwnMessage\}/,
    "reaction pill and picker must anchor left, where the card actually sits",
  );
  assert.match(
    bubbleSource,
    /if \(systemAuthored\) \{[\s\S]{0,1200}items-start/,
    "system notices render in their own left-aligned branch",
  );
  // That branch must precede the own/incoming split, or a planner's own
  // update would still take the right-aligned outgoing path.
  assert.ok(
    bubbleSource.indexOf("if (systemAuthored) {") < bubbleSource.indexOf("if (!isOwnMessage) {"),
    "the system-authored branch must come before the own/incoming split",
  );

  // Narrower than a normal message so it supports rather than dominates.
  assert.match(bubbleSource, /max-w-\[72%\] sm:max-w-\[56%\]/);

  /* ---- polish pass: separation, border weight, timestamp ---- */

  // Tailwind spacing unit is 0.25rem = 4px.
  const spacingPx = (cls: string, axis: "mb" | "mt"): number => {
    const found = cls.match(new RegExp(`\\b${axis}-(\\d+(?:\\.\\d+)?)\\b`));
    return found ? Number(found[1]) * 4 : 0;
  };

  const systemLi = resolveSystemCardGroupLiClass();
  const normalCrewGap = spacingPx(GROUP_CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS, "mb");

  // LEFT-ALIGNED is a hard requirement, not an incidental: never centred.
  assert.match(systemLi, /\bjustify-start\b/);
  assert.doesNotMatch(systemLi, /\bjustify-center\b|\bmx-auto\b|\bitems-center\b/);

  // Reads as a timeline event: 4-8px more air than a normal crew message on
  // BOTH sides. flex-col-reverse, so `mb` is the gap above and `mt` below.
  const extraAbove = spacingPx(systemLi, "mb") - normalCrewGap;
  const extraBelow = spacingPx(systemLi, "mt");
  assert.ok(
    extraAbove >= 4 && extraAbove <= 8,
    `system card needs 4-8px more space above a normal message, got ${extraAbove}px`,
  );
  assert.ok(
    extraBelow >= 4 && extraBelow <= 8,
    `system card needs 4-8px more space below a normal message, got ${extraBelow}px`,
  );

  // Exactly one margin utility per axis. Two (e.g. from appending to
  // resolveIncomingGroupLiClass, which already emits mb-2.5) would resolve by
  // stylesheet order rather than class order -- a silent coin flip.
  assert.equal((systemLi.match(/\bmb-/g) ?? []).length, 1, "one margin-bottom utility only");
  assert.equal((systemLi.match(/\bmt-/g) ?? []).length, 1, "one margin-top utility only");

  // A day/time separator directly above already supplies the break, so the
  // top gap tightens there while the extra space below is kept.
  const afterSeparator = resolveSystemCardGroupLiClass({ precededByTimeSeparator: true });
  assert.ok(
    spacingPx(afterSeparator, "mb") < spacingPx(systemLi, "mb"),
    "top gap must tighten when a time separator sits directly above",
  );
  assert.equal(spacingPx(afterSeparator, "mt"), extraBelow);

  // The row must use the dedicated resolver, not the incoming one.
  assert.match(
    bubbleSource,
    /if \(systemAuthored\) \{[\s\S]{0,400}resolveSystemCardGroupLiClass\(\{ precededByTimeSeparator \}\)/,
  );

  // Softer than the full-strength shared token (0.28 alpha), which read as a
  // status/warning frame and competed with the blue heading.
  assert.match(geometrySource, /resolveChatSystemCardShellClass[\s\S]{0,400}border-ftc-primary\/20/);
  assert.doesNotMatch(
    geometrySource.slice(geometrySource.indexOf("export function resolveChatSystemCardShellClass")),
    /border-\[var\(--ftc-color-primary-border\)\]/,
    "the softened border must not fall back to the full-strength token",
  );

  // Superseded by the DM-parity timestamp pass: the card's timestamp is now
  // hidden like every other crew-chat row, so the only visible times are the
  // centred separators. See testCrewChatTimestampSeparators.
  assert.match(
    bubbleSource,
    /if \(systemAuthored\) \{[\s\S]{0,1400}<time dateTime=\{createdAt\} hidden>/,
  );

  // Reactions, highlight and the seen label all still route through the
  // shared shell -- restyling must not quietly drop message capabilities.
  assert.match(bubbleSource, /if \(systemAuthored\) \{[\s\S]{0,1200}\{bubbleBlock\}/);

  // DM is untouched: it has no system-card concept at all.
  const dmBubbleSource = readFileSync(
    new URL("../app/components/dm/DmTextMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(dmBubbleSource, /resolveChatSystemCardShellClass|systemAuthored/);
}

function testIncomingChatMessagesHaveNoAvatarTimestamp() {
  const incomingLayoutSource = readFileSync(
    new URL("../app/components/chat/IncomingChatMessageLayout.tsx", import.meta.url),
    "utf8",
  );
  const dmIncomingLayoutSource = readFileSync(
    new URL("../app/components/chat/DmIncomingMessageLayout.tsx", import.meta.url),
    "utf8",
  );
  const groupLayoutSource = readFileSync(
    new URL("../lib/dm/chatMessageGroupLayout.ts", import.meta.url),
    "utf8",
  );
  const chatPageSource = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );

  // Day separators and the grouped time separators between clusters already
  // say when a message was sent, so the per-message time under every incoming
  // avatar was duplicate information. Both incoming layouts now keep the
  // <time> in the DOM purely as machine-readable markup.
  for (const [name, source] of [
    ["IncomingChatMessageLayout", incomingLayoutSource],
    ["DmIncomingMessageLayout", dmIncomingLayoutSource],
  ] as const) {
    // Requires at least one attribute, so prose mentions of `<time>` in doc
    // comments aren't mistaken for rendered elements.
    const timeTags = source.match(/<time\s[^>]*>/g) ?? [];

    assert.ok(timeTags.length > 0, `${name} should still emit a machine-readable <time>`);
    for (const tag of timeTags) {
      assert.match(tag, /\bhidden\b/, `${name} must not render a visible avatar timestamp`);
    }
  }

  // The grid row and cell that existed only to position that timestamp are
  // gone, so the row no longer reserves space (or a gap) for it.
  assert.doesNotMatch(incomingLayoutSource, /CHAT_INCOMING_TIMESTAMP_CELL_CLASS/);
  assert.doesNotMatch(incomingLayoutSource, /CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS/);
  assert.doesNotMatch(incomingLayoutSource, /showTimestamp/);
  assert.doesNotMatch(
    groupLayoutSource,
    /CHAT_INCOMING_TIMESTAMP_CELL_CLASS|CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS/,
    "the timestamp cell/row constants must not be reintroduced",
  );

  // Everything the timestamp sat beside is untouched: avatar cell, the
  // sender-name slot, and the bubble column.
  assert.match(incomingLayoutSource, /CHAT_INCOMING_AVATAR_CELL_CLASS/);
  assert.match(incomingLayoutSource, /CHAT_INCOMING_BUBBLE_CELL_CLASS/);
  assert.match(incomingLayoutSource, /\{leadingContent\}/);

  // The grouping system this replaces must still be wired up.
  assert.match(chatPageSource, /DmChatTimeSeparator/);
  // Call shape now maps visibility (text + attachments) in — see
  // testCrewChatTimestampSeparators for why.
  assert.match(chatPageSource, /buildGroupChatTimestampLayout\(/);
  // Name/avatar/spacing all come from the one shared grouping calculation now
  // — see testCrewChatMessageGrouping.
  assert.match(chatPageSource, /showSenderName=\{messageGroup\?\.showSenderName \?\? false\}/);
}

function testCrewChatImageAttachmentsWiring() {
  // Image sharing reuses the DM attachment pipeline (shared type, shared
  // pending-photo staging, shared upload validation) rather than a second
  // upload system -- see lib/groupChatAttachments.ts.
  const chatPageSource = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );
  const groupChatAttachmentsSource = readFileSync(
    new URL("../lib/groupChatAttachments.ts", import.meta.url),
    "utf8",
  );
  const composerSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatComposer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(groupChatAttachmentsSource, /sendEventCrewChatMessageWithAttachments/);
  assert.match(groupChatAttachmentsSource, /DM_ATTACHMENTS_BUCKET/);
  assert.match(groupChatAttachmentsSource, /validateDmAttachmentFile/);

  // Composer matches DM's exactly: same photo-picker button, same pending-photo
  // strip, same "Message" placeholder (no ellipsis).
  assert.match(composerSource, /placeholder="Message"/);
  assert.doesNotMatch(composerSource, /placeholder="Message\.\.\."/);
  assert.match(composerSource, /ComposerIconButton/);
  assert.match(composerSource, /dm-composer-pending-photo-selected/);

  // Page: staging state, optimistic send, and the message_attachments realtime
  // subscription filtered on event_id (DM's equivalent filters on conversation_id).
  assert.match(chatPageSource, /const \[attachments, setAttachments\] = useState<DmMessageAttachment\[\]>/);
  assert.match(chatPageSource, /const \[pendingAttachments, setPendingAttachments\]/);
  assert.match(chatPageSource, /async function sendCrewChatAttachments\(files: File\[\]\)/);
  assert.match(chatPageSource, /sendEventCrewChatMessageWithAttachments\(\{/);
  assert.match(chatPageSource, /table: "message_attachments",[\s\S]{0,80}filter: `event_id=eq\.\$\{eventId\}`/);
  assert.match(chatPageSource, /pendingPhotos=\{pendingAttachments\}/);
  assert.match(chatPageSource, /attachments=\{attachmentsByMessageId\.get\(message\.id\) \?\? \[\]\}/);

  // Attachment loading fails soft (matches the reactions pattern already on
  // this page) -- a missing migration must never take the whole chat down.
  assert.match(
    chatPageSource,
    /listEventCrewChatAttachmentsForEvent\(eventId\)\.catch\(\(attachmentError\) => \{/,
  );

  // Bubble renders attachments via the same DmMessageAttachmentGroup DM uses --
  // no second gallery/lightbox implementation for crew chat images.
  const bubbleSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatMessageBubble.tsx", import.meta.url),
    "utf8",
  );
  assert.match(bubbleSource, /import DmMessageAttachmentGroup from/);
  assert.doesNotMatch(bubbleSource, /class="[^"]*lightbox/i);
}

/**
 * Crew chat keeps the composer focused (and the iOS keyboard open) across a
 * send, reusing DM's proven mechanism rather than a second implementation.
 *
 * Root cause this pins: the textarea used to carry `disabled={busy}`. A
 * disabled form control cannot hold focus, so the browser blurred it
 * synchronously the moment `sending` flipped true and iOS closed the
 * keyboard. DM never disabled its textarea — only its Send button — which is
 * why DM never had the bug. Duplicate sends are prevented by the page's
 * `sending || uploading` early-return plus the Send button's own disabled
 * state, so keeping the field enabled costs nothing.
 */
function testCrewChatComposerKeepsFocusAfterSend() {
  const composerSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatComposer.tsx", import.meta.url),
    "utf8",
  );
  const chatPageSource = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );

  // THE regression: the textarea must never be disabled while busy.
  assert.doesNotMatch(
    composerSource,
    /placeholder="Message"[\s\S]{0,200}disabled=\{busy\}/,
    "a disabled textarea cannot hold focus — this is what closed the iOS keyboard",
  );
  assert.doesNotMatch(
    composerSource,
    /<ComposerMessageField[\s\S]{0,300}disabled=/,
    "ComposerMessageField must not receive any disabled prop in crew chat",
  );
  // The Send button still is disabled while busy — that is the duplicate-send guard.
  assert.match(composerSource, /disabled=\{busy \|\| !canSend\}/);

  // Same ref/blur plumbing DM uses.
  assert.match(composerSource, /inputRef/);
  assert.match(composerSource, /composerRootRef/);
  assert.match(composerSource, /onInputBlurWhileBusy/);
  assert.match(composerSource, /useComposerTextareaAutogrow\(value, inputRef\)/);
  // Send button keeps focus through the tap instead of stealing it.
  assert.match(composerSource, /onPointerDown/);

  // Page wiring: capture intent before the await, restore on both outcomes.
  assert.match(chatPageSource, /composerInputRef/);
  assert.match(chatPageSource, /keepComposerFocusedAfterSendRef/);
  assert.match(chatPageSource, /shouldKeepComposerFocusedAfterSend/);
  assert.match(chatPageSource, /restoreComposerInputFocusElement/);
  assert.match(chatPageSource, /captureComposerFocusIntentForSend/);
  assert.match(chatPageSource, /onInputBlurWhileBusy=\{handleComposerInputBlurWhileBusy\}/);

  // Intentional dismissal wins: a blur while busy drops the refocus intent,
  // and the shared scroll-dismiss hook owns the drag-to-dismiss gesture.
  assert.match(
    chatPageSource,
    /handleComposerInputBlurWhileBusy = useCallback\(\(\) => \{\s*keepComposerFocusedAfterSendRef\.current = false;/,
  );
  assert.match(
    chatPageSource,
    /useDismissComposerKeyboardOnIntentionalScroll\(scrollRef, composerInputRef, composerRootRef\)/,
  );

  // Draft survives a failed send: input is cleared only after the awaited
  // send resolves, and focus is restored on both paths via `finally`.
  const textSend = chatPageSource.match(/async function sendMessage\(\)[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(textSend, "sendMessage must exist");
  assert.ok(
    textSend.indexOf("await sendEventCrewChatMessage(") < textSend.indexOf('setInput("")'),
    "the draft must only be cleared after a confirmed successful send",
  );
  assert.match(textSend, /finally \{[\s\S]*restoreComposerInputFocus\(\);/);
  // Duplicate-send guard intact.
  assert.match(textSend, /\|\| !eventId \|\| sending \|\| uploading\) \{\s*return;/);

  /* ---- viewport half of the keyboard fix: full DM shell parity ---- */

  // `fixed inset-0` pins the shell to the LAYOUT viewport, which iOS does not
  // shrink when the software keyboard opens — the composer ends up under the
  // keyboard and WebKit scrolls the document to chase the focused input, then
  // dismisses the keyboard when the list re-renders and auto-scrolls on send.
  // The shared `h-[100dvh]` shell tracks the dynamic viewport instead. Removing
  // the disabled textarea (above) was necessary but not sufficient on its own.
  assert.match(chatPageSource, /FIXED_CHAT_PAGE_SHELL_CLASS/);
  assert.doesNotMatch(
    chatPageSource,
    /className="fixed inset-0 flex flex-col overflow-hidden/,
    "the crew chat shell must not pin itself to the layout viewport",
  );

  // Second half: the document must be locked flat while this fixed surface is
  // mounted, so there is nothing for WebKit to scroll in the first place.
  assert.match(chatPageSource, /useFixedChatPageDocumentReset\(/);

  // Both halves come from the same modules DM uses — not a crew-chat fork.
  const shellSource = readFileSync(
    new URL("../lib/navigation/prepareFixedChatPageMount.ts", import.meta.url),
    "utf8",
  );
  assert.match(shellSource, /h-\[100dvh\] max-h-\[100dvh\]/);
  assert.match(shellSource, /html\.style\.overflow = "hidden"/);

  // DM is untouched — it must still own the same mechanisms independently.
  const dmComposerSource = readFileSync(
    new URL("../app/components/dm/DmComposer.tsx", import.meta.url),
    "utf8",
  );
  const dmPageSourceForFocus = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(dmComposerSource, /onInputBlurWhileBusy/);
  assert.doesNotMatch(dmComposerSource, /<ComposerMessageField[\s\S]{0,300}disabled=/);
  assert.match(dmPageSourceForFocus, /FIXED_CHAT_PAGE_SHELL_CLASS/);
  assert.match(dmPageSourceForFocus, /useFixedChatPageDocumentReset\(/);
}

/**
 * One grouping calculation drives sender name, avatar and spacing in crew
 * chat. This replaced two independent passes that provably disagreed:
 *  - the layout pass received a list with system rows filtered out, so two
 *    messages either side of an event update became adjacent and grouped
 *    together (losing the avatar), while the name pass broke on them;
 *  - only the layout pass knew about time gaps, so after a centred timestamp
 *    separator the avatar broke but the sender name did not reappear.
 */
function testCrewChatMessageGrouping() {
  const baseTime = new Date(2026, 7, 3, 12, 0, 0).getTime();
  const at = (offsetMs: number) => new Date(baseTime + offsetMs).toISOString();
  const ME = "me";
  const OTHER = "dj-1";
  const OTHER_2 = "dj-2";

  // Isaac x3, DJ x2, Isaac x1 — the exact shape from the brief.
  const runs = buildCrewChatMessageGroups(
    [
      { id: "a1", user_id: OTHER, created_at: at(0), text: "one" },
      { id: "a2", user_id: OTHER, created_at: at(1000), text: "two" },
      { id: "a3", user_id: OTHER, created_at: at(2000), text: "three" },
      { id: "b1", user_id: OTHER_2, created_at: at(3000), text: "hey" },
      { id: "b2", user_id: OTHER_2, created_at: at(4000), text: "again" },
      { id: "c1", user_id: OTHER, created_at: at(5000), text: "back" },
    ],
    ME,
  );

  // Sender name ONLY on the first message of each run.
  assert.deepEqual(
    ["a1", "a2", "a3", "b1", "b2", "c1"].map((id) => runs.get(id)?.showSenderName),
    [true, false, false, true, false, true],
  );
  // Avatar ONLY on the last message of each run.
  assert.deepEqual(
    ["a1", "a2", "a3", "b1", "b2", "c1"].map((id) => runs.get(id)?.showAvatar),
    [false, false, true, false, true, true],
  );
  // Spacing positions agree with the same boundaries.
  assert.deepEqual(
    ["a1", "a2", "a3", "b1", "b2", "c1"].map((id) => runs.get(id)?.position),
    ["first", "middle", "last", "first", "last", "standalone"],
  );
  // Tight spacing only inside a run.
  assert.deepEqual(
    ["a1", "a2", "a3"].map((id) => runs.get(id)?.tightWithPrevious),
    [false, true, true],
  );

  // Outgoing follows the same rhythm but never shows own name or avatar.
  const own = buildCrewChatMessageGroups(
    [
      { id: "m1", user_id: ME, created_at: at(0), text: "mine one" },
      { id: "m2", user_id: ME, created_at: at(1000), text: "mine two" },
    ],
    ME,
  );
  assert.deepEqual(["m1", "m2"].map((id) => own.get(id)?.showSenderName), [false, false]);
  assert.deepEqual(["m1", "m2"].map((id) => own.get(id)?.showAvatar), [false, false]);
  // ...but the grouping rhythm itself is unchanged.
  assert.deepEqual(["m1", "m2"].map((id) => own.get(id)?.position), ["first", "last"]);

  /* ---- every break reason, each checked on its own ---- */

  // A meaningful time gap (the same threshold the centred separator uses).
  const gapped = buildCrewChatMessageGroups(
    [
      { id: "g1", user_id: OTHER, created_at: at(0), text: "before" },
      {
        id: "g2",
        user_id: OTHER,
        created_at: at(DM_CHAT_MEANINGFUL_TIME_GAP_MS + 1000),
        text: "after",
      },
    ],
    ME,
  );
  assert.equal(gapped.get("g2")?.showSenderName, true, "name must reappear after a time break");
  assert.equal(gapped.get("g1")?.showAvatar, true, "avatar must close the run at a time break");

  // A new calendar day, even when the clock gap is small (23:59 -> 00:01).
  const acrossMidnight = buildCrewChatMessageGroups(
    [
      { id: "d1", user_id: OTHER, created_at: new Date(2026, 7, 3, 23, 59, 0).toISOString(), text: "late" },
      { id: "d2", user_id: OTHER, created_at: new Date(2026, 7, 4, 0, 1, 0).toISOString(), text: "early" },
    ],
    ME,
  );
  assert.equal(acrossMidnight.get("d2")?.showSenderName, true, "a day separator must break the run");
  assert.equal(acrossMidnight.get("d1")?.showAvatar, true);

  // A system / rich row between two messages from the SAME sender. This is the
  // case the old split calculation got wrong.
  const interrupted = buildCrewChatMessageGroups(
    [
      { id: "s1", user_id: OTHER, created_at: at(0), text: "before the update" },
      {
        id: "sys",
        user_id: OTHER,
        created_at: at(1000),
        text: "Event details updated:\n• Venue: A → B",
      },
      { id: "s2", user_id: OTHER, created_at: at(2000), text: "after the update" },
    ],
    ME,
  );
  assert.equal(interrupted.get("s1")?.showAvatar, true, "run must close before a system card");
  assert.equal(interrupted.get("s2")?.showSenderName, true, "run must restart after a system card");
  // The system card itself is app-authored: never a human name or avatar.
  assert.equal(interrupted.get("sys")?.showSenderName, false);
  assert.equal(interrupted.get("sys")?.showAvatar, false);
  assert.equal(interrupted.get("sys")?.position, "standalone");

  // A booking-update system notice breaks a run the same way.
  const bookingNotice = buildCrewChatMessageGroups(
    [
      { id: "n1", user_id: OTHER, created_at: at(0), text: "one" },
      { id: "n2", user_id: OTHER, created_at: at(1000), text: "Booking update: run sheet changed" },
      { id: "n3", user_id: OTHER, created_at: at(2000), text: "two" },
    ],
    ME,
  );
  assert.equal(bookingNotice.get("n2")?.showSenderName, false);
  assert.equal(bookingNotice.get("n3")?.showSenderName, true);

  // Name and avatar can never disagree with spacing: whenever a name shows the
  // run started, and whenever an avatar shows the run ended.
  for (const map of [runs, gapped, acrossMidnight, interrupted, bookingNotice]) {
    for (const entry of map.values()) {
      if (entry.showSenderName) {
        assert.equal(entry.startsSenderGroup, true, "name may only render at a run start");
      }
      if (entry.showAvatar) {
        assert.equal(entry.endsSenderGroup, true, "avatar may only render at a run end");
      }
      assert.equal(entry.tightWithPrevious, !entry.startsSenderGroup);
    }
  }

  /* ---- page + component wiring: one source, no second calculation ---- */

  const chatPageSource = readFileSync(
    new URL("../app/events/[eventId]/chat/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chatPageSource, /buildCrewChatMessageGroups\(messages, currentUserId\)/);
  assert.doesNotMatch(
    chatPageSource,
    /buildGroupChatSenderNameVisibility|buildChatMessageGroupLayout/,
    "crew chat must derive name, avatar and spacing from ONE calculation",
  );
  // System rows must reach the helper — filtering them out is what broke runs.
  assert.doesNotMatch(
    chatPageSource,
    /filter\(\(message\) => !isGroupChatSystemUpdateMessage\(message\.text\)\)/,
  );
  for (const prop of [
    /showSenderName=\{messageGroup\?\.showSenderName \?\? false\}/,
    /showAvatar=\{messageGroup\?\.showAvatar \?\? true\}/,
    /tightWithPrevious=\{messageGroup\?\.tightWithPrevious \?\? false\}/,
    /groupPosition=\{messageGroup\?\.position \?\? "standalone"\}/,
  ]) {
    assert.match(chatPageSource, prop);
  }
}

/**
 * A long/multiline bubble must never collapse into a one-character-wide
 * column. Its text sets `overflow-wrap: break-word`, so its min-content width
 * is a single character, and the bubble is `w-fit max-w-full` whose percentage
 * max-width resolves against an ancestor carrying `min-w-0` — which explicitly
 * permits shrinking below min-content. Measured in-browser: 251.6px -> 32px
 * under that pressure. Every branch now carries a floor.
 */
function testChatBubbleCannotCollapseToOneCharacterColumn() {
  const geometrySource = readFileSync(
    new URL("../lib/dm/chatMessageBubbleGeometry.ts", import.meta.url),
    "utf8",
  );

  assert.match(geometrySource, /CHAT_BUBBLE_MIN_WIDTH_LONG_CLASS = "min-w-\[8rem\]"/);
  assert.match(geometrySource, /CHAT_BUBBLE_MIN_WIDTH_SHORT_CLASS = "min-w-\[2\.75rem\]"/);

  // The long branch is the one that regressed — it must not go back to bare padding.
  const longBranch = resolveChatMessageBubbleShellClass({
    isOwnMessage: true,
    text: "Can everyone confirm their arrival time for the load in please, thanks",
  });
  assert.match(longBranch, /min-w-\[8rem\]/, "long/multiline bubbles need a width floor");
  assert.match(longBranch, /px-4 py-2\.5/, "padding must be unchanged");
  assert.match(longBranch, /max-w-full/, "the existing maximum width is preserved");

  // A multiline message takes the same long branch.
  assert.match(
    resolveChatMessageBubbleShellClass({ isOwnMessage: false, text: "line one\nline two" }),
    /min-w-\[8rem\]/,
  );

  // Long unbroken strings wrap rather than overflow.
  assert.match(
    resolveChatMessageBubbleTextClass("x".repeat(80)),
    /break-words/,
    "long unbroken text must wrap, not overflow",
  );

  // Short messages stay compact — the fix must not widen ordinary chat.
  const shortBranch = resolveChatMessageBubbleShellClass({ isOwnMessage: true, text: "ok" });
  assert.match(shortBranch, /min-w-\[2\.75rem\]/);
  assert.doesNotMatch(shortBranch, /min-w-\[8rem\]/, "short pills must not inherit the long floor");
  const compactBranch = resolveChatMessageBubbleShellClass({
    isOwnMessage: false,
    text: "see you there",
  });
  assert.match(compactBranch, /min-w-\[2\.75rem\]/);
  assert.doesNotMatch(compactBranch, /min-w-\[8rem\]/);

  // Attachment-only bubbles are sized by the image itself — no text floor.
  assert.doesNotMatch(
    resolveChatMessageBubbleShellClass({
      isOwnMessage: true,
      text: "",
      hasAttachments: true,
      attachmentOnly: true,
    }),
    /min-w-/,
  );

  /* ---- reactions stay attached to their own bubble ---- */

  const shellSource = readFileSync(
    new URL("../app/components/chat/ChatMessageBubbleShell.tsx", import.meta.url),
    "utf8",
  );
  // The reaction slot lives inside the per-message bubble frame and is
  // absolutely positioned, so grouping cannot lift it onto the whole run and
  // it cannot push neighbouring grouped messages around.
  assert.match(shellSource, /CHAT_MESSAGE_BUBBLE_FRAME_CLASS/);
  assert.match(shellSource, /resolveMessageReactionSlotClass\(isOwnMessage\)/);
  const frameBlock = shellSource.slice(
    shellSource.indexOf("CHAT_MESSAGE_BUBBLE_FRAME_CLASS"),
    shellSource.indexOf("<DmReactionPicker"),
  );
  assert.match(frameBlock, /bubbleShellRef/, "the bubble and its reaction slot share one frame");
  assert.match(frameBlock, /resolveMessageReactionSlotClass/);

  const groupLayoutSource = readFileSync(
    new URL("../lib/dm/chatMessageGroupLayout.ts", import.meta.url),
    "utf8",
  );
  assert.match(groupLayoutSource, /CHAT_MESSAGE_REACTION_SLOT_BASE_CLASS[\s\S]{0,120}absolute/);
}

function testChatEmptyStateComponentized() {
  // DM's empty state was inline JSX; both DM and crew chat now render the
  // same shared ChatEmptyState component instead of two hand-rolled layouts.
  const emptyStateComponentSource = readFileSync(
    new URL("../app/components/chat/ChatEmptyState.tsx", import.meta.url),
    "utf8",
  );
  const dmPageSource = readFileSync(
    new URL("../app/dm/[conversationId]/page.tsx", import.meta.url),
    "utf8",
  );
  const groupEmptyStateSource = readFileSync(
    new URL("../app/components/group-chat/GroupChatEmptyState.tsx", import.meta.url),
    "utf8",
  );

  assert.match(emptyStateComponentSource, /export default function ChatEmptyState/);
  assert.match(dmPageSource, /<ChatEmptyState/);
  assert.match(dmPageSource, /title="No messages yet"/);
  assert.match(groupEmptyStateSource, /import ChatEmptyState from "@\/app\/components\/chat\/ChatEmptyState"/);
  assert.match(groupEmptyStateSource, /title="Welcome to your Crew Chat"/);
  assert.doesNotMatch(
    groupEmptyStateSource,
    /flex flex-col items-center justify-center px-6/,
    "layout markup lives in the shared component now, not duplicated here",
  );
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
  testDmChatDaySeparators();
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
  testUsernameValidationErrorNotDuplicated();
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
  testBookingCardGroupChatIsANavigationRow();
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
  testWorkspaceGigsCountFollowsIncomingDownwards();
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
  await testMessageHistoryGestureTarget();
  testComposerMessageListMomentumScroll();
  testDmBookingTargetScrollUsesContainerOnly();
  testDmBookingTargetCenterScrollTopMath();
  testEventTitleClampLayout();
  testEventsActiveStatusPillsSingleRowLayout();
  testEventCreateFormTextFieldMaxLength();
  testWithdrawalOtherReasonInputLimits();
  testDmComposerClearsPendingPhotoAfterSuccessfulSend();
  testDmComposerRowAlignment();
  testDmComposerPendingPhotoGroupHelpers();
  testDmMultiPhotoSend();
  testDmImageGridLayout();
  testDmImageGridNoCropping();
  testDmImageGroupFullViewerAndOwnershipAlignment();
  testDmImageGalleryOverviewForLargeGroups();
  testDmMediaViewerCloseButtonConsistentAndClickable();
  testDmImageLightboxUsesPagedTrackNotFloatingCard();
  testDmImageLightboxLocksGestureDirectionVerticalDoesNotDrift();
  testDmImageLightboxOpensFullyContainedNotCropped();
  testComposerNewlineKeydown();
  testDmComposerFocusSyncAfterSend();
  testDmMessageReactionGestureInteractions();
  testDmReactionNotifications();
  testDmReactionInboxActivity();
  testDmInboxSearchEmptyStateCopy();
  testDmInboxImageMessagePreview();
  testDmInboxMultiPhotoPreview();
  testDmReactionRealtime();
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
  await testOnboardingAccessCheckNeverHangsForever();
  testBrowserslistSupportsPreSafari164Devices();
  testGigsListTabSwitchUsesClientHistoryWithoutRouterNavigation();
  testGigsWorkspaceChromeStateSyncAvoidsNoOpUpdates();
  testBookingsRouteMountsPersistentGigsSecondaryBand();
  testPlannerBookingCreateHidesGigsSubTabs();
  testWorkspaceSubNavLayoutIsStable();
  testPlannerWorkspaceSecondaryRowRhythm();
  testWorkspaceNavRoleDoesNotDropEventPlansTab();
  testWorkspaceActiveHrefIgnoresStaleOverrides();
  testProfileIdentityPresentationHierarchy();
  testEventBrandsParsingAndSerialization();
  testDisplayNameInputLimit();
  testBioInputLimit();
  testProfileBioTextRendering();
  testProfileDisplayNameAndBioFieldUx();
  testProfileBioAcceptsFullLengthWithEmoji();
  testLongDisplayNameLayoutSafety();
  testAddEventBrandTag();
  testEventBrandChipOverflowSafe();
  testCreateEventBrandRemovedFromUi();
  testCreateEventValidationScrollsAndFocusesFirstInvalidField();
  testGenreSheetHeightDoesNotTrackFilteredContent();
  testPublicProfileEventBrandsAdaptiveChips();
  testProfileCacheInvalidatedAfterSave();
  testEventBrandEditFormHydration();
  testEventBrandSafeSave();
  testMapEventInputToRowEventBrandFallback();
  testQaEnvironmentResetScript();
  testLoginScreenPolish();
  testEventNotesTextareaScrollsWhenContentExceedsCap();
  testRunSheetInitialLoadIsNotDirty();
  testRunSheetTextareasArePinnedToTheirRowCounts();
  testRunSheetFieldsEnforceHardLineLimits();
  testRunSheetSetLabelGrouping();
  testRunSheetAccordionRestructure();
  testRunSheetChromeReduction();
  testRunSheetFieldsWrapLongUnbrokenTokens();
  testRunSheetDirtyStateAndSaveFeedback();
  testRunSheetEditMode();
  testRunSheetProductionPolish();
  testRunSheetHeaderCancelAndSave();
  testRunSheetSaveButtonPolish();
  testRunSheetVisualHierarchyPolish();
  testRunSheetDensityAndSummaryPolish();
  testRunSheetHeaderAlignmentAndDensity();
  testAppSplashScreenSlogan();
  testRoleAwareWorkspaceNavigation();
  testCancelledEventGigsAreSurfacedInGigs();
  testDjMainNavGigsCountBadge();
  testEventPlansSendPanelReusesSharedConfirmUi();
  testBookingRateModeDescriptionsAreUnified();
  testBookingsResultsAreaMatchesOneBookingCard();
  testIosOverscrollDoesNotClipFixedChrome();
  testRootOverscrollContainmentIsDeclaredOnHtmlAndBody();
  testBookingStatusChangesReconcileEverywhere();
  testBookingAcceptedDmMessageIsScopedToTheBooking();
  testTemporaryDebugInstrumentationIsFullyRemoved();
  testCrewChatPremiumPolish();
  testCrewChatTimestampSeparators();
  testCrewChatEventCardToggleScrollCompensation();
  testIncomingChatMessagesHaveNoAvatarTimestamp();
  testEventUpdateMessagePresentation();
  testCrewChatImageAttachmentsWiring();
  testCrewChatComposerKeepsFocusAfterSend();
  testCrewChatMessageGrouping();
  testChatBubbleCannotCollapseToOneCharacterColumn();
  testChatEmptyStateComponentized();
  await testEventsHistorySelectAllButtonInteraction();
  await testEventsHistoryRemoveConfirmInteraction();
  await testDmChatReopenScroll();
  await testDmChatGrowthScrollRace();
  await testDmImageAttachmentDimensions();
  await testDmMessageOrderDeterminism();
  await testDmBookingReturnScroll();
  console.log("All regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
