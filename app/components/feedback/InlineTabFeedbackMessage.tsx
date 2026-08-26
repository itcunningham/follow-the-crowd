import {
  EVENTS_LIST_TAB_FEEDBACK_CLASS,
  EVENTS_LIST_TAB_FEEDBACK_WRAP_CLASS,
} from "@/lib/design/ftcDesignSystem";

type InlineTabFeedbackMessageProps = {
  message: string | null;
  fading: boolean;
  className?: string;
  /**
   * Opt out of the tab-row truncation for hosts that can grow vertically (the
   * DM booking lifecycle toast). Defaults to the slot-constrained behaviour, so
   * every existing tab-row consumer renders byte-identically.
   */
  wrap?: boolean;
};

/** Shared transient success copy — same opacity transition as Event Plans toolbar feedback. */
export function InlineTabFeedbackMessage({
  message,
  fading,
  className = "w-full text-center",
  wrap = false,
}: InlineTabFeedbackMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`${
        wrap ? EVENTS_LIST_TAB_FEEDBACK_WRAP_CLASS : EVENTS_LIST_TAB_FEEDBACK_CLASS
      } ${className} ${fading ? "opacity-0" : "opacity-100"}`}
    >
      {message}
    </p>
  );
}
