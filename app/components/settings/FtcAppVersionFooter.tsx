import { formatFtcAppVersionLabel } from "@/lib/ftcAppVersion";

export default function FtcAppVersionFooter() {
  return (
    <p
      className="mx-auto max-w-full px-1 pt-6 text-center text-[11px] leading-snug tracking-tight text-ftc-text-muted"
      aria-label="App version"
    >
      {formatFtcAppVersionLabel()}
    </p>
  );
}
