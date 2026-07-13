"use client";

import { PlannerFilterPills } from "@/app/components/planner/PlannerUi";

type CalendarViewTab = "planner" | "dj";

type CalendarViewTabsProps = {
  activeTab: CalendarViewTab;
  onChange: (tab: CalendarViewTab) => void;
};

const TABS: { value: CalendarViewTab; label: string }[] = [
  { value: "planner", label: "Events Calendar" },
  { value: "dj", label: "Gigs Calendar" },
];

export default function CalendarViewTabs({ activeTab, onChange }: CalendarViewTabsProps) {
  return <PlannerFilterPills options={TABS} value={activeTab} onChange={onChange} />;
}

export type { CalendarViewTab };
