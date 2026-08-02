"use client";

import Link from "next/link";
import { CalendarMobileDashedEmptyState } from "@/app/components/calendar/calendarMobileUi";
import { EventDetailSectionTitle } from "@/app/components/event-detail/EventDetailLayout";
import {
  EVENT_DETAIL_BTN_PRIMARY,
  EVENT_DETAIL_CARD_CLASS,
  EVENT_DETAIL_FEEDBACK_CLASS,
  EVENT_DETAIL_SECTION_SUBTITLE_CLASS,
} from "@/app/components/event-detail/eventDetailUi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookingDualTimeWheelPicker } from "@/app/components/BookingTimeWheelPicker";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
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
  type RunSheetRowInput,
} from "@/lib/eventRunSheet";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";
import { MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import {
  applyCappedMultilineInputLimit,
  shouldBlockMultilineEnter,
} from "@/lib/cappedMultilineInput";
import { countUnicodeCharacters } from "@/lib/textInputLimits";

const FIXED_FIELDS = [
  { key: "stage_area" as const, label: "Stage / Area" },
  { key: "notes" as const, label: "Notes" },
];

const RUN_SHEET_STAGE_COLUMN_CLASS = "w-[16%] min-w-[8rem]";
const RUN_SHEET_DJ_COLUMN_CLASS = "w-[18%] min-w-[10rem]";
const RUN_SHEET_SET_TIME_BUTTON_CLASS =
  "ftc-field-trigger inline-flex w-full min-h-[2.25rem] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:min-h-[2rem] lg:max-w-[11rem]";
const RUN_SHEET_NOTES_COLUMN_CLASS = "w-[28%] min-w-[10rem]";
/** Visible rows each field is pinned to. Mirrors the `.ftc-run-sheet-textarea-N`
 * modifier that owns the height; used for the `rows` attribute so the field is
 * the right size before the stylesheet applies. */
const RUN_SHEET_NOTES_VISIBLE_ROWS = 4;
const RUN_SHEET_STAGE_AREA_VISIBLE_ROWS = 2;
const RUN_SHEET_STAGE_AREA_MAX_LENGTH = 50;

function getFixedField(key: (typeof FIXED_FIELDS)[number]["key"]) {
  const field = FIXED_FIELDS.find((item) => item.key === key);

  if (!field) {
    throw new Error(`Unknown run sheet field: ${key}`);
  }

  return field;
}

const iconButtonBaseClassName =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40";

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
      className={`${iconButtonBaseClassName} border-ftc-border-strong bg-ftc-bg-elevated/80 text-ftc-text-secondary hover:border-ftc-border-strong hover:bg-ftc-bg-elevated hover:text-ftc-text`}
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
  readOnlyTextClassName,
}: {
  startTime: string;
  finishTime: string;
  onChange: (start: string, finish: string) => void;
  canEdit: boolean;
  readOnlyTextClassName: string;
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
    const readOnlyDisplay = formatRunSheetSetTimeDisplay(startTime, finishTime);
    const hasValue = Boolean(startTime.trim() || finishTime.trim());

    return (
      <div
        className={`${readOnlyTextClassName} min-h-[2.25rem] whitespace-pre-wrap break-words`}
      >
        {hasValue ? readOnlyDisplay : "—"}
      </div>
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
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  maxLength: number;
  rows: number;
}) {
  const length = countUnicodeCharacters(value);

  return (
    <div>
      <textarea
        value={value}
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
 * The read-only rendering of a Run Sheet cell, shown to accepted crew and to
 * the planner on a history event.
 *
 * Composes the same pinned-height pair as the matching editable textarea —
 * `ftc-run-sheet-textarea` plus its `-2`/`-4` row modifier — so the two look
 * like the same field in two states rather than different components: same
 * height, same internal scroll past the row cap, same line-height (the base
 * class pins it to `1.5rem !important`, overriding the `leading-relaxed` in
 * `className`).
 *
 * Stage / Area used to carry only a `min-height`, on the reasoning that its
 * 50-character cap keeps it under two *explicit* lines. That reasoning held
 * for line count but not for wrapping: a single unbroken 40+ character run
 * (a venue name with no spaces, in practice a pasted URL) still wraps across
 * several *visual* lines, and without the pinned height and this class's
 * `overflow-wrap`/`min-width` pair, that either grew the cell past two rows
 * or — inside the flex/grid/table-cell layouts both card and table views use
 * — overflowed the card horizontally instead of wrapping at all, because a
 * long token's content-based minimum width can widen an auto-sized ancestor
 * before wrapping ever gets a chance to apply. Both fields now share one
 * fix.
 */
function RunSheetReadOnlyText({
  value,
  className,
  rows,
}: {
  value: string;
  className: string;
  rows: number;
}) {
  return (
    <div className={`${className} ftc-run-sheet-textarea ftc-run-sheet-textarea-${rows}`}>
      {value?.trim() ? value : "—"}
    </div>
  );
}

function RunSheetDjIdentity({
  row,
  lineup,
  profiles,
  readOnlyTextClassName,
}: {
  row: RunSheetRowInput;
  lineup: BookingRequest[];
  profiles: Map<string, BookingRecipientProfile>;
  readOnlyTextClassName: string;
}) {
  const dj = resolveRunSheetRowDjDisplay(row, lineup, profiles);

  if (!dj.displayName) {
    return (
      <div className={`${readOnlyTextClassName} flex min-h-[2.25rem] items-center text-ftc-text-muted`}>
        —
      </div>
    );
  }

  const identity = (
    <>
      <ProfileAvatar name={dj.displayName} avatarUrl={dj.avatarUrl} size="sm" />
      <span className="min-w-0 truncate font-medium text-ftc-text">{dj.displayName}</span>
    </>
  );

  if (dj.profileId) {
    return (
      <div className="flex min-h-[2.25rem] items-center gap-2 px-1 py-0.5">
        <ChatProfileAvatarLink
          userId={dj.profileId}
          name={dj.displayName}
          avatarUrl={dj.avatarUrl}
          size="sm"
        />
        <Link
          href={`/profile/${dj.profileId}`}
          className="min-w-0 truncate font-medium text-ftc-text transition hover:text-ftc-primary"
        >
          {dj.displayName}
        </Link>
      </div>
    );
  }

  return <div className="flex min-h-[2.25rem] items-center gap-2 px-1 py-0.5">{identity}</div>;
}

function renderRunSheetFieldInput({
  field,
  row,
  canEdit,
  stageAreaTextareaClassName,
  notesTextareaClassName,
  readOnlyTextClassName,
  updateRow,
}: {
  field: (typeof FIXED_FIELDS)[number];
  row: RunSheetRowInput;
  canEdit: boolean;
  stageAreaTextareaClassName: string;
  notesTextareaClassName: string;
  readOnlyTextClassName: string;
  updateRow: (rowId: string, patch: Partial<RunSheetRowInput>) => void;
}) {
  if (!canEdit) {
    return (
      <RunSheetReadOnlyText
        value={row[field.key]}
        className={readOnlyTextClassName}
        rows={
          field.key === "notes" ? RUN_SHEET_NOTES_VISIBLE_ROWS : RUN_SHEET_STAGE_AREA_VISIBLE_ROWS
        }
      />
    );
  }

  if (field.key === "notes") {
    return (
      <RunSheetCappedTextarea
        value={row[field.key]}
        onChange={(value) => updateRow(row.id!, { [field.key]: value })}
        className={notesTextareaClassName}
        maxLength={MAX_EVENT_NOTES_LENGTH}
        rows={RUN_SHEET_NOTES_VISIBLE_ROWS}
      />
    );
  }

  if (field.key === "stage_area") {
    return (
      <RunSheetCappedTextarea
        value={row[field.key]}
        onChange={(value) => updateRow(row.id!, { [field.key]: value })}
        className={stageAreaTextareaClassName}
        maxLength={RUN_SHEET_STAGE_AREA_MAX_LENGTH}
        rows={RUN_SHEET_STAGE_AREA_VISIBLE_ROWS}
      />
    );
  }

  return null;
}

export default function EventRunSheetSection({
  eventId,
  canEdit,
  lineup,
  profiles,
  onSaved,
  readOnlyHint,
  emptyStateMessage = "Accepted DJs will appear here once they confirm their booking",
}: {
  eventId: string;
  canEdit: boolean;
  lineup: BookingRequest[];
  profiles: Map<string, BookingRecipientProfile>;
  onSaved?: (message: string) => void;
  readOnlyHint?: string | null;
  emptyStateMessage?: string;
}) {
  const [rows, setRows] = useState<RunSheetRowInput[]>([]);
  /** Last persisted rows — the baseline the Save button's dirty check compares against. */
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
      // Clears the dirty state, which hides the Save button until the next edit.
      setSavedRows(persistedRows);
      onSaved?.("Run sheet saved");
    } catch (saveError) {
      logRunSheetSaveError(saveError);
      setError(getRunSheetSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const hasUnsavedChanges = useMemo(
    () => hasUnsavedRunSheetEdits(savedRows, rows),
    [savedRows, rows],
  );
  /**
   * Whether the Save button is shown. Its slot in the header is reserved
   * whenever the planner could ever save (see the header below), so flipping
   * this only changes the button's visibility, never the layout.
   */
  const showSaveButton = hasUnsavedChanges || saving;

  // Both capped fields share one sizing architecture: the base class carries the
  // pinned line-height, internal scrolling and scroll containment, and a
  // `-N` modifier pins height/min-height/max-height to that row count. No
  // `min-h-*` or `leading-*` utility here on purpose — each was a second opinion
  // about a height that now has exactly one source.
  const runSheetTextareaBaseClassName =
    "ftc-textarea ftc-run-sheet-textarea w-full rounded-lg px-2.5 py-1.5 text-sm break-words";

  const stageAreaTextareaClassName = `${runSheetTextareaBaseClassName} ftc-run-sheet-textarea-2`;
  const notesTextareaClassName = `${runSheetTextareaBaseClassName} ftc-run-sheet-textarea-4`;

  const readOnlyTextClassName =
    "rounded-lg border border-ftc-border bg-ftc-bg-elevated/30 px-2.5 py-1.5 text-sm leading-relaxed text-ftc-text whitespace-pre-wrap break-words";

  return (
    <section className={EVENT_DETAIL_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <EventDetailSectionTitle>Run Sheet</EventDetailSectionTitle>
          {!canEdit && readOnlyHint !== null ? (
            <p className={EVENT_DETAIL_SECTION_SUBTITLE_CLASS}>
              {readOnlyHint ?? "Read-only view for accepted crew"}
            </p>
          ) : null}
        </div>

        {/* The slot is reserved for as long as saving is possible at all, so the
            header keeps its height and nothing below it moves when the dirty
            state flips. Only the button's visibility changes.

            `invisible` (visibility: hidden) rather than opacity: it keeps the
            reserved space but takes the button out of the tab order and the
            accessibility tree, and stops it receiving pointer events — an
            opacity-only hide would leave an invisible control that is still
            focusable and clickable. tabIndex/aria-hidden restate that
            explicitly. The label stays "Save run sheet" while hidden (saving is
            false whenever the button is hidden), so the reserved width is the
            visible button's width, not the narrower "Saving" width. */}
        {canEdit && rows.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              aria-hidden={showSaveButton ? undefined : true}
              tabIndex={showSaveButton ? undefined : -1}
              className={`${EVENT_DETAIL_BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50${
                showSaveButton ? "" : " invisible"
              }`}
            >
              {saving ? "Saving" : "Save run sheet"}
            </button>
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
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    className={`${RUN_SHEET_DJ_COLUMN_CLASS} border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted`}
                  >
                    DJ
                  </th>
                  <th
                    className={`${RUN_SHEET_STAGE_COLUMN_CLASS} border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted`}
                  >
                    {getFixedField("stage_area").label}
                  </th>
                  <th className="w-[11rem] border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                    Set Time
                  </th>
                  <th
                    className={`${RUN_SHEET_NOTES_COLUMN_CLASS} border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted`}
                  >
                    {getFixedField("notes").label}
                  </th>
                  {canEdit ? (
                    <th className="w-[1%] whitespace-nowrap border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                      <span className="sr-only">Row actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id} className="align-top">
                    <td className={`${RUN_SHEET_DJ_COLUMN_CLASS} border-b border-ftc-border/70 px-2 py-2 align-top`}>
                      <RunSheetDjIdentity
                        row={row}
                        lineup={lineup}
                        profiles={profiles}
                        readOnlyTextClassName={readOnlyTextClassName}
                      />
                    </td>
                    <td className={`${RUN_SHEET_STAGE_COLUMN_CLASS} border-b border-ftc-border/70 px-2 py-2 align-top`}>
                      {renderRunSheetFieldInput({
                        field: getFixedField("stage_area"),
                        row,
                        canEdit,
                        stageAreaTextareaClassName,
                        notesTextareaClassName,
                        readOnlyTextClassName,
                        updateRow,
                      })}
                    </td>
                    <td className="whitespace-nowrap border-b border-ftc-border/70 px-2 py-2 align-top">
                      <RunSheetSetTimeField
                        startTime={row.start_time}
                        finishTime={row.finish_time}
                        onChange={(start, finish) =>
                          updateRow(row.id!, { start_time: start, finish_time: finish })
                        }
                        canEdit={canEdit}
                        readOnlyTextClassName={readOnlyTextClassName}
                      />
                    </td>
                    <td className={`${RUN_SHEET_NOTES_COLUMN_CLASS} border-b border-ftc-border/70 px-2 py-2 align-top`}>
                      {renderRunSheetFieldInput({
                        field: getFixedField("notes"),
                        row,
                        canEdit,
                        stageAreaTextareaClassName,
                        notesTextareaClassName,
                        readOnlyTextClassName,
                        updateRow,
                      })}
                    </td>
                    {canEdit ? (
                      <td className="w-[1%] whitespace-nowrap border-b border-ftc-border/70 px-2 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <RowMoveButton
                            direction="up"
                            onClick={() => handleMoveRow(row.id!, "up")}
                            disabled={rowIndex === 0}
                          />
                          <RowMoveButton
                            direction="down"
                            onClick={() => handleMoveRow(row.id!, "down")}
                            disabled={rowIndex === rows.length - 1}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3 lg:hidden">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="ftc-card p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                    Set {index + 1}
                  </p>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      <RowMoveButton
                        direction="up"
                        onClick={() => handleMoveRow(row.id!, "up")}
                        disabled={index === 0}
                      />
                      <RowMoveButton
                        direction="down"
                        onClick={() => handleMoveRow(row.id!, "down")}
                        disabled={index === rows.length - 1}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                      DJ
                    </span>
                    <RunSheetDjIdentity
                      row={row}
                      lineup={lineup}
                      profiles={profiles}
                      readOnlyTextClassName={readOnlyTextClassName}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                      {getFixedField("stage_area").label}
                    </span>
                    {renderRunSheetFieldInput({
                      field: getFixedField("stage_area"),
                      row,
                      canEdit,
                      stageAreaTextareaClassName,
                      notesTextareaClassName,
                      readOnlyTextClassName,
                      updateRow,
                    })}
                  </label>

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
                      readOnlyTextClassName={readOnlyTextClassName}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                      {getFixedField("notes").label}
                    </span>
                    {renderRunSheetFieldInput({
                      field: getFixedField("notes"),
                      row,
                      canEdit,
                      stageAreaTextareaClassName,
                      notesTextareaClassName,
                      readOnlyTextClassName,
                      updateRow,
                    })}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
