/**
 * Serves an avatar at the size it is actually drawn at.
 *
 * Avatars are uploaded untouched — `uploadProfileImage` stores the original
 * file — and rendered by `ProfileAvatar` into boxes between 32px and 112px.
 * Measured on the QA account: a 3.72 MB, 3024px-wide JPEG being downloaded to
 * paint a 32px circle. On anything but a fast connection the avatar is simply
 * absent until those megabytes arrive, which is the "avatar missing until I
 * refresh" report — on the second view the bytes are in the HTTP cache
 * (`cache-control: public, max-age=3600`) so it paints immediately.
 *
 * Supabase Storage renders resized derivatives natively, so this needs no
 * dependency, no build step and no re-upload — existing avatars benefit
 * immediately. Same file measured through the transform endpoint at 96px:
 * 4,074 bytes. Roughly a 950x reduction.
 *
 * Deliberately conservative: anything that is not a public Supabase Storage
 * object URL is returned untouched, so an external or already-transformed URL
 * can never be mangled into a broken one.
 *
 * When the transform URL fails (deleted object, transform blip), ProfileAvatar
 * falls back to the original object URL, then to initials — empty circles with
 * a broken `<img>` and no initials are worse than a letter mark.
 */

const PUBLIC_OBJECT_MARKER = "/storage/v1/object/public/";
const RENDER_IMAGE_PATH = "/storage/v1/render/image/public/";

/** Rendered box sizes in ProfileAvatar, doubled for retina. */
export const AVATAR_RENDER_WIDTHS = {
  sm: 64,
  md: 96,
  lg: 112,
  xl: 224,
} as const;

export type AvatarRenderSize = keyof typeof AVATAR_RENDER_WIDTHS;

/**
 * `blob:` is admissible alongside http(s) because Edit Profile previews the
 * chosen photo with `URL.createObjectURL(file)` before anything is uploaded -
 * the upload only runs inside the save handler. Rejecting it meant the guard
 * below returned null for a perfectly renderable source, ProfileAvatar fell
 * through to initials, and picking a new photo appeared to do nothing until
 * the form was saved.
 *
 * Widened by exactly one scheme on purpose. The point of this predicate is to
 * reject values that cannot be an `<img src>` at all - `"null"`, `"undefined"`,
 * bare storage paths - and those stay rejected. No stored avatar_url can be a
 * blob URL: uploadProfileImage always returns an https Supabase URL.
 */
function isImageSourceUrl(value: string): boolean {
  return /^(https?|blob):/i.test(value);
}

/**
 * Absolute http(s) or blob avatar URL, or null when the value cannot be an
 * `<img src>`. Non-URLs (paths, `"null"`, junk) used to paint an empty circle
 * forever because ProfileAvatar preferred a broken img over initials.
 */
export function coerceAvatarSourceUrl(
  avatarUrl: string | null | undefined,
): string | null {
  const trimmed = avatarUrl?.trim();

  if (!trimmed || !isImageSourceUrl(trimmed)) {
    return null;
  }

  return trimmed;
}

/** Original public object URL when `avatarUrl` is a sized render URL. */
export function resolveAvatarObjectUrl(
  avatarUrl: string | null | undefined,
): string | null {
  const trimmed = coerceAvatarSourceUrl(avatarUrl);

  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes(RENDER_IMAGE_PATH)) {
    return trimmed.includes(PUBLIC_OBJECT_MARKER) ? trimmed : null;
  }

  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(RENDER_IMAGE_PATH, PUBLIC_OBJECT_MARKER);
    url.search = "";
    return url.toString();
  } catch {
    return trimmed.split("?")[0]?.replace(RENDER_IMAGE_PATH, PUBLIC_OBJECT_MARKER) ?? null;
  }
}

export function resolveAvatarImageUrl(
  avatarUrl: string | null | undefined,
  size: AvatarRenderSize,
): string | null {
  const trimmed = coerceAvatarSourceUrl(avatarUrl);

  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes(PUBLIC_OBJECT_MARKER)) {
    return trimmed;
  }

  const width = AVATAR_RENDER_WIDTHS[size];

  try {
    const url = new URL(trimmed.replace(PUBLIC_OBJECT_MARKER, RENDER_IMAGE_PATH));
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(width));
    // `cover` matches the `object-cover` the avatar is painted with, so the
    // crop the server does and the crop the browser would have done agree.
    url.searchParams.set("resize", "cover");
    url.searchParams.set("quality", "80");
    return url.toString();
  } catch {
    return `${trimmed.replace(PUBLIC_OBJECT_MARKER, RENDER_IMAGE_PATH)}?width=${width}&height=${width}&resize=cover&quality=80`;
  }
}
