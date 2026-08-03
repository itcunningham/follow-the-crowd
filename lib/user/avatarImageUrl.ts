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

export function resolveAvatarImageUrl(
  avatarUrl: string | null | undefined,
  size: AvatarRenderSize,
): string | null {
  const trimmed = avatarUrl?.trim();

  if (!trimmed || !trimmed.includes(PUBLIC_OBJECT_MARKER)) {
    return trimmed || null;
  }

  const width = AVATAR_RENDER_WIDTHS[size];

  // `resize=cover` matches the `object-cover` the avatar is painted with, so
  // the crop the server does and the crop the browser would have done agree.
  return `${trimmed.replace(PUBLIC_OBJECT_MARKER, RENDER_IMAGE_PATH)}?width=${width}&height=${width}&resize=cover&quality=80`;
}
