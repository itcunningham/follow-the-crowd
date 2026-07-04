import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export const DM_REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "scam_fraud", label: "Scam/fraud" },
  { value: "other", label: "Other" },
] as const;

export type DmReportReason = (typeof DM_REPORT_REASONS)[number]["value"];

export type DmReportType = "user" | "message";

const MAX_REPORT_NOTE_LENGTH = 500;

function normalizeReportNote(note?: string): string | null {
  const trimmed = note?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_REPORT_NOTE_LENGTH);
}

function getDuplicateReportMessage(reportType: DmReportType): string {
  return reportType === "message"
    ? "You already reported this message."
    : "You already submitted an open report for this user in this conversation.";
}

function getReportErrorMessage(error: unknown, reportType: DmReportType): string {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return getDuplicateReportMessage(reportType);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Failed to submit report. Please try again.";
}

export async function submitDmUserReport(input: {
  conversationId: string;
  reportedUserId: string;
  reason: DmReportReason;
  note?: string;
}): Promise<void> {
  const reporterId = await getCurrentUserId();

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: reporterId,
    reported_user_id: input.reportedUserId,
    conversation_id: input.conversationId,
    message_id: null,
    report_type: "user",
    reason: input.reason,
    note: normalizeReportNote(input.note),
    status: "open",
  });

  if (error) {
    throw new Error(getReportErrorMessage(error, "user"));
  }
}

export async function submitDmMessageReport(input: {
  conversationId: string;
  messageId: string;
  reportedUserId: string;
  reason: DmReportReason;
  note?: string;
}): Promise<void> {
  const reporterId = await getCurrentUserId();

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: reporterId,
    reported_user_id: input.reportedUserId,
    conversation_id: input.conversationId,
    message_id: input.messageId,
    report_type: "message",
    reason: input.reason,
    note: normalizeReportNote(input.note),
    status: "open",
  });

  if (error) {
    throw new Error(getReportErrorMessage(error, "message"));
  }
}
