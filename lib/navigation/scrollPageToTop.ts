const MOBILE_SCROLL_RESET_DELAYS_MS = [0, 50, 100, 300] as const;

export function scrollDocumentToTop(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo(0, 0);

  const scrollingElement = document.scrollingElement;
  if (scrollingElement) {
    scrollingElement.scrollTop = 0;
    scrollingElement.scrollLeft = 0;
  }

  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;
}

export function scheduleMobileScrollPageToTop(): () => void {
  scrollDocumentToTop();

  let rafId1 = 0;
  let rafId2 = 0;
  rafId1 = requestAnimationFrame(() => {
    scrollDocumentToTop();
    rafId2 = requestAnimationFrame(scrollDocumentToTop);
  });

  const timeoutIds = MOBILE_SCROLL_RESET_DELAYS_MS.map((delay) =>
    window.setTimeout(scrollDocumentToTop, delay),
  );

  return () => {
    if (rafId1) cancelAnimationFrame(rafId1);
    if (rafId2) cancelAnimationFrame(rafId2);
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
}
