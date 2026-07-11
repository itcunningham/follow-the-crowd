export function scrollPageToTop(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function scheduleScrollPageToTop(): void {
  scrollPageToTop();

  requestAnimationFrame(() => {
    scrollPageToTop();
    requestAnimationFrame(scrollPageToTop);
  });
}
