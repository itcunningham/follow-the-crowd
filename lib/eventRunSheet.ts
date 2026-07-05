import type { BookingRequest } from "@/lib/bookingRequests";
import { supabase } from "@/lib/supabaseClient";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";
import { getCurrentUserId } from "@/lib/user/currentUser";

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

export async function ensureRunSheetRowsForAcceptedBookings(
  eventId: string,
  lineup: BookingRequest[],
  profiles: Map<string, BookingRecipientProfile>,
): Promise<EventRunSheetData> {
  const existing = await loadEventRunSheet(eventId);
  const existingInputs = mapRunSheetRowsFromDb(existing.rows);
  const { rows: mergedRows, addedCount } = mergeAcceptedDjsIntoRunSheetRows(
    existingInputs,
    lineup,
    profiles,
  );

  if (addedCount === 0) {
    return existing;
  }

  const ownerId = await getCurrentUserId();
  const newRows = mergedRows.filter((row) => !isPersistedRunSheetRowId(row.id));

  for (const row of newRows) {
    if (!row.booking_request_id || !row.booking_recipient_id) {
      continue;
    }

    const alreadyExists = await runSheetRowExistsForBooking(
      eventId,
      row.booking_request_id,
      row.booking_recipient_id,
    );

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

      throw error;
    }
  }

  return loadEventRunSheet(eventId);
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
