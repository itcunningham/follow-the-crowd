const DM_CHAT_SCROLL_STORAGE_PREFIX = "ftc-dm-chat-scroll:";
const DM_CHAT_SCROLL_MAX_AGE_MS = 30 * 60 * 1000;

type DmChatScrollSnapshot = {
  scrollTop: number;
  savedAt: number;
};

function getStorageKey(conversationId: string): string {
  return `${DM_CHAT_SCROLL_STORAGE_PREFIX}${conversationId}`;
}

export function saveDmChatScrollPosition(conversationId: string, scrollTop: number): void {
  if (typeof window === "undefined" || !conversationId.trim()) {
    return;
  }

  const payload: DmChatScrollSnapshot = {
    scrollTop: Math.max(0, scrollTop),
    savedAt: Date.now(),
  };

  sessionStorage.setItem(getStorageKey(conversationId), JSON.stringify(payload));
}

export function consumeDmChatScrollPosition(conversationId: string): number | null {
  if (typeof window === "undefined" || !conversationId.trim()) {
    return null;
  }

  const raw = sessionStorage.getItem(getStorageKey(conversationId));

  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(getStorageKey(conversationId));

  try {
    const parsed = JSON.parse(raw) as Partial<DmChatScrollSnapshot>;
    const scrollTop = parsed.scrollTop;
    const savedAt = parsed.savedAt;

    if (typeof scrollTop !== "number" || !Number.isFinite(scrollTop)) {
      return null;
    }

    if (typeof savedAt === "number" && Date.now() - savedAt > DM_CHAT_SCROLL_MAX_AGE_MS) {
      return null;
    }

    return Math.max(0, scrollTop);
  } catch {
    return null;
  }
}
