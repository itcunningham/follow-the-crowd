"use client";

export default function ProfileFormField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  multiline = false,
  textareaClassName,
  error,
  suffix,
  footer,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  textareaClassName?: string;
  error?: string;
  suffix?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        {label}
        {required ? " *" : ""}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={4}
          className={`ftc-input px-3.5 py-2.5 ${textareaClassName ?? ""}`.trim()}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className="ftc-input px-3.5 py-2.5"
        />
      )}
      {footer ? <div className="mt-1">{footer}</div> : null}
      {suffix ? <div className="mt-1">{suffix}</div> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </label>
  );
}
