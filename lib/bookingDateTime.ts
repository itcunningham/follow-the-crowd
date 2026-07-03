const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SINGLE_TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

const SET_TIME_RANGE_SEPARATOR = /\s*[–-]\s*/;

export const SET_TIME_RANGE_JOINER = " – ";

export type Meridiem = "AM" | "PM";

export type ParsedEventDate = {
  isoDate: string;
  legacyValue: string | null;
};

export type ParsedTimePart = {
  time24: string;
  meridiem: Meridiem;
  formatted: string;
};

export type ParsedSetTimeRange = {
  start: ParsedTimePart | null;
  finish: ParsedTimePart | null;
  unparsedRaw: string | null;
};

export function isIsoDateString(value: string): boolean {
  return ISO_DATE_PATTERN.test(value.trim());
}

export function parseEventDate(value: string): ParsedEventDate {
  const trimmed = value.trim();

  if (!trimmed) {
    return { isoDate: "", legacyValue: null };
  }

  if (isIsoDateString(trimmed)) {
    return { isoDate: trimmed, legacyValue: null };
  }

  return { isoDate: "", legacyValue: trimmed };
}

function padTimePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function to24Hour(hour12: number, meridiem: Meridiem): number {
  if (meridiem === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }

  return hour12 === 12 ? 12 : hour12 + 12;
}

function parseSingleTimePart(token: string): ParsedTimePart | null {
  const match = token.trim().match(SINGLE_TIME_PATTERN);

  if (!match) {
    return null;
  }

  const hour12 = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase() as Meridiem;
  const hour24 = to24Hour(hour12, meridiem);

  return {
    time24: `${padTimePart(hour24)}:${padTimePart(minute)}`,
    meridiem,
    formatted: `${hour12}:${padTimePart(minute)} ${meridiem}`,
  };
}

export function parseSetTimeRange(value: string): ParsedSetTimeRange {
  const trimmed = value.trim();

  if (!trimmed) {
    return { start: null, finish: null, unparsedRaw: null };
  }

  const rangeParts = trimmed.split(SET_TIME_RANGE_SEPARATOR);

  if (rangeParts.length === 2) {
    const start = parseSingleTimePart(rangeParts[0]);
    const finish = parseSingleTimePart(rangeParts[1]);

    if (start && finish) {
      return { start, finish, unparsedRaw: null };
    }

    return { start: null, finish: null, unparsedRaw: trimmed };
  }

  const single = parseSingleTimePart(trimmed);

  if (single) {
    return { start: single, finish: null, unparsedRaw: null };
  }

  return { start: null, finish: null, unparsedRaw: trimmed };
}

export function combineSetTimeRange(startFormatted: string, finishFormatted: string): string {
  const start = startFormatted.trim();
  const finish = finishFormatted.trim();

  if (!start) {
    return finish;
  }

  if (!finish) {
    return start;
  }

  return `${start}${SET_TIME_RANGE_JOINER}${finish}`;
}

export function extractClockDisplay(formatted: string): string {
  return formatted.replace(/\s*(AM|PM)\s*$/i, "").trim();
}

export function isCompleteClock(clock: string): boolean {
  const match = clock.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return false;
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);

  return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59;
}

export function sanitizeTimeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

export function clockDisplayToDigits(clock: string): string {
  const match = clock.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return sanitizeTimeDigits(clock);
  }

  return `${Number.parseInt(match[1], 10)}${match[2]}`;
}

function isValidHour(hour: number): boolean {
  return hour >= 1 && hour <= 12;
}

function isValidMinute(minute: number): boolean {
  return minute >= 0 && minute <= 59;
}

export function formatTimeDigits(digits: string): string {
  const d = sanitizeTimeDigits(digits);

  if (!d) {
    return "";
  }

  if (d[0] === "0") {
    return "";
  }

  if (d.length === 1) {
    const hour = Number.parseInt(d[0], 10);

    if (!isValidHour(hour)) {
      return "";
    }

    return `${hour}:`;
  }

  if (d.length === 2) {
    const first = Number.parseInt(d[0], 10);
    const second = Number.parseInt(d[1], 10);

    if (first >= 2) {
      return `${first}:${second}`;
    }

    if (first === 1) {
      return `1:${second}`;
    }

    return "";
  }

  if (d.length === 3) {
    const first = Number.parseInt(d[0], 10);

    if (first >= 2) {
      const hour = first;
      const minute = Number.parseInt(d.slice(1), 10);

      if (!isValidMinute(minute)) {
        return "";
      }

      return `${hour}:${padTimePart(minute)}`;
    }

    if (first === 1) {
      const minute = Number.parseInt(d.slice(1), 10);

      if (!isValidMinute(minute)) {
        return "";
      }

      return `1:${padTimePart(minute)}`;
    }

    return "";
  }

  const hour = Number.parseInt(d.slice(0, 2), 10);
  const minute = Number.parseInt(d.slice(2), 10);

  if (!isValidHour(hour) || !isValidMinute(minute) || hour < 10) {
    return "";
  }

  return `${hour}:${padTimePart(minute)}`;
}

export function applyTimeDigitInput(
  rawValue: string,
  previousDigits = "",
): { digits: string; display: string } {
  const digits = sanitizeTimeDigits(rawValue);
  const previousDisplay = formatTimeDigits(previousDigits);

  if (digits.length === 4) {
    const display = formatTimeDigits(digits);

    if (!display) {
      return { digits: previousDigits, display: previousDisplay };
    }

    return { digits, display };
  }

  if (
    digits.length === previousDigits.length + 1 &&
    digits.startsWith(previousDigits)
  ) {
    const display = formatTimeDigits(digits);

    if (!display) {
      return { digits: previousDigits, display: previousDisplay };
    }

    return { digits, display };
  }

  let nextDigits = digits;
  let display = formatTimeDigits(nextDigits);

  while (nextDigits.length > 0 && !display) {
    nextDigits = nextDigits.slice(0, -1);
    display = formatTimeDigits(nextDigits);
  }

  return { digits: nextDigits, display };
}

export function combineClockAndMeridiem(clock: string, meridiem: Meridiem): string {
  if (!isCompleteClock(clock)) {
    return "";
  }

  const match = clock.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return "";
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);

  return `${hour}:${padTimePart(minute)} ${meridiem}`;
}

export type WheelTimeValue = {
  hour: number;
  minute: number;
  meridiem: Meridiem;
};

export const WHEEL_HOURS = Array.from({ length: 12 }, (_, index) => index + 1);

export const WHEEL_MINUTES = Array.from({ length: 60 }, (_, index) => index);

export const WHEEL_MERIDIEMS: Meridiem[] = ["AM", "PM"];

export function defaultStartWheelTime(): WheelTimeValue {
  return { hour: 9, minute: 0, meridiem: "PM" };
}

export function defaultFinishWheelTime(): WheelTimeValue {
  return { hour: 1, minute: 0, meridiem: "AM" };
}

export function wheelTimeToFormatted(value: WheelTimeValue): string {
  return `${value.hour}:${padTimePart(value.minute)} ${value.meridiem}`;
}

export function clockPartsToWheelTime(clock: string, meridiem: Meridiem): WheelTimeValue | null {
  if (!isCompleteClock(clock)) {
    return null;
  }

  const match = clock.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
    meridiem,
  };
}

export function wheelTimeToClockParts(value: WheelTimeValue): { clock: string; meridiem: Meridiem } {
  return {
    clock: `${value.hour}:${padTimePart(value.minute)}`,
    meridiem: value.meridiem,
  };
}

export function formatTimeButtonLabel(clock: string, meridiem: Meridiem): string {
  return combineClockAndMeridiem(clock, meridiem) || "Select time";
}

export const BOOKING_TIME_BUTTON_CLASS =
  "flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-left text-sm text-zinc-100 outline-none transition hover:border-zinc-700 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15";

export const BOOKING_DATE_TIME_INPUT_CLASS =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 [color-scheme:dark]";

export const BOOKING_FIELD_LABEL_CLASS =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";
