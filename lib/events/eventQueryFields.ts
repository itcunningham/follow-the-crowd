const CREW_CHAT_STARTED_AT_FIELD = "crew_chat_started_at";
const HISTORY_HIDDEN_AT_FIELD = "history_hidden_at";

export const EVENT_CORE_FIELDS =
  "id, created_at, owner_id, booking_plan_id, name, venue, event_date, set_time, rate, notes, status, cover_image_url, fallback_colour";

export const EVENT_BASE_FIELDS = `${EVENT_CORE_FIELDS}, ${HISTORY_HIDDEN_AT_FIELD}`;

export const EVENT_FIELDS_WITH_CREW_CHAT = `${EVENT_BASE_FIELDS}, ${CREW_CHAT_STARTED_AT_FIELD}`;

export const EVENT_ARTWORK_BASE_FIELDS =
  "id, name, venue, event_date, set_time, rate, cover_image_url, fallback_colour, status";

export const EVENT_ARTWORK_FIELDS_WITH_CREW_CHAT = `${EVENT_ARTWORK_BASE_FIELDS}, ${CREW_CHAT_STARTED_AT_FIELD}`;

export const EVENT_UNLOCK_FIELDS = `id, status, ${CREW_CHAT_STARTED_AT_FIELD}`;

export const EVENT_UNLOCK_BASE_FIELDS = "id, status";

let crewChatStartedAtColumnMissing = false;
let historyHiddenAtColumnMissing = false;

export function isMissingCrewChatStartedAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as { code?: string; message?: string };

  return (
    supabaseError.code === "42703" &&
    String(supabaseError.message ?? "").includes(CREW_CHAT_STARTED_AT_FIELD)
  );
}

export function isMissingHistoryHiddenAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as { code?: string; message?: string };

  return (
    supabaseError.code === "42703" &&
    String(supabaseError.message ?? "").includes(HISTORY_HIDDEN_AT_FIELD)
  );
}

export function markCrewChatStartedAtColumnMissing(): void {
  crewChatStartedAtColumnMissing = true;
}

export function markHistoryHiddenAtColumnMissing(): void {
  historyHiddenAtColumnMissing = true;
}

export function resetCrewChatStartedAtColumnMissingFlag(): void {
  crewChatStartedAtColumnMissing = false;
}

export function resetHistoryHiddenAtColumnMissingFlag(): void {
  historyHiddenAtColumnMissing = false;
}

export function isCrewChatStartedAtColumnMissing(): boolean {
  return crewChatStartedAtColumnMissing;
}

export function isHistoryHiddenAtColumnMissing(): boolean {
  return historyHiddenAtColumnMissing;
}

export function isEventHistoryHideAvailable(): boolean {
  return !historyHiddenAtColumnMissing;
}

function buildEventSelectFields(includeHistoryHidden: boolean, includeCrewChat: boolean): string {
  const fields = [EVENT_CORE_FIELDS];

  if (includeHistoryHidden) {
    fields.push(HISTORY_HIDDEN_AT_FIELD);
  }

  if (includeCrewChat) {
    fields.push(CREW_CHAT_STARTED_AT_FIELD);
  }

  return fields.join(", ");
}

export function selectEventFields(): string {
  return buildEventSelectFields(
    !historyHiddenAtColumnMissing,
    !crewChatStartedAtColumnMissing,
  );
}

export function selectEventArtworkFields(): string {
  return crewChatStartedAtColumnMissing
    ? EVENT_ARTWORK_BASE_FIELDS
    : EVENT_ARTWORK_FIELDS_WITH_CREW_CHAT;
}

export function selectEventUnlockFields(): string {
  return crewChatStartedAtColumnMissing
    ? EVENT_UNLOCK_BASE_FIELDS
    : EVENT_UNLOCK_FIELDS;
}

function normalizeCrewChatStartedAtValue(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function normalizeEventRow(row: Record<string, unknown>): Record<string, unknown> & {
  crew_chat_started_at: string | null;
  history_hidden_at: string | null;
} {
  const historyHiddenAt = row.history_hidden_at;

  return {
    ...row,
    crew_chat_started_at: normalizeCrewChatStartedAtValue(
      row.crew_chat_started_at as string | null | undefined,
    ),
    history_hidden_at:
      typeof historyHiddenAt === "string" && historyHiddenAt.trim()
        ? historyHiddenAt
        : null,
  };
}

export function normalizeEventRows(
  rows: Record<string, unknown>[],
): Array<Record<string, unknown> & { crew_chat_started_at: string | null; history_hidden_at: string | null }> {
  return rows.map((row) => normalizeEventRow(row));
}

type PostgrestError = { code?: string; message?: string } | null;

type PostgrestResult<T> = {
  data: T;
  error: PostgrestError;
};

function markMissingOptionalEventColumn(error: PostgrestError): boolean {
  if (isMissingHistoryHiddenAtColumnError(error)) {
    markHistoryHiddenAtColumnMissing();
    return true;
  }

  if (isMissingCrewChatStartedAtColumnError(error)) {
    markCrewChatStartedAtColumnMissing();
    return true;
  }

  return false;
}

export async function withEventFieldsFallback<T>(
  query: (fields: string) => PromiseLike<PostgrestResult<T>>,
): Promise<T> {
  let result = await query(selectEventFields());

  while (result.error && markMissingOptionalEventColumn(result.error)) {
    result = await query(selectEventFields());
  }

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

export async function withEventArtworkFieldsFallback<T>(
  query: (fields: string) => PromiseLike<PostgrestResult<T>>,
): Promise<T> {
  const first = await query(selectEventArtworkFields());

  if (!first.error) {
    return first.data;
  }

  if (isMissingCrewChatStartedAtColumnError(first.error)) {
    markCrewChatStartedAtColumnMissing();
    const second = await query(selectEventArtworkFields());

    if (second.error) {
      throw second.error;
    }

    return second.data;
  }

  throw first.error;
}

export async function withEventUnlockFieldsFallback<T>(
  query: (fields: string) => PromiseLike<PostgrestResult<T>>,
): Promise<T> {
  const first = await query(selectEventUnlockFields());

  if (!first.error) {
    return first.data;
  }

  if (isMissingCrewChatStartedAtColumnError(first.error)) {
    markCrewChatStartedAtColumnMissing();
    const second = await query(selectEventUnlockFields());

    if (second.error) {
      throw second.error;
    }

    return second.data;
  }

  throw first.error;
}
