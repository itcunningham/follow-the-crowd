export const EVENT_FALLBACK_COLOUR_KEYS = [
  "blue",
  "violet",
  "teal",
  "green",
  "amber",
  "red",
  "slate",
] as const;

export type EventFallbackColourKey = (typeof EVENT_FALLBACK_COLOUR_KEYS)[number];

export type EventFallbackColourOption = {
  key: EventFallbackColourKey;
  label: string;
};

export const EVENT_FALLBACK_COLOUR_OPTIONS: EventFallbackColourOption[] = [
  { key: "blue", label: "Blue" },
  { key: "violet", label: "Violet" },
  { key: "teal", label: "Teal" },
  { key: "green", label: "Green" },
  { key: "amber", label: "Amber" },
  { key: "red", label: "Red" },
  { key: "slate", label: "Slate" },
];

export function isEventFallbackColourKey(value: string): value is EventFallbackColourKey {
  return (EVENT_FALLBACK_COLOUR_KEYS as readonly string[]).includes(value);
}

export function getEventInitials(eventName: string): string {
  const words = eventName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "E";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function hashEventName(eventName: string): number {
  let hash = 0;

  for (let index = 0; index < eventName.length; index += 1) {
    hash = (hash * 31 + eventName.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getEventFallbackColour(
  eventName: string,
  savedColour?: string | null,
): EventFallbackColourKey {
  const trimmedSavedColour = savedColour?.trim();

  if (trimmedSavedColour && isEventFallbackColourKey(trimmedSavedColour)) {
    return trimmedSavedColour;
  }

  const normalizedName = eventName.trim().toLowerCase() || "event";
  const hash = hashEventName(normalizedName);

  return EVENT_FALLBACK_COLOUR_KEYS[hash % EVENT_FALLBACK_COLOUR_KEYS.length];
}

export function getEventFallbackColourStyles(colourKey: EventFallbackColourKey): {
  tileClassName: string;
  textClassName: string;
  heroAccentClassName: string;
} {
  switch (colourKey) {
    case "blue":
      return {
        tileClassName: "border-sky-500/35 bg-sky-500/10",
        textClassName: "text-sky-400",
        heroAccentClassName: "from-sky-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
    case "violet":
      return {
        tileClassName: "border-violet-500/35 bg-violet-500/10",
        textClassName: "text-violet-400",
        heroAccentClassName: "from-violet-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
    case "teal":
      return {
        tileClassName: "border-teal-500/35 bg-teal-500/10",
        textClassName: "text-teal-400",
        heroAccentClassName: "from-teal-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
    case "green":
      return {
        tileClassName: "border-emerald-500/35 bg-emerald-500/10",
        textClassName: "text-emerald-400",
        heroAccentClassName: "from-emerald-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
    case "amber":
      return {
        tileClassName: "border-amber-500/35 bg-amber-500/10",
        textClassName: "text-amber-400",
        heroAccentClassName: "from-amber-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
    case "red":
      return {
        tileClassName: "border-rose-500/35 bg-rose-500/10",
        textClassName: "text-rose-400",
        heroAccentClassName: "from-rose-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
    case "slate":
      return {
        tileClassName: "border-slate-500/35 bg-slate-500/10",
        textClassName: "text-slate-300",
        heroAccentClassName: "from-slate-500/20 via-ftc-bg-elevated to-ftc-bg",
      };
  }
}
