"use client";

import Link from "next/link";
import { PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS } from "@/app/components/planner/PlannerWorkspaceLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getBookingRequestHref,
  groupActiveBookingsByDate,
  listMyActiveReceivedBookings,
  type BookingRequest,
} from "@/lib/bookingRequests";
import {
  getFlatAvailabilityFillClass,
  getFlatBookingFillClass,
  FTC_CAL_CELL,
  FTC_STATUS_DANGER,
} from "@/lib/ftcFlatStatus";
import CalendarMonthNav from "@/app/components/CalendarMonthNav";
import CalendarDotLegend from "@/app/components/calendar/CalendarDotLegend";
import PlannerCalendarMobileDateStrip from "@/app/components/PlannerCalendarMobileDateStrip";
import { DjCalendarContentSkeleton } from "@/app/components/skeleton/Skeleton";
import {
  batchClearMyAvailabilityForDates,
  batchSaveMyAvailability,
  clearMyAvailabilityForDate,
  formatDjAvailabilityStatusLabel,
  getDjAvailabilityLoadErrorMessage,
  getDjAvailabilityDateStripMarker,
  getDjQuickSelectPreviewFillClass,
  getDjBookingStatusBadgeClass,
  getDjCalendarLegendDotClass,
  DJ_CALENDAR_LEGEND_ITEMS,
  groupAvailabilityEntriesByDate,
  listMyAvailabilityEntries,
  normalizeAvailabilityDate,
  saveMyAvailability,
  type DjAvailabilityEntry,
  type DjAvailabilityStatus,
} from "@/lib/djAvailability";
import {
  buildCalendarOriginState,
  formatCalendarTimeLabel,
  formatPlannerAgendaDateLabel,
  getCalendarWeekRows,
  getDefaultSelectedCalendarDate,
  isSameDay,
  isSameMonth,
  parsePlannerCalendarDateParam,
  resolveCalendarOriginEventHref,
  resolveDjCalendarSelectedDate,
  resolveDjCalendarViewMonthStart,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { prepareMobileDocumentScrollReset } from "@/lib/navigation/prepareMobileDocumentScrollReset";
import { isDateKeyBeforeToday } from "@/lib/bookingDateTime";


const AVAILABILITY_STATUS_VALUES: readonly DjAvailabilityStatus[] = [
  "available",
  "tentative",
  "unavailable",
];

const PERSONAL_STATUS_OPTIONS = AVAILABILITY_STATUS_VALUES.map((value) => ({
  value,
  label: formatDjAvailabilityStatusLabel(value),
}));

const BULK_STATUS_OPTIONS = PERSONAL_STATUS_OPTIONS;

type PendingBulkChoice =
  | { type: "status"; status: DjAvailabilityStatus }
  | { type: "clear" };

function getBulkActionLabel(status: DjAvailabilityStatus): string {
  return formatDjAvailabilityStatusLabel(status);
}

function getDisplayedMonthDates(monthStart: Date): Date[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
}

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function getAvailabilityMenuPositionClass(weekdayIndex: number): string {
  if (weekdayIndex <= 2) {
    return "left-0 origin-top-left";
  }

  if (weekdayIndex >= 4) {
    return "right-0 origin-top-right";
  }

  return "left-1/2 -translate-x-1/2 origin-top";
}

const calendarCellColorBadgeClass = FTC_CAL_CELL;

function getAvailabilityActionPillClass(
  status: DjAvailabilityStatus,
  isActive: boolean,
): string {
  const baseClass = "ftc-filter-pill disabled:opacity-50";

  if (!isActive) {
    return baseClass;
  }

  switch (status) {
    case "available":
      return `${baseClass} border-ftc-primary/50 bg-ftc-primary/10 text-ftc-primary`;
    case "tentative":
      return `${baseClass} border-[color-mix(in_srgb,var(--ftc-color-warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--ftc-color-warning)_12%,transparent)] text-[var(--ftc-color-warning)]`;
    case "unavailable":
      return `${baseClass} border-[color-mix(in_srgb,var(--ftc-color-danger)_55%,transparent)] bg-[color-mix(in_srgb,var(--ftc-color-danger)_12%,transparent)] text-[var(--ftc-color-danger)]`;
  }
}

function DjAvailabilityLegend() {
  return (
    <CalendarDotLegend
      items={DJ_CALENDAR_LEGEND_ITEMS.map((item) => ({
        label: item.label,
        dotClassName: getDjCalendarLegendDotClass(item.kind),
      }))}
    />
  );
}

type DayBookingsPopoverProps = {
  dateKey: string;
  bookings: BookingRequest[];
  monthStart: Date;
  onClose: () => void;
};

function DayBookingsPopover({ dateKey, bookings, monthStart, onClose }: DayBookingsPopoverProps) {
  const calendarOrigin = buildCalendarOriginState({
    calendarDate: dateKey,
    calendarView: "dj",
    monthStart,
  });

  return (
    <div
      data-calendar-overlay=""
      className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-ftc-border-strong bg-ftc-bg-elevated p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
          {bookings.length} booking requests
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
        >
          Close
        </button>
      </div>
      <ul className="max-h-44 space-y-1 overflow-y-auto">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Link
              href={resolveCalendarOriginEventHref(getBookingRequestHref(booking), calendarOrigin)}
              onClick={() => {
                prepareMobileDocumentScrollReset();
                onClose();
              }}
              className="block rounded-lg border border-ftc-border bg-ftc-surface/80 px-2.5 py-2 transition hover:border-ftc-primary/30 hover:bg-ftc-surface"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-ftc-text">
                  {booking.event_name.trim() || "Booking request"}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${getDjBookingStatusBadgeClass(booking.status === "accepted" ? "accepted" : "pending")}`}
                >
                  {booking.status === "accepted" ? "Booked" : "Pending Request"}
                </span>
              </div>
              {booking.set_time.trim() ? (
                <p className="mt-0.5 truncate text-[11px] text-ftc-text-muted">
                  {formatCalendarTimeLabel(booking.set_time)}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <span className="sr-only">Bookings for {dateKey}</span>
    </div>
  );
}

function QuickSelectMenu({
  open,
  onToggle,
  onSelectFridays,
  onSelectSaturdays,
  onSelectWeekends,
  onClearSelection,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onSelectFridays: () => void;
  onSelectSaturdays: () => void;
  onSelectWeekends: () => void;
  onClearSelection: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
        className="rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-2.5 py-1.5 text-[11px] font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
      >
        Quick select
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[11.5rem] rounded-lg border border-ftc-border-strong bg-ftc-bg-elevated p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          {[
            { label: "All Fridays this month", action: onSelectFridays },
            { label: "All Saturdays this month", action: onSelectSaturdays },
            { label: "Weekends this month", action: onSelectWeekends },
            { label: "Clear selection", action: onClearSelection },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                option.action();
                onClose();
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-ftc-text transition hover:bg-ftc-surface/90"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BulkActionBar({
  selectedCount,
  saving,
  pendingChoice,
  error,
  onChooseStatus,
  onChooseClear,
  onConfirm,
  onCancel,
}: {
  selectedCount: number;
  saving: boolean;
  pendingChoice: PendingBulkChoice | null;
  error: string | null;
  onChooseStatus: (status: DjAvailabilityStatus) => void;
  onChooseClear: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const outlineButtonClass =
    "rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-2.5 py-1.5 text-[11px] font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:opacity-50";
  const pendingLabel =
    pendingChoice?.type === "clear"
      ? "Clear"
      : pendingChoice
        ? getBulkActionLabel(pendingChoice.status)
        : null;

  return (
    <div className="sticky bottom-0 z-30 mt-3 rounded-xl border border-ftc-border-strong bg-ftc-bg-elevated/95 p-2 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold text-ftc-text-secondary">
          {selectedCount === 0
            ? "Tap dates to select them"
            : pendingLabel
              ? `${pendingLabel} · ${selectedCount} date${selectedCount === 1 ? "" : "s"}`
              : `${selectedCount} date${selectedCount === 1 ? "" : "s"} selected`}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {BULK_STATUS_OPTIONS.map((option) => {
            const isActive =
              pendingChoice?.type === "status" && pendingChoice.status === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={saving || selectedCount === 0}
                onClick={() => onChooseStatus(option.value)}
                className={`${outlineButtonClass} ${
                  isActive ? getFlatAvailabilityFillClass(option.value) : ""
                }`}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={saving || selectedCount === 0}
            onClick={onChooseClear}
            className={`${outlineButtonClass} ${
              pendingChoice?.type === "clear" ? FTC_STATUS_DANGER : ""
            }`}
          >
            Clear
          </button>
          <button
            type="button"
            disabled={saving || selectedCount === 0 || !pendingChoice}
            onClick={onConfirm}
            className="rounded-lg bg-ftc-primary-dim px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-ftc-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-2.5 py-1.5 text-[11px] font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated px-2.5 py-1.5 text-[11px] text-[var(--ftc-color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

type DjAvailabilityMobileDayPanelProps = {
  selectedDate: Date;
  isTodayDate: boolean;
  personalEntry?: DjAvailabilityEntry;
  dayBookings: BookingRequest[];
  saving: boolean;
  monthStart: Date;
  onSetPersonalStatus: (status: DjAvailabilityStatus) => void;
  onClearPersonalStatus: () => void;
};

function DjAvailabilityMobileDayPanel({
  selectedDate,
  isTodayDate,
  personalEntry,
  dayBookings,
  saving,
  monthStart,
  onSetPersonalStatus,
  onClearPersonalStatus,
}: DjAvailabilityMobileDayPanelProps) {
  const dateKey = toDateKey(selectedDate);
  const calendarOrigin = buildCalendarOriginState({
    calendarDate: dateKey,
    calendarView: "dj",
    monthStart,
  });
  const pendingBookings = dayBookings.filter((booking) => booking.status === "pending");
  const acceptedBookings = dayBookings.filter((booking) => booking.status === "accepted");
  const interactiveBookings = [...pendingBookings, ...acceptedBookings];
  const canEditAvailability = !isDateKeyBeforeToday(dateKey);

  return (
    <>
      <div className="mt-4">
        <h2 className="text-base font-semibold text-ftc-text">
          {formatPlannerAgendaDateLabel(selectedDate)}
        </h2>
        {isTodayDate ? (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
            Today
          </p>
        ) : null}
      </div>

      {canEditAvailability ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERSONAL_STATUS_OPTIONS.map((option) => {
              const isActive = personalEntry?.status === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={saving}
                  onClick={() => onSetPersonalStatus(option.value)}
                  className={getAvailabilityActionPillClass(option.value, isActive)}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={saving || !personalEntry}
              onClick={onClearPersonalStatus}
              className="ftc-filter-pill disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          {saving ? (
            <p className="mt-2 text-xs font-medium text-ftc-text-muted">Saving...</p>
          ) : null}
        </>
      ) : null}

      {interactiveBookings.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {interactiveBookings.map((booking) => (
            <li key={booking.id}>
              <Link
                href={resolveCalendarOriginEventHref(getBookingRequestHref(booking), calendarOrigin)}
                onClick={() => prepareMobileDocumentScrollReset()}
                className="block rounded-xl border border-ftc-border bg-ftc-surface/80 px-3 py-3 transition hover:border-ftc-primary/30 hover:bg-ftc-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ftc-text">
                    {booking.event_name.trim() || "Booking request"}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${getDjBookingStatusBadgeClass(booking.status === "accepted" ? "accepted" : "pending")}`}
                  >
                    {booking.status === "accepted" ? "Booked" : "Pending Request"}
                  </span>
                </div>
                {booking.set_time.trim() ? (
                  <p className="mt-0.5 truncate text-xs text-ftc-text-muted">
                    {formatCalendarTimeLabel(booking.set_time)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : canEditAvailability ? (
        <div className="mt-3 rounded-xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-4 py-6 text-center">
          <p className="text-sm text-ftc-text-muted">No booking requests on this date</p>
        </div>
      ) : null}
    </>
  );
}

type DjAvailabilityMobileAgendaProps = {
  monthStart: Date;
  selectedDate: Date;
  multiSelectMode: boolean;
  selectedDateKeys: Set<string>;
  pendingBulkChoice: PendingBulkChoice | null;
  availabilityByDate: Map<string, DjAvailabilityEntry>;
  bookingsByDate: Map<string, BookingRequest[]>;
  savingDateKey: string | null;
  isTodayDate: (date: Date) => boolean;
  onSelectDate: (date: Date) => void;
  onSetPersonalStatus: (dateKey: string, status: DjAvailabilityStatus) => void;
  onClearPersonalStatus: (dateKey: string) => void;
};

function DjAvailabilityMobileAgenda({
  monthStart,
  selectedDate,
  multiSelectMode,
  selectedDateKeys,
  pendingBulkChoice,
  availabilityByDate,
  bookingsByDate,
  savingDateKey,
  isTodayDate,
  onSelectDate,
  onSetPersonalStatus,
  onClearPersonalStatus,
}: DjAvailabilityMobileAgendaProps) {
  const selectedDateKey = toDateKey(selectedDate);
  const personalEntry = availabilityByDate.get(selectedDateKey);
  const dayBookings = bookingsByDate.get(selectedDateKey) ?? [];

  return (
    <div className="mt-4 md:hidden">
      <PlannerCalendarMobileDateStrip
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        monthStart={monthStart}
        getDateMarker={(dateKey, isHighlighted) => {
          const isBulkSelected = multiSelectMode && selectedDateKeys.has(dateKey);

          return getDjAvailabilityDateStripMarker(
            dateKey,
            availabilityByDate,
            bookingsByDate,
            isHighlighted,
            {
              isSelected: isBulkSelected,
              choice: isBulkSelected ? pendingBulkChoice : null,
            },
          );
        }}
        isDateHighlighted={(date) =>
          multiSelectMode
            ? selectedDateKeys.has(toDateKey(date))
            : isSameDay(date, selectedDate)
        }
      />

      {multiSelectMode ? (
        <p className="mt-4 text-center text-sm text-ftc-text-muted">
          Tap dates on the strip to select them
        </p>
      ) : (
        <DjAvailabilityMobileDayPanel
          selectedDate={selectedDate}
          isTodayDate={isTodayDate(selectedDate)}
          personalEntry={personalEntry}
          dayBookings={dayBookings}
          saving={savingDateKey === selectedDateKey}
          monthStart={monthStart}
          onSetPersonalStatus={(status) => onSetPersonalStatus(selectedDateKey, status)}
          onClearPersonalStatus={() => onClearPersonalStatus(selectedDateKey)}
        />
      )}
    </div>
  );
}

function DjAvailabilityDayCell({
  date,
  isToday,
  weekdayIndex,
  multiSelectMode,
  isSelected,
  pendingBulkChoice,
  personalEntry,
  dayBookings,
  menuOpen,
  bookingPopoverOpen,
  savingDate,
  monthStart,
  onToggleSelect,
  onToggleMenu,
  onCloseOverlays,
  onSetPersonalStatus,
  onClearPersonalStatus,
  onOpenBooking,
  onToggleBookingPopover,
}: {
  date: Date;
  isToday: boolean;
  weekdayIndex: number;
  multiSelectMode: boolean;
  isSelected: boolean;
  pendingBulkChoice: PendingBulkChoice | null;
  personalEntry?: DjAvailabilityEntry;
  dayBookings: BookingRequest[];
  menuOpen: boolean;
  bookingPopoverOpen: boolean;
  savingDate: boolean;
  monthStart: Date;
  onToggleSelect: () => void;
  onToggleMenu: () => void;
  onCloseOverlays: () => void;
  onSetPersonalStatus: (status: DjAvailabilityStatus) => void;
  onClearPersonalStatus: () => void;
  onOpenBooking: (booking: BookingRequest, calendarDate: string) => void;
  onToggleBookingPopover: () => void;
}) {
  const dateKey = toDateKey(date);
  const canEditAvailability = !isDateKeyBeforeToday(dateKey);
  const pendingBookings = dayBookings.filter((booking) => booking.status === "pending");
  const acceptedBookings = dayBookings.filter((booking) => booking.status === "accepted");
  const interactiveBookings = [...pendingBookings, ...acceptedBookings];
  const isPreviewingAvailability = multiSelectMode && isSelected && pendingBulkChoice !== null;
  const previewStatus =
    isPreviewingAvailability && pendingBulkChoice.type === "status"
      ? pendingBulkChoice.status
      : null;
  const previewClearsAvailability =
    isPreviewingAvailability && pendingBulkChoice.type === "clear";

  function handleCellClick() {
    if (multiSelectMode) {
      onToggleSelect();
    }
  }

  function handleCellKeyDown(event: { key: string; preventDefault: () => void }) {
    if (!multiSelectMode) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleSelect();
    }
  }

  return (
    <div
      role={multiSelectMode ? "button" : undefined}
      tabIndex={multiSelectMode ? 0 : undefined}
      aria-pressed={multiSelectMode ? isSelected : undefined}
      aria-label={multiSelectMode ? `Select ${dateKey}` : undefined}
      onClick={multiSelectMode ? handleCellClick : undefined}
      onKeyDown={multiSelectMode ? handleCellKeyDown : undefined}
      className={`relative min-h-[6.5rem] rounded-lg border bg-ftc-bg-elevated/20 p-1.5 transition sm:min-h-[7.5rem] sm:p-2 ${
        multiSelectMode
          ? isSelected
            ? "cursor-pointer border-ftc-primary"
            : "cursor-pointer border-ftc-border/70 hover:border-ftc-border-strong"
          : menuOpen
            ? "border-ftc-border-strong"
            : "border-ftc-border/70 hover:border-ftc-border-strong/90"
      }`}
    >
      {multiSelectMode && isSelected ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ftc-primary-dim text-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-1">
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold ${
            isToday ? "bg-ftc-primary text-ftc-bg" : "text-ftc-text"
          }`}
        >
          {date.getDate()}
        </span>
        {!multiSelectMode && canEditAvailability ? (
          <div className="relative">
            <button
              type="button"
              data-calendar-overlay=""
              aria-label={`Availability options for ${dateKey}`}
              aria-expanded={menuOpen}
              onClick={onToggleMenu}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-ftc-text-muted transition hover:border-ftc-border-subtle hover:bg-ftc-surface/80 hover:text-ftc-text focus:outline-none focus-visible:border-ftc-border-strong"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <circle cx="5" cy="12" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="19" cy="12" r="1.75" />
              </svg>
            </button>
            {menuOpen ? (
              <div
                data-calendar-overlay=""
                className={`absolute top-6 z-50 w-[7.25rem] rounded-lg border border-ftc-border-strong/70 bg-ftc-bg-elevated/95 p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm ${getAvailabilityMenuPositionClass(weekdayIndex)}`}
              >
                {PERSONAL_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={savingDate}
                    onClick={() => onSetPersonalStatus(option.value)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-ftc-text transition hover:bg-ftc-surface/90 disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
                <div className="my-0.5 border-t border-ftc-border" />
                <button
                  type="button"
                  disabled={savingDate || !personalEntry}
                  onClick={onClearPersonalStatus}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-ftc-text-muted transition hover:bg-ftc-surface/90 hover:text-red-300 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`relative mt-1 space-y-1 ${multiSelectMode ? "pointer-events-none" : ""}`}>
          {!previewClearsAvailability && previewStatus ? (
            <span
              title={formatDjAvailabilityStatusLabel(previewStatus)}
              className={`${calendarCellColorBadgeClass} ${getDjQuickSelectPreviewFillClass(previewStatus)}`}
            >
              <span className="sr-only">{formatDjAvailabilityStatusLabel(previewStatus)}</span>
            </span>
          ) : !previewClearsAvailability && personalEntry ? (
            <span
              title={formatDjAvailabilityStatusLabel(personalEntry.status)}
              className={`${calendarCellColorBadgeClass} ${getFlatAvailabilityFillClass(personalEntry.status)}`}
            >
              <span className="sr-only">{formatDjAvailabilityStatusLabel(personalEntry.status)}</span>
            </span>
          ) : null}

          {pendingBookings.length === 1 ? (
            <button
              type="button"
              title="Pending Request"
              aria-label="Pending Request"
              onClick={() => onOpenBooking(pendingBookings[0], dateKey)}
              className={`${calendarCellColorBadgeClass} transition hover:opacity-90 ${getFlatBookingFillClass("pending")}`}
            >
              <span className="sr-only">Pending Request</span>
            </button>
          ) : pendingBookings.length > 1 ? (
            <div className="relative">
              <button
                type="button"
                data-calendar-overlay=""
                title={`${pendingBookings.length} booking requests`}
                aria-label={`${pendingBookings.length} booking requests`}
                onClick={onToggleBookingPopover}
                className={`${calendarCellColorBadgeClass} transition hover:opacity-90 ${getFlatBookingFillClass("pending")}`}
              >
                <span className="sr-only">{pendingBookings.length} booking requests</span>
              </button>
              {bookingPopoverOpen ? (
                <DayBookingsPopover
                  dateKey={dateKey}
                  bookings={interactiveBookings}
                  monthStart={monthStart}
                  onClose={onCloseOverlays}
                />
              ) : null}
            </div>
          ) : null}

          {acceptedBookings.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => onOpenBooking(booking, dateKey)}
              className={`block w-full rounded-md border-0 px-1 py-1 text-left transition hover:opacity-90 ${getDjBookingStatusBadgeClass("accepted")}`}
            >
              <span className="block truncate text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]">
                Booked
              </span>
              <span className="block truncate text-[9px] normal-case tracking-normal text-ftc-bg/90 sm:text-[10px]">
                {booking.event_name.trim() || "Confirmed gig"}
              </span>
              {booking.set_time.trim() ? (
                <span className="block truncate text-[9px] normal-case tracking-normal text-ftc-bg/75 sm:text-[10px]">
                  {formatCalendarTimeLabel(booking.set_time)}
                </span>
              ) : null}
            </button>
          ))}
      </div>
    </div>
  );
}

export default function DjAvailabilityCalendar({
  description = "Manage your availability and bookings.",
}: {
  description?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMonthStart = resolveDjCalendarViewMonthStart(
    searchParams.get("date"),
    searchParams.get("month"),
  );
  const [monthStart, setMonthStart] = useState(() => initialMonthStart);
  const [selectedDate, setSelectedDate] = useState(() =>
    resolveDjCalendarSelectedDate(searchParams.get("date"), initialMonthStart),
  );
  const [availabilityEntries, setAvailabilityEntries] = useState<DjAvailabilityEntry[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDateKey, setSavingDateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayParts, setTodayParts] = useState<{ year: number; month: number; day: number } | null>(
    null,
  );
  const [openMenuDateKey, setOpenMenuDateKey] = useState<string | null>(null);
  const [openBookingPopoverDateKey, setOpenBookingPopoverDateKey] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDateKeys, setSelectedDateKeys] = useState<Set<string>>(() => new Set());
  const [quickSelectOpen, setQuickSelectOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [pendingBulkChoice, setPendingBulkChoice] = useState<PendingBulkChoice | null>(null);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    const nextMonthStart = resolveDjCalendarViewMonthStart(
      searchParams.get("date"),
      searchParams.get("month"),
    );

    setMonthStart((current) =>
      current.getTime() === nextMonthStart.getTime() ? current : nextMonthStart,
    );

    const restoredDate = parsePlannerCalendarDateParam(searchParams.get("date"));

    if (restoredDate) {
      setSelectedDate(restoredDate);
    }
  }, [searchParams]);

  useEffect(() => {
    const now = new Date();
    setTodayParts({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    });
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const viewingCurrentMonth =
    todayParts !== null &&
    monthStart.getFullYear() === todayParts.year &&
    monthStart.getMonth() === todayParts.month;

  function closeCalendarOverlays() {
    setOpenMenuDateKey(null);
    setOpenBookingPopoverDateKey(null);
  }

  function exitMultiSelectMode() {
    setMultiSelectMode(false);
    setSelectedDateKeys(new Set());
    setQuickSelectOpen(false);
    setPendingBulkChoice(null);
    setBulkActionError(null);
    closeCalendarOverlays();
  }

  function enterMultiSelectMode() {
    closeCalendarOverlays();
    setMultiSelectMode(true);
    setSelectedDateKeys(new Set());
  }

  function toggleDateSelection(dateKey: string) {
    setSelectedDateKeys((current) => {
      const next = new Set(current);

      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }

      return next;
    });
  }

  function selectDisplayedDatesMatching(predicate: (date: Date) => boolean) {
    const keys = getDisplayedMonthDates(monthStart).filter(predicate).map(toDateKey);
    setSelectedDateKeys(new Set(keys));
  }

  function mergeAvailabilityEntries(entries: DjAvailabilityEntry[]) {
    setAvailabilityEntries((current) => {
      const next = [...current];

      for (const entry of entries) {
        const normalizedDate = normalizeAvailabilityDate(entry.date);
        const existingIndex = next.findIndex(
          (existing) => normalizeAvailabilityDate(existing.date) === normalizedDate,
        );

        if (existingIndex >= 0) {
          next[existingIndex] = entry;
        } else {
          next.push(entry);
        }
      }

      return next;
    });
  }

  function removeAvailabilityEntriesForDates(dates: string[]) {
    const normalizedDates = new Set(dates.map(normalizeAvailabilityDate));

    setAvailabilityEntries((current) =>
      current.filter((entry) => !normalizedDates.has(normalizeAvailabilityDate(entry.date))),
    );
  }

  function chooseBulkStatus(status: DjAvailabilityStatus) {
    if (selectedDateKeys.size === 0 || bulkSaving) {
      return;
    }

    setBulkActionError(null);
    setPendingBulkChoice({ type: "status", status });
  }

  function chooseBulkClear() {
    if (selectedDateKeys.size === 0 || bulkSaving) {
      return;
    }

    setBulkActionError(null);
    setPendingBulkChoice({ type: "clear" });
  }

  async function handleConfirmBulkAction() {
    if (!pendingBulkChoice || selectedDateKeys.size === 0 || bulkSaving) {
      return;
    }

    const dates = [...selectedDateKeys];
    setBulkSaving(true);
    setBulkActionError(null);

    try {
      if (pendingBulkChoice.type === "clear") {
        await batchClearMyAvailabilityForDates(dates);
        removeAvailabilityEntriesForDates(dates);
        setToastMessage(`${dates.length} date${dates.length === 1 ? "" : "s"} cleared`);
      } else {
        const entries = await batchSaveMyAvailability({
          dates,
          status: pendingBulkChoice.status,
        });
        mergeAvailabilityEntries(entries);
        setToastMessage(`${dates.length} date${dates.length === 1 ? "" : "s"} updated`);
      }

      setPendingBulkChoice(null);
      exitMultiSelectMode();
    } catch (saveError) {
      console.error("Failed to bulk update availability:", saveError);
      setBulkActionError(
        saveError instanceof Error ? saveError.message : "Failed to update availability",
      );
    } finally {
      setBulkSaving(false);
    }
  }

  function isTodayDate(date: Date): boolean {
    if (!viewingCurrentMonth || todayParts === null) {
      return false;
    }

    return (
      date.getFullYear() === todayParts.year &&
      date.getMonth() === todayParts.month &&
      date.getDate() === todayParts.day
    );
  }

  function isMobileTodayDate(date: Date): boolean {
    if (todayParts === null) {
      return false;
    }

    return (
      date.getFullYear() === todayParts.year &&
      date.getMonth() === todayParts.month &&
      date.getDate() === todayParts.day
    );
  }

  function handleMonthStartChange(nextMonthStart: Date) {
    closeCalendarOverlays();
    setMonthStart(nextMonthStart);
    setSelectedDate((current) => {
      if (isSameMonth(current, nextMonthStart)) {
        return current;
      }

      return getDefaultSelectedCalendarDate(nextMonthStart, todayParts);
    });
  }

  function handleMobileSelectDate(date: Date) {
    closeCalendarOverlays();

    if (multiSelectMode) {
      toggleDateSelection(toDateKey(date));
    }

    setSelectedDate(date);
  }

  const availabilityByDate = useMemo(
    () => groupAvailabilityEntriesByDate(availabilityEntries),
    [availabilityEntries],
  );

  const bookingsByDate = useMemo(() => groupActiveBookingsByDate(bookings), [bookings]);

  const calendarWeeks = useMemo(() => getCalendarWeekRows(monthStart), [monthStart]);

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [entries, activeBookings] = await Promise.all([
        listMyAvailabilityEntries(),
        listMyActiveReceivedBookings(),
      ]);
      setAvailabilityEntries(entries);
      setBookings(activeBookings);
    } catch (loadError) {
      console.error("Failed to load DJ availability calendar:", loadError);
      setAvailabilityEntries([]);
      setBookings([]);
      setError(getDjAvailabilityLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendarData();
  }, [loadCalendarData]);

  useEffect(() => {
    if (!openMenuDateKey && !openBookingPopoverDateKey) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;

      if (target instanceof Element && target.closest("[data-calendar-overlay]")) {
        return;
      }

      closeCalendarOverlays();
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenuDateKey, openBookingPopoverDateKey]);

  async function handleSetPersonalStatus(dateKey: string, status: DjAvailabilityStatus) {
    if (isDateKeyBeforeToday(dateKey)) {
      return;
    }

    setSavingDateKey(dateKey);
    setError(null);
    setOpenMenuDateKey(null);

    try {
      const entry = await saveMyAvailability({ date: dateKey, status });
      setAvailabilityEntries((current) => {
        const normalizedDate = normalizeAvailabilityDate(entry.date);
        const next = current.filter(
          (existing) => normalizeAvailabilityDate(existing.date) !== normalizedDate,
        );
        next.push(entry);
        return next;
      });
    } catch (saveError) {
      console.error("Failed to save personal availability:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save availability");
    } finally {
      setSavingDateKey(null);
    }
  }

  async function handleClearPersonalStatus(dateKey: string) {
    if (isDateKeyBeforeToday(dateKey)) {
      return;
    }

    setSavingDateKey(dateKey);
    setError(null);
    setOpenMenuDateKey(null);

    try {
      await clearMyAvailabilityForDate(dateKey);
      setAvailabilityEntries((current) =>
        current.filter((entry) => normalizeAvailabilityDate(entry.date) !== dateKey),
      );
    } catch (clearError) {
      console.error("Failed to clear personal availability:", clearError);
      setError(clearError instanceof Error ? clearError.message : "Failed to clear availability");
    } finally {
      setSavingDateKey(null);
    }
  }

  function handleOpenBooking(booking: BookingRequest, calendarDate: string) {
    setOpenBookingPopoverDateKey(null);
    setOpenMenuDateKey(null);

    const calendarOrigin = buildCalendarOriginState({
      calendarDate,
      calendarView: "dj",
      monthStart,
    });

    prepareMobileDocumentScrollReset();
    router.push(resolveCalendarOriginEventHref(getBookingRequestHref(booking), calendarOrigin));
  }

  return (
    <section className={PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="text-sm text-ftc-text-muted">{description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
            {!multiSelectMode ? (
              <button
                type="button"
                onClick={enterMultiSelectMode}
                className="rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-2.5 py-1.5 text-[11px] font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
              >
                Select dates
              </button>
            ) : (
              <QuickSelectMenu
                open={quickSelectOpen}
                onToggle={() => setQuickSelectOpen((open) => !open)}
                onSelectFridays={() =>
                  selectDisplayedDatesMatching((date) => getWeekdayIndex(date) === 4)
                }
                onSelectSaturdays={() =>
                  selectDisplayedDatesMatching((date) => getWeekdayIndex(date) === 5)
                }
                onSelectWeekends={() =>
                  selectDisplayedDatesMatching((date) => {
                    const weekday = getWeekdayIndex(date);
                    return weekday === 4 || weekday === 5;
                  })
                }
                onClearSelection={() => setSelectedDateKeys(new Set())}
                onClose={() => setQuickSelectOpen(false)}
              />
            )}
          </div>
        </div>

        {loading ? (
          <DjCalendarContentSkeleton />
        ) : (
          <div className="transition-opacity duration-200 ease-out opacity-100 motion-reduce:transition-none">
            <div className="relative mt-4">
              {toastMessage ? (
                <p className="pointer-events-none absolute inset-x-0 -top-1 z-10 flex justify-center">
                  <span className="rounded-full border-0 bg-ftc-primary px-3 py-1 text-[11px] font-medium text-ftc-bg">
                    {toastMessage}
                  </span>
                </p>
              ) : null}
              {error ? (
                <p
                  role="alert"
                  className="pointer-events-none absolute inset-x-0 -top-1 z-10 flex justify-center"
                >
                  <span className="rounded-full border-0 bg-[var(--ftc-color-danger)] px-3 py-1 text-[11px] font-medium text-ftc-bg">
                    {error}
                  </span>
                </p>
              ) : null}

              <CalendarMonthNav
                monthStart={monthStart}
                onMonthStartChange={handleMonthStartChange}
                onBeforeNavigate={() => {
                  closeCalendarOverlays();
                  exitMultiSelectMode();
                }}
              />
            </div>

            <div className="mt-3">
              <DjAvailabilityLegend />
            </div>

            <DjAvailabilityMobileAgenda
              monthStart={monthStart}
              selectedDate={selectedDate}
              multiSelectMode={multiSelectMode}
              selectedDateKeys={selectedDateKeys}
              pendingBulkChoice={pendingBulkChoice}
              availabilityByDate={availabilityByDate}
              bookingsByDate={bookingsByDate}
              savingDateKey={savingDateKey}
              isTodayDate={isMobileTodayDate}
              onSelectDate={handleMobileSelectDate}
              onSetPersonalStatus={(dateKey, status) => void handleSetPersonalStatus(dateKey, status)}
              onClearPersonalStatus={(dateKey) => void handleClearPersonalStatus(dateKey)}
            />

            <div
              className={`mt-4 hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 md:block ${multiSelectMode ? "pb-1" : ""}`}
            >
              <div className="grid grid-cols-7 border-b border-ftc-border bg-ftc-bg-elevated/60">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted sm:px-2"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 p-2 sm:gap-2 sm:p-2.5">
                {calendarWeeks.flatMap((week, weekIndex) =>
                  week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${weekIndex}-${dayIndex}`}
                          aria-hidden="true"
                          className="min-h-0"
                        />
                      );
                    }

                    const dateKey = toDateKey(day);

                    return (
                      <DjAvailabilityDayCell
                        key={dateKey}
                        date={day}
                        isToday={isTodayDate(day)}
                        weekdayIndex={dayIndex}
                        multiSelectMode={multiSelectMode}
                        isSelected={selectedDateKeys.has(dateKey)}
                        pendingBulkChoice={pendingBulkChoice}
                        personalEntry={availabilityByDate.get(dateKey)}
                        dayBookings={bookingsByDate.get(dateKey) ?? []}
                        menuOpen={!multiSelectMode && openMenuDateKey === dateKey}
                        bookingPopoverOpen={!multiSelectMode && openBookingPopoverDateKey === dateKey}
                        savingDate={savingDateKey === dateKey}
                        monthStart={monthStart}
                        onToggleSelect={() => toggleDateSelection(dateKey)}
                        onToggleMenu={() => {
                          setOpenBookingPopoverDateKey(null);
                          setOpenMenuDateKey((current) => (current === dateKey ? null : dateKey));
                        }}
                        onCloseOverlays={closeCalendarOverlays}
                        onSetPersonalStatus={(status) => void handleSetPersonalStatus(dateKey, status)}
                        onClearPersonalStatus={() => void handleClearPersonalStatus(dateKey)}
                        onOpenBooking={handleOpenBooking}
                        onToggleBookingPopover={() => {
                          setOpenMenuDateKey(null);
                          setOpenBookingPopoverDateKey((current) =>
                            current === dateKey ? null : dateKey,
                          );
                        }}
                      />
                    );
                  }),
                )}
              </div>
            </div>
            {multiSelectMode ? (
              <BulkActionBar
                selectedCount={selectedDateKeys.size}
                saving={bulkSaving}
                pendingChoice={pendingBulkChoice}
                error={bulkActionError}
                onChooseStatus={chooseBulkStatus}
                onChooseClear={chooseBulkClear}
                onConfirm={() => void handleConfirmBulkAction()}
                onCancel={exitMultiSelectMode}
              />
            ) : null}
          </div>
        )}

        <p className="mt-3 hidden text-xs text-ftc-text-muted md:block">
          Use the menu on each date to set personal availability. Booking badges open the linked
          event or DM.
        </p>
      </section>
  );
}
