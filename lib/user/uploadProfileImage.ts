import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export const PROFILE_IMAGES_BUCKET = "profile-images";

/** Longest edge after client resize — enough for xl@2x (224) with headroom. */
export const PROFILE_IMAGE_MAX_EDGE_PX = 1024;

export const PROFILE_IMAGE_JPEG_QUALITY = 0.85;

/** Hard stop so Save cannot sit on “Saving” forever on a hung storage call. */
export const PROFILE_IMAGE_UPLOAD_TIMEOUT_MS = 30_000;

/** Reject absurd camera dumps before we try to decode them. */
export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 25 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function isAllowedProfileImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type.trim().toLowerCase());
}

export async function withProfileImageUploadTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = PROFILE_IMAGE_UPLOAD_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              "Image upload timed out. Check your connection and try a smaller photo.",
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Downscale + re-encode to JPEG before upload.
 * Untouched iPhone photos are often 3–12 MB; avatars only paint ≤224px.
 */
export async function prepareProfileImageForUpload(file: File): Promise<File> {
  if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) {
    throw new Error("Image must be 25 MB or smaller");
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that photo. Try a JPG or PNG.");
  }

  try {
    const scale = Math.min(
      1,
      PROFILE_IMAGE_MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height, 1),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not process image");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => {
          if (!next) {
            reject(new Error("Could not process image"));
            return;
          }

          resolve(next);
        },
        "image/jpeg",
        PROFILE_IMAGE_JPEG_QUALITY,
      );
    });

    return new File([blob], "profile.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message.trim();
  }

  return "Image upload failed. Try a smaller JPG or PNG.";
}

export async function uploadProfileImage(file: File): Promise<string> {
  // Empty MIME (some iOS HEIC picks) — still try decode/resize below.
  if (file.type.trim() && !isAllowedProfileImageType(file.type)) {
    throw new Error("Please choose a JPG, PNG, WebP, or HEIC image");
  }

  const prepared = await prepareProfileImageForUpload(file);
  const userId = await getCurrentUserId();
  const path = `${userId}/profile-image-${Date.now()}.jpg`;

  const { error: uploadError } = await withProfileImageUploadTimeout(
    supabase.storage.from(PROFILE_IMAGES_BUCKET).upload(path, prepared, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    }),
  );

  if (uploadError) {
    throw new Error(getUploadErrorMessage(uploadError));
  }

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
