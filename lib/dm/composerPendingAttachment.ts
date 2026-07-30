import { DM_MAX_PHOTOS_PER_MESSAGE } from "@/lib/dmAttachments";

export type PendingComposerAttachment = {
  file: File;
  previewUrl: string;
};

export function createPendingComposerAttachment(file: File): PendingComposerAttachment {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function revokePendingComposerAttachment(
  pending: PendingComposerAttachment | null | undefined,
): void {
  if (pending?.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(pending.previewUrl);
  }
}

export function revokeAllPendingComposerAttachments(
  pending: ReadonlyArray<PendingComposerAttachment>,
): void {
  for (const item of pending) {
    revokePendingComposerAttachment(item);
  }
}

function buildPendingAttachmentSignature(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export type MergePendingComposerAttachmentsResult = {
  attachments: PendingComposerAttachment[];
  addedCount: number;
  skippedDuplicateCount: number;
  skippedLimitCount: number;
};

/**
 * Adds newly selected files to the pending photo group, skipping files that
 * are already staged (same name/size/lastModified — a fresh file picker
 * selection always produces new `File` objects, so signature comparison is
 * used instead of reference equality) and capping the total at
 * `DM_MAX_PHOTOS_PER_MESSAGE`.
 */
export function mergePendingComposerAttachments(
  current: ReadonlyArray<PendingComposerAttachment>,
  files: ReadonlyArray<File>,
  maxCount: number = DM_MAX_PHOTOS_PER_MESSAGE,
): MergePendingComposerAttachmentsResult {
  const existingSignatures = new Set(
    current.map((item) => buildPendingAttachmentSignature(item.file)),
  );
  const next = [...current];
  let addedCount = 0;
  let skippedDuplicateCount = 0;
  let skippedLimitCount = 0;

  for (const file of files) {
    if (next.length >= maxCount) {
      skippedLimitCount += 1;
      continue;
    }

    const signature = buildPendingAttachmentSignature(file);

    if (existingSignatures.has(signature)) {
      skippedDuplicateCount += 1;
      continue;
    }

    existingSignatures.add(signature);
    next.push(createPendingComposerAttachment(file));
    addedCount += 1;
  }

  return { attachments: next, addedCount, skippedDuplicateCount, skippedLimitCount };
}

export function removePendingComposerAttachmentAt(
  pending: ReadonlyArray<PendingComposerAttachment>,
  index: number,
): { attachments: PendingComposerAttachment[]; removed: PendingComposerAttachment | null } {
  const removed = pending[index] ?? null;

  if (!removed) {
    return { attachments: [...pending], removed: null };
  }

  return {
    attachments: pending.filter((_, itemIndex) => itemIndex !== index),
    removed,
  };
}
