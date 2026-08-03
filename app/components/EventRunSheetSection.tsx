"use client";

import Link from "next/link";
import { CalendarMobileDashedEmptyState } from "@/app/components/calendar/calendarMobileUi";
import { EventDetailSectionTitle } from "@/app/components/event-detail/EventDetailLayout";
import {
  EVENT_DETAIL_BTN_PRIMARY,
  EVENT_DETAIL_CARD_CLASS,
  EVENT_DETAIL_FEEDBACK_CLASS,
} from "@/app/components/event-detail/eventDetailUi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookingDualTimeWheelPicker } from "@/app/components/BookingTimeWheelPicker";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import AnimatedExpandPanel from "@/app/components/AnimatedExpandPanel";
import BookingCardExpandableNotes from "@/app/components/booking/BookingCardExpandableNotes";
import type { BookingRequest } from "@/lib/bookingRequests";
import {
  clockPartsToWheelTime,
  combineClockAndMeridiem,
  defaultFinishWheelTime,
  defaultStartWheelTime,
  extractClockDisplay,
  getBookingFieldTriggerLabelClassName,
  hasBookingFieldTriggerLabelValue,
  BOOKING_TIME_PLACEHOLDER_LABEL,
  parseSetTimeRange,
  SET_TIME_RANGE_JOINER,
  wheelTimeToClockParts,
  type Meridiem,
  type WheelTimeValue,
} from "@/lib/bookingDateTime";
import {
  computeRunSheetSetLabels,
  ensureRunSheetRowsForAcceptedBookings,
  filterRunSheetRowsToAcceptedBookings,
  getRunSheetLoadErrorMessage,
  getRunSheetSaveErrorMessage,
  hasUnsavedRunSheetEdits,
  loadEventRunSheet,
  logRunSheetSaveError,
  mapRunSheetRowsFromDb,
  mergeAcceptedDjsIntoRunSheetRows,
  moveRunSheetRow,
  reorderRunSheetRows,
  resolveRunSheetRowDjDisplay,
  saveEventRunSheet,
  type RunSheetRowDjDisplay,
  type RunSheetRowInput,
} from "@/lib/eventRunSheet";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";
import { MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import {
  applyCappedMultilineInputLimit,
  shouldBlockMultilineEnter,
} from "@/lib/cappedMultilineInput";
import { countUnicodeCharacters } from "@/lib/textInputLimits";

const RUN_SHEET_SET_TIME_BUTTON_CLASS =
  "ftc-field-trigger inline-flex w-full min-h-[2.25rem] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:min-h-[2rem] lg:max-w-[11rem]";
/** Narrower than `EVENT_DETAIL_BTN_PRIMARY` (`px-3` instead of `px-4`) to sit
 * comfortably alongside Cancel in the same row without dominating it. */
const RUN_SHEET_SAVE_BUTTON_CLASS =
  "ftc-btn-primary inline-flex min-h-10 items-center justify-center px-3 py-2 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";
/** Visible rows each field is pinned to. Mirrors the `.ftc-run-sheet-textarea-N`
 * modifier that owns the height; used for the `rows` attribute so the field is
 * the right size before the stylesheet applies. */
const RUN_SHEET_NOTES_VISIBLE_ROWS = 4;
const RUN_SHEET_STAGE_AREA_VISIBLE_ROWS = 2;
const RUN_SHEET_STAGE_AREA_MAX_LENGTH = 50;

// Idle state is intentionally light (subtle border/background opacity) so the
// reorder controls don't compete with the DJ information they sit beside;
// `hover` restores full-strength colour so the control still reads clearly
// once someone's actually interacting with it. Disabled keeps the flattened
// border/background/text (rather than opacity alone on the hover-ready
// styling) so a row at either end still reads as clearly inert, not merely a
// faded active control -- `disabled:opacity-30` on top of that flattening is
// only slightly eased by the softer border beneath it. Layout (size,
// position) is unchanged -- only colour and opacity respond to `disabled`.
const iconButtonBaseClassName =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:border-ftc-border-subtle/70 disabled:bg-transparent disabled:text-ftc-text-muted disabled:opacity-30";

function RowMoveButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "up" | "down";
  onClick: () => void;
  disabled?: boolean;
}) {
  const label = direction === "up" ? "Move row up" : "Move row down";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${iconButtonBaseClassName} border-ftc-border-strong/60 bg-ftc-bg-elevated/60 text-ftc-text-secondary hover:border-ftc-border-strong hover:bg-ftc-bg-elevated hover:text-ftc-text`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === "up" ? (
          <path d="M12 19V5M5 12l7-7 7 7" />
        ) : (
          <path d="M12 5v14M5 12l7 7 7-7" />
        )}
      </svg>
    </button>
  );
}

function formatRunSheetSetTimeDisplay(startTime: string, finishTime: string): string {
  const start = startTime.trim();
  const finish = finishTime.trim();

  if (!start && !finish) {
    return BOOKING_TIME_PLACEHOLDER_LABEL;
  }

  if (start && finish) {
    return `${start}${SET_TIME_RANGE_JOINER}${finish}`;
  }

  return start || finish;
}

/**
 * A DJ's entry counts as "complete" once the essentials -- where and when --
 * are filled in. Notes stay optional supplementary detail and don't count
 * either way; a partial Set Time (only a start or only a finish) still
 * counts, matching what `hasBookingFieldTriggerLabelValue` already treats as
 * "has a value" rather than the empty placeholder.
 */
function isRunSheetRowComplete(row: RunSheetRowInput): boolean {
  return Boolean(row.stage_area.trim()) && Boolean(row.start_time.trim() || row.finish_time.trim());
}

/**
 * Running order, e.g. "#1". Factored out to this one call site so a future
 * named-sets feature (Opening / Main Set / Closing) only has to change this
 * function, not `RunSheetEntry` or its caller.
 */
function formatRunSheetOrderLabel(index: number): string {
  return `#${index + 1}`;
}

function parseRunSheetTimeField(value: string): {
  clock: string;
  meridiem: Meridiem;
  legacy: string | null;
} {
  const trimmed = value.trim();

  if (!trimmed) {
    return { clock: "", meridiem: "PM", legacy: null };
  }

  const parsed = parseSetTimeRange(trimmed);

  if (parsed.unparsedRaw) {
    return { clock: "", meridiem: "PM", legacy: parsed.unparsedRaw };
  }

  if (parsed.start) {
    return {
      clock: extractClockDisplay(parsed.start.formatted),
      meridiem: parsed.start.meridiem,
      legacy: null,
    };
  }

  return { clock: "", meridiem: "PM", legacy: null };
}

function RunSheetSetTimeField({
  startTime,
  finishTime,
  onChange,
  canEdit,
}: {
  startTime: string;
  finishTime: string;
  onChange: (start: string, finish: string) => void;
  canEdit: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const userEditedRef = useRef(false);
  const [startClock, setStartClock] = useState("");
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>("PM");
  const [finishClock, setFinishClock] = useState("");
  const [finishMeridiem, setFinishMeridiem] = useState<Meridiem>("AM");
  const [startLegacy, setStartLegacy] = useState<string | null>(null);
  const [finishLegacy, setFinishLegacy] = useState<string | null>(null);

  useEffect(() => {
    if (userEditedRef.current) {
      return;
    }

    const start = parseRunSheetTimeField(startTime);
    const finish = parseRunSheetTimeField(finishTime);
    setStartClock(start.clock);
    setStartMeridiem(start.meridiem);
    setFinishClock(finish.clock);
    setFinishMeridiem(finish.meridiem);
    setStartLegacy(start.legacy);
    setFinishLegacy(finish.legacy);
  }, [startTime, finishTime]);

  const displayValue = (() => {
    if (startLegacy && finishLegacy) {
      return `${startLegacy}${SET_TIME_RANGE_JOINER}${finishLegacy}`;
    }

    if (startLegacy && finishTime.trim()) {
      return `${startLegacy}${SET_TIME_RANGE_JOINER}${finishTime.trim()}`;
    }

    if (startLegacy) {
      return startLegacy;
    }

    if (finishLegacy && startTime.trim()) {
      return `${startTime.trim()}${SET_TIME_RANGE_JOINER}${finishLegacy}`;
    }

    if (finishLegacy) {
      return finishLegacy;
    }

    return formatRunSheetSetTimeDisplay(startTime, finishTime);
  })();

  if (!canEdit) {
    // Informational content, not a form control: plain typography, no
    // bordered box. Set Time is a short fixed-format string that never
    // wraps to more than one line, so unlike Stage / Area and Notes it
    // needs no truncate-and-expand treatment.
    //
    // Ranked by weight alone, not size or colour: `font-semibold` at the
    // same `text-sm`/`text-ftc-text-secondary` as Stage / Area and Notes
    // (both normal weight) puts Set Time one tier above them, while staying
    // well below the DJ name's `text-base font-bold text-ftc-text`.
    const readOnlyDisplay = formatRunSheetSetTimeDisplay(startTime, finishTime);
    const hasValue = Boolean(startTime.trim() || finishTime.trim());

    return (
      <p className="text-sm font-semibold tabular-nums text-ftc-text-secondary">
        {hasValue ? readOnlyDisplay : "—"}
      </p>
    );
  }

  const hasValue = hasBookingFieldTriggerLabelValue(displayValue);

  function handleDone(start: WheelTimeValue, finish: WheelTimeValue) {
    userEditedRef.current = true;
    const startParts = wheelTimeToClockParts(start);
    const finishParts = wheelTimeToClockParts(finish);
    setStartLegacy(null);
    setFinishLegacy(null);
    setStartClock(startParts.clock);
    setStartMeridiem(startParts.meridiem);
    setFinishClock(finishParts.clock);
    setFinishMeridiem(finishParts.meridiem);
    onChange(
      combineClockAndMeridiem(startParts.clock, startParts.meridiem),
      combineClockAndMeridiem(finishParts.clock, finishParts.meridiem),
    );
    setPickerOpen(false);
  }

  const startWheelValue =
    clockPartsToWheelTime(startClock, startMeridiem) ?? defaultStartWheelTime();
  const finishWheelValue =
    clockPartsToWheelTime(finishClock, finishMeridiem) ?? defaultFinishWheelTime();

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label={`Set time, ${displayValue}`}
        className={RUN_SHEET_SET_TIME_BUTTON_CLASS}
      >
        <span
          className={getBookingFieldTriggerLabelClassName(hasValue, "truncate text-center tabular-nums")}
        >
          {displayValue}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-3 w-3 shrink-0 text-ftc-text-muted"
        >
          <path
            d="M7.5 8.5 10 11l2.5-2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <BookingDualTimeWheelPicker
        open={pickerOpen}
        startValue={startWheelValue}
        finishValue={finishWheelValue}
        onCancel={() => setPickerOpen(false)}
        onDone={handleDone}
      />
    </>
  );
}

/**
 * The Run Sheet's two capped text fields. Height is owned entirely by the
 * `.ftc-run-sheet-textarea-*` rules, which pin height/min-height/max-height to
 * one value — there is deliberately no JS sizing here.
 *
 * The auto-grow effect this replaces measured `line-height` at runtime to build
 * a ceiling, and skipped the clamp when that measurement wasn't numeric. Above
 * the 639px breakpoint, with no line-height source applying, it computed to
 * `normal`, `parseFloat` returned NaN, the guard fell through and the field
 * grew to fit its text. Pinning in CSS removes the negotiation rather than
 * tuning it: nothing measures, so nothing can disagree.
 *
 * `rows` still matches the pinned row count so the field is the right size in
 * the moment before the stylesheet applies. It doubles as the line cap: a field
 * cannot hold more explicit lines than it can show, so the internal scroll is
 * left to handle wrapping alone rather than hidden lines the user must scroll
 * to find.
 *
 * The cap is enforced in two places because there are two ways to add a line.
 * `onChange` covers anything that replaces the value — paste, drag-and-drop,
 * autofill, dictation — and truncates to the first `rows` lines. `onKeyDown`
 * covers the Return key, which has to be stopped before it inserts: letting it
 * through and truncating afterwards would move the caret to a line that then
 * disappears.
 */
function RunSheetCappedTextarea({
  value,
  onChange,
  className,
  maxLength,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  maxLength: number;
  rows: number;
  placeholder?: string;
}) {
  const length = countUnicodeCharacters(value);

  return (
    <div>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={(event) => {
          // `isComposing` guard: mid-composition Return commits an IME
          // candidate rather than inserting a newline, and swallowing it would
          // break entry of Japanese, Chinese and Korean text.
          if (event.key !== "Enter" || event.nativeEvent.isComposing) {
            return;
          }

          if (shouldBlockMultilineEnter(value, rows)) {
            event.preventDefault();
          }
        }}
        onChange={(event) => {
          // Shared line + character cap, the same one behind the booking rate
          // note and the profile bio: it permits deletions when a stored value
          // is already over either limit, so content saved before the cap
          // existed stays editable instead of being silently rewritten.
          const limited = applyCappedMultilineInputLimit(
            value,
            event.target.value,
            rows,
            maxLength,
          );

          if (limited === null) {
            return;
          }

          onChange(limited);
        }}
        className={className}
      />
      <p className={`ftc-form-notes-counter ${length > maxLength ? "is-over-limit" : ""}`}>
        {length} / {maxLength}
      </p>
    </div>
  );
}

/**
 * Avatar + display name only -- no outer sizing wrapper, no label. The
 * accordion header supplies its own layout (it also needs to fit move
 * buttons and a set badge on the same row), and "DJ" as a field label above
 * this was redundant: the avatar and name already say what it is.
 *
 * Takes an already-resolved `dj` rather than `row`/`lineup`/`profiles`: the
 * caller resolves it once per row (also needed for the set-number grouping),
 * so this doesn't repeat that lookup.
 *
 * Explicitly `text-base font-bold` (was an unsized `font-medium`, inheriting
 * whatever size happened to be ambient) so the name is unambiguously the
 * largest, boldest thing in the card -- the top of the reading hierarchy the
 * Set Time and Stage / Area / Notes tiers below are built to sit under.
 */
function RunSheetDjIdentity({ dj }: { dj: RunSheetRowDjDisplay }) {
  if (!dj.displayName) {
    return <span className="text-ftc-text-muted">—</span>;
  }

  if (dj.profileId) {
    return (
      <>
        <ChatProfileAvatarLink
          userId={dj.profileId}
          name={dj.displayName}
          avatarUrl={dj.avatarUrl}
          size="sm"
        />
        <Link
          href={`/profile/${dj.profileId}`}
          className="min-w-0 truncate text-base font-bold text-ftc-text transition hover:text-ftc-primary"
        >
          {dj.displayName}
        </Link>
      </>
    );
  }

  return (
    <>
      <ProfileAvatar name={dj.displayName} avatarUrl={dj.avatarUrl} size="sm" />
      <span className="min-w-0 truncate text-base font-bold text-ftc-text">{dj.displayName}</span>
    </>
  );
}

function RunSheetExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 shrink-0 text-ftc-text-muted transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One Run Sheet entry, collapsed by default to an avatar, a name, a
 * one-line Stage / Area preview and a chevron -- everything else, including
 * Set Time, lives behind the chevron, animated open with
 * `AnimatedExpandPanel`. A DJ reads this before performing in the order the
 * fields are laid out: where, when, then anything extra.
 *
 * The DJ name is its own `Link` to the profile (when assigned), so it can't
 * sit inside the toggle `<button>` -- a link nested in a button is invalid
 * HTML and produces ambiguous click/focus behaviour. Header row and toggle
 * button are siblings instead: the name has its own tap target, everything
 * to its right (the preview, the chevron) toggles the panel.
 *
 * Stage / Area and Notes only switch presentation when read-only. Editing
 * keeps the pinned-height, internally-scrolling textarea
 * (`RunSheetCappedTextarea`) for both -- that scroll is doing real work
 * there, keeping the row cap enforceable while typing. Read-only for both
 * reuses `BookingCardExpandableNotes` (already the FTC show-more/less
 * pattern behind DM booking notes and the rate proposal panel) instead of a
 * second implementation: it hides itself on empty content, measures real
 * overflow before showing a toggle, resets to collapsed via `detailsOpen`
 * when the row itself closes, and needs no internal scrollbar at any length.
 * Stage / Area asks for a 2-line preview instead of the component's 3-line
 * default -- it's a short field, so a taller preview would rarely need to
 * collapse anything.
 *
 * Set Time is left out of this pattern: read-only, it's a single short fixed
 * string that can't overflow two lines, so the reduced-chrome plain
 * typography inside `RunSheetSetTimeField` is enough on its own.
 */
function RunSheetEntry({
  row,
  dj,
  orderLabel,
  setLabel,
  canEdit,
  isExpanded,
  onToggleExpanded,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  stageAreaTextareaClassName,
  notesTextareaClassName,
  updateRow,
}: {
  row: RunSheetRowInput;
  dj: RunSheetRowDjDisplay;
  /** Running order, e.g. "#1" -- see `formatRunSheetOrderLabel`. */
  orderLabel: string;
  setLabel: string | null;
  canEdit: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  stageAreaTextareaClassName: string;
  notesTextareaClassName: string;
  updateRow: (rowId: string, patch: Partial<RunSheetRowInput>) => void;
}) {
  const panelId = `run-sheet-panel-${row.id}`;
  const stagePreview = row.stage_area.trim();
  /**
   * One-line "where and when" for the collapsed card, e.g.
   * "Front room · 9:00 PM – 1:00 AM" -- whichever halves exist. Joined with
   * ` · `, the separator this app already uses for compact metadata lines
   * (`BookingRequestCard`, `DmBookingUpdateRow`, `EventDjSendOfferControls`),
   * rather than introducing a second bullet glyph for the same job.
   *
   * `formatRunSheetSetTimeDisplay` is reused for the time half, but only once
   * a time actually exists: it returns the "TBC" placeholder for an empty
   * pair, which would read as real content here rather than as the absence
   * of a value.
   */
  const hasSetTime = Boolean(row.start_time.trim() || row.finish_time.trim());
  const collapsedSummary = [
    stagePreview,
    hasSetTime ? formatRunSheetSetTimeDisplay(row.start_time, row.finish_time) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  // `canEdit` here is already the combined "editing this row right now" flag
  // (permission AND edit mode -- see the call site), so `!canEdit` means this
  // row is currently presented read-only, for whatever reason. Incomplete
  // rows only get the muted treatment in that read-only presentation --
  // muting a field the planner is actively filling in would read as broken,
  // not helpful.
  const isReadOnlyAndIncomplete = !canEdit && !isRunSheetRowComplete(row);

  return (
    <div className={`ftc-card p-3 ${isReadOnlyAndIncomplete ? "opacity-75" : ""}`.trim()}>
      {setLabel ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
          {setLabel}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs font-semibold tabular-nums text-ftc-text-muted">
            {orderLabel}
          </span>
          <RunSheetDjIdentity dj={dj} />
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <RowMoveButton direction="up" onClick={onMoveUp} disabled={!canMoveUp} />
            <RowMoveButton direction="down" onClick={onMoveDown} disabled={!canMoveDown} />
          </div>
        ) : null}
      </div>

      {/* Always rendered, even with nothing to summarise: this is the only
          way to reach Set Time and Notes, not just a preview of content.
          Falls back to "Run Sheet details pending" only when there is
          genuinely nothing to preview -- a row with a stage but no time
          (still "incomplete") keeps showing its real summary instead of
          being overwritten by the generic helper text.

          The summary is collapsed-only. Expanded, both halves of it are
          already on screen directly below under their own "Stage / Area" and
          "Set Time" labels, and repeating them in the header is the exact
          duplication the previous pass removed. `truncate` keeps it to one
          line however long the stage name is. Editing force-expands every
          row, so the summary is automatically absent there too -- no
          separate `isEditing` check needed. */}
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="mt-1 flex w-full items-center gap-2 rounded-md py-1 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-xs text-ftc-text-muted">
          {!isExpanded && collapsedSummary
            ? collapsedSummary
            : isReadOnlyAndIncomplete
              ? "Run Sheet details pending"
              : ""}
        </span>
        <RunSheetExpandChevron expanded={isExpanded} />
      </button>

      <div id={panelId}>
        <AnimatedExpandPanel open={isExpanded}>
          {/* Plain block stack, not a grid: every child here is already a
              full-width block (each `<label>`, and BookingCardExpandableNotes'
              own root). A single-column grid gains nothing over that and
              costs something real -- an unconstrained grid item is sized by
              its content's min-content width, so a single long unbroken
              string (no natural wrap point) can size this item far wider
              than the card and get silently clipped by the animated panel's
              `overflow-x-hidden` rather than actually wrapping. Plain block
              flow doesn't have that failure mode: a block's width comes from
              its containing block, not its content, so it can't be pulled
              wide by anything inside it. */}
          <div className="space-y-2.5 pt-2">
            {canEdit ? (
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                  Stage / Area
                </span>
                <RunSheetCappedTextarea
                  value={row.stage_area}
                  onChange={(value) => updateRow(row.id!, { stage_area: value })}
                  className={stageAreaTextareaClassName}
                  maxLength={RUN_SHEET_STAGE_AREA_MAX_LENGTH}
                  rows={RUN_SHEET_STAGE_AREA_VISIBLE_ROWS}
                  placeholder="Enter stage"
                />
              </label>
            ) : stagePreview ? (
              <BookingCardExpandableNotes
                notes={row.stage_area}
                label="Stage / Area"
                detailsOpen={isExpanded}
                previewLines={2}
              />
            ) : null}

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Set Time
              </span>
              <RunSheetSetTimeField
                startTime={row.start_time}
                finishTime={row.finish_time}
                onChange={(start, finish) =>
                  updateRow(row.id!, { start_time: start, finish_time: finish })
                }
                canEdit={canEdit}
              />
            </label>

            {canEdit ? (
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                  Notes
                </span>
                <RunSheetCappedTextarea
                  value={row.notes}
                  onChange={(value) => updateRow(row.id!, { notes: value })}
                  className={notesTextareaClassName}
                  maxLength={MAX_EVENT_NOTES_LENGTH}
                  rows={RUN_SHEET_NOTES_VISIBLE_ROWS}
                  placeholder="Add notes"
                />
              </label>
            ) : row.notes.trim() ? (
              <BookingCardExpandableNotes notes={row.notes} label="Notes" detailsOpen={isExpanded} />
            ) : null}
          </div>
        </AnimatedExpandPanel>
      </div>
    </div>
  );
}

/**
 * Replaces the row list entirely when there are DJs on the sheet but none of
 * them have anything filled in yet -- distinct from `rows.length === 0`
 * (no DJs on the sheet at all), which keeps its existing dashed empty state
 * below. Two copies because a promoter and a DJ need different next steps:
 * one can act on it, the other is just told to check back.
 *
 * Deliberately no card, border or icon -- an onboarding invitation rather
 * than an error/placeholder state, carried by typography and spacing alone.
 * Deliberately no heading of its own either, for either branch: the section
 * title immediately above this already says "Run Sheet", so a second "Run
 * Sheet"/"Create your Run Sheet" line here would repeat what the planner
 * already knows rather than tell them what to do next -- the one sentence
 * is the whole message. `max-w-sm mx-auto` keeps that sentence a comfortably
 * short reading measure on wide desktop viewports rather than stretching
 * edge to edge.
 */
function RunSheetNotCompletedEmptyState({
  canEdit,
  onEditClick,
}: {
  canEdit: boolean;
  onEditClick: () => void;
}) {
  if (!canEdit) {
    return (
      <div className="mt-5 py-10 text-center">
        <p className="mx-auto max-w-sm text-sm text-ftc-text-secondary">
          The promoter hasn&apos;t published the Run Sheet yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 py-10 text-center">
      <p className="mx-auto max-w-sm text-sm text-ftc-text-secondary">
        Add set times, stages and notes for your DJs.
      </p>
      <button type="button" onClick={onEditClick} className={`${EVENT_DETAIL_BTN_PRIMARY} mt-5`}>
        Create
      </button>
    </div>
  );
}

export default function EventRunSheetSection({
  eventId,
  canEdit,
  lineup,
  profiles,
  onSaved,
  emptyStateMessage = "Accepted DJs will appear here once they confirm their booking",
}: {
  eventId: string;
  canEdit: boolean;
  lineup: BookingRequest[];
  profiles: Map<string, BookingRecipientProfile>;
  onSaved?: (message: string) => void;
  emptyStateMessage?: string;
}) {
  const [rows, setRows] = useState<RunSheetRowInput[]>([]);
  /** Last persisted rows — what Cancel reverts to, and the auto-add sync's
   * record of what is actually in the database (see `syncAcceptedDjs`). */
  const [savedRows, setSavedRows] = useState<RunSheetRowInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  /**
   * Returns the rows to display plus the rows actually in the database. They
   * differ in exactly one case: the accepted-DJ auto-add failed to persist, so
   * the new rows are local-only and must read as unsaved.
   */
  const syncAcceptedDjs = useCallback(
    async (
      currentRows: RunSheetRowInput[],
    ): Promise<{ rows: RunSheetRowInput[]; persistedRows: RunSheetRowInput[] }> => {
      const currentFiltered = () =>
        filterRunSheetRowsToAcceptedBookings(currentRows, lineup, profiles);

      if (syncInFlightRef.current) {
        const unchanged = currentFiltered();
        return { rows: unchanged, persistedRows: unchanged };
      }

      const { addedCount } = mergeAcceptedDjsIntoRunSheetRows(currentRows, lineup, profiles);

      if (addedCount === 0) {
        const unchanged = currentFiltered();
        return { rows: unchanged, persistedRows: unchanged };
      }

      if (!canEdit) {
        const merged = filterRunSheetRowsToAcceptedBookings(
          mergeAcceptedDjsIntoRunSheetRows(currentRows, lineup, profiles).rows,
          lineup,
          profiles,
        );
        return { rows: merged, persistedRows: merged };
      }

      syncInFlightRef.current = true;

      try {
        const saved = await ensureRunSheetRowsForAcceptedBookings(eventId, lineup, profiles);
        const persisted = filterRunSheetRowsToAcceptedBookings(
          reorderRunSheetRows(mapRunSheetRowsFromDb(saved.rows)),
          lineup,
          profiles,
        );
        return { rows: persisted, persistedRows: persisted };
      } catch (autoSaveError) {
        console.error(
          "Accepted DJ auto-add save failed; rows stay local until Save changes:",
          autoSaveError,
        );
        return {
          rows: filterRunSheetRowsToAcceptedBookings(
            mergeAcceptedDjsIntoRunSheetRows(currentRows, lineup, profiles).rows,
            lineup,
            profiles,
          ),
          persistedRows: currentFiltered(),
        };
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [canEdit, eventId, lineup, profiles],
  );

  const loadRunSheet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await loadEventRunSheet(eventId);
      const loadedRows = reorderRunSheetRows(mapRunSheetRowsFromDb(data.rows));
      const synced = await syncAcceptedDjs(loadedRows);
      setRows(synced.rows);
      setSavedRows(synced.persistedRows);
    } catch (loadError) {
      console.error("Failed to load run sheet:", loadError);
      setRows([]);
      setSavedRows([]);
      setError(getRunSheetLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [eventId, syncAcceptedDjs]);

  useEffect(() => {
    void loadRunSheet();
  }, [loadRunSheet]);

  function updateRow(rowId: string, patch: Partial<RunSheetRowInput>) {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function handleMoveRow(rowId: string, direction: "up" | "down") {
    setRows((prev) => moveRunSheetRow(prev, rowId, direction));
  }

  /** At most one entry open at a time when browsing; opening one closes
   * whatever was open, and re-tapping the open entry closes it. Keyed by row
   * id (stable across reordering), not array index. Overridden wholesale by
   * `isEditing` below -- every card expands for editing regardless of this. */
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  function toggleRowExpanded(rowId: string) {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
  }

  /**
   * View-first, edit-on-demand: the sheet opens read-only, and editing is the
   * explicit result of tapping Edit rather than the sheet's permanent state.
   * `canEdit` (the prop) still gates whether editing is possible at all; this
   * is which of the two presentations of that possibility is on screen.
   */
  const [isEditing, setIsEditing] = useState(false);

  function handleEnterEditMode() {
    setError(null);
    setIsEditing(true);
  }

  /** Discards in-progress edits back to the last persisted state. Local state
   * only -- nothing is sent to the server, so there is nothing to undo there. */
  function handleCancelEdit() {
    setRows(savedRows);
    setError(null);
    setIsEditing(false);
    setExpandedRowId(null);
  }

  /** "SET 1" / "SET 2" only when the same DJ genuinely holds more than one
   * entry on this sheet; see `computeRunSheetSetLabels` for how DJs are
   * grouped and why. */
  const rowSetLabels = useMemo(
    () => computeRunSheetSetLabels(rows, lineup, profiles),
    [rows, lineup, profiles],
  );

  /** Derived from `rows`, so it is exact the instant a field changes. */
  const completedRowCount = useMemo(
    () => rows.filter(isRunSheetRowComplete).length,
    [rows],
  );
  const isFullyComplete = rows.length > 0 && completedRowCount === rows.length;
  // "No Run Sheet information entered for any DJ" -- the trigger for the
  // dedicated empty state below, distinct from partial completion (which
  // shows the normal list with individual rows muted; see RunSheetEntry).
  const allRowsIncomplete = rows.length > 0 && completedRowCount === 0;
  // View mode only: "N of M completed" is a browsing aid, not something a
  // planner mid-edit needs restated back to them while they are the one
  // actively changing that number -- and it would otherwise sit directly
  // above a "Save" button appearing for the same reason, doubling up.
  const showRunSheetProgress = !isEditing && rows.length > 0 && !allRowsIncomplete;
  // The header cluster (Edit, or Cancel + Save) is suppressed for exactly the
  // same window the empty state above owns: while browsing an all-incomplete
  // sheet, "Create Run Sheet" is the only action on screen, not a duplicate of
  // the top-right Edit button. Once editing starts, or once any row is
  // complete, the cluster reappears as normal.
  const showRunSheetHeaderActions =
    canEdit && rows.length > 0 && (isEditing || !allRowsIncomplete);
  // Whether Save has anything to persist. Save itself is always mounted for
  // the whole editing session (its row's height is reserved from the start),
  // but only becomes visible -- via a CSS transition, not a mount/unmount --
  // once this is true.
  const hasUnsavedChanges = useMemo(
    () => hasUnsavedRunSheetEdits(savedRows, rows),
    [savedRows, rows],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const saved = await saveEventRunSheet(eventId, {
        rows: reorderRunSheetRows(rows),
        deletedRowIds: [],
      });

      const persistedRows = filterRunSheetRowsToAcceptedBookings(
        reorderRunSheetRows(mapRunSheetRowsFromDb(saved.rows)),
        lineup,
        profiles,
      );

      setRows(persistedRows);
      setSavedRows(persistedRows);
      // View -> Edit -> Save -> View: a successful save returns to the
      // read-only presentation, collapsed, exactly like opening the sheet
      // fresh. Left out of `finally` deliberately -- a failed save keeps the
      // planner in edit mode, with the error and their unsaved rows intact,
      // so they can retry rather than losing the edit.
      setIsEditing(false);
      setExpandedRowId(null);
      onSaved?.("Run sheet saved");
    } catch (saveError) {
      logRunSheetSaveError(saveError);
      setError(getRunSheetSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  // Both capped fields share one sizing architecture: the base class carries the
  // pinned line-height, internal scrolling and scroll containment, and a
  // `-N` modifier pins height/min-height/max-height to that row count. No
  // `min-h-*` or `leading-*` utility here on purpose — each was a second opinion
  // about a height that now has exactly one source.
  const runSheetTextareaBaseClassName =
    "ftc-textarea ftc-run-sheet-textarea w-full rounded-lg px-2.5 py-1.5 text-sm break-words";

  const stageAreaTextareaClassName = `${runSheetTextareaBaseClassName} ftc-run-sheet-textarea-2`;
  const notesTextareaClassName = `${runSheetTextareaBaseClassName} ftc-run-sheet-textarea-4`;

  return (
    <section className={EVENT_DETAIL_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <EventDetailSectionTitle>Run Sheet</EventDetailSectionTitle>
          {/* Lightweight and secondary to the title on purpose -- muted,
              small text, no colour coding. View mode only (see
              `showRunSheetProgress`): while editing, this would sit directly
              above a Save button appearing for the exact same reason,
              restating the same fact twice. */}
          {showRunSheetProgress ? (
            <p className="mt-0.5 text-xs font-semibold text-ftc-text-secondary">
              {isFullyComplete
                ? "Run Sheet Complete"
                : `${completedRowCount} of ${rows.length} DJs completed`}
            </p>
          ) : null}
        </div>

        {/* Read-only by default -- editing is the deliberate result of tapping
            Edit, not the sheet's permanent state. Suppressed entirely while
            the "Create your Run Sheet" empty state above is showing -- Create
            Run Sheet is the one obvious action, not a duplicate of Edit.

            Edit and Cancel share one top-right slot and the same lightweight
            text-link treatment (`.ftc-form-cancel-link`) so neither competes
            with the "Run Sheet" title. While editing, Cancel and Save sit
            together in a single row -- paired as one action, not a lone
            floating button -- with Save as the visually primary one. Save's
            visibility is a CSS transition (`.ftc-run-sheet-save-btn`) gated
            on `hasUnsavedChanges`, not a mount/unmount -- it fades and nudges
            into place rather than appearing from nothing, and Cancel doesn't
            shift when it does. */}
        {showRunSheetHeaderActions ? (
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="ftc-form-cancel-link disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  aria-hidden={!hasUnsavedChanges}
                  tabIndex={hasUnsavedChanges ? 0 : -1}
                  className={`${RUN_SHEET_SAVE_BUTTON_CLASS} ftc-run-sheet-save-btn ${
                    hasUnsavedChanges ? "ftc-run-sheet-save-btn--visible" : ""
                  }`}
                >
                  {saving ? "Saving" : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEnterEditMode}
                aria-label="Edit Run Sheet"
                className="ftc-form-cancel-link disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit
              </button>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className={`mt-4 ${EVENT_DETAIL_FEEDBACK_CLASS} mb-0 text-[var(--ftc-color-danger)]`}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-ftc-text-muted">Loading run sheet...</p>
      ) : rows.length === 0 ? (
        <div className="mt-5">
          <CalendarMobileDashedEmptyState message={emptyStateMessage} />
        </div>
      ) : !isEditing && allRowsIncomplete ? (
        // Only in the read-only presentation: while editing, the planner
        // needs the actual rows on screen to fill in, not a static message
        // standing in for them.
        <RunSheetNotCompletedEmptyState canEdit={canEdit} onEditClick={handleEnterEditMode} />
      ) : (
        // One accordion list for every viewport -- a table and a card list
        // were two implementations of the same information, and neither
        // needed to be denser than this: collapsed, each entry is two short
        // lines regardless of screen width, which is what actually lets more
        // of them fit on screen at once. Same component, same behaviour,
        // desktop and phone alike -- nothing here is viewport-conditional.
        <div className="mt-5 space-y-2">
          {rows.map((row, index) => {
            const dj = resolveRunSheetRowDjDisplay(row, lineup, profiles);

            return (
              <RunSheetEntry
                key={row.id}
                row={row}
                dj={dj}
                orderLabel={formatRunSheetOrderLabel(index)}
                setLabel={rowSetLabels.get(row.id!) ?? null}
                canEdit={canEdit && isEditing}
                isExpanded={isEditing || expandedRowId === row.id}
                onToggleExpanded={() => toggleRowExpanded(row.id!)}
                canMoveUp={index > 0}
                canMoveDown={index < rows.length - 1}
                onMoveUp={() => handleMoveRow(row.id!, "up")}
                onMoveDown={() => handleMoveRow(row.id!, "down")}
                stageAreaTextareaClassName={stageAreaTextareaClassName}
                notesTextareaClassName={notesTextareaClassName}
                updateRow={updateRow}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
