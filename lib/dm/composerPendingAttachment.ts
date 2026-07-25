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
