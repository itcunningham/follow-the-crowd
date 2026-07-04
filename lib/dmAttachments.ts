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
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const DM_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DM_MAX_FILE_BYTES = 25 * 1024 * 1024;

export type DmMessageAttachment = {
  id: string;
  message_id: string;
  conversation_id: string;
  uploader_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
};

const ATTACHMENT_SELECT =
  "id, message_id, conversation_id, uploader_id, file_url, file_name, file_type, file_size, created_at";

export function isDmImageAttachment(fileType: string): boolean {
  return fileType.startsWith("image/");
}

export function isAllowedDmAttachmentType(fileType: string): boolean {
  return DM_FILE_TYPES.has(fileType);
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

  return "bin";
}

export async function uploadDmAttachmentFile(
  conversationId: string,
  file: File,
): Promise<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }> {
  if (!isAllowedDmAttachmentType(file.type)) {
    throw new Error("Unsupported file type");
  }

  const maxBytes = getDmAttachmentMaxBytes(file.type);

  if (file.size > maxBytes) {
    throw new Error(`File is too large (max ${formatDmAttachmentSize(maxBytes)})`);
  }

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
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(DM_ATTACHMENTS_BUCKET).getPublicUrl(path);

  return {
    fileUrl: data.publicUrl,
    fileName: file.name.trim() || `${safeName}.${extension}`,
    fileType: file.type,
    fileSize: file.size,
  };
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
): string {
  return isDmImageAttachment(attachment.file_type) ? "Sent a photo" : "Sent an attachment";
}

export async function sendDmMessageWithAttachment(input: {
  conversationId: string;
  text?: string;
  file: File;
}): Promise<{ messageId: string; attachment: DmMessageAttachment }> {
  const userId = await getCurrentUserId();
  const text = input.text?.trim() ?? "";
  const uploaded = await uploadDmAttachmentFile(input.conversationId, input.file);

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
    throw messageError ?? new Error("Failed to create message");
  }

  const { data: attachmentRow, error: attachmentError } = await supabase
    .from("message_attachments")
    .insert({
      message_id: messageRow.id,
      conversation_id: input.conversationId,
      uploader_id: userId,
      file_url: uploaded.fileUrl,
      file_name: uploaded.fileName,
      file_type: uploaded.fileType,
      file_size: uploaded.fileSize,
    })
    .select(ATTACHMENT_SELECT)
    .single();

  if (attachmentError || !attachmentRow) {
    throw attachmentError ?? new Error("Failed to save attachment");
  }

  return {
    messageId: messageRow.id as string,
    attachment: attachmentRow as DmMessageAttachment,
  };
}
