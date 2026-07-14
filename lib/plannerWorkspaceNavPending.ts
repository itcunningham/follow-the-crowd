type PendingWorkspaceHrefListener = () => void;

let pendingWorkspaceHref: string | null = null;
const pendingWorkspaceHrefListeners = new Set<PendingWorkspaceHrefListener>();

export function getPendingWorkspaceHref(): string | null {
  return pendingWorkspaceHref;
}

export function setPendingWorkspaceHref(href: string): void {
  if (pendingWorkspaceHref === href) {
    return;
  }

  pendingWorkspaceHref = href;
  pendingWorkspaceHrefListeners.forEach((listener) => listener());
}

export function clearPendingWorkspaceHref(): void {
  if (pendingWorkspaceHref === null) {
    return;
  }

  pendingWorkspaceHref = null;
  pendingWorkspaceHrefListeners.forEach((listener) => listener());
}

export function subscribePendingWorkspaceHref(
  listener: PendingWorkspaceHrefListener,
): () => void {
  pendingWorkspaceHrefListeners.add(listener);

  return () => {
    pendingWorkspaceHrefListeners.delete(listener);
  };
}
