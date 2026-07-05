"use client";

type CalendarViewTab = "planner" | "dj";

type CalendarViewTabsProps = {
  activeTab: CalendarViewTab;
  onChange: (tab: CalendarViewTab) => void;
};

const TABS: { value: CalendarViewTab; label: string }[] = [
  { value: "planner", label: "Planner Calendar" },
  { value: "dj", label: "DJ Calendar" },
];

export default function CalendarViewTabs({ activeTab, onChange }: CalendarViewTabsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive ? "ftc-tab-active" : "ftc-tab-inactive"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export type { CalendarViewTab };
