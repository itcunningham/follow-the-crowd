import { applyTextInputLimit } from "@/lib/textInputLimits";

export const PROFILE_GENRE_OPTIONS = [
  "Techno",
  "Hypnotic Techno",
  "Hardgroove",
  "Groove Techno",
  "Hard Techno",
  "Industrial Techno",
  "Minimal Techno",
  "Deep Techno",
  "House",
  "Deep House",
  "Tech House",
  "Progressive House",
  "Trance",
  "Psytrance",
  "Electro",
  "Breaks",
  "Jungle",
  "Drum & Bass",
  "Garage",
  "Dubstep",
  "Ambient",
  "Experimental",
  "Hard House",
  "Acid Techno",
  "Acid House",
  "UK Hard House",
  "Speed Garage",
  "UK Garage",
  "Bassline",
  "UK Bass",
  "Rave",
  "Hardcore",
  "Hard Dance",
  "Happy Hardcore",
  "Schranz",
  "EBM",
  "IDM",
  "Downtempo",
  "Disco",
  "Nu-Disco",
  "Funky House",
  "Afro House",
  "Melodic Techno",
  "Melodic House",
  "Organic House",
  "Electronica",
  "Leftfield",
  "Footwork",
  "Ghetto Tech",
  "Baile Funk",
] as const;

export const MAX_PROFILE_GENRE_TAGS = 8;
export const MAX_PROFILE_BIO_LENGTH = 150;
export const MAX_PROMOTER_EVENT_BRANDS = 10;
export const MAX_EVENT_BRAND_NAME_LENGTH = 40;

/** Separator for the `promoter_brand_name` column's list-of-brands format. Reuses the existing
 * text column rather than a schema change — see parseStoredEventBrands/serializeEventBrands. */
const EVENT_BRAND_SEPARATOR = "|";

function collapseEventBrandWhitespace(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Enforces the 40-character limit — used only at the point a brand is
 * actively added (`addEventBrandTag`). Parsing/serializing existing stored
 * brands deliberately does NOT re-apply this (see
 * `dedupeEventBrandsPreservingLength` below): a brand that predates this
 * limit (or otherwise already exceeds it in storage) must not get silently
 * shortened just because the profile was loaded or saved for an unrelated
 * reason. Overlong values are instead handled safely at render time —
 * `PROFILE_TAG_CHIP_BASE_CLASS` truncates with an ellipsis (see
 * `ProfileTagChipList.tsx`).
 */
function normalizeNewEventBrandName(raw: string): string {
  return collapseEventBrandWhitespace(raw).slice(0, MAX_EVENT_BRAND_NAME_LENGTH);
}

/**
 * Trims/collapses whitespace and case-insensitively dedupes without
 * enforcing the length cap, so reading or re-saving existing stored brands
 * (e.g. via `parseStoredEventBrands`/`serializeEventBrands`) never
 * truncates a pre-existing value the user didn't just edit.
 */
function dedupeEventBrandsPreservingLength(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of names) {
    const normalized = collapseEventBrandWhitespace(raw);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

/**
 * `promoter_brand_name` predates the multi-brand Event Brands feature and stores a single
 * `EVENT_BRAND_SEPARATOR`-joined list in the same text column (mirrors how `genre` stores a
 * delimited list of tags) — no schema change needed. An existing single brand name has no
 * separator in it, so it parses as a one-item list automatically, preserving current users'
 * data with no migration step.
 */
export function parseStoredEventBrands(brands: string | null | undefined): string[] {
  if (!brands?.trim()) {
    return [];
  }

  return dedupeEventBrandsPreservingLength(brands.split(EVENT_BRAND_SEPARATOR)).slice(
    0,
    MAX_PROMOTER_EVENT_BRANDS,
  );
}

export function serializeEventBrands(brands: string[]): string {
  return dedupeEventBrandsPreservingLength(brands)
    .slice(0, MAX_PROMOTER_EVENT_BRANDS)
    .join(EVENT_BRAND_SEPARATOR);
}

export function applyEventBrandNameInputLimit(current: string, next: string): string | null {
  return applyTextInputLimit(current, next, MAX_EVENT_BRAND_NAME_LENGTH);
}

export type AddEventBrandResult = {
  brands: string[];
  error: string | null;
};

/** Blank entries are ignored (not an error) — matches "ignore blank entries" in the spec. */
export function addEventBrandTag(currentBrands: string[], rawName: string): AddEventBrandResult {
  const normalized = normalizeNewEventBrandName(rawName);

  if (!normalized) {
    return { brands: currentBrands, error: null };
  }

  if (currentBrands.length >= MAX_PROMOTER_EVENT_BRANDS) {
    return {
      brands: currentBrands,
      error: `You can add up to ${MAX_PROMOTER_EVENT_BRANDS} brands`,
    };
  }

  const isDuplicate = currentBrands.some(
    (brand) => brand.toLowerCase() === normalized.toLowerCase(),
  );

  if (isDuplicate) {
    return { brands: currentBrands, error: "That brand has already been added" };
  }

  return { brands: [...currentBrands, normalized], error: null };
}

export function applyBioInputLimit(currentBio: string, nextBio: string): string | null {
  return applyTextInputLimit(currentBio, nextBio, MAX_PROFILE_BIO_LENGTH);
}

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
  return /^[a-z0-9_.]{3,30}$/.test(username);
}

export const RESERVED_USERNAMES = new Set([
  "admin",
  "support",
  "followthecrowd",
  "ftc",
  "official",
  "system",
]);

const BLOCKED_USERNAME_TERMS = [
  "faggot",
  "fag",
  "fuck",
  "nigger",
  "nigga",
  "retard",
  "rape",
  "hitler",
  "nazi",
];

function containsBlockedUsernameTerm(normalized: string): boolean {
  return BLOCKED_USERNAME_TERMS.some((term) => normalized.includes(term));
}

export function getUsernameFormatError(raw: string): string | null {
  const normalized = normalizeUsername(raw);

  if (!normalized) {
    return "Username is required";
  }

  if (!isValidUsername(normalized)) {
    return "Use 3–30 lowercase letters, numbers, underscores, or dots";
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return "That username is reserved. Choose another one.";
  }

  if (containsBlockedUsernameTerm(normalized)) {
    return "That username is not available";
  }

  return null;
}

export function canCheckUsernameAvailability(normalized: string): boolean {
  return getUsernameFormatError(normalized) === null;
}

export function createProfileFormInputFromProfile(profile: {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  genre: string | null;
  location: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  soundcloud_url: string | null;
  website_url: string | null;
  artist_name: string | null;
  dj_booking_contact_name: string | null;
  promoter_brand_name: string | null;
  promoter_brand_description: string | null;
  dj_availability: string | null;
  dj_past_gigs: string | null;
  promoter_venues_used: string | null;
  promoter_upcoming_events: string | null;
  promoter_past_events: string | null;
}): import("@/lib/user/currentUser").UserProfileInput {
  const displayName = profile.display_name?.trim() ?? "";

  return {
    username: profile.username?.trim() ?? suggestUsernameFromDisplayName(displayName),
    display_name: displayName,
    bio: profile.bio?.trim() ?? "",
    genre: profile.genre?.trim() ?? "",
    location: profile.location?.trim() ?? "",
    instagram_url: profile.instagram_url?.trim() ?? "",
    tiktok_url: profile.tiktok_url?.trim() ?? "",
    soundcloud_url: profile.soundcloud_url?.trim() ?? "",
    website_url: profile.website_url?.trim() ?? "",
    artist_name: profile.artist_name?.trim() ?? "",
    dj_booking_contact_name: profile.dj_booking_contact_name?.trim() ?? "",
    promoter_brand_name: profile.promoter_brand_name?.trim() ?? "",
    promoter_brand_description: profile.promoter_brand_description?.trim() ?? "",
    dj_availability: profile.dj_availability?.trim() ?? "",
    dj_past_gigs: profile.dj_past_gigs?.trim() ?? "",
    promoter_venues_used: profile.promoter_venues_used?.trim() ?? "",
    promoter_upcoming_events: profile.promoter_upcoming_events?.trim() ?? "",
    promoter_past_events: profile.promoter_past_events?.trim() ?? "",
  };
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
  ];
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
      throw new Error("Enter a valid Instagram URL");
    }

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host !== "instagram.com") {
      throw new Error("Instagram link must be an instagram.com URL");
    }

    return parsed.toString();
  }

  const handle = trimmed.replace(/^@+/, "").replace(/\/.*/, "");

  if (!handle) {
    throw new Error("Enter a valid Instagram handle");
  }

  return `https://instagram.com/${handle}`;
}

export function normalizeTikTokInput(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = tryParseUrl(trimmed);

    if (!parsed) {
      throw new Error("Enter a valid TikTok URL");
    }

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host !== "tiktok.com") {
      throw new Error("TikTok link must be a tiktok.com URL");
    }

    const handleMatch = parsed.pathname.match(/^\/@([^/?#]+)/);

    if (!handleMatch?.[1]) {
      throw new Error("Enter a valid TikTok profile URL");
    }

    return `https://www.tiktok.com/@${handleMatch[1]}`;
  }

  const handle = trimmed.replace(/^@+/, "").replace(/\/.*/, "");

  if (!handle) {
    throw new Error("Enter a valid TikTok handle");
  }

  return `https://www.tiktok.com/@${handle}`;
}

function isValidSoundCloudUsername(handle: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(handle);
}

export function normalizeSoundCloudInput(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  const looksLikeUrl =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("soundcloud.com");

  if (looksLikeUrl) {
    const parsed = tryParseUrl(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed.replace(/^\/\//, "")}`,
    );

    if (!parsed) {
      throw new Error("Enter a valid SoundCloud URL");
    }

    const host = parsed.hostname.toLowerCase();

    if (host === "on.soundcloud.com") {
      const shortLink = new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        "https://on.soundcloud.com",
      );

      if (!shortLink.pathname || shortLink.pathname === "/") {
        throw new Error("Enter a valid SoundCloud share link");
      }

      return shortLink.toString();
    }

    const profileHost = host.replace(/^www\./, "").replace(/^m\./, "");

    if (profileHost !== "soundcloud.com") {
      throw new Error("SoundCloud link must be a soundcloud.com URL");
    }

    const profileMatch = parsed.pathname.match(/^\/([^/?#]+)/);

    if (!profileMatch?.[1]) {
      throw new Error("Enter a valid SoundCloud profile URL");
    }

    return `https://soundcloud.com/${profileMatch[1]}`;
  }

  const handle = trimmed.replace(/^@+/, "").replace(/\/.*/, "");

  if (!handle || !isValidSoundCloudUsername(handle)) {
    throw new Error("Enter a valid SoundCloud username");
  }

  return `https://soundcloud.com/${handle}`;
}

export function formatProfileIdentityUsername(username: string | null | undefined): string | null {
  const normalized = normalizeUsername(username ?? "");

  return normalized || null;
}

const ROLE_LITERAL_USERNAMES = new Set(["planner", "dj", "both", "promoter"]);

function pickPublicIdentityField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export type ProfileIdentityPresentation = {
  primary: string;
  secondaryUsername: string | null;
};

/** Public profile heading: meaningful display identity first, @username second when distinct. */
export function resolveProfileIdentityPresentation(profile: {
  display_name?: string | null;
  username?: string | null;
  artist_name?: string | null;
  promoter_brand_name?: string | null;
}): ProfileIdentityPresentation {
  const primary =
    pickPublicIdentityField(profile.display_name) ??
    pickPublicIdentityField(profile.artist_name) ??
    pickPublicIdentityField(parseStoredEventBrands(profile.promoter_brand_name)[0]) ??
    pickPublicIdentityField(formatProfileIdentityUsername(profile.username)) ??
    "Profile";

  const normalizedUsername = formatProfileIdentityUsername(profile.username);
  const formattedUsername = normalizedUsername ? formatPublicUsername(normalizedUsername) : null;

  if (
    !formattedUsername ||
    normalizeUsername(primary) === normalizedUsername ||
    primary.toLowerCase() === formattedUsername.toLowerCase()
  ) {
    return { primary, secondaryUsername: null };
  }

  return { primary, secondaryUsername: formattedUsername };
}

export function isRoleLiteralUsername(username: string | null | undefined): boolean {
  const normalized = formatProfileIdentityUsername(username);

  return normalized ? ROLE_LITERAL_USERNAMES.has(normalized) : false;
}

export function suggestSyntheticQaUsername(role: "planner" | "dj" | "both"): string {
  return `ftcqa_${role}`;
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
    throw new Error(`Enter a valid ${options?.label ?? "URL"}`);
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (options?.allowedHosts?.length && !options.allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new Error(`${options.label ?? "URL"} must use ${options.allowedHosts.join(" or ")}.`);
  }

  return parsed.toString();
}

export function getMusicLinkLabel(url: string | null | undefined): "SoundCloud" | null {
  const trimmed = url?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = tryParseUrl(trimmed);
  const host = parsed?.hostname.replace(/^www\./, "").toLowerCase() ?? "";

  if (host.includes("soundcloud.com")) {
    return "SoundCloud";
  }

  return null;
}

export function isSoundCloudUrl(url: string | null | undefined): boolean {
  return getMusicLinkLabel(url) === "SoundCloud";
}
