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
