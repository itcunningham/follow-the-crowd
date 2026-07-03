import { supabase } from "@/lib/supabaseClient";
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
};

export type RunSheetRowInput = {
  id?: string;
  sort_order: number;
  artist_name: string;
  start_time: string;
  finish_time: string;
  stage_area: string;
  notes: string;
};

export type RunSheetSavePayload = {
  rows: RunSheetRowInput[];
  deletedRowIds: string[];
};

export type EventRunSheetData = {
  rows: RunSheetRow[];
};

const ROW_FIELDS =
  "id, created_at, event_id, owner_id, sort_order, artist_name, start_time, finish_time, stage_area, notes";

const RUN_SHEET_ROW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedRunSheetRowId(id: string | undefined): id is string {
  return Boolean(id && RUN_SHEET_ROW_UUID_RE.test(id));
}

function filterPersistedRowIds(ids: string[]): string[] {
  return ids.filter(isPersistedRunSheetRowId);
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

    if (isPersistedRunSheetRowId(row.id)) {
      const { error } = await supabase
        .from("event_run_sheet_rows")
        .update(rowFields)
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
      ...rowFields,
      custom_data: {},
    });

    if (error) {
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

export function createEmptyRunSheetRow(sortOrder: number, artistName = ""): RunSheetRowInput {
  return {
    id: createTempRunSheetId(),
    sort_order: sortOrder,
    artist_name: artistName,
    start_time: "",
    finish_time: "",
    stage_area: "",
    notes: "",
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
