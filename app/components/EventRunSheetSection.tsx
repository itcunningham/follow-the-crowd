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
  getRunSheetLoadErrorMessage,
  getRunSheetSaveErrorMessage,
  isPersistedRunSheetRowId,
  loadEventRunSheet,
  logRunSheetSaveError,
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
  "inline-flex w-full min-h-[2.25rem] items-center gap-1 rounded-full border border-zinc-800/90 bg-[#121214] px-2.5 py-1 text-xs font-medium text-zinc-100 outline-none transition hover:border-blue-500/35 focus:border-blue-500/45 focus:ring-1 focus:ring-blue-500/20 sm:min-h-[2rem] lg:max-w-[11rem]";

const RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS = "w-[14%] min-w-[9rem]";
const RUN_SHEET_NOTES_COLUMN_CLASS = "w-[28%] min-w-[10rem]";

function getFixedField(key: (typeof FIXED_FIELDS)[number]["key"]) {
  const field = FIXED_FIELDS.find((item) => item.key === key);

  if (!field) {
    throw new Error(`Unknown run sheet field: ${key}`);
  }

  return field;
}

function mapRowsFromDb(
  rows: Array<{
    id: string;
    sort_order: number;
    artist_name: string;
    start_time: string;
    finish_time: string;
    stage_area: string;
    notes: string;
  }>,
): RunSheetRowInput[] {
  return rows.map((row) => ({
    id: row.id,
    sort_order: row.sort_order,
    artist_name: row.artist_name,
    start_time: row.start_time,
    finish_time: row.finish_time,
    stage_area: row.stage_area,
    notes: row.notes,
  }));
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
      className={`${iconButtonBaseClassName} border-zinc-700/80 bg-zinc-950/80 text-zinc-400 hover:border-blue-500/40 hover:text-blue-300`}
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
      className={`${iconButtonBaseClassName} border-red-500/35 bg-red-500/10 text-red-400 hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-300`}
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
          className={`min-w-0 flex-1 truncate text-center tabular-nums ${hasValue ? "text-zinc-100" : "text-zinc-500"}`}
        >
          {displayValue}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-3 w-3 shrink-0 text-zinc-500"
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

  const loadRunSheet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await loadEventRunSheet(eventId);
      setRows(reorderRunSheetRows(mapRowsFromDb(data.rows)));
      setDeletedRowIds([]);
    } catch (loadError) {
      console.error("Failed to load run sheet:", loadError);
      setRows([]);
      setError(getRunSheetLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

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

  function handleAddAcceptedDjs() {
    const acceptedBookings = lineup.filter((booking) => booking.status === "accepted");
    const existingNames = new Set(
      rows.map((row) => row.artist_name.trim().toLowerCase()).filter(Boolean),
    );

    const additions = acceptedBookings
      .map((booking) => {
        const profile = profiles.get(booking.recipient_id);
        const name = profile?.display_name?.trim() || "DJ";
        return name;
      })
      .filter((name) => {
        const key = name.toLowerCase();
        if (existingNames.has(key)) {
          return false;
        }

        existingNames.add(key);
        return true;
      })
      .map((name, index) => createEmptyRunSheetRow(rows.length + index, name));

    if (additions.length === 0) {
      setError("No new accepted DJs to add.");
      return;
    }

    setRows((prev) => reorderRunSheetRows([...prev, ...additions]));
    setError(null);
    setSuccessMessage(null);
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

      setRows(reorderRunSheetRows(mapRowsFromDb(saved.rows)));
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
    "w-full resize-none overflow-x-hidden overflow-y-hidden rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 break-words";

  const artistTextareaClassName = `${runSheetTextareaBaseClassName} min-h-[2.25rem] leading-normal`;
  const stageAreaTextareaClassName = `${runSheetTextareaBaseClassName} min-h-[2.25rem] leading-normal`;
  const notesTextareaClassName = `${runSheetTextareaBaseClassName} min-h-[3.25rem] leading-relaxed`;

  const readOnlyTextClassName =
    "rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-2.5 py-1.5 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words";

  return (
    <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
            Run Sheet
          </h2>
          {!canEdit ? (
            <p className="mt-1 text-xs text-zinc-500">Read-only view for accepted crew.</p>
          ) : null}
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-300"
            >
              Add row
            </button>
            <button
              type="button"
              onClick={handleAddAcceptedDjs}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-300"
            >
              Add accepted DJs
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : null}
      </div>

      {successMessage ? (
        <p className="mt-4 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-sm text-blue-200">
          {successMessage}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading run sheet...</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">No run sheet rows yet. Add your first DJ set.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-zinc-800 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500`}
                  >
                    {getFixedField("artist_name").label}
                  </th>
                  <th
                    className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-zinc-800 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500`}
                  >
                    {getFixedField("stage_area").label}
                  </th>
                  <th className="w-[11rem] border-b border-zinc-800 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Set Time
                  </th>
                  <th
                    className={`${RUN_SHEET_NOTES_COLUMN_CLASS} border-b border-zinc-800 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500`}
                  >
                    {getFixedField("notes").label}
                  </th>
                  {canEdit ? (
                    <th className="w-[1%] whitespace-nowrap border-b border-zinc-800 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      <span className="sr-only">Row actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id} className="align-top">
                    <td className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-zinc-800/70 px-2 py-2 align-top`}>
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
                    <td className={`${RUN_SHEET_EQUAL_TEXT_COLUMN_CLASS} border-b border-zinc-800/70 px-2 py-2 align-top`}>
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
                    <td className="whitespace-nowrap border-b border-zinc-800/70 px-2 py-2 align-top">
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
                    <td className={`${RUN_SHEET_NOTES_COLUMN_CLASS} border-b border-zinc-800/70 px-2 py-2 align-top`}>
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
                      <td className="w-[1%] whitespace-nowrap border-b border-zinc-800/70 px-2 py-2 align-top">
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
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
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
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
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
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
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
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
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
