import { supabase } from "@/lib/supabaseClient";
import {
  FTC_STATUS_DANGER,
  FTC_STATUS_MUTED,
  FTC_STATUS_PRIMARY,
  FTC_STATUS_SUCCESS,
  FTC_STATUS_WARNING,
} from "@/lib/ftcFlatStatus";
import { getCurrentUserId } from "@/lib/user/currentUser";

export type DjAvailabilityStatus = "available" | "unavailable" | "tentative";

export type DjAvailabilityEntry = {
  id: string;
  created_at: string;
  user_id: string;
  date: string;
  status: DjAvailabilityStatus;
  notes: string;
};

export type DjPlannerAvailabilityStatus =
  | "already_booked"
  | "available"
  | "unavailable"
  | "tentative"
  | "unknown";

export type DjPlannerAvailabilityHint = {
  status: DjPlannerAvailabilityStatus;
  label: string;
};

const STATUS_LABELS: Record<DjPlannerAvailabilityStatus, string> = {
  already_booked: "Already booked",
  available: "Available",
  unavailable: "Unavailable",
  tentative: "Maybe",
  unknown: "Unknown",
};

export function normalizeAvailabilityDate(value: string): string {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatAvailabilityDateLabel(value: string): string {
  const normalized = normalizeAvailabilityDate(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return value.trim() || "Date TBC";
  }

  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDjAvailabilityStatusLabel(status: DjAvailabilityStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "unavailable":
      return "Unavailable";
    case "tentative":
      return "Maybe";
  }
}

export function getDjPlannerAvailabilityLabel(status: DjPlannerAvailabilityStatus): string {
  return STATUS_LABELS[status];
}

export function getDjPlannerAvailabilityBadgeClass(status: DjPlannerAvailabilityStatus): string {
  switch (status) {
    case "already_booked":
      return FTC_STATUS_SUCCESS;
    case "available":
      return FTC_STATUS_PRIMARY;
    case "unavailable":
      return FTC_STATUS_DANGER;
    case "tentative":
      return FTC_STATUS_WARNING;
    case "unknown":
      return FTC_STATUS_MUTED;
  }
}

export function getDjAvailabilityStatusBadgeClass(status: DjAvailabilityStatus): string {
  switch (status) {
    case "available":
      return FTC_STATUS_PRIMARY;
    case "unavailable":
      return FTC_STATUS_DANGER;
    case "tentative":
      return FTC_STATUS_WARNING;
  }
}

export function getDjAvailabilityLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.code === "42P01" || supabaseError.code === "PGRST205") {
      return "DJ availability table is not set up yet. Run scripts/setupDjAvailability.sql.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load DJ availability";
}

export async function listMyUpcomingAvailability(): Promise<DjAvailabilityEntry[]> {
  const userId = await getCurrentUserId();
  const today = normalizeAvailabilityDate(new Date().toISOString().slice(0, 10));

  const { data, error } = await supabase
    .from("dj_availability")
    .select("id, created_at, user_id, date, status, notes")
    .eq("user_id", userId)
    .gte("date", today)
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DjAvailabilityEntry[];
}

export async function listMyAvailabilityEntries(): Promise<DjAvailabilityEntry[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("dj_availability")
    .select("id, created_at, user_id, date, status, notes")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DjAvailabilityEntry[];
}

export function groupAvailabilityEntriesByDate(
  entries: DjAvailabilityEntry[],
): Map<string, DjAvailabilityEntry> {
  const grouped = new Map<string, DjAvailabilityEntry>();

  for (const entry of entries) {
    grouped.set(normalizeAvailabilityDate(entry.date), entry);
  }

  return grouped;
}

export function getDjBookingStatusBadgeClass(status: "pending" | "accepted"): string {
  if (status === "pending") {
    return FTC_STATUS_WARNING;
  }

  return FTC_STATUS_SUCCESS;
}

export async function saveMyAvailability(input: {
  date: string;
  status: DjAvailabilityStatus;
  notes?: string;
}): Promise<DjAvailabilityEntry> {
  const userId = await getCurrentUserId();
  const date = normalizeAvailabilityDate(input.date);
  const notes = input.notes?.trim() ?? "";

  if (!date) {
    throw new Error("Please choose a date.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("dj_availability")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("dj_availability")
      .update({
        status: input.status,
        notes,
      })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id, created_at, user_id, date, status, notes")
      .single();

    if (error) {
      throw error;
    }

    return data as DjAvailabilityEntry;
  }

  const { data, error } = await supabase
    .from("dj_availability")
    .insert({
      user_id: userId,
      date,
      status: input.status,
      notes,
    })
    .select("id, created_at, user_id, date, status, notes")
    .single();

  if (error) {
    throw error;
  }

  return data as DjAvailabilityEntry;
}

export async function deleteMyAvailability(entryId: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("dj_availability")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function clearMyAvailabilityForDate(date: string): Promise<void> {
  const userId = await getCurrentUserId();
  const normalizedDate = normalizeAvailabilityDate(date);

  const { error } = await supabase
    .from("dj_availability")
    .delete()
    .eq("user_id", userId)
    .eq("date", normalizedDate);

  if (error) {
    throw error;
  }
}

export async function batchSaveMyAvailability(input: {
  dates: string[];
  status: DjAvailabilityStatus;
}): Promise<DjAvailabilityEntry[]> {
  const userId = await getCurrentUserId();
  const dates = [...new Set(input.dates.map(normalizeAvailabilityDate))].filter(Boolean);

  if (dates.length === 0) {
    return [];
  }

  const rows = dates.map((date) => ({
    user_id: userId,
    date,
    status: input.status,
    notes: "",
  }));

  const { data, error } = await supabase
    .from("dj_availability")
    .upsert(rows, { onConflict: "user_id,date" })
    .select("id, created_at, user_id, date, status, notes");

  if (error) {
    throw error;
  }

  return (data ?? []) as DjAvailabilityEntry[];
}

export async function batchClearMyAvailabilityForDates(dates: string[]): Promise<void> {
  const userId = await getCurrentUserId();
  const normalizedDates = [...new Set(dates.map(normalizeAvailabilityDate))].filter(Boolean);

  if (normalizedDates.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("dj_availability")
    .delete()
    .eq("user_id", userId)
    .in("date", normalizedDates);

  if (error) {
    throw error;
  }
}

function buildPlannerAvailabilityHint(
  markedStatus: DjAvailabilityStatus | null,
  alreadyBooked: boolean,
): DjPlannerAvailabilityHint {
  if (alreadyBooked) {
    return { status: "already_booked", label: STATUS_LABELS.already_booked };
  }

  if (markedStatus === "unavailable") {
    return { status: "unavailable", label: STATUS_LABELS.unavailable };
  }

  if (markedStatus === "tentative") {
    return { status: "tentative", label: STATUS_LABELS.tentative };
  }

  if (markedStatus === "available") {
    return { status: "available", label: STATUS_LABELS.available };
  }

  return { status: "unknown", label: STATUS_LABELS.unknown };
}

export async function getPlannerDjAvailabilityHints(
  djUserIds: string[],
  eventDate: string,
): Promise<Map<string, DjPlannerAvailabilityHint>> {
  const hints = new Map<string, DjPlannerAvailabilityHint>();

  if (djUserIds.length === 0) {
    return hints;
  }

  const normalizedDate = normalizeAvailabilityDate(eventDate);

  if (!normalizedDate) {
    for (const djUserId of djUserIds) {
      hints.set(djUserId, buildPlannerAvailabilityHint(null, false));
    }

    return hints;
  }

  const uniqueDjUserIds = [...new Set(djUserIds)];

  const [{ data: availabilityRows, error: availabilityError }, { data: bookedRows, error: bookedError }] =
    await Promise.all([
      supabase
        .from("dj_availability")
        .select("user_id, status")
        .in("user_id", uniqueDjUserIds)
        .eq("date", normalizedDate),
      supabase
        .from("booking_requests")
        .select("recipient_id")
        .in("recipient_id", uniqueDjUserIds)
        .eq("event_date", normalizedDate)
        .eq("status", "accepted"),
    ]);

  if (availabilityError) {
    throw availabilityError;
  }

  if (bookedError) {
    throw bookedError;
  }

  const markedByUserId = new Map<string, DjAvailabilityStatus>();

  for (const row of availabilityRows ?? []) {
    markedByUserId.set(row.user_id as string, row.status as DjAvailabilityStatus);
  }

  const bookedUserIds = new Set(
    (bookedRows ?? []).map((row) => row.recipient_id as string),
  );

  for (const djUserId of uniqueDjUserIds) {
    hints.set(
      djUserId,
      buildPlannerAvailabilityHint(
        markedByUserId.get(djUserId) ?? null,
        bookedUserIds.has(djUserId),
      ),
    );
  }

  return hints;
}

export type UnavailableDjBookingWarning = {
  userId: string;
  displayName: string;
};

export function getUnavailableDjBookingWarnings(
  selectedDjIds: string[],
  djProfiles: ReadonlyArray<{ user_id: string; display_name?: string | null }>,
  availabilityHints: ReadonlyMap<string, DjPlannerAvailabilityHint>,
): UnavailableDjBookingWarning[] {
  return selectedDjIds
    .filter((userId) => availabilityHints.get(userId)?.status === "unavailable")
    .map((userId) => {
      const profile = djProfiles.find((dj) => dj.user_id === userId);

      return {
        userId,
        displayName: profile?.display_name?.trim() || "DJ",
      };
    });
}
