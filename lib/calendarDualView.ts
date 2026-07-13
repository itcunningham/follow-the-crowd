import type { CalendarItem, CalendarMobileDateStripMarker } from "@/lib/calendar";

export type CalendarMobileStripConfig = {
  itemsByDate?: Map<string, CalendarItem[]>;
  getDateMarker?: (dateKey: string, isHighlighted: boolean) => CalendarMobileDateStripMarker | null;
  isDateHighlighted?: (date: Date) => boolean;
  onSelectDate?: (date: Date) => void;
};

export type CalendarSharedViewState = {
  monthStart: Date;
  selectedDate: Date;
  onMonthStartChange: (nextMonthStart: Date) => void;
  onSelectDate: (date: Date) => void;
};

export type CalendarDualModeRegistration = {
  onBeforeMonthNavigate?: () => void;
};

export type CalendarDualModeProps = {
  variant?: "standalone" | "dual";
  isActive?: boolean;
  sharedViewState?: CalendarSharedViewState;
  onMobileStripConfigChange?: (config: CalendarMobileStripConfig) => void;
  onMonthActivityDotClassChange?: (getter: (month: number, year: number) => string | null) => void;
  onDualModeRegistration?: (registration: CalendarDualModeRegistration) => void;
};
