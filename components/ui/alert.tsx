import { CircleAlert, CircleX, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertTone = "error" | "warning" | "info";

export interface AlertProps {
  title: string;
  children?: ReactNode;
  tone?: AlertTone;
  className?: string;
}

const toneClasses: Record<AlertTone, string> = {
  error: "border-error/30 bg-error/5 text-error",
  warning: "border-warning/30 bg-warning/5 text-warning",
  info: "border-info/30 bg-info/5 text-info",
};

const toneIcons = {
  error: CircleX,
  warning: CircleAlert,
  info: Info,
} as const;

export function Alert({
  title,
  children,
  tone = "error",
  className,
}: AlertProps) {
  const Icon = toneIcons[tone];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden strokeWidth={2} />
      <div className="min-w-0">
        <p className="font-medium text-neutral-900">{title}</p>
        {children ? (
          <div className="mt-1 text-sm text-neutral-700">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
