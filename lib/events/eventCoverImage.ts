import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export const EVENT_COVERS_BUCKET = "event-covers";
export const MAX_EVENT_COVER_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedEventCoverImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type);
}

export function getEventCoverImageAlt(eventName: string): string {
  const trimmed = eventName.trim();
  return trimmed ? `${trimmed} cover image` : "Event cover image";
}

export function validateEventCoverFile(file: File): string | null {
  if (!isAllowedEventCoverImageType(file.type)) {
    return "Cover image must be JPEG, PNG, or WebP.";
  }

  if (file.size > MAX_EVENT_COVER_BYTES) {
    return "Cover image must be 5 MB or smaller.";
  }

  return null;
}

function getExtensionForMimeType(type: string): string {
  if (type === "image/jpeg") {
    return "jpg";
  }

  if (type === "image/png") {
    return "png";
  }

  if (type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function sanitizeFileName(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const sanitized = withoutExtension
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return sanitized || "cover";
}

export function buildEventCoverStoragePath(
  ownerId: string,
  eventId: string,
  file: File,
): string {
  const timestamp = Date.now();
  const extension = getExtensionForMimeType(file.type);
  const sanitized = sanitizeFileName(file.name);

  return `${ownerId}/${eventId}/${timestamp}-${sanitized}.${extension}`;
}

export function getEventCoverPathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${EVENT_COVERS_BUCKET}/`;
    const index = url.pathname.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export function getEventCoverUploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string };

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return "Cover image upload failed.";
}

export async function uploadEventCoverImage(eventId: string, file: File): Promise<string> {
  const validationError = validateEventCoverFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const ownerId = await getCurrentUserId();
  const path = buildEventCoverStoragePath(ownerId, eventId, file);

  const { error: uploadError } = await supabase.storage
    .from(EVENT_COVERS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteEventCoverStorageObject(
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl?.trim()) {
    return;
  }

  const path = getEventCoverPathFromPublicUrl(publicUrl);

  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(EVENT_COVERS_BUCKET).remove([path]);

  if (error) {
    console.error("[event-cover] Failed to delete storage object:", error);
  }
}
