import { supabase } from "@/lib/supabaseClient";
import { CURRENT_USER_ID } from "@/lib/user/currentUser";

export const PROFILE_IMAGES_BUCKET = "profile-images";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedProfileImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type);
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

export async function uploadProfileImage(file: File): Promise<string> {
  if (!isAllowedProfileImageType(file.type)) {
    throw new Error("Unsupported image type");
  }

  const timestamp = Date.now();
  const extension = getExtensionForMimeType(file.type);
  const path = `${CURRENT_USER_ID}/profile-image-${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
