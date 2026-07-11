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

  const isoDatePrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/)?.[1];

  if (isoDatePrefix && isIsoDateString(isoDatePrefix)) {
    return { isoDate: isoDatePrefix, legacyValue: null };
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

export function compareWheelTimes(a: WheelTimeValue, b: WheelTimeValue): number {
  const aMinutes = to24Hour(a.hour, a.meridiem) * 60 + a.minute;
  const bMinutes = to24Hour(b.hour, b.meridiem) * 60 + b.minute;
  return aMinutes - bMinutes;
}

export function isWheelTimeBefore(value: WheelTimeValue, min: WheelTimeValue): boolean {
  return compareWheelTimes(value, min) < 0;
}

export function getMinWheelTimeFromNow(): WheelTimeValue {
  const now = new Date();
  const hour24 = now.getHours();
  const minute = now.getMinutes();
  const meridiem: Meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;

  if (hour12 === 0) {
    hour12 = 12;
  }

  return { hour: hour12, minute, meridiem };
}

export function getMinWheelTimeForEventDate(eventDate: string): WheelTimeValue | null {
  const dateKey = resolveEventDateKey(eventDate);

  if (!dateKey || dateKey !== getTodayDateKey()) {
    return null;
  }

  return getMinWheelTimeFromNow();
}

export function isWheelMeridiemDisabled(meridiem: Meridiem, min: WheelTimeValue): boolean {
  const lastMinuteInMeridiem: WheelTimeValue =
    meridiem === "AM"
      ? { hour: 11, minute: 59, meridiem: "AM" }
      : { hour: 11, minute: 59, meridiem: "PM" };

  return isWheelTimeBefore(lastMinuteInMeridiem, min);
}

export function isWheelHourDisabled(hour: number, meridiem: Meridiem, min: WheelTimeValue): boolean {
  if (meridiem !== min.meridiem) {
    return isWheelMeridiemDisabled(meridiem, min);
  }

  return hour < min.hour;
}

export function isWheelMinuteDisabled(
  minute: number,
  hour: number,
  meridiem: Meridiem,
  min: WheelTimeValue,
): boolean {
  return isWheelTimeBefore({ hour, minute, meridiem }, min);
}

export function clampWheelTimeToMin(
  value: WheelTimeValue,
  min: WheelTimeValue | null | undefined,
): WheelTimeValue {
  if (!min || !isWheelTimeBefore(value, min)) {
    return value;
  }

  return min;
}

export function resolveWheelTimeForPicker(
  value: WheelTimeValue,
  min: WheelTimeValue | null | undefined,
): WheelTimeValue {
  return clampWheelTimeToMin(value, min);
}

export function formatTimeButtonLabel(clock: string, meridiem: Meridiem): string {
  return combineClockAndMeridiem(clock, meridiem) || "Select time";
}

export const BOOKING_TIME_BUTTON_CLASS =
  "ftc-field-trigger flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm";

export const BOOKING_TIME_BUTTON_COMPACT_CLASS =
  "ftc-field-trigger inline-flex w-full min-h-[2.25rem] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:min-h-[2rem] lg:max-w-[6.25rem]";

export const BOOKING_DATE_TIME_INPUT_CLASS =
  "ftc-field-trigger w-full rounded-xl px-3.5 py-2.5 text-sm [color-scheme:dark]";

export const BOOKING_FIELD_LABEL_CLASS = "ftc-label";

export const EVENT_START_IN_PAST_ERROR =
  "Event start must be in the future. Choose a later date and time.";

export const EVENT_DATE_REQUIRES_PICKER_ERROR =
  "Choose an event date from the calendar.";

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = padTimePart(now.getMonth() + 1);
  const day = padTimePart(now.getDate());
  return `${year}-${month}-${day}`;
}

export function isDateKeyBeforeToday(isoDate: string): boolean {
  if (!isIsoDateString(isoDate)) {
    return false;
  }

  return isoDate.trim() < getTodayDateKey();
}

export function isDateKeyBeforeMin(isoDate: string, minDate: string): boolean {
  if (!isIsoDateString(isoDate) || !isIsoDateString(minDate)) {
    return false;
  }

  return isoDate.trim() < minDate.trim();
}

export function resolveMinEventDateKey(minDate?: string): string {
  return minDate?.trim() || getTodayDateKey();
}

export function resolvePickerEventDateValue(
  eventDate: string,
  minDate?: string,
): string {
  const effectiveMinDate = resolveMinEventDateKey(minDate);
  const parsed = parseEventDate(eventDate);

  if (parsed.isoDate) {
    return isDateKeyBeforeMin(parsed.isoDate, effectiveMinDate) ? "" : parsed.isoDate;
  }

  if (parsed.legacyValue) {
    return "";
  }

  return eventDate;
}

export function guardEventDatePickerChange(
  nextValue: string,
  minDate?: string,
): string | null {
  const parsed = parseEventDate(nextValue);
  const isoDate = parsed.isoDate.trim();

  if (!isoDate) {
    return nextValue;
  }

  if (isDateKeyBeforeMin(isoDate, resolveMinEventDateKey(minDate))) {
    return null;
  }

  return isoDate;
}

export function isSavedEventDateBeforeMin(
  eventDate: string,
  minDate?: string,
): boolean {
  const dateKey = resolveEventDateKey(eventDate);

  if (!dateKey) {
    return false;
  }

  return isDateKeyBeforeMin(dateKey, resolveMinEventDateKey(minDate));
}

export function savedEventDateNeedsPickerReselection(
  eventDate: string,
  minDate?: string,
): boolean {
  const parsed = parseEventDate(eventDate);

  if (parsed.legacyValue) {
    return true;
  }

  if (!parsed.isoDate) {
    return false;
  }

  return isDateKeyBeforeMin(parsed.isoDate, resolveMinEventDateKey(minDate));
}

export function sanitizePrefilledEventDateKey(eventDate: string, minDate?: string): string {
  const dateKey = resolveEventDateKey(eventDate);

  if (!dateKey || isDateKeyBeforeMin(dateKey, resolveMinEventDateKey(minDate))) {
    return "";
  }

  return dateKey;
}

export function dateKeyFromLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());
  return `${year}-${month}-${day}`;
}

export function resolveEventDateKey(eventDate: string): string | null {
  const parsed = parseEventDate(eventDate);

  if (parsed.isoDate) {
    return parsed.isoDate;
  }

  if (!parsed.legacyValue) {
    return null;
  }

  const parsedMs = Date.parse(parsed.legacyValue);

  if (Number.isNaN(parsedMs)) {
    return null;
  }

  return dateKeyFromLocalDate(new Date(parsedMs));
}

export function getOrdinalDaySuffix(day: number): string {
  const normalizedDay = Math.trunc(day);
  const remainder100 = normalizedDay % 100;

  if (remainder100 >= 11 && remainder100 <= 13) {
    return "th";
  }

  switch (normalizedDay % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatOrdinalDay(day: number): string {
  return `${Math.trunc(day)}${getOrdinalDaySuffix(day)}`;
}

export function formatIsoDateKeyForDisplay(dateKey: string): string {
  if (!isIsoDateString(dateKey)) {
    return dateKey.trim();
  }

  const [year, month, day] = dateKey.split("-");
  return `${day}-${month}-${year}`;
}

export function formatDisplayEventDate(eventDate: string): string {
  const trimmed = eventDate.trim();

  if (!trimmed) {
    return "";
  }

  const dateKey = resolveEventDateKey(trimmed);

  if (dateKey && isIsoDateString(dateKey)) {
    return formatIsoDateKeyForDisplay(dateKey);
  }

  const parsed = parseEventDate(trimmed);

  if (parsed.legacyValue) {
    return parsed.legacyValue;
  }

  return trimmed;
}

export function resolveEventStartDateTime(eventDate: string, setTime: string): Date | null {
  const dateKey = resolveEventDateKey(eventDate);

  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const parsedTime = parseSetTimeRange(setTime);

  if (parsedTime.start) {
    const [hour24, minute] = parsedTime.start.time24.split(":").map(Number);
    return new Date(year, month - 1, day, hour24, minute, 0, 0);
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function minutesFromTime24(time24: string): number {
  const [hour, minute] = time24.split(":").map(Number);
  return hour * 60 + minute;
}

export function resolveEventEndDateTime(eventDate: string, setTime: string): Date | null {
  const dateKey = resolveEventDateKey(eventDate);

  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const parsedTime = parseSetTimeRange(setTime);

  if (parsedTime.finish) {
    const [endHour, endMinute] = parsedTime.finish.time24.split(":").map(Number);
    const endDay =
      parsedTime.start &&
      minutesFromTime24(parsedTime.finish.time24) <= minutesFromTime24(parsedTime.start.time24)
        ? day + 1
        : day;

    return new Date(year, month - 1, endDay, endHour, endMinute, 0, 0);
  }

  if (parsedTime.start) {
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export function isPlannerEventPast(
  eventDate: string,
  setTime: string,
  referenceDate: Date = new Date(),
): boolean {
  const endDateTime = resolveEventEndDateTime(eventDate, setTime);

  if (!endDateTime) {
    const dateKey = resolveEventDateKey(eventDate);

    if (!dateKey) {
      return false;
    }

    return dateKey < dateKeyFromLocalDate(referenceDate);
  }

  return endDateTime.getTime() < referenceDate.getTime();
}

export function getEventDateValidationError(eventDate: string, setTime: string): string | null {
  const trimmedDate = eventDate.trim();

  if (!trimmedDate) {
    return null;
  }

  const parsed = parseEventDate(eventDate);
  const dateKey = resolveEventDateKey(eventDate);

  if (!dateKey) {
    return EVENT_DATE_REQUIRES_PICKER_ERROR;
  }

  if (parsed.legacyValue && !parsed.isoDate) {
    if (isDateKeyBeforeToday(dateKey)) {
      return EVENT_START_IN_PAST_ERROR;
    }

    return EVENT_DATE_REQUIRES_PICKER_ERROR;
  }

  if (isDateKeyBeforeToday(dateKey)) {
    return EVENT_START_IN_PAST_ERROR;
  }

  if (dateKey !== getTodayDateKey()) {
    return null;
  }

  const startDateTime = resolveEventStartDateTime(eventDate, setTime);

  if (!startDateTime) {
    return null;
  }

  return startDateTime.getTime() < Date.now() ? EVENT_START_IN_PAST_ERROR : null;
}

export function isEventStartInPast(eventDate: string, setTime: string): boolean {
  return getEventDateValidationError(eventDate, setTime) === EVENT_START_IN_PAST_ERROR;
}

export function isEventStartSaveBlocked(eventDate: string, setTime: string): boolean {
  return getEventDateValidationError(eventDate, setTime) !== null;
}

export function getEventStartInPastError(eventDate: string, setTime: string): string | null {
  const error = getEventDateValidationError(eventDate, setTime);

  if (error === EVENT_START_IN_PAST_ERROR || error === EVENT_DATE_REQUIRES_PICKER_ERROR) {
    return error;
  }

  return null;
}
