// Crew Chat's half of the shared attachment pipeline in lib/dmAttachments.ts.
// Reuses that file's bucket, file validation, mime/extension resolution and
// `DmMessageAttachment` row type rather than duplicating them -- only the
// parts that are genuinely event-shaped (storage path, which column gets the
// scope id, and the crew-chat-specific send guards already enforced by
// `sendEventCrewChatMessage`) are new.
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId, getCurrentUserProfile } from "@/lib/user/currentUser";
import { createNotification, formatNotificationPreview } from "@/lib/notifications";
import { markEventChatRead } from "@/lib/messageReads";
import { getEventById, isEventCancelled } from "@/lib/events";
import { getCrewChatUnlockStateForEvent } from "@/lib/events/crewChatUnlock";
import { getEventCrewChatLink, getEventCrewParticipantIds } from "@/lib/eventCrewChat";
import {
  DM_ATTACHMENTS_BUCKET,
  DM_MAX_PHOTOS_PER_MESSAGE,
  getDmAttachmentMaxBytes,
  validateDmAttachmentFile,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";

const ATTACHMENT_SELECT =
  "id, message_id, conversation_id, event_id, uploader_id, file_url, file_name, file_type, file_size, created_at";

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

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";

  return "bin";
}

async function uploadEventCrewChatAttachmentFile(
  eventId: string,
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
  // Same {scope}/{user}/{timestamp}-{name}.{ext} shape as DM uploads, keyed
  // by event id instead of conversation id -- the two can never collide,
  // since conversation ids and event ids are UUIDs from disjoint tables.
  const path = `${eventId}/${userId}/${timestamp}-${safeName}.${extension}`;

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

  // Same reasoning as the DM upload: a stable identifier in the existing
  // format, never a URL to render. See lib/attachmentUrls.ts.
  const { data } = supabase.storage.from(DM_ATTACHMENTS_BUCKET).getPublicUrl(path);

  return {
    fileUrl: data.publicUrl,
    fileName: file.name.trim() || `${safeName}.${extension}`,
    fileType: mimeType,
    fileSize: file.size,
    path,
  };
}

async function cleanupOrphanedEventCrewChatAttachmentFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  try {
    const { error } = await supabase.storage.from(DM_ATTACHMENTS_BUCKET).remove(paths);

    if (error) {
      console.error("Failed to clean up orphaned Crew Chat attachment files:", error);
    }
  } catch (cleanupError) {
    console.error("Failed to clean up orphaned Crew Chat attachment files:", cleanupError);
  }
}

export async function listEventCrewChatAttachmentsForEvent(
  eventId: string,
): Promise<DmMessageAttachment[]> {
  const { data, error } = await supabase
    .from("message_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DmMessageAttachment[];
}

/**
 * Sends one or more photos as a single grouped Crew Chat message, mirroring
 * `sendDmMessageWithAttachments`' upload-all-then-insert-then-cleanup-on-
 * failure shape, but gated by the same guards `sendEventCrewChatMessage`
 * already enforces for text (cancelled event, crew chat not yet unlocked) --
 * an attachment message must not be able to bypass those checks. Also
 * mirrors that function's read-receipt and notification side effects, so a
 * photo notifies and marks-read exactly like a text message does.
 */
export async function sendEventCrewChatMessageWithAttachments(input: {
  eventId: string;
  eventName: string;
  text?: string;
  files: File[];
  notifyParticipants?: boolean;
}): Promise<{ messageId: string; attachments: DmMessageAttachment[] }> {
  const files = input.files;

  if (files.length === 0) {
    throw new Error("No photos to send");
  }

  if (files.length > DM_MAX_PHOTOS_PER_MESSAGE) {
    throw new Error(`You can send up to ${DM_MAX_PHOTOS_PER_MESSAGE} photos at once`);
  }

  const event = await getEventById(input.eventId);

  if (!event || isEventCancelled(event)) {
    throw new Error("This event was cancelled. Group chat is no longer available.");
  }

  const unlock = await getCrewChatUnlockStateForEvent(event);

  if (!unlock.isUnlocked) {
    throw new Error("Crew chat is not available for this event yet");
  }

  const userId = await getCurrentUserId();
  const text = input.text?.trim() ?? "";

  const uploadOutcomes = await Promise.allSettled(
    files.map((file) => uploadEventCrewChatAttachmentFile(input.eventId, file)),
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
    await cleanupOrphanedEventCrewChatAttachmentFiles(uploaded.map((item) => item.path));
    throw firstUploadError instanceof Error
      ? firstUploadError
      : new Error("Failed to upload one or more photos");
  }

  const { data: messageRow, error: messageError } = await supabase
    .from("messages")
    .insert({
      event_id: input.eventId,
      user_id: userId,
      text,
    })
    .select("id")
    .single();

  if (messageError || !messageRow) {
    await cleanupOrphanedEventCrewChatAttachmentFiles(uploaded.map((item) => item.path));
    throw messageError ?? new Error("Failed to create message");
  }

  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("message_attachments")
    .insert(
      uploaded.map((item) => ({
        message_id: messageRow.id,
        event_id: input.eventId,
        uploader_id: userId,
        file_url: item.fileUrl,
        file_name: item.fileName,
        file_type: item.fileType,
        file_size: item.fileSize,
      })),
    )
    .select(ATTACHMENT_SELECT);

  if (attachmentError || !attachmentRows || attachmentRows.length !== uploaded.length) {
    // Same reasoning as the DM path: the message row can't be rolled back
    // (no delete grant), but an empty-caption, attachment-only message with
    // no attachment rows renders as nothing, so it never surfaces -- the
    // uploaded files are the only thing that needs cleaning up.
    await cleanupOrphanedEventCrewChatAttachmentFiles(uploaded.map((item) => item.path));
    throw attachmentError ?? new Error("Failed to save attachments");
  }

  await markEventChatRead(input.eventId);

  if (input.notifyParticipants !== false) {
    try {
      const participants = await getEventCrewParticipantIds(input.eventId);
      const senderProfile = await getCurrentUserProfile();
      const senderName = senderProfile?.display_name?.trim() || "Group member";
      const genericPhotoPreview =
        uploaded.length > 1 ? `Sent ${uploaded.length} photos` : "Sent a photo";
      // A caption alongside the photo(s) is more useful than generic "Sent a
      // photo" copy — prefer it, same as the DM attachment push already does.
      const preview = formatNotificationPreview(text || genericPhotoPreview);
      const link = getEventCrewChatLink(input.eventId);
      const title = `${senderName} · ${input.eventName}`;

      await Promise.all(
        participants
          .filter((participantId) => participantId !== userId)
          .map(async (participantId) => {
            try {
              await createNotification(
                participantId,
                "message",
                title,
                preview,
                link,
              );
            } catch (notificationError) {
              console.error(
                "[groupChatAttachments] Photo message posted but notification failed:",
                participantId,
                notificationError,
              );
            }
          }),
      );
    } catch (participantError) {
      console.error(
        "[groupChatAttachments] Failed to load crew participants for notifications:",
        participantError,
      );
    }
  }

  return {
    messageId: messageRow.id as string,
    attachments: attachmentRows as DmMessageAttachment[],
  };
}
