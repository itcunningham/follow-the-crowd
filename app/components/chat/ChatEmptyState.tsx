"use client";

/** Centred "nothing here yet" state for a chat's message list (DM, Crew Chat). */
export default function ChatEmptyState({
  icon,
  title,
  subtitle,
  subtitleClassName = "",
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  subtitleClassName?: string;
}) {
  return (
    <div
      data-chat-content-root
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      {icon}
      <p className={`text-sm font-medium text-ftc-text-secondary ${icon ? "mt-4" : ""}`}>
        {title}
      </p>
      <p className={`mt-1 text-sm text-ftc-text-muted ${subtitleClassName}`}>{subtitle}</p>
    </div>
  );
}
