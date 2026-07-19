type FtcAppSplashScreenProps = {
  /** When true, fades the splash out before unmounting. */
  exiting?: boolean;
};

export default function FtcAppSplashScreen({ exiting = false }: FtcAppSplashScreenProps) {
  return (
    <div
      className={`flex min-h-[100dvh] flex-col items-center justify-center bg-ftc-bg px-6 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label="Loading Follow The Crowd"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ftc-primary/25 bg-ftc-surface text-lg font-bold tracking-[0.14em] text-ftc-primary sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl"
      >
        FTC
      </div>
      <p className="mt-5 text-center text-sm font-bold uppercase tracking-[0.18em] text-ftc-text">
        Follow The Crowd
      </p>
      <div
        aria-hidden="true"
        className="mt-8 flex items-center justify-center gap-1.5"
      >
        <span className="ftc-app-splash-dot" />
        <span className="ftc-app-splash-dot ftc-app-splash-dot--delay-1" />
        <span className="ftc-app-splash-dot ftc-app-splash-dot--delay-2" />
      </div>
    </div>
  );
}
