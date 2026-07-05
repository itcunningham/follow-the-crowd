"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookingDualTimeWheelPicker } from "@/app/components/BookingTimeWheelPicker";
import type { BookingRequest } from "@/lib/bookingRequests";
import {
  clockPartsToWheelTime,
  combineClockAndMeridiem,
  defaultFinishWheelTime,
  defaultStartWheelTime,
  extractClockDisplay,
  parseSetTimeRange,
  SET_TIME_RANGE_JOINER,
  wheelTimeToClockParts,
  type Meridiem,
  type WheelTimeValue,
} from "@/lib/bookingDateTime";
import {
  createEmptyRunSheetRow,
  ensureRunSheetRowsForAcceptedBookings,
  getRunSheetLoadErrorMessage,
  getRunSheetSaveErrorMessage,
  isPersistedRunSheetRowId,
  loadEventRunSheet,
  logRunSheetSaveError,
  mapRunSheetRowsFromDb,
  mergeAcceptedDjsIntoRunSheetRows,
  moveRunSheetRow,
  reorderRunSheetRows,
  saveEventRunSheet,
  type RunSheetRowInput,
} from "@/lib/eventRunSheet";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

const FIXED_FIELDS = [
  { key: "artist_name" as const, label: "Artist / DJ" },
  { key: "stage_area" as const, label: "Stage / Area" },
  { key: "notes" as const, label: "Notes" },
];

const RUN_SHEET_SET_TIME_BUTTON_CLASS =
  "inline-flex w-full min-h-[2.25rem] items-center gap-1 rounded-full border border-ftc-border/90 bg-ftc-bg-elevated px-2.5 py-1 text-xs font-medium text-ftc-text outline-none transition hover:border-ftc-primary/30 focus:border-ftc-primary/40 focus:border-ftc-primary/40 sm:min-h-[2rem] lg:max-w-[11rem]";

const RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS = "w-[14%] min-w-[9rem]";
const RUN_SHEET_NOTES_COLUMN_CLASS = "w-[28%] min-w-[10rem]";

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

function RowRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove row"
      title="Remove row"
      className={`${iconButtonBaseClassName} border-0 bg-[var(--ftc-color-danger)] text-ftc-bg hover:opacity-90`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

function formatRunSheetSetTimeDisplay(startTime: string, finishTime: string): string {
  const start = startTime.trim();
  const finish = finishTime.trim();

  if (!start && !finish) {
    return "Select time";
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

  const hasValue = displayValue !== "Select time";

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
          className={`min-w-0 flex-1 truncate text-center tabular-nums ${hasValue ? "text-ftc-text" : "text-ftc-text-muted"}`}
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

function RunSheetAutoGrowTextarea({
  value,
  onChange,
  className,
  minRows = 1,
  placeholder,
  expandWhenWrapped = false,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  minRows?: number;
  placeholder?: string;
  expandWhenWrapped?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const singleLineHeightRef = useRef<number | null>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    if (expandWhenWrapped && singleLineHeightRef.current === null) {
      const savedValue = textarea.value;
      textarea.value = "";
      textarea.style.height = "auto";
      singleLineHeightRef.current = textarea.scrollHeight;
      textarea.value = savedValue;
    }

    textarea.style.height = "auto";
    const nextHeight = textarea.scrollHeight;

    if (
      expandWhenWrapped &&
      singleLineHeightRef.current !== null &&
      nextHeight <= singleLineHeightRef.current + 1
    ) {
      textarea.style.height = `${singleLineHeightRef.current}px`;
      return;
    }

    textarea.style.height = `${nextHeight}px`;
  }, [expandWhenWrapped]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight, className]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={minRows}
      placeholder={placeholder}
      onChange={(event) => {
        onChange(event.target.value);
        requestAnimationFrame(adjustHeight);
      }}
      className={className}
    />
  );
}

function RunSheetReadOnlyText({
  value,
  className,
  notes = false,
}: {
  value: string;
  className: string;
  notes?: boolean;
}) {
  return (
    <div className={`${className} ${notes ? "min-h-[3.25rem]" : "min-h-[2.25rem]"}`}>
      {value?.trim() ? value : "—"}
    </div>
  );
}

function renderRunSheetFieldInput({
  field,
  row,
  canEdit,
  artistTextareaClassName,
  stageAreaTextareaClassName,
  notesTextareaClassName,
  readOnlyTextClassName,
  updateRow,
}: {
  field: (typeof FIXED_FIELDS)[number];
  row: RunSheetRowInput;
  canEdit: boolean;
  artistTextareaClassName: string;
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
        notes={field.key === "notes"}
      />
    );
  }

  if (field.key === "notes") {
    return (
      <RunSheetAutoGrowTextarea
        value={row[field.key]}
        onChange={(value) => updateRow(row.id!, { [field.key]: value })}
        className={notesTextareaClassName}
        minRows={2}
      />
    );
  }

  if (field.key === "stage_area") {
    return (
      <RunSheetAutoGrowTextarea
        value={row[field.key]}
        onChange={(value) => updateRow(row.id!, { [field.key]: value })}
        className={stageAreaTextareaClassName}
        minRows={1}
        expandWhenWrapped
      />
    );
  }

  return (
    <RunSheetAutoGrowTextarea
      value={row[field.key]}
      onChange={(value) => updateRow(row.id!, { [field.key]: value })}
      className={artistTextareaClassName}
      minRows={1}
      expandWhenWrapped
    />
  );
}

export default function EventRunSheetSection({
  eventId,
  canEdit,
  lineup,
  profiles,
  onSaved,
}: {
  eventId: string;
  canEdit: boolean;
  lineup: BookingRequest[];
  profiles: Map<string, BookingRecipientProfile>;
  onSaved?: (message: string) => void;
}) {
  const [rows, setRows] = useState<RunSheetRowInput[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  const syncAcceptedDjs = useCallback(
    async (currentRows: RunSheetRowInput[]) => {
      if (syncInFlightRef.current) {
        return currentRows;
      }

      const { addedCount } = mergeAcceptedDjsIntoRunSheetRows(currentRows, lineup, profiles);

      if (addedCount === 0) {
        return currentRows;
      }

      if (!canEdit) {
        return mergeAcceptedDjsIntoRunSheetRows(currentRows, lineup, profiles).rows;
      }

      syncInFlightRef.current = true;

      try {
        const saved = await ensureRunSheetRowsForAcceptedBookings(eventId, lineup, profiles);
        return reorderRunSheetRows(mapRunSheetRowsFromDb(saved.rows));
      } catch (autoSaveError) {
        console.error(
          "Accepted DJ auto-add save failed; rows stay local until Save changes:",
          autoSaveError,
        );
        return mergeAcceptedDjsIntoRunSheetRows(currentRows, lineup, profiles).rows;
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
      const mergedRows = await syncAcceptedDjs(loadedRows);
      setRows(mergedRows);
      setDeletedRowIds([]);
    } catch (loadError) {
      console.error("Failed to load run sheet:", loadError);
      setRows([]);
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

  function handleAddRow() {
    setRows((prev) => reorderRunSheetRows([...prev, createEmptyRunSheetRow(prev.length)]));
    setSuccessMessage(null);
  }

  function handleRemoveRow(rowId: string) {
    setRows((prev) => reorderRunSheetRows(prev.filter((row) => row.id !== rowId)));

    if (isPersistedRunSheetRowId(rowId)) {
      setDeletedRowIds((prev) => [...prev, rowId]);
    }
  }

  function handleMoveRow(rowId: string, direction: "up" | "down") {
    setRows((prev) => moveRunSheetRow(prev, rowId, direction));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const saved = await saveEventRunSheet(eventId, {
        rows: reorderRunSheetRows(rows),
        deletedRowIds,
      });

      setRows(reorderRunSheetRows(mapRunSheetRowsFromDb(saved.rows)));
      setDeletedRowIds([]);

      const message = "Run sheet saved";
      setSuccessMessage(message);
      onSaved?.(message);
    } catch (saveError) {
      logRunSheetSaveError(saveError);
      setError(getRunSheetSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const runSheetTextareaBaseClassName =
    "w-full resize-none overflow-x-hidden overflow-y-hidden rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 px-2.5 py-1.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-ftc-border-strong break-words";

  const artistTextareaClassName = `${runSheetTextareaBaseClassName} min-h-[2.25rem] leading-normal`;
  const stageAreaTextareaClassName = `${runSheetTextareaBaseClassName} min-h-[2.25rem] leading-normal`;
  const notesTextareaClassName = `${runSheetTextareaBaseClassName} min-h-[3.25rem] leading-relaxed`;

  const readOnlyTextClassName =
    "rounded-lg border border-ftc-border bg-ftc-bg-elevated/30 px-2.5 py-1.5 text-sm leading-relaxed text-ftc-text whitespace-pre-wrap break-words";

  return (
    <section className="mb-6 ftc-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-primary">
            Run Sheet
          </h2>
          {!canEdit ? (
            <p className="mt-1 text-xs text-ftc-text-muted">Read-only view for accepted crew.</p>
          ) : null}
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
            >
              Add row
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ftc-btn-primary px-3 py-1.5 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : null}
      </div>

      {successMessage ? (
        <p className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
          {successMessage}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-[var(--ftc-color-danger)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-ftc-text-muted">Loading run sheet...</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-ftc-border bg-ftc-bg-elevated/40 px-4 py-8 text-center">
          <p className="text-sm text-ftc-text-secondary">No run sheet rows yet. Add your first DJ set.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted`}
                  >
                    {getFixedField("artist_name").label}
                  </th>
                  <th
                    className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-ftc-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted`}
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
                    <td className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-ftc-border/70 px-2 py-2 align-top`}>
                      {renderRunSheetFieldInput({
                        field: getFixedField("artist_name"),
                        row,
                        canEdit,
                        artistTextareaClassName,
                        stageAreaTextareaClassName,
                        notesTextareaClassName,
                        readOnlyTextClassName,
                        updateRow,
                      })}
                    </td>
                    <td className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-ftc-border/70 px-2 py-2 align-top`}>
                      {renderRunSheetFieldInput({
                        field: getFixedField("stage_area"),
                        row,
                        canEdit,
                        artistTextareaClassName,
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
                        artistTextareaClassName,
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
                          <RowRemoveButton onClick={() => handleRemoveRow(row.id!)} />
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
                className="rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 p-4"
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
                      <RowRemoveButton onClick={() => handleRemoveRow(row.id!)} />
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  {(["artist_name", "stage_area"] as const).map((fieldKey) => {
                    const field = getFixedField(fieldKey);

                    return (
                      <label key={field.key} className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                          {field.label}
                        </span>
                        {renderRunSheetFieldInput({
                          field,
                          row,
                          canEdit,
                          artistTextareaClassName,
                          stageAreaTextareaClassName,
                          notesTextareaClassName,
                          readOnlyTextClassName,
                          updateRow,
                        })}
                      </label>
                    );
                  })}

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
                      artistTextareaClassName,
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
