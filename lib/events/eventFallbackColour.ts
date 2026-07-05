export const EVENT_AUTOMATIC_FALLBACK_COLOUR = "slate" as const;

export const EVENT_SELECTABLE_FALLBACK_COLOUR_KEYS = [
  "blue",
  "violet",
  "teal",
  "green",
  "amber",
  "orange",
  "red",
  "pink",
] as const;

export const EVENT_FALLBACK_COLOUR_KEYS = [
  ...EVENT_SELECTABLE_FALLBACK_COLOUR_KEYS,
  EVENT_AUTOMATIC_FALLBACK_COLOUR,
] as const;

export type EventSelectableFallbackColourKey =
  (typeof EVENT_SELECTABLE_FALLBACK_COLOUR_KEYS)[number];

export type EventFallbackColourKey = (typeof EVENT_FALLBACK_COLOUR_KEYS)[number];

export type EventFallbackColourOption = {
  key: EventSelectableFallbackColourKey;
  label: string;
};

export const EVENT_SELECTABLE_FALLBACK_COLOUR_OPTIONS: EventFallbackColourOption[] = [
  { key: "blue", label: "Blue" },
  { key: "violet", label: "Violet" },
  { key: "teal", label: "Teal" },
  { key: "green", label: "Green" },
  { key: "amber", label: "Amber" },
  { key: "orange", label: "Orange" },
  { key: "red", label: "Red" },
  { key: "pink", label: "Pink" },
];

export function isEventFallbackColourKey(value: string): value is EventFallbackColourKey {
  return (EVENT_FALLBACK_COLOUR_KEYS as readonly string[]).includes(value);
}

export function isSelectableEventFallbackColourKey(
  value: string,
): value is EventSelectableFallbackColourKey {
  return (EVENT_SELECTABLE_FALLBACK_COLOUR_KEYS as readonly string[]).includes(value);
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

export function getEventFallbackColour(
  eventName: string,
  savedColour?: string | null,
): EventFallbackColourKey {
  void eventName;

  const trimmedSavedColour = savedColour?.trim();

  if (
    trimmedSavedColour &&
    isSelectableEventFallbackColourKey(trimmedSavedColour)
  ) {
    return trimmedSavedColour;
  }

  return EVENT_AUTOMATIC_FALLBACK_COLOUR;
}

export function getEventFallbackColourStyles(colourKey: EventFallbackColourKey): {
  tileClassName: string;
  textClassName: string;
  swatchClassName: string;
  heroClassName: string;
} {
  switch (colourKey) {
    case "blue":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#1a4882]",
        textClassName: "text-white",
        swatchClassName: "bg-[#1a4882]",
        heroClassName: "bg-[#1a4882]",
      };
    case "violet":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#523581]",
        textClassName: "text-white",
        swatchClassName: "bg-[#523581]",
        heroClassName: "bg-[#523581]",
      };
    case "teal":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#0e665c]",
        textClassName: "text-white",
        swatchClassName: "bg-[#0e665c]",
        heroClassName: "bg-[#0e665c]",
      };
    case "green":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#145c37]",
        textClassName: "text-white",
        swatchClassName: "bg-[#145c37]",
        heroClassName: "bg-[#145c37]",
      };
    case "amber":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#92600a]",
        textClassName: "text-white",
        swatchClassName: "bg-[#92600a]",
        heroClassName: "bg-[#92600a]",
      };
    case "orange":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#9a4312]",
        textClassName: "text-white",
        swatchClassName: "bg-[#9a4312]",
        heroClassName: "bg-[#9a4312]",
      };
    case "red":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#9b2222]",
        textClassName: "text-white",
        swatchClassName: "bg-[#9b2222]",
        heroClassName: "bg-[#9b2222]",
      };
    case "pink":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#9d2463]",
        textClassName: "text-white",
        swatchClassName: "bg-[#9d2463]",
        heroClassName: "bg-[#9d2463]",
      };
    case "slate":
      return {
        tileClassName: "border-ftc-border-subtle bg-[#111820]",
        textClassName: "text-[#e2e8f0]",
        swatchClassName: "bg-[#111820]",
        heroClassName: "bg-[#111820]",
      };
  }
}

export function getEventFallbackColourLabel(colourKey: EventFallbackColourKey): string {
  if (colourKey === EVENT_AUTOMATIC_FALLBACK_COLOUR) {
    return "Auto";
  }

  return (
    EVENT_SELECTABLE_FALLBACK_COLOUR_OPTIONS.find((option) => option.key === colourKey)?.label ??
    colourKey
  );
}
