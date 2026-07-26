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

type TitleFeedbackState = {
  message: string | null;
  fading: boolean;
};

type PlannerTitleFeedbackContextValue = {
  setTitleFeedback: (patch: Partial<TitleFeedbackState>) => void;
};

const PlannerTitleFeedbackContext = createContext<
  (PlannerTitleFeedbackContextValue & TitleFeedbackState) | null
>(null);

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

  const value = useMemo(
    () => ({
      ...feedback,
      setTitleFeedback,
    }),
    [feedback, setTitleFeedback],
  );

  return (
    <PlannerTitleFeedbackContext.Provider value={value}>
      {children}
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

export function usePlannerTitleFeedbackState(): TitleFeedbackState {
  const context = useContext(PlannerTitleFeedbackContext);

  if (!context) {
    throw new Error("usePlannerTitleFeedbackState must be used within PlannerTitleFeedbackProvider");
  }

  return {
    message: context.message,
    fading: context.fading,
  };
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
