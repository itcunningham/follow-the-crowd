export default function ChatSendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="m20 12-16-8 4 8 4 8 16-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
