export const FTC_APP_URL_FALLBACK = "https://follow-the-crowd.vercel.app";

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getAppOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;

    if (!isLocalhostHostname(hostname)) {
      return normalizeOrigin(origin);
    }
  }

  return FTC_APP_URL_FALLBACK;
}

export function getAuthRedirectUrl(path: string = "/login"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppOrigin()}${normalizedPath}`;
}

export function isPasswordRecoveryUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery"
  );
}
