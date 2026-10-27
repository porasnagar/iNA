import { Zap } from "lucide-react";

import { formatBattery } from "@/lib/ina/protocol";
import { cn } from "@/lib/utils";

export function BatteryRing({
  level,
  charging,
  label,
  size = 72,
  stroke = 6,
  className,
}: {
  level: number;
  charging?: boolean;
  label: string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const known = level >= 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = known ? Math.max(0, Math.min(100, level)) : 0;
  const low = known && pct <= 20;
  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-foreground/12"
            strokeDasharray={known ? undefined : "3 5"}
          />
          {known && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct / 100)}
              className={cn("transition-[stroke-dashoffset] duration-700 ease-out", low ? "text-warning" : "text-success")}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {charging && known && <Zap className="mb-0.5 size-3.5 fill-success text-success" aria-label="Charging" />}
          <span
            className={cn(
              "font-semibold tabular-nums leading-none tracking-tight",
              known ? "text-foreground" : "text-muted-foreground",
            )}
            style={{ fontSize: size * 0.22 }}
          >
            {formatBattery(level)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
