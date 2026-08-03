const knownAspectRatioByAttachmentId = new Map<string, number>();

/** Aspect ratio (width / height) learned from a prior decode of this attachment in this tab, if any. */
export function getKnownDmImageAspectRatio(attachmentId: string): number | undefined {
  return knownAspectRatioByAttachmentId.get(attachmentId);
}

/**
 * Records a decoded image's aspect ratio so a later render (e.g. reopening the
 * conversation) can reserve its space with `aspect-ratio` before the image
 * loads, instead of only discovering the height after decode. Module-scoped
 * so it survives an away-and-back navigation regardless of whether the page
 * component instance is remounted.
 */
export function recordDmImageAspectRatio(
  attachmentId: string,
  naturalWidth: number,
  naturalHeight: number,
): void {
  if (naturalWidth > 0 && naturalHeight > 0) {
    knownAspectRatioByAttachmentId.set(attachmentId, naturalWidth / naturalHeight);
  }
}

/**
 * Reserved box for an attachment that has not decoded yet, emitted as the
 * image's `width`/`height` ATTRIBUTES.
 *
 * This exists to break a self-sustaining deadlock that left freshly uploaded
 * photos permanently blank until a reload, measured in-browser:
 *
 *   1. A chat image is `w-fit` / `max-w-full` all the way up the tree, so its
 *      box comes entirely from the image's own intrinsic size.
 *   2. Before it decodes it HAS no intrinsic size, so every ancestor collapses
 *      (measured: the whole row 0px wide, 2px tall) and the image's own
 *      `max-width: min(100%, 18rem)` then resolves against a zero-width parent
 *      and clamps the image itself to zero.
 *   3. A zero-area `loading="lazy"` image is never fetched. Confirmed: the row
 *      sat at `complete: false` / `naturalWidth: 0` while `fetch()` of the very
 *      same URL in that tab returned 200 with the full body, and
 *      `scrollIntoView()` did not start the request either.
 *   4. Never fetched means never decoded, means `recordDmImageAspectRatio` is
 *      never called, means no ratio, means still zero-area next render.
 *
 * Width/height attributes are the standard escape: they give the replaced
 * element a definite box and a default aspect ratio from the very first layout,
 * so the lazy loader has real geometry to work with. They are only a
 * presentational hint, and the components pair them with `w-auto h-auto` so
 * author CSS wins once the real image arrives — the placeholder governs the
 * pre-decode box and nothing else, leaving the existing max-width/max-height
 * sizing exactly as it was.
 */
export function getDmImageReservedSize(
  attachmentId: string,
  fallbackWidth: number,
  maxHeight: number,
  knownRatio?: number,
): { width: number; height: number } {
  const ratio = knownRatio ?? getKnownDmImageAspectRatio(attachmentId);

  if (!ratio || ratio <= 0) {
    // Square only until the first decode teaches us better. A wrong-but-present
    // box is recoverable (it corrects on load); a zero box is not.
    return { width: fallbackWidth, height: fallbackWidth };
  }

  // The width must stay DEFINITE -- that is what reserves the pre-decode box,
  // and measurement confirms the alternative (`width: auto`) collapses a
  // still-loading image to 0x0 and reinstates the never-fetched deadlock.
  //
  // But a definite width plus `max-height` is what squashed portraits: at
  // width 288 a 3:4 photo computes height 384, `max-height: 288` clamps the
  // height, and because the width is definite it does NOT shrink to match, so
  // the image renders 288x288. Landscape never showed it because its computed
  // height (216) never reached the cap.
  //
  // Deriving the width from the height cap removes the clamp entirely rather
  // than fighting it: the box is always within both caps by construction, so
  // `max-height` never binds and the ratio survives. Measured on a genuinely
  // slow-loading 3024x4032: 216x216 reserved while pending, 216x288 once
  // decoded, ratio 0.75 exactly.
  const width = Math.min(fallbackWidth, Math.round(maxHeight * ratio));

  return { width, height: Math.max(1, Math.round(width / ratio)) };
}
