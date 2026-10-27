import { CircleOff, Ear, EarOff, Sparkles, type LucideIcon } from "lucide-react";

import { MODE_ORDER, MODE_SHORT, type ListeningMode } from "@/lib/ina/protocol";
import { cn } from "@/lib/utils";

export const MODE_ICON: Record<ListeningMode, LucideIcon> = {
  anc: EarOff,
  transparency: Ear,
  adaptive: Sparkles,
  off: CircleOff,
};

export function ModeSelector({
  value,
  supported,
  onChange,
  compact,
  className,
}: {
  value: ListeningMode;
  supported: ListeningMode[];
  onChange: (m: ListeningMode) => void;
  compact?: boolean;
  className?: string;
}) {
  const modes = MODE_ORDER.filter((m) => supported.includes(m));
  return (
    <div
      role="radiogroup"
      aria-label="Listening mode"
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
    >
      {modes.map((m) => {
        const Icon = MODE_ICON[m];
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl transition-all active:scale-95",
              compact ? "h-12 text-[10px]" : "h-[68px] text-[11px]",
              active ? "bg-foreground text-background" : "bg-foreground/8 text-foreground hover:bg-foreground/12",
            )}
          >
            <Icon className={compact ? "size-4" : "size-5"} />
            <span className="w-full truncate px-1 font-medium">{MODE_SHORT[m]}</span>
          </button>
        );
      })}
    </div>
  );
}
