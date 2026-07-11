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

export function runDoubleRafDocumentScrollToTop(onSettled?: () => void): () => void {
  scrollDocumentToTop();

  let cancelled = false;
  let rafId1 = 0;
  let rafId2 = 0;

  rafId1 = requestAnimationFrame(() => {
    if (cancelled) {
      return;
    }

    scrollDocumentToTop();
    rafId2 = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      scrollDocumentToTop();
      onSettled?.();
    });
  });

  return () => {
    cancelled = true;
    if (rafId1) {
      cancelAnimationFrame(rafId1);
    }
    if (rafId2) {
      cancelAnimationFrame(rafId2);
    }
  };
}
