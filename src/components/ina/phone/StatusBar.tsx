import { Headphones, Signal, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

import { useSim } from "@/lib/ina/store";
import { formatBattery } from "@/lib/ina/protocol";
import { cn } from "@/lib/utils";

export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function StatusBar({ tone = "default" }: { tone?: "default" | "light" }) {
  const { state, actions, isConnected, displayBattery } = useSim();
  const now = useClock();
  const time = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "") : "9:41";
  const min = Math.min(displayBattery("left"), displayBattery("right"));
  return (
    <button
      type="button"
      onClick={() => actions.setShade(true)}
      aria-label="Pull down Quick Settings"
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-10 items-center justify-between px-7 text-[13px] font-semibold",
        tone === "light" ? "text-foreground" : "text-foreground",
      )}
    >
      <span className="tabular-nums">{time}</span>
      <span className="absolute left-1/2 top-3 size-3.5 -translate-x-1/2 rounded-full bg-island ring-1 ring-foreground/10" />
      <span className="flex items-center gap-1.5">
        {isConnected && state.shadeOpen && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums">
            <Headphones className="size-3.5" />
            {formatBattery(min)}
          </span>
        )}
        <Signal className="size-3.5" />
        <Wifi className="size-3.5" />
      </span>
    </button>
  );
}

export function NavHandle() {
  const { actions } = useSim();
  return (
    <button
      type="button"
      aria-label="Go to Android Home Screen"
      onClick={() => actions.setSurface("home")}
      className="absolute inset-x-0 bottom-0 z-20 flex h-6 items-center justify-center"
    >
      <span className="h-1 w-28 rounded-full bg-foreground/70" />
    </button>
  );
}
