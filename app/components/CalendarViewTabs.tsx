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
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border border-blue-500/45 bg-blue-600/15 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.12)]"
                : "border border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:border-blue-500/30 hover:text-blue-300"
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
