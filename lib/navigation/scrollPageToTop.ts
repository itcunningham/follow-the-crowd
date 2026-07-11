const IOS_SCROLL_CATCH_MS = 50;

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

function isDocumentAtTop(): boolean {
  const scrollingElementTop = document.scrollingElement?.scrollTop ?? 0;
  return window.scrollY <= 1 && scrollingElementTop <= 1;
}

export function commitMobileDocumentScrollToTop(onSettled: () => void): () => void {
  scrollDocumentToTop();

  let cancelled = false;
  let frame = 0;
  let rafId = 0;
  let iosCatchTimeout = 0;
  const maxFrames = 3;

  const settle = () => {
    if (!cancelled) {
      onSettled();
    }
  };

  const runFramePass = () => {
    if (cancelled) {
      return;
    }

    scrollDocumentToTop();
    frame += 1;

    if (isDocumentAtTop() || frame >= maxFrames) {
      if (isDocumentAtTop()) {
        settle();
        return;
      }

      iosCatchTimeout = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        scrollDocumentToTop();
        settle();
      }, IOS_SCROLL_CATCH_MS);
      return;
    }

    rafId = requestAnimationFrame(runFramePass);
  };

  rafId = requestAnimationFrame(runFramePass);

  return () => {
    cancelled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    if (iosCatchTimeout) {
      window.clearTimeout(iosCatchTimeout);
    }
  };
}
