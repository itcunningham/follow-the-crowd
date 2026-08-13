import { supabase } from "@/lib/supabaseClient";

/**
 * How long a signed attachment URL stays valid.
 *
 * Long enough for an ordinary chat session, short enough that a URL which
 * escapes (screenshot, copied link, shared devtools) stops working the same
 * day. Views re-sign when they remount, and an image that 403s once because it
 * outlived this window re-signs itself once - see the group component.
 */
export const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Resolve a stored `message_attachments.file_url` to its storage object path.
 *
 * Two shapes are accepted on purpose:
 *
 *   1. The public-URL form every existing row holds, and the form new uploads
 *      still write. `dm-attachments` is becoming a private bucket, so these
 *      strings no longer resolve to anything fetchable - they are stable
 *      identifiers, not URLs. Nothing may hand one to an <img> or an <a>.
 *   2. A bare object path. Nothing writes this yet. It is accepted so that
 *      normalising the column later is a data change on its own, with no code
 *      change riding along.
 *
 * Anything else - a foreign host, another bucket, an empty string - returns
 * null, and the caller renders its existing unavailable state. Returning the
 * input unchanged would put a dead public URL back in the DOM, which is the
 * exact defect this whole change exists to remove.
 */
export function toStorageObjectPath(fileUrl: string, bucket: string): string | null {
  const trimmed = fileUrl.trim();

  if (!trimmed) {
    return null;
  }

  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = trimmed.indexOf(marker);

  if (markerIndex !== -1) {
    // decodeURIComponent matters: filenames carry spaces and are percent-encoded
    // into the stored URL, but the storage API addresses objects by raw path.
    return decodeURIComponent(trimmed.slice(markerIndex + marker.length));
  }

  // A bare path has no scheme and no leading slash. Absolute URLs that did not
  // match the marker above belong to some other bucket or host.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("/")) {
    return null;
  }

  return trimmed;
}

/**
 * Sign every path in one request.
 *
 * `createSignedUrls` is the plural form deliberately: a message with eight
 * images must cost one round trip, not eight. Keyed by path on the way out so
 * callers can map results back without relying on array order.
 */
export async function signAttachmentPaths(
  paths: string[],
  bucket: string,
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();

  if (paths.length === 0) {
    return signed;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("Failed to sign attachment URLs:", error);
    return signed;
  }

  for (const entry of data) {
    if (entry.path && entry.signedUrl) {
      signed.set(entry.path, entry.signedUrl);
    }
  }

  return signed;
}
