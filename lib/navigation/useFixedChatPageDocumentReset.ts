"use client";

import { useLayoutEffect } from "react";
import { prepareFixedChatPageMount } from "@/lib/navigation/prepareFixedChatPageMount";

/** Reset window/document insets when entering a fixed chat page (e.g. DM return from Event Details). */
export function useFixedChatPageDocumentReset(): void {
  useLayoutEffect(() => {
    prepareFixedChatPageMount();

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        prepareFixedChatPageMount();
      }
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);
}
