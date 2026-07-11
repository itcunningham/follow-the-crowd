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
  return window.scrollY <= 1 && scrollingElementTop <= 1 && document.documentElement.scrollTop <= 1;
}

type BodyStyleSnapshot = {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
};

export function freezeDocumentScrollAtTop(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  scrollDocumentToTop();

  const { style } = document.body;
  const snapshot: BodyStyleSnapshot = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    overflow: style.overflow,
  };

  style.position = "fixed";
  style.top = "0px";
  style.left = "0";
  style.right = "0";
  style.width = "100%";
  style.overflow = "hidden";

  return () => {
    style.position = snapshot.position;
    style.top = snapshot.top;
    style.left = snapshot.left;
    style.right = snapshot.right;
    style.width = snapshot.width;
    style.overflow = snapshot.overflow;
    scrollDocumentToTop();
  };
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

export function commitCalendarOriginDocumentScrollToTop(onSettled: () => void): () => void {
  scrollDocumentToTop();

  let cancelled = false;
  let rafId1 = 0;
  let rafId2 = 0;
  let rafId3 = 0;
  let settleTimeout = 0;

  const settle = () => {
    if (cancelled || !isDocumentAtTop()) {
      return false;
    }

    onSettled();
    return true;
  };

  const runPasses = () => {
    if (cancelled) {
      return;
    }

    scrollDocumentToTop();
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
        if (settle()) {
          return;
        }

        rafId3 = requestAnimationFrame(() => {
          if (cancelled) {
            return;
          }

          scrollDocumentToTop();
          if (settle()) {
            return;
          }

          settleTimeout = window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            scrollDocumentToTop();
            onSettled();
          }, 0);
        });
      });
    });
  };

  runPasses();

  return () => {
    cancelled = true;
    if (rafId1) cancelAnimationFrame(rafId1);
    if (rafId2) cancelAnimationFrame(rafId2);
    if (rafId3) cancelAnimationFrame(rafId3);
    if (settleTimeout) window.clearTimeout(settleTimeout);
  };
}
