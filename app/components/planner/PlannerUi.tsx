"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import {
  applyEventNotesInputLimit,
  countEventNotesLines,
  MAX_EVENT_NOTES_LINES,
} from "@/lib/events/eventNotes";
import { useBoundedAutoGrowTextarea } from "@/lib/useBoundedAutoGrowTextarea";

export function PlannerFieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs ftc-inline-error">{message}</p>;
}

function PlannerMultilineField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string | null;
}) {
  const { textareaRef } = useBoundedAutoGrowTextarea({ value });

  function handleChange(next: string) {
    if (maxLength !== undefined) {
      const limited = applyEventNotesInputLimit(value, next);

      if (limited === null) {
        return;
      }

      onChange(limited);
      return;
    }

    onChange(next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (countEventNotesLines(value) >= MAX_EVENT_NOTES_LINES) {
      event.preventDefault();
    }
  }

  return (
    <label className="block [overflow-anchor:none]">
      <span className="ftc-label">{label}</span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={4}
        className="ftc-input ftc-event-notes-textarea px-3.5 py-2.5"
      />
      {maxLength !== undefined ? (
        <p
          className={`mt-1 text-right text-xs ${
            value.length > maxLength ? "text-red-400" : "text-ftc-text-muted"
          }`}
        >
          {value.length} / {maxLength}
        </p>
      ) : null}
      {error ? <PlannerFieldError message={error} /> : null}
    </label>
  );
}

export function PlannerFormField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  error?: string | null;
}) {
  if (multiline) {
    return (
      <PlannerMultilineField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        error={error}
      />
    );
  }

  return (
    <label className="block">
      <span className="ftc-label">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="ftc-input px-3.5 py-2.5"
      />
      {error ? <PlannerFieldError message={error} /> : null}
    </label>
  );
}

export function PlannerFormCard({
  title,
  onCancel,
  cancelDisabled = false,
  children,
}: {
  title: string;
  onCancel: () => void;
  cancelDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 ftc-card p-4 sm:p-5">
      <div className="ftc-form-card-header">
        <h2 className="text-lg font-semibold text-ftc-text">{title}</h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelDisabled}
          className="ftc-form-cancel-link disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {children}
    </section>
  );
}

export function PlannerBackLink({
  onClick,
  children = "← Back",
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="ftc-form-back-link">
      {children}
    </button>
  );
}

export function PlannerOptionCard({
  title,
  description,
  selected = false,
  onClick,
}: {
  title: string;
  description: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ftc-option-card ${selected ? "ftc-option-card-selected" : ""}`}
    >
      <p className="text-base font-semibold text-ftc-text">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">{description}</p>
    </button>
  );
}

function PlannerFilterPillButton({
  label,
  isActive,
  onSelect,
}: {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const activatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{ pointerId: number; cancelled: boolean } | null>(null);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary) {
      return;
    }

    activatedThisGestureRef.current = false;
    activeGestureRef.current = {
      pointerId: event.pointerId,
      cancelled: false,
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const gesture = activeGestureRef.current;

      if (!gesture || event.pointerId !== gesture.pointerId || gesture.cancelled) {
        return;
      }

      activeGestureRef.current = null;

      if (event.pointerType === "touch") {
        activatedThisGestureRef.current = true;
        onSelect();
      }
    },
    [onSelect],
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = activeGestureRef.current;

    if (gesture && event.pointerId === gesture.pointerId) {
      gesture.cancelled = true;
      activeGestureRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (activatedThisGestureRef.current) {
      return;
    }

    onSelect();
  }, [onSelect]);

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      className={`touch-manipulation ftc-filter-pill ${isActive ? "ftc-filter-pill-active" : ""}`}
    >
      <span className="pointer-events-none">{label}</span>
    </button>
  );
}

export function PlannerFilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <PlannerFilterPillButton
            key={option.value}
            label={option.label}
            isActive={isActive}
            onSelect={() => onChange(option.value)}
          />
        );
      })}
    </div>
  );
}

export function PlannerStatChip({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "compact";
}) {
  const className =
    variant === "compact"
      ? "rounded-full border border-ftc-border-subtle bg-ftc-bg-input px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ftc-text-muted"
      : "ftc-stat-chip";

  return (
    <span className={className}>
      {label}: <span className={variant === "compact" ? "text-ftc-text-secondary" : "text-ftc-text"}>{value}</span>
    </span>
  );
}

export function PlannerEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ftc-card-empty px-6 py-12 text-center">
      <p className="text-base font-medium text-ftc-text-secondary">{title}</p>
      {description ? <p className="mt-2 text-sm text-ftc-text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function PlannerInlineError({ message }: { message: string }) {
  return <p className="ftc-inline-error">{message}</p>;
}

export function PlannerSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="ftc-planner-section-label">{children}</p>;
}

export function PlannerEmptyPanel({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={`ftc-card-empty px-4 py-8 text-center ${className}`}>
      <p className="text-sm text-ftc-text-secondary">{message}</p>
    </div>
  );
}

export function PlannerLinkAction({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-block text-sm font-semibold text-ftc-primary transition hover:text-ftc-primary-dim ${className}`}
    >
      {children}
    </Link>
  );
}
