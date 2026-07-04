import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT_DELETION_FAILED_MESSAGE } from "@/lib/accountDeletion";

function extractPublicStoragePath(fileUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = fileUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(fileUrl.slice(markerIndex + marker.length));
}

export async function removeUserStorageObjects(
  userClient: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: profileFiles, error: profileListError } = await userClient.storage
    .from("profile-images")
    .list(userId);

  if (profileListError) {
    throw new Error(ACCOUNT_DELETION_FAILED_MESSAGE);
  }

  if (profileFiles?.length) {
    const { error: profileRemoveError } = await userClient.storage
      .from("profile-images")
      .remove(profileFiles.map((file) => `${userId}/${file.name}`));

    if (profileRemoveError) {
      throw new Error(ACCOUNT_DELETION_FAILED_MESSAGE);
    }
  }

  const { data: attachments, error: attachmentsError } = await userClient
    .from("message_attachments")
    .select("file_url")
    .eq("uploader_id", userId);

  if (attachmentsError) {
    throw new Error(ACCOUNT_DELETION_FAILED_MESSAGE);
  }

  const attachmentPaths = (attachments ?? [])
    .map((attachment) => extractPublicStoragePath(attachment.file_url, "dm-attachments"))
    .filter((path): path is string => Boolean(path));

  if (attachmentPaths.length > 0) {
    const { error: attachmentRemoveError } = await userClient.storage
      .from("dm-attachments")
      .remove(attachmentPaths);

    if (attachmentRemoveError) {
      throw new Error(ACCOUNT_DELETION_FAILED_MESSAGE);
    }
  }
}
