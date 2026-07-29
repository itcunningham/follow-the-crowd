"use client";

/** Centred timestamp between conversation time clusters (Instagram-style). */
export default function DmChatTimeSeparator({
  dateTime,
  label,
}: {
  dateTime: string;
  label: string;
}) {
  return (
    <li
      aria-hidden={false}
      className="flex w-full list-none justify-center px-4 py-2"
      data-chat-time-separator
    >
      <time
        dateTime={dateTime}
        className="whitespace-nowrap text-[11px] font-medium leading-none text-ftc-text-muted"
      >
        {label}
      </time>
    </li>
  );
}
