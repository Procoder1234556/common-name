import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({
  id,
  label,
  hint,
  error,
  className,
  disabled,
  ...props
}: InputProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <input
        id={id}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-neutral-900",
          "placeholder:text-neutral-400",
          "focus-visible:ring-primary-500 focus-visible:border-transparent focus-visible:ring-2 focus-visible:outline-none",
          "disabled:bg-neutral-50 disabled:text-neutral-500",
          error ? "border-error" : "border-neutral-300",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-neutral-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
