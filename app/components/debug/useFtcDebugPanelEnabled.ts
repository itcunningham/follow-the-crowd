"use client";

import { useEffect, useState } from "react";
import { getCurrentUserId } from "@/lib/user/currentUser";
import { isFtcDebugPanelEnabled } from "@/lib/debug/ftcDebugPanel";

export function useFtcDebugPanelEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getCurrentUserId()
      .then((userId) => {
        if (!cancelled) {
          setEnabled(isFtcDebugPanelEnabled(userId));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(isFtcDebugPanelEnabled(null));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
