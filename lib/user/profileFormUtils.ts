export const PROFILE_GENRE_OPTIONS = [
  "Techno",
  "House",
  "Breaks",
  "Ambient",
  "Drum & Bass",
  "Trance",
  "Disco",
  "Experimental",
] as const;

export const MAX_PROFILE_GENRE_TAGS = 5;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/g, "").toLowerCase();
}

export function formatPublicUsername(username: string | null | undefined): string | null {
  const normalized = normalizeUsername(username ?? "");

  if (!normalized) {
    return null;
  }

  return `@${normalized}`;
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username);
}

export function suggestUsernameFromDisplayName(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 30);

  return slug.length >= 3 ? slug : "ftc_user";
}

export function parseStoredGenreTags(genre: string | null | undefined): string[] {
  if (!genre?.trim()) {
    return [];
  }

  return [
    ...new Set(
      genre
        .split(/[,·/|]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_PROFILE_GENRE_TAGS);
}

export function serializeGenreTags(tags: string[]): string {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, MAX_PROFILE_GENRE_TAGS).join(", ");
}

function tryParseUrl(raw: string): URL | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

export function normalizeInstagramInput(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = tryParseUrl(trimmed);

    if (!parsed) {
      throw new Error("Enter a valid Instagram URL.");
    }

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host !== "instagram.com") {
      throw new Error("Instagram link must be an instagram.com URL.");
    }

    return parsed.toString();
  }

  const handle = trimmed.replace(/^@+/, "").replace(/\/.*/, "");

  if (!handle) {
    throw new Error("Enter a valid Instagram handle.");
  }

  return `https://instagram.com/${handle}`;
}

export function normalizeExternalUrl(
  raw: string,
  options?: { label?: string; allowedHosts?: string[] },
): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  const parsed = tryParseUrl(trimmed);

  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Enter a valid ${options?.label ?? "URL"}.`);
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (options?.allowedHosts?.length && !options.allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new Error(`${options.label ?? "URL"} must use ${options.allowedHosts.join(" or ")}.`);
  }

  return parsed.toString();
}

export function getMusicLinkLabel(url: string | null | undefined): "SoundCloud" | "Mixcloud" | null {
  const trimmed = url?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = tryParseUrl(trimmed);
  const host = parsed?.hostname.replace(/^www\./, "").toLowerCase() ?? "";

  if (host.includes("mixcloud.com")) {
    return "Mixcloud";
  }

  if (host.includes("soundcloud.com")) {
    return "SoundCloud";
  }

  return "SoundCloud";
}
