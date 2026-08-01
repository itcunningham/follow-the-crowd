/**
 * Shared sizing for DM image message bubbles — single images and multi-image
 * grids both bound to the same max footprint (matches modern messaging apps
 * like iMessage/Instagram) regardless of the source photo's resolution or
 * capture metadata. Single images additionally cap height so an extremely
 * tall image can't dominate the conversation; width is the primary
 * constraint, height is a secondary safety cap.
 */
export const DM_IMAGE_BUBBLE_MAX_WIDTH_CLASS = "max-w-[min(100%,18rem)]";
export const DM_IMAGE_BUBBLE_MAX_HEIGHT_CLASS = "max-h-72";

/**
 * Explicit (not max-) width for the multi-image grid. Grid tiles wrap and
 * intrinsically size to each photo's own aspect ratio, so — unlike the
 * single-image bubble — the container has no single natural content width
 * for the browser to shrink-wrap around; without an explicit width it
 * renders far wider than intended and the surrounding flex alignment (which
 * right/left aligns by shrinking to the bubble's own width) can't hug the
 * sender's side. A fixed width matching the single-image cap fixes both.
 */
export const DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS = "w-[min(100%,18rem)]";

/** Beyond this many images in one message, extras collapse into a "+N" overlay on the last visible tile. */
export const DM_MAX_VISIBLE_GRID_IMAGES = 4;

/**
 * At this many images or more, tapping the chat-bubble grid opens the
 * Instagram-style Gallery Overview first instead of jumping straight into
 * the single-image lightbox — large groups need to be browsed before
 * picking one, small groups (2-4) still go straight to the lightbox on the
 * tapped image. Matches the existing "+N" overlay boundary (`+N` only
 * appears once there are more images than `DM_MAX_VISIBLE_GRID_IMAGES`).
 */
export const DM_GALLERY_OVERVIEW_MIN_IMAGES = DM_MAX_VISIBLE_GRID_IMAGES + 1;

/**
 * Splits a message's images into the tiles the grid actually renders and how
 * many were left out — the same balanced-grid pattern (cap visible tiles,
 * overlay the remainder count) used by major messaging apps for 5+ photos.
 */
export function resolveVisibleGridImages<T>(
  images: T[],
  maxVisible: number = DM_MAX_VISIBLE_GRID_IMAGES,
): { visible: T[]; hiddenCount: number } {
  const visible = images.slice(0, maxVisible);

  return { visible, hiddenCount: images.length - visible.length };
}

/**
 * Per-image caps for the multi-image grid (2+ attachments in one message).
 * Each tile keeps its own source aspect ratio — no forced square/2:1 box and
 * no `object-fit: cover` — so portrait, landscape, and square photos never
 * get cropped; these just bound how large any one tile can get so a group of
 * photos doesn't dominate the conversation. A fixed pixel width (not a
 * percentage) roughly half the shared grid width, so two tiles sit side by
 * side and wrap to new rows past that — a percentage max-width here would
 * fight the flex-wrap container's own shrink pass and under-size every tile.
 */
export const DM_IMAGE_GRID_CELL_MAX_WIDTH_CLASS = "max-w-36";
export const DM_IMAGE_GRID_CELL_MAX_HEIGHT_CLASS = "max-h-40";
