import { Ban, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type UiSignalCode =
  "EXACT_TAKEN" | "SIMILAR" | "LIKELY_UNIQUE" | "UNAVAILABLE";

export interface SignalBlockProps {
  code: UiSignalCode;
  message: string;
  className?: string;
}

const signalMeta: Record<
  UiSignalCode,
  {
    Icon: typeof CircleCheck;
    colorClass: string;
  }
> = {
  LIKELY_UNIQUE: {
    Icon: CircleCheck,
    colorClass: "text-success",
  },
  SIMILAR: {
    Icon: TriangleAlert,
    colorClass: "text-warning",
  },
  EXACT_TAKEN: {
    Icon: Ban,
    colorClass: "text-error",
  },
  UNAVAILABLE: {
    Icon: CircleX,
    colorClass: "text-error",
  },
};

export function SignalBlock({ code, message, className }: SignalBlockProps) {
  const { Icon, colorClass } = signalMeta[code];

  // Parent `#results` owns aria-live; role=status here for the signal announcement.
  return (
    <div
      role="status"
      data-testid="signal-block"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-6 shrink-0", colorClass)}
        aria-hidden
        strokeWidth={2}
      />
      <p className="text-lg font-semibold text-neutral-900">{message}</p>
    </div>
  );
}
