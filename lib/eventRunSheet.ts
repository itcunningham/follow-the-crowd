import type { BookingRequest } from "@/lib/bookingRequests";
import { SET_TIME_RANGE_JOINER } from "@/lib/bookingDateTime";
import { formatRunSheetUpdatedDmMessage } from "@/lib/dm/dmBookingSystemMessages";
import {
  createNotification,
  formatNotificationPreview,
  getNotificationCreateErrorMessage,
} from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";
import { getCurrentUserId, getCurrentUserProfile } from "@/lib/user/currentUser";
import { resolveUserDisplayName } from "@/lib/user/displayName";
import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import {
  formatRunSheetUpdateMessage,
  type RunSheetUpdateChange,
} from "@/lib/events/runSheetUpdateMessage";

export type RunSheetRow = {
  id: string;
  created_at: string;
  event_id: string;
  owner_id: string;
  sort_order: number;
  artist_name: string;
  start_time: string;
  finish_time: string;
  stage_area: string;
  notes: string;
  booking_request_id?: string | null;
  custom_data?: unknown;
};

export type RunSheetRowInput = {
  id?: string;
  sort_order: number;
  artist_name: string;
  start_time: string;
  finish_time: string;
  stage_area: string;
  notes: string;
  booking_request_id?: string;
  booking_recipient_id?: string;
};

export type RunSheetSavePayload = {
  rows: RunSheetRowInput[];
  deletedRowIds: string[];
};

export type RunSheetRowDjDisplay = {
  displayName: string;
  avatarUrl?: string | null;
  profileId?: string;
  isAssigned: boolean;
};

export type EventRunSheetData = {
  rows: RunSheetRow[];
};

const ROW_FIELDS =
  "id, created_at, event_id, owner_id, sort_order, artist_name, start_time, finish_time, stage_area, notes, booking_request_id, custom_data";

const RUN_SHEET_ROW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedRunSheetRowId(id: string | undefined): id is string {
  return Boolean(id && RUN_SHEET_ROW_UUID_RE.test(id));
}

function filterPersistedRowIds(ids: string[]): string[] {
  return ids.filter(isPersistedRunSheetRowId);
}

function buildRunSheetRowCustomData(row: RunSheetRowInput): Record<string, unknown> {
  const customData: Record<string, unknown> = {};

  if (row.booking_recipient_id?.trim()) {
    customData.booking_recipient_id = row.booking_recipient_id.trim();
  }

  if (row.booking_request_id?.trim()) {
    customData.booking_request_id = row.booking_request_id.trim();
  }

  return customData;
}

function readBookingRecipientIdFromCustomData(customData: unknown): string | undefined {
  if (!customData || typeof customData !== "object") {
    return undefined;
  }

  const recipientId = (customData as { booking_recipient_id?: unknown }).booking_recipient_id;

  return typeof recipientId === "string" && recipientId.trim() ? recipientId.trim() : undefined;
}

function readBookingRequestIdFromRow(
  row: Pick<RunSheetRow, "booking_request_id" | "custom_data">,
): string | undefined {
  if (typeof row.booking_request_id === "string" && row.booking_request_id.trim()) {
    return row.booking_request_id.trim();
  }

  if (!row.custom_data || typeof row.custom_data !== "object") {
    return undefined;
  }

  const bookingRequestId = (row.custom_data as { booking_request_id?: unknown }).booking_request_id;

  return typeof bookingRequestId === "string" && bookingRequestId.trim()
    ? bookingRequestId.trim()
    : undefined;
}

export function resolveRunSheetRowDjDisplay(
  row: RunSheetRowInput,
  lineup: BookingRequest[],
  profiles: Map<string, BookingRecipientProfile>,
): RunSheetRowDjDisplay {
  let recipientId = row.booking_recipient_id?.trim();

  if (!recipientId && row.booking_request_id?.trim()) {
    const booking = lineup.find((item) => item.id === row.booking_request_id?.trim());
    recipientId = booking?.recipient_id;
  }

  if (recipientId) {
    const profile = profiles.get(recipientId);

    return {
      displayName: profile?.display_name?.trim() || row.artist_name.trim() || "DJ",
      avatarUrl: profile?.avatar_url,
      profileId: recipientId,
      isAssigned: true,
    };
  }

  const legacyName = row.artist_name.trim();

  if (legacyName) {
    return {
      displayName: legacyName,
      isAssigned: false,
    };
  }

  return {
    displayName: "",
    isAssigned: false,
  };
}

export function filterRunSheetRowsToAcceptedBookings(
  rows: RunSheetRowInput[],
  lineup: BookingRequest[],
  profiles: Map<string, BookingRecipientProfile>,
): RunSheetRowInput[] {
  const acceptedBookings = lineup.filter((booking) => booking.status === "accepted");

  if (acceptedBookings.length === 0) {
    return [];
  }

  return rows.filter((row) =>
    acceptedBookings.some((booking) => {
      const profile = profiles.get(booking.recipient_id);
      const artistName = profile?.display_name?.trim() || "DJ";
      return runSheetRowMatchesAcceptedBooking(row, booking, artistName);
    }),
  );
}

export function mapRunSheetRowsFromDb(rows: RunSheetRow[]): RunSheetRowInput[] {
  return rows.map((row) => ({
    id: row.id,
    sort_order: row.sort_order,
    artist_name: row.artist_name,
    start_time: row.start_time,
    finish_time: row.finish_time,
    stage_area: row.stage_area,
    notes: row.notes,
    booking_request_id: readBookingRequestIdFromRow(row),
    booking_recipient_id: readBookingRecipientIdFromCustomData(row.custom_data),
  }));
}

function buildRunSheetRowFields(row: RunSheetRowInput) {
  return {
    sort_order: row.sort_order,
    artist_name: row.artist_name.trim(),
    start_time: row.start_time.trim(),
    finish_time: row.finish_time.trim(),
    stage_area: row.stage_area.trim(),
    notes: row.notes.trim(),
  };
}

function runSheetRowMatchesAcceptedBooking(
  row: RunSheetRowInput,
  booking: BookingRequest,
  artistName: string,
): boolean {
  if (row.booking_request_id && row.booking_request_id === booking.id) {
    return true;
  }

  if (row.booking_recipient_id && row.booking_recipient_id === booking.recipient_id) {
    return true;
  }

  const artistKey = artistName.trim().toLowerCase();
  return Boolean(artistKey) && row.artist_name.trim().toLowerCase() === artistKey;
}

async function runSheetRowExistsForBooking(
  eventId: string,
  bookingRequestId: string,
  recipientId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("event_run_sheet_rows")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .or(
      `booking_request_id.eq.${bookingRequestId},custom_data->>booking_recipient_id.eq.${recipientId}`,
    );

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

export function mergeAcceptedDjsIntoRunSheetRows(
  rows: RunSheetRowInput[],
  lineup: BookingRequest[],
  profiles: Map<string, BookingRecipientProfile>,
): { rows: RunSheetRowInput[]; addedCount: number } {
  const acceptedBookings = lineup.filter((booking) => booking.status === "accepted");
  const additions: RunSheetRowInput[] = [];

  for (const booking of acceptedBookings) {
    const profile = profiles.get(booking.recipient_id);
    const artistName = profile?.display_name?.trim() || "DJ";
    const existingRows = [...rows, ...additions];
    const alreadyPresent = existingRows.some((row) =>
      runSheetRowMatchesAcceptedBooking(row, booking, artistName),
    );

    if (alreadyPresent) {
      continue;
    }

    additions.push(
      createEmptyRunSheetRow(existingRows.length, artistName, booking.recipient_id, booking.id),
    );
  }

  if (additions.length === 0) {
    return { rows, addedCount: 0 };
  }

  return {
    rows: reorderRunSheetRows([...rows, ...additions]),
    addedCount: additions.length,
  };
}

/**
 * "Set 1" / "Set 2" labels for a DJ that holds more than one Run Sheet entry.
 * A DJ with exactly one entry gets `null`: the label exists only to
 * disambiguate which of a DJ's several entries this is, so it must not
 * appear when there is nothing to disambiguate.
 *
 * Grouped the same way `mergeAcceptedDjsIntoRunSheetRows` matches a row to a
 * booking: by resolved profile id first, falling back to the typed artist
 * name for legacy/unassigned rows -- two rows for the same person should
 * group even if one was added before the other had a linked booking.
 * Numbering follows the rows' own array order (the run sheet's actual
 * running order), not proximity, so a DJ's sets stay correctly numbered even
 * if another DJ's entry sits between them.
 */
export function computeRunSheetSetLabels(
  rows: RunSheetRowInput[],
  lineup: BookingRequest[],
  profiles: Map<string, BookingRecipientProfile>,
): Map<string, string | null> {
  const keyOf = (row: RunSheetRowInput) => {
    const dj = resolveRunSheetRowDjDisplay(row, lineup, profiles);
    return dj.profileId ?? (dj.displayName.trim().toLowerCase() || `row:${row.id}`);
  };

  const totalByKey = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    totalByKey.set(key, (totalByKey.get(key) ?? 0) + 1);
  }

  const seenByKey = new Map<string, number>();
  const labels = new Map<string, string | null>();
  for (const row of rows) {
    const key = keyOf(row);

    if ((totalByKey.get(key) ?? 1) <= 1) {
      labels.set(row.id!, null);
      continue;
    }

    const setNumber = (seenByKey.get(key) ?? 0) + 1;
    seenByKey.set(key, setNumber);
    labels.set(row.id!, `Set ${setNumber}`);
  }

  return labels;
}

export async function loadEventRunSheet(eventId: string): Promise<EventRunSheetData> {
  const { data, error } = await supabase
    .from("event_run_sheet_rows")
    .select(ROW_FIELDS)
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return {
    rows: (data ?? []) as RunSheetRow[],
  };
}

export async function saveEventRunSheet(
  eventId: string,
  payload: RunSheetSavePayload,
): Promise<EventRunSheetData> {
  const ownerId = await getCurrentUserId();
  const persistedDeletedRowIds = filterPersistedRowIds(payload.deletedRowIds);

  if (persistedDeletedRowIds.length > 0) {
    const { error } = await supabase
      .from("event_run_sheet_rows")
      .delete()
      .eq("event_id", eventId)
      .in("id", persistedDeletedRowIds);

    if (error) {
      throw error;
    }
  }

  for (const row of payload.rows) {
    const rowFields = buildRunSheetRowFields(row);
    const customData = buildRunSheetRowCustomData(row);

    if (isPersistedRunSheetRowId(row.id)) {
      const { error } = await supabase
        .from("event_run_sheet_rows")
        .update({
          ...rowFields,
          booking_request_id: row.booking_request_id?.trim() || null,
          custom_data: buildRunSheetRowCustomData(row),
        })
        .eq("id", row.id)
        .eq("event_id", eventId);

      if (error) {
        throw error;
      }

      continue;
    }

    const { error } = await supabase.from("event_run_sheet_rows").insert({
      event_id: eventId,
      owner_id: ownerId,
      booking_request_id: row.booking_request_id ?? null,
      ...rowFields,
      custom_data: customData,
    });

    if (error) {
      if (error.code === "23505" && row.booking_request_id) {
        continue;
      }

      throw error;
    }
  }

  return loadEventRunSheet(eventId);
}

/**
 * Every failure in the accepted-DJ auto-add lands in one place: the `catch` in
 * `EventRunSheetSection`'s `syncAcceptedDjs`, which keeps the rows local-only
 * so the planner can still save them by hand. That is the correct behaviour,
 * but it also means a genuine persistence failure is indistinguishable from
 * every other one — the planner just sees "Save run sheet" on an untouched
 * sheet, and the log carries a bare Supabase error with no indication of which
 * step produced it.
 *
 * This tags the failing step onto the error before it propagates. Control flow
 * is unchanged: the same errors still throw, at the same points, and the same
 * catch still handles them — the message just now says which of the five
 * fallible steps failed, so a single reload identifies the root cause instead
 * of requiring another round of guessing.
 */
function tagRunSheetAutoAddFailure(step: string, error: unknown): Error {
  const detail = getRunSheetErrorMessage(error, "unknown error");
  const code =
    error && typeof error === "object" && "code" in error
      ? ` [code ${String((error as { code?: unknown }).code)}]`
      : "";

  return Object.assign(
    new Error(`Run sheet accepted-DJ auto-add failed at "${step}"${code}: ${detail}`),
    { cause: error },
  );
}

export async function ensureRunSheetRowsForAcceptedBookings(
  eventId: string,
  lineup: BookingRequest[],
  profiles: Map<string, BookingRecipientProfile>,
): Promise<EventRunSheetData> {
  let existing: EventRunSheetData;

  try {
    existing = await loadEventRunSheet(eventId);
  } catch (error) {
    throw tagRunSheetAutoAddFailure("load existing rows", error);
  }

  const existingInputs = mapRunSheetRowsFromDb(existing.rows);
  const { rows: mergedRows, addedCount } = mergeAcceptedDjsIntoRunSheetRows(
    existingInputs,
    lineup,
    profiles,
  );

  if (addedCount === 0) {
    return existing;
  }

  let ownerId: string;

  try {
    ownerId = await getCurrentUserId();
  } catch (error) {
    throw tagRunSheetAutoAddFailure("resolve current user id", error);
  }

  const newRows = mergedRows.filter((row) => !isPersistedRunSheetRowId(row.id));

  for (const row of newRows) {
    if (!row.booking_request_id || !row.booking_recipient_id) {
      // Nothing to key the row off, so it can never be matched or de-duped
      // later. Skipping silently would persist nothing and report nothing,
      // which reads downstream as an unexplained permanently-unsaved row.
      console.warn(
        "Run sheet accepted-DJ auto-add skipped a row with no booking linkage; it cannot be auto-persisted:",
        {
          artist_name: row.artist_name,
          booking_request_id: row.booking_request_id ?? null,
          booking_recipient_id: row.booking_recipient_id ?? null,
        },
      );
      continue;
    }

    let alreadyExists: boolean;

    try {
      alreadyExists = await runSheetRowExistsForBooking(
        eventId,
        row.booking_request_id,
        row.booking_recipient_id,
      );
    } catch (error) {
      throw tagRunSheetAutoAddFailure("check for an existing row", error);
    }

    if (alreadyExists) {
      continue;
    }

    const rowFields = buildRunSheetRowFields(row);
    const customData = buildRunSheetRowCustomData(row);
    const { error } = await supabase.from("event_run_sheet_rows").insert({
      event_id: eventId,
      owner_id: ownerId,
      booking_request_id: row.booking_request_id,
      ...rowFields,
      custom_data: customData,
    });

    if (error) {
      if (error.code === "23505") {
        continue;
      }

      throw tagRunSheetAutoAddFailure("insert the row", error);
    }
  }

  try {
    return await loadEventRunSheet(eventId);
  } catch (error) {
    throw tagRunSheetAutoAddFailure("reload rows after insert", error);
  }
}

function getRunSheetErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const supabaseError = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    if (supabaseError.code === "42P01" || supabaseError.code === "PGRST205") {
      return "Run sheet tables are not set up yet. Run scripts/setupEventRunSheet.sql.";
    }

    const parts = [
      supabaseError.message,
      supabaseError.details ? `Details: ${supabaseError.details}` : null,
      supabaseError.hint ? `Hint: ${supabaseError.hint}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return error instanceof Error ? error.message : fallback;
}

export function getRunSheetLoadErrorMessage(error: unknown): string {
  return getRunSheetErrorMessage(error, "Failed to load run sheet");
}

export function getRunSheetSaveErrorMessage(error: unknown): string {
  return getRunSheetErrorMessage(error, "Failed to save run sheet");
}

export function logRunSheetSaveError(error: unknown): void {
  console.error("Failed to save run sheet:", error);

  if (error && typeof error === "object") {
    console.error("Run sheet save Supabase error:", JSON.stringify(error, null, 2));
  }
}

export function createTempRunSheetId(): string {
  return `temp-row-${crypto.randomUUID()}`;
}

export function createEmptyRunSheetRow(
  sortOrder: number,
  artistName = "",
  bookingRecipientId?: string,
  bookingRequestId?: string,
): RunSheetRowInput {
  return {
    id: createTempRunSheetId(),
    sort_order: sortOrder,
    artist_name: artistName,
    start_time: "",
    finish_time: "",
    stage_area: "",
    notes: "",
    booking_recipient_id: bookingRecipientId,
    booking_request_id: bookingRequestId,
  };
}

export function reorderRunSheetRows(rows: RunSheetRowInput[]): RunSheetRowInput[] {
  return rows.map((row, index) => ({ ...row, sort_order: index }));
}

/**
 * Signature of everything a planner can change: which DJs are on the sheet, the
 * order they run in (array position, which `reorderRunSheetRows` keeps in step
 * with `sort_order`), and each row's editable fields.
 *
 * `sort_order` itself is left out deliberately — it is derived from position, so
 * including it would only ever restate what the array order already says.
 */
function serializeRunSheetRows(rows: RunSheetRowInput[]): string {
  return JSON.stringify(
    rows.map((row) => [
      row.id ?? "",
      row.booking_request_id ?? "",
      row.booking_recipient_id ?? "",
      // Every field is null-coalesced, not just the ids. `RunSheetRowInput`
      // types these as `string`, but rows reach this from two different
      // producers -- `mapRunSheetRowsFromDb` (straight passthrough of whatever
      // the column holds) and `createEmptyRunSheetRow` (always `""`) -- so a
      // nullish value on one side and `""` on the other would serialize as
      // `null` vs `""` and read as an edit the planner never made. Values are
      // NOT trimmed here: trimming is a save-time transform
      // (`buildRunSheetRowFields`), so treating " Main" as equal to "Main"
      // would hide a genuine pending edit.
      row.artist_name ?? "",
      row.stage_area ?? "",
      row.start_time ?? "",
      row.finish_time ?? "",
      row.notes ?? "",
    ]),
  );
}

/** True when the run sheet on screen differs from the one last persisted. */
export function hasUnsavedRunSheetEdits(
  savedRows: RunSheetRowInput[],
  currentRows: RunSheetRowInput[],
): boolean {
  return serializeRunSheetRows(savedRows) !== serializeRunSheetRows(currentRows);
}

export function moveRunSheetRow(
  rows: RunSheetRowInput[],
  rowId: string,
  direction: "up" | "down",
): RunSheetRowInput[] {
  const index = rows.findIndex((row) => row.id === rowId);

  if (index === -1) {
    return rows;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= rows.length) {
    return rows;
  }

  const next = [...rows];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return reorderRunSheetRows(next);
}

/**
 * Absolute indices of a booking's rows — order-only reshuffles change this
 * without touching stage/time/notes.
 */
function runSheetBookingOrderFingerprint(
  rows: RunSheetRowInput[],
  bookingRequestId: string,
): string {
  return rows
    .map((row, index) =>
      (row.booking_request_id ?? "").trim() === bookingRequestId ? String(index) : null,
    )
    .filter((part): part is string => part !== null)
    .join(",");
}

function rowsForBookingRequest(
  rows: RunSheetRowInput[],
  bookingRequestId: string,
): RunSheetRowInput[] {
  return rows.filter((row) => (row.booking_request_id ?? "").trim() === bookingRequestId);
}

function formatRunSheetSetTimeForDm(startTime: string, finishTime: string): string {
  const start = startTime.trim();
  const finish = finishTime.trim();

  if (!start && !finish) {
    return "";
  }

  if (start && finish) {
    return `${start}${SET_TIME_RANGE_JOINER}${finish}`;
  }

  return start || finish;
}

/**
 * Pair saved↔current rows for one booking (by row id, then leftover index) so
 * a multi-set DJ's Set 1 doesn't get compared to Set 2 after a reorder.
 */
function pairRunSheetRowsForBooking(
  savedRows: RunSheetRowInput[],
  currentRows: RunSheetRowInput[],
): Array<{ saved: RunSheetRowInput | null; current: RunSheetRowInput | null }> {
  const pairs: Array<{ saved: RunSheetRowInput | null; current: RunSheetRowInput | null }> = [];
  const unmatchedCurrent = [...currentRows];

  for (const saved of savedRows) {
    const savedId = saved.id?.trim();
    const matchIndex = savedId
      ? unmatchedCurrent.findIndex((row) => row.id?.trim() === savedId)
      : -1;

    if (matchIndex >= 0) {
      pairs.push({ saved, current: unmatchedCurrent[matchIndex] });
      unmatchedCurrent.splice(matchIndex, 1);
    } else {
      pairs.push({ saved, current: null });
    }
  }

  for (const current of unmatchedCurrent) {
    pairs.push({ saved: null, current });
  }

  return pairs;
}

export type RunSheetBookingChange = {
  bookingRequestId: string;
  /** Human-readable "what changed", e.g. "Stage: Back, Notes updated". */
  changeSummary: string;
};

/**
 * Describes one booking's run-sheet diff for the DM notice.
 * Returns null when nothing meaningful changed.
 */
export function describeRunSheetBookingChange(
  savedRows: RunSheetRowInput[],
  currentRows: RunSheetRowInput[],
  bookingRequestId: string,
): string | null {
  const savedForBooking = rowsForBookingRequest(savedRows, bookingRequestId);
  const currentForBooking = rowsForBookingRequest(currentRows, bookingRequestId);

  if (savedForBooking.length === 0 && currentForBooking.length === 0) {
    return null;
  }

  const pairs = pairRunSheetRowsForBooking(savedForBooking, currentForBooking);
  let stageChanged = false;
  let timeChanged = false;
  let notesChanged = false;

  for (const { saved, current } of pairs) {
    if (!saved || !current) {
      stageChanged = true;
      timeChanged = true;
      notesChanged = true;
      continue;
    }

    if ((saved.stage_area ?? "") !== (current.stage_area ?? "")) {
      stageChanged = true;
    }

    if (
      (saved.start_time ?? "") !== (current.start_time ?? "") ||
      (saved.finish_time ?? "") !== (current.finish_time ?? "")
    ) {
      timeChanged = true;
    }

    if ((saved.notes ?? "") !== (current.notes ?? "")) {
      notesChanged = true;
    }
  }

  const orderChanged =
    runSheetBookingOrderFingerprint(savedRows, bookingRequestId) !==
    runSheetBookingOrderFingerprint(currentRows, bookingRequestId);

  const parts: string[] = [];

  if (stageChanged) {
    const stages = currentForBooking.map((row) => row.stage_area.trim()).filter(Boolean);
    parts.push(stages.length > 0 ? `Stage: ${stages.join(" / ")}` : "Stage updated");
  }

  if (timeChanged) {
    const times = currentForBooking
      .map((row) => formatRunSheetSetTimeForDm(row.start_time, row.finish_time))
      .filter(Boolean);
    parts.push(times.length > 0 ? `Set time: ${times.join(" / ")}` : "Set time updated");
  }

  if (notesChanged) {
    parts.push("Notes updated");
  }

  // Order alone must still produce a notice; when content also changed, the
  // field lines above are enough — don't add a redundant "Order updated".
  if (parts.length === 0 && orderChanged) {
    parts.push("Order updated");
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(", ");
}

/** Booking request ids + change copy for DJs who need a DM after Save. */
export function collectRunSheetBookingChanges(
  savedRows: RunSheetRowInput[],
  currentRows: RunSheetRowInput[],
): RunSheetBookingChange[] {
  const ids = new Set<string>();

  for (const row of [...savedRows, ...currentRows]) {
    const id = row.booking_request_id?.trim();
    if (id) {
      ids.add(id);
    }
  }

  const changes: RunSheetBookingChange[] = [];

  for (const bookingRequestId of ids) {
    const changeSummary = describeRunSheetBookingChange(
      savedRows,
      currentRows,
      bookingRequestId,
    );

    if (changeSummary) {
      changes.push({ bookingRequestId, changeSummary });
    }
  }

  return changes;
}

/** @deprecated Prefer `collectRunSheetBookingChanges` — kept for call-site clarity in tests. */
export function collectChangedRunSheetBookingIds(
  savedRows: RunSheetRowInput[],
  currentRows: RunSheetRowInput[],
): string[] {
  return collectRunSheetBookingChanges(savedRows, currentRows).map(
    (change) => change.bookingRequestId,
  );
}

/**
 * After a successful Save: post a system message to crew chat about the runsheet update.
 * Soft-fail — never throws; Save already succeeded.
 */
export async function notifyCrewChatOfRunSheetUpdate(options: {
  eventId: string;
  eventName: string;
  changes: RunSheetBookingChange[];
  lineup?: BookingRequest[];
  profiles?: Map<string, BookingRecipientProfile>;
}): Promise<void> {
  const { eventId, eventName, changes, lineup = [], profiles = new Map() } = options;

  if (changes.length === 0) {
    return;
  }

  try {
    const formattedChanges: RunSheetUpdateChange[] = changes
      .map((change) => {
        const booking = lineup.find((b) => b.id === change.bookingRequestId);
        if (!booking) return null;

        const profile = profiles.get(booking.recipient_id);
        const djName = profile?.display_name?.trim() || "DJ";

        // Split comma-separated changes and format each
        const individualChanges = change.changeSummary
          .split(", ")
          .filter((item) => !item.toLowerCase().includes("notes"))
          .map((item) => {
            // Remove "updated" suffix if present
            return item.replace(/\s+updated$/, "");
          });

        return {
          djName,
          changes: individualChanges,
        };
      })
      .filter((item): item is RunSheetUpdateChange => item !== null);

    if (formattedChanges.length === 0) {
      return;
    }

    const messageText = formatRunSheetUpdateMessage(formattedChanges);

    await sendEventCrewChatMessage(eventId, messageText, eventName, {
      notifyParticipants: true,
    });
  } catch (notifyError) {
    console.warn("[run-sheet] Crew chat notification failed:", notifyError);
  }
}

/**
 * After a successful Save: DM + in-app notification to each DJ whose row
 * changed. Soft-fail — never throws; Save already succeeded.
 *
 * Channel is the booking DM (not crew chat). Notification type is `message`
 * so `create_notification` allows planner → DJ without a booking_update gate.
 */
export async function notifyRunSheetUpdatesForChangedBookings(options: {
  lineup: BookingRequest[];
  changes: RunSheetBookingChange[];
}): Promise<void> {
  const { lineup, changes } = options;

  if (changes.length === 0) {
    return;
  }

  let authorId: string;

  try {
    authorId = await getCurrentUserId();
  } catch (authorError) {
    console.warn("[run-sheet] Could not resolve author for DM notify:", authorError);
    return;
  }

  const authorProfile = await getCurrentUserProfile();
  const authorName = resolveUserDisplayName(authorProfile, { fallback: "Someone" });

  for (const change of changes) {
    const booking = lineup.find((item) => item.id === change.bookingRequestId);

    if (!booking?.conversation_id || booking.status !== "accepted") {
      continue;
    }

    const messageText = formatRunSheetUpdatedDmMessage(
      booking.event_name,
      change.changeSummary,
    );

    try {
      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: booking.conversation_id,
        user_id: authorId,
        text: messageText,
      });

      if (insertError) {
        console.warn("[run-sheet] Failed to insert run-sheet DM:", insertError);
        continue;
      }

      try {
        await createNotification(
          booking.recipient_id,
          "message",
          authorName,
          formatNotificationPreview(messageText),
          `/dm/${booking.conversation_id}`,
        );
      } catch (notificationError) {
        console.warn(
          "[run-sheet] Run-sheet DM inserted but notification failed:",
          getNotificationCreateErrorMessage(notificationError),
        );
      }
    } catch (notifyError) {
      console.warn("[run-sheet] Run-sheet DJ notify failed:", notifyError);
    }
  }
}
