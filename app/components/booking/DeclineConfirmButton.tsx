"use client";

import { useEffect, useRef, useState } from "react";

/** How long Decline stays armed as CONFIRM before auto-disarm. */
const ARM_MS = 3000;

/**
 * Two-tap Decline: first tap arms (CONFIRM + solid danger), second tap declines.
 * Disarms on outside pointerdown, Accept/other taps, disable/loading, or after ~3s.
 */
export default function DeclineConfirmButton({
  disabled = false,
  loading = false,
  onConfirm,
  idleClassName,
  armedClassName,
  className = "",
  idleLabel = "Decline",
  armedLabel = "CONFIRM",
  loadingLabel = "...",
}: {
  disabled?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  idleClassName: string;
  armedClassName: string;
  className?: string;
  idleLabel?: string;
  armedLabel?: string;
  loadingLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setArmed(false), ARM_MS);
    return () => window.clearTimeout(timeout);
  }, [armed]);

  useEffect(() => {
    if (!armed) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setArmed(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [armed]);

  useEffect(() => {
    if (disabled || loading) {
      setArmed(false);
    }
  }, [disabled, loading]);

  async function handleClick() {
    if (disabled || loading) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    await onConfirm();
  }

  return (
    <button
      ref={rootRef}
      type="button"
      disabled={disabled || loading}
      onClick={() => void handleClick()}
      className={`${armed ? armedClassName : idleClassName} ${className}`}
      aria-pressed={armed}
    >
      {loading ? loadingLabel : armed ? armedLabel : idleLabel}
    </button>
  );
}
