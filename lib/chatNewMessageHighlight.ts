export const CHAT_NEW_MESSAGE_HIGHLIGHT_DURATION_MS = 2500;

export const CHAT_NEW_MESSAGE_HIGHLIGHT_CLASS =
  "chat-new-message-highlight ring-1 ring-blue-400/60 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.25)]";

export function getChatNewMessageHighlightClass(isHighlighted: boolean) {
  return isHighlighted ? CHAT_NEW_MESSAGE_HIGHLIGHT_CLASS : "";
}

export function logChatHighlightRender(messageId: string, highlighted: boolean) {
  if (highlighted) {
    console.log("[chat highlight] render", { messageId, highlighted: true });
  }
}
