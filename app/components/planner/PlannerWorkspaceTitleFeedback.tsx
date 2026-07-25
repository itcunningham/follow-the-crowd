"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  HISTORY_REMOVAL_FEEDBACK_FADE_MS,
  PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS,
} from "@/lib/design/inlineTabFeedback";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS } from "@/lib/design/plannerWorkspaceTokens";

type PlannerWorkspaceTitleFeedbackProps = {
  message: string | null;
  fading: boolean;
  onFadeComplete?: () => void;
};

/** Centred history-removal success row below the planner title row (Events + Gigs). */
export function PlannerWorkspaceTitleFeedback({
  message,
  fading,
  onFadeComplete,
}: PlannerWorkspaceTitleFeedbackProps) {
  const onFadeCompleteRef = useRef(onFadeComplete);
  const fadeFinishedRef = useRef(false);

  onFadeCompleteRef.current = onFadeComplete;

  useEffect(() => {
    fadeFinishedRef.current = false;
  }, [message]);

  const finishFade = useCallback(() => {
    if (fadeFinishedRef.current || !fading) {
      return;
    }

    fadeFinishedRef.current = true;
    onFadeCompleteRef.current?.();
  }, [fading]);

  useEffect(() => {
    if (!fading || !message) {
      return;
    }

    const fallbackTimer = window.setTimeout(
      finishFade,
      HISTORY_REMOVAL_FEEDBACK_FADE_MS + 50,
    );

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [fading, finishFade, message]);

  return (
    <div
      className={PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS}
      aria-live={message ? "polite" : undefined}
    >
      {message ? (
        <p
          className={`${PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS} ${
            fading ? "opacity-0" : "opacity-100"
          }`}
          onTransitionEnd={(event) => {
            if (event.propertyName !== "opacity" || event.target !== event.currentTarget) {
              return;
            }

            finishFade();
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
