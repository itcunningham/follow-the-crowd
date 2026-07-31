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

/** Beyond this many images in one message, extras collapse into a "+N" overlay on the last visible tile. */
export const DM_MAX_VISIBLE_GRID_IMAGES = 4;

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
 * Per-cell layout class for the 2-column image grid: 2 and 4+ images are
 * plain equal squares (2-col/1-row and 2-col/2-row respectively); exactly 3
 * images use the standard large-top/two-bottom pattern (first cell spans
 * both columns as a 2:1 rectangle, the other two remain equal squares below).
 */
export function resolveImageGridCellClass(totalImageCount: number, index: number): string {
  if (totalImageCount === 3 && index === 0) {
    return "col-span-2 aspect-[2/1]";
  }

  return "aspect-square";
}
