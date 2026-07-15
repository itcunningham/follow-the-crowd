export const CHAT_NEW_MESSAGE_HIGHLIGHT_DURATION_MS = 2500;

export const CHAT_NEW_MESSAGE_HIGHLIGHT_CLASS =
  "chat-new-message-highlight border-l-2 border-ftc-primary bg-ftc-bg-elevated";

export function getChatNewMessageHighlightClass(isHighlighted: boolean) {
  return isHighlighted ? CHAT_NEW_MESSAGE_HIGHLIGHT_CLASS : "";
}

export function logChatHighlightRender(messageId: string, highlighted: boolean) {
  if (process.env.NODE_ENV === "production" || !highlighted) {
    return;
  }

  console.log("[chat highlight] render", { messageId, highlighted: true });
}
