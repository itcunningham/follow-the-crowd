const EVENT_CREATE_INVITE_MESSAGE_KEY = "ftc.event-create.invite-message";

export function stashEventCreateInviteMessage(message: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(EVENT_CREATE_INVITE_MESSAGE_KEY, message);
}

export function consumeEventCreateInviteMessage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const message = sessionStorage.getItem(EVENT_CREATE_INVITE_MESSAGE_KEY);

  if (!message) {
    return null;
  }

  sessionStorage.removeItem(EVENT_CREATE_INVITE_MESSAGE_KEY);
  return message;
}
