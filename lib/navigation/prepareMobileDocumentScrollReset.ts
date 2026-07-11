export function prepareMobileDocumentScrollReset(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  window.history.scrollRestoration = "manual";
}
