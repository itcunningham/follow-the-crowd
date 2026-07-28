/** Recent touch samples used to estimate release velocity. */
export type TouchSample = {
  y: number;
  time: number;
};

/** Lookback window for release-velocity samples. */
export const MOMENTUM_SAMPLE_WINDOW_MS = 100;

/** Minimum release speed before coasting begins. */
export const MOMENTUM_MIN_RELEASE_VELOCITY_PX_PER_MS = 0.12;

/** Velocity below which coasting stops. */
export const MOMENTUM_STOP_VELOCITY_PX_PER_MS = 0.02;

/** Friction applied per 16ms frame (~60fps). */
export const MOMENTUM_FRICTION_PER_FRAME = 0.94;

const MAX_TOUCH_SAMPLES = 8;

export function appendTouchSample(
  samples: TouchSample[],
  y: number,
  time: number,
): TouchSample[] {
  const next = [...samples, { y, time }].filter(
    (sample) => time - sample.time <= MOMENTUM_SAMPLE_WINDOW_MS,
  );

  return next.slice(-MAX_TOUCH_SAMPLES);
}

/**
 * Estimate scrollTop velocity (px/ms) from recent finger movement.
 * Finger up → positive scroll velocity toward older messages.
 */
export function computeReleaseScrollVelocityPxPerMs(samples: TouchSample[]): number {
  if (samples.length < 2) {
    return 0;
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsedMs = last.time - first.time;

  if (elapsedMs <= 0) {
    return 0;
  }

  const fingerVelocityPxPerMs = (last.y - first.y) / elapsedMs;

  return -fingerVelocityPxPerMs;
}

export function shouldStartMomentumScroll(releaseVelocityPxPerMs: number): boolean {
  return Math.abs(releaseVelocityPxPerMs) >= MOMENTUM_MIN_RELEASE_VELOCITY_PX_PER_MS;
}

export function applyMomentumFriction(
  velocityPxPerMs: number,
  frameDeltaMs: number,
): number {
  const friction = MOMENTUM_FRICTION_PER_FRAME ** (frameDeltaMs / 16);

  return velocityPxPerMs * friction;
}

export function applyMomentumScrollStep({
  scrollTop,
  velocityPxPerMs,
  frameDeltaMs,
  maxScrollTop,
}: {
  scrollTop: number;
  velocityPxPerMs: number;
  frameDeltaMs: number;
  maxScrollTop: number;
}): { scrollTop: number; velocityPxPerMs: number } {
  let nextScrollTop = scrollTop + velocityPxPerMs * frameDeltaMs;
  let nextVelocity = velocityPxPerMs;

  if (nextScrollTop <= 0) {
    nextScrollTop = 0;
    nextVelocity = 0;
  } else if (nextScrollTop >= maxScrollTop) {
    nextScrollTop = maxScrollTop;
    nextVelocity = 0;
  }

  if (Math.abs(nextVelocity) < MOMENTUM_STOP_VELOCITY_PX_PER_MS) {
    nextVelocity = 0;
  }

  return { scrollTop: nextScrollTop, velocityPxPerMs: nextVelocity };
}
