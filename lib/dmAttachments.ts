import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export const DM_ATTACHMENTS_BUCKET = "dm-attachments";

export const DM_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const DM_FILE_TYPES = new Set([
  ...DM_IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
]);

export const DM_SUPPORTED_FILE_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".csv",
  ".zip",
  ".mp3",
  ".wav",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const DM_PHOTO_INPUT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

export const DM_FILE_INPUT_ACCEPT = [
  ...DM_SUPPORTED_FILE_EXTENSIONS,
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "image/jpeg",
  "image/png",
  "image/webp",
].join(",");

export const DM_UNSUPPORTED_FILE_TYPE_MESSAGE =
  "This file type isn't supported. You can send PDF, TXT, DOC, DOCX, CSV, ZIP, MP3, WAV, JPG, PNG, or WEBP.";

export const DM_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DM_MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * One row in `message_attachments`. Despite the name (kept to avoid a
 * rename ripple through every existing DM import), this now also covers
 * Crew Chat attachments: exactly one of `conversation_id`/`event_id` is set
 * per row (enforced by a DB check constraint,
 * `message_attachments_scope_check`), never both, never neither. Every
 * rendering component that consumes this type (`DmMessageAttachment.tsx`,
 * `DmMessageAttachmentGroup.tsx`, the lightbox, the gallery overview) only
 * ever reads the file/id fields, never `conversation_id` or `event_id`, so
 * they're reused as-is for Crew Chat rather than forked.
 */
export type DmMessageAttachment = {
  id: string;
  message_id: string;
  conversation_id: string | null;
  event_id: string | null;
  uploader_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
};

const ATTACHMENT_SELECT =
  "id, message_id, conversation_id, event_id, uploader_id, file_url, file_name, file_type, file_size, created_at";

export function isDmImageAttachment(fileType: string): boolean {
  return fileType.startsWith("image/");
}

export function isAllowedDmAttachmentType(fileType: string): boolean {
  return DM_FILE_TYPES.has(fileType);
}

function getFileExtension(fileName: string): string | null {
  const parts = fileName.toLowerCase().split(".");

  if (parts.length < 2) {
    return null;
  }

  return `.${parts.pop()}`;
}

const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".csv": "text/csv",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function resolveDmAttachmentMimeType(file: File): string | null {
  const normalizedType = file.type.trim().toLowerCase();

  if (normalizedType && isAllowedDmAttachmentType(normalizedType)) {
    return normalizedType;
  }

  const extension = getFileExtension(file.name);

  if (!extension) {
    return null;
  }

  return EXTENSION_TO_MIME[extension] ?? null;
}

export function validateDmAttachmentFile(
  file: File,
): { ok: true; mimeType: string } | { ok: false; error: string } {
  const mimeType = resolveDmAttachmentMimeType(file);

  if (!mimeType) {
    return { ok: false, error: DM_UNSUPPORTED_FILE_TYPE_MESSAGE };
  }

  const maxBytes = getDmAttachmentMaxBytes(mimeType);

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File is too large (max ${formatDmAttachmentSize(maxBytes)})`,
    };
  }

  return { ok: true, mimeType };
}

export function getDmAttachmentMaxBytes(fileType: string): number {
  return isDmImageAttachment(fileType) ? DM_MAX_IMAGE_BYTES : DM_MAX_FILE_BYTES;
}

export function formatDmAttachmentSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim() || "attachment";

  return trimmed
    .replace(/[^\w.\-() ]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getExtensionForFile(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;

  if (fromName && fromName.length <= 8) {
    return fromName;
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  if (file.type === "application/pdf") {
    return "pdf";
  }

  if (file.type === "text/csv" || file.type === "application/csv") {
    return "csv";
  }

  if (file.type === "audio/mpeg" || file.type === "audio/mp3") {
    return "mp3";
  }

  if (file.type === "audio/wav" || file.type === "audio/x-wav" || file.type === "audio/wave") {
    return "wav";
  }

  return "bin";
}

export async function uploadDmAttachmentFile(
  conversationId: string,
  file: File,
): Promise<{ fileUrl: string; fileName: string; fileType: string; fileSize: number; path: string }> {
  const validation = validateDmAttachmentFile(file);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const mimeType = validation.mimeType;
  const maxBytes = getDmAttachmentMaxBytes(mimeType);

  const userId = await getCurrentUserId();
  const timestamp = Date.now();
  const extension = getExtensionForFile(file);
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "") || "attachment");
  const path = `${conversationId}/${userId}/${timestamp}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(DM_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(DM_ATTACHMENTS_BUCKET).getPublicUrl(path);

  return {
    fileUrl: data.publicUrl,
    fileName: file.name.trim() || `${safeName}.${extension}`,
    fileType: mimeType,
    fileSize: file.size,
    path,
  };
}

async function cleanupOrphanedDmAttachmentFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  try {
    const { error } = await supabase.storage.from(DM_ATTACHMENTS_BUCKET).remove(paths);

    if (error) {
      console.error("Failed to clean up orphaned DM attachment files:", error);
    }
  } catch (cleanupError) {
    console.error("Failed to clean up orphaned DM attachment files:", cleanupError);
  }
}

export async function listDmAttachmentsForConversation(
  conversationId: string,
): Promise<DmMessageAttachment[]> {
  const { data, error } = await supabase
    .from("message_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DmMessageAttachment[];
}

export function groupDmAttachmentsByMessageId(
  attachments: ReadonlyArray<DmMessageAttachment>,
): Map<string, DmMessageAttachment[]> {
  const grouped = new Map<string, DmMessageAttachment[]>();

  for (const attachment of attachments) {
    const existing = grouped.get(attachment.message_id) ?? [];
    existing.push(attachment);
    grouped.set(attachment.message_id, existing);
  }

  return grouped;
}

export function getDmAttachmentNotificationBody(
  attachment: Pick<DmMessageAttachment, "file_type">,
  count = 1,
): string {
  if (!isDmImageAttachment(attachment.file_type)) {
    return "Sent an attachment";
  }

  return count > 1 ? `Sent ${count} photos` : "Sent a photo";
}

// An image-only (or file-only) message has an empty `messages.text`, so the
// inbox preview pipeline (which reads `message.text`) has nothing to show
// and falls through to "No messages yet". Rather than teach every inbox
// preview consumer about attachments, encode a synthetic token into the
// message's text the same way DM reaction activity already does
// (see lib/dm/dmReactionInbox.ts), so it flows through the existing
// latestPreview/sorting/unread pipeline unchanged.
export const DM_ATTACHMENT_INBOX_PREVIEW_PREFIX = "__ftc_dm_attachment__:";

export type DmAttachmentPreviewKind = "image" | "file";

/** Maximum number of photos that can be sent in a single grouped DM message. */
export const DM_MAX_PHOTOS_PER_MESSAGE = 10;

export function resolveDmAttachmentPreviewKind(fileType: string): DmAttachmentPreviewKind {
  return isDmImageAttachment(fileType) ? "image" : "file";
}

// A trailing `:<count>` segment is only appended for groups of 2+ so the
// common single-attachment token (and any already-stored single-attachment
// text) is untouched.
export function encodeDmAttachmentInboxPreview(
  kind: DmAttachmentPreviewKind,
  count = 1,
): string {
  const safeCount = Number.isFinite(count) && count > 1 ? Math.trunc(count) : 1;

  return safeCount > 1
    ? `${DM_ATTACHMENT_INBOX_PREVIEW_PREFIX}${kind}:${safeCount}`
    : `${DM_ATTACHMENT_INBOX_PREVIEW_PREFIX}${kind}`;
}

export function parseDmAttachmentInboxPreview(
  value: string | null | undefined,
): { kind: DmAttachmentPreviewKind; count: number } | null {
  if (!value || !value.startsWith(DM_ATTACHMENT_INBOX_PREVIEW_PREFIX)) {
    return null;
  }

  const encoded = value.slice(DM_ATTACHMENT_INBOX_PREVIEW_PREFIX.length);
  const [kindPart, countPart] = encoded.split(":");

  if (kindPart !== "image" && kindPart !== "file") {
    return null;
  }

  if (countPart === undefined) {
    return { kind: kindPart, count: 1 };
  }

  const parsedCount = Number.parseInt(countPart, 10);
  const count = Number.isFinite(parsedCount) && parsedCount > 1 ? parsedCount : 1;

  return { kind: kindPart, count };
}

export function isDmAttachmentInboxPreview(value: string | null | undefined): boolean {
  return parseDmAttachmentInboxPreview(value) !== null;
}

export function buildDmAttachmentInboxPreviewText(
  kind: DmAttachmentPreviewKind,
  count = 1,
): string {
  if (kind === "image") {
    return count > 1 ? "📷 Photos" : "📷 Photo";
  }

  return "📎 File";
}

export async function sendDmMessageWithAttachment(input: {
  conversationId: string;
  text?: string;
  file: File;
}): Promise<{ messageId: string; attachment: DmMessageAttachment }> {
  const result = await sendDmMessageWithAttachments({
    conversationId: input.conversationId,
    text: input.text,
    files: [input.file],
  });

  return { messageId: result.messageId, attachment: result.attachments[0] };
}

/**
 * Sends one or more photos as a single grouped message: one `messages` row
 * (carrying the optional caption) plus one `message_attachments` row per
 * file, all pointing at that same message id. This is the same
 * one-message/many-attachments shape the schema already supported for
 * single-photo sends (`message_attachments.message_id` has no uniqueness
 * constraint) — sending N photos just inserts N attachment rows instead of 1.
 *
 * Failure handling: every file is uploaded to storage first, and the
 * `messages`/`message_attachments` rows are only written once *all* uploads
 * succeed, so a mid-batch failure never leaves a half-populated message
 * visible to either party. If any upload fails, or either DB write fails,
 * whatever was already uploaded to storage for this attempt is deleted
 * before the error is thrown, so retrying never creates duplicate files or
 * duplicate attachment rows.
 */
export async function sendDmMessageWithAttachments(input: {
  conversationId: string;
  text?: string;
  files: File[];
}): Promise<{ messageId: string; attachments: DmMessageAttachment[] }> {
  const files = input.files;

  if (files.length === 0) {
    throw new Error("No photos to send");
  }

  if (files.length > DM_MAX_PHOTOS_PER_MESSAGE) {
    throw new Error(`You can send up to ${DM_MAX_PHOTOS_PER_MESSAGE} photos at once`);
  }

  const userId = await getCurrentUserId();
  const text = input.text?.trim() ?? "";

  const uploadOutcomes = await Promise.allSettled(
    files.map((file) => uploadDmAttachmentFile(input.conversationId, file)),
  );

  const uploaded: Array<{
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    path: string;
  }> = [];
  let firstUploadError: unknown = null;

  for (const outcome of uploadOutcomes) {
    if (outcome.status === "fulfilled") {
      uploaded.push(outcome.value);
    } else if (!firstUploadError) {
      firstUploadError = outcome.reason;
    }
  }

  if (firstUploadError) {
    await cleanupOrphanedDmAttachmentFiles(uploaded.map((item) => item.path));
    throw firstUploadError instanceof Error
      ? firstUploadError
      : new Error("Failed to upload one or more photos");
  }

  const { data: messageRow, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      user_id: userId,
      text,
    })
    .select("id")
    .single();

  if (messageError || !messageRow) {
    await cleanupOrphanedDmAttachmentFiles(uploaded.map((item) => item.path));
    throw messageError ?? new Error("Failed to create message");
  }

  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("message_attachments")
    .insert(
      uploaded.map((item) => ({
        message_id: messageRow.id,
        conversation_id: input.conversationId,
        uploader_id: userId,
        file_url: item.fileUrl,
        file_name: item.fileName,
        file_type: item.fileType,
        file_size: item.fileSize,
      })),
    )
    .select(ATTACHMENT_SELECT);

  if (attachmentError || !attachmentRows || attachmentRows.length !== uploaded.length) {
    // The message row itself can't be rolled back (no delete grant on
    // `messages`), but with an empty caption it renders as nothing (see
    // DmTextMessageBubble's `!hasText && !hasAttachments` guard) and the
    // inbox preview pipeline leaves it as empty text, so it never surfaces
    // to either user. The uploaded files are now unreferenced, so it's safe
    // — and required — to clean them up.
    await cleanupOrphanedDmAttachmentFiles(uploaded.map((item) => item.path));
    throw attachmentError ?? new Error("Failed to save attachments");
  }

  return {
    messageId: messageRow.id as string,
    attachments: attachmentRows as DmMessageAttachment[],
  };
}
