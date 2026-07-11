"use client";

import Link from "next/link";
import { applyTextInputLimit } from "@/lib/textInputLimits";

export function PlannerFormField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
}) {
  function handleChange(next: string) {
    if (multiline && maxLength !== undefined) {
      const limited = applyTextInputLimit(value, next, maxLength);

      if (limited === null) {
        return;
      }

      onChange(limited);
      return;
    }

    onChange(next);
  }

  return (
    <label className="block">
      <span className="ftc-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="ftc-input px-3.5 py-2.5"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="ftc-input px-3.5 py-2.5"
        />
      )}
      {multiline && maxLength !== undefined ? (
        <p
          className={`mt-1 text-right text-xs ${
            value.length > maxLength ? "text-red-400" : "text-ftc-text-muted"
          }`}
        >
          {value.length} / {maxLength}
        </p>
      ) : null}
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
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`ftc-filter-pill ${isActive ? "ftc-filter-pill-active" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function PlannerStatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="ftc-stat-chip">
      {label}: <span className="text-ftc-text">{value}</span>
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
