import { EVENTS_LIST_TAB_FEEDBACK_CLASS } from "@/lib/design/ftcDesignSystem";

type InlineTabFeedbackMessageProps = {
  message: string | null;
  fading: boolean;
  className?: string;
};

/** Shared transient success copy — same opacity transition as Event Plans toolbar feedback. */
export function InlineTabFeedbackMessage({
  message,
  fading,
  className = "w-full text-center",
}: InlineTabFeedbackMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`${EVENTS_LIST_TAB_FEEDBACK_CLASS} ${className} ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {message}
    </p>
  );
}
