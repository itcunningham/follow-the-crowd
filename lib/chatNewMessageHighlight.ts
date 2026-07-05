export const CHAT_NEW_MESSAGE_HIGHLIGHT_DURATION_MS = 2500;

export const CHAT_NEW_MESSAGE_HIGHLIGHT_CLASS =
  "chat-new-message-highlight ring-1 ring-ftc-primary/45 bg-ftc-primary/10 shadow-ftc-glow";

export function getChatNewMessageHighlightClass(isHighlighted: boolean) {
  return isHighlighted ? CHAT_NEW_MESSAGE_HIGHLIGHT_CLASS : "";
}

export function logChatHighlightRender(messageId: string, highlighted: boolean) {
  if (highlighted) {
    console.log("[chat highlight] render", { messageId, highlighted: true });
  }
}
