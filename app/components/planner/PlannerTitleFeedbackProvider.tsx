"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_HOST_CLASS } from "@/lib/design/plannerWorkspaceTokens";

type TitleFeedbackState = {
  message: string | null;
  fading: boolean;
};

type PlannerTitleFeedbackContextValue = {
  setTitleFeedback: (patch: Partial<TitleFeedbackState>) => void;
};

const PlannerTitleFeedbackContext = createContext<PlannerTitleFeedbackContextValue | null>(null);

export function PlannerTitleFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedbackState] = useState<TitleFeedbackState>({
    message: null,
    fading: false,
  });

  const setTitleFeedback = useCallback((patch: Partial<TitleFeedbackState>) => {
    setFeedbackState((previous) => ({
      message: "message" in patch ? patch.message ?? null : previous.message,
      fading: "fading" in patch ? patch.fading ?? false : previous.fading,
    }));
  }, []);

  const value = useMemo(() => ({ setTitleFeedback }), [setTitleFeedback]);

  return (
    <PlannerTitleFeedbackContext.Provider value={value}>
      {children}
      <div className={PLANNER_WORKSPACE_TITLE_FEEDBACK_HOST_CLASS} aria-live="polite">
        <PlannerWorkspaceTitleFeedback message={feedback.message} fading={feedback.fading} />
      </div>
    </PlannerTitleFeedbackContext.Provider>
  );
}

export function usePlannerTitleFeedback(): PlannerTitleFeedbackContextValue {
  const context = useContext(PlannerTitleFeedbackContext);

  if (!context) {
    throw new Error("usePlannerTitleFeedback must be used within PlannerTitleFeedbackProvider");
  }

  return context;
}

/** Sync transient title feedback from any FTC screen (Gigs History, Event Details, etc.). */
export function useSyncPlannerTitleFeedback(
  message: string | null,
  fading: boolean,
  active: boolean,
) {
  const { setTitleFeedback } = usePlannerTitleFeedback();

  useLayoutEffect(() => {
    if (!active) {
      return;
    }

    setTitleFeedback({
      message,
      fading,
    });

    return () => {
      setTitleFeedback({
        message: null,
        fading: false,
      });
    };
  }, [active, fading, message, setTitleFeedback]);
}
