import { Zap } from "lucide-react";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { MODE_ICON, ModeSelector } from "@/components/ina/ModeSelector";
import { ProductImage } from "@/components/ina/product";
import { formatBattery, MODE_LABEL } from "@/lib/ina/protocol";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

/** Persistent Live Status pill that grows out of the camera cut-out (Dynamic Island style). */
export function LiveIsland() {
  const { state, actions, model, modes, isConnected, displayBattery } = useSim();
  if (!isConnected || !model || state.shadeOpen) return null;
  const { expanded, message } = state.island;
  const ModeIcon = MODE_ICON[state.mode];
  const overEar = !model.caps.hasCase;
  const anyCharging = state.accessory.leftCharging || state.accessory.rightCharging;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1.5 z-30 flex justify-center px-2">
      <div
        className={cn(
          "pointer-events-auto overflow-hidden bg-island text-foreground shadow-2xl transition-all duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]",
          expanded ? "w-full rounded-[32px] p-4" : "h-8 w-[172px] rounded-full",
        )}
      >
        {!expanded ? (
          <button
            type="button"
            onClick={() => actions.setIslandExpanded(true)}
            aria-label="Expand live status"
            className="flex h-8 w-full items-center justify-between gap-2 pl-1.5 pr-3"
          >
            <ProductImage product={model.image} alt="" className="size-6 drop-shadow-none" />
            <span className="size-3.5 rounded-full bg-background/0" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums">
              {modes.length > 0 && <ModeIcon className="size-3.5 text-primary" />}
              {overEar ? formatBattery(displayBattery("left")) : `${formatBattery(displayBattery("left"))} · ${formatBattery(displayBattery("right"))}`}
              {anyCharging && <Zap className="size-3 fill-success text-success" />}
            </span>
          </button>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <ProductImage product={model.image} alt={model.name} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{model.name}</div>
                <div className="truncate text-xs text-primary">{message ?? MODE_LABEL[state.mode]}</div>
              </div>
              <button
                type="button"
                onClick={() => actions.setIslandExpanded(false)}
                className="shrink-0 rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-medium"
              >
                Close
              </button>
            </div>
            <div className="mt-3 flex justify-around">
              {overEar ? (
                <BatteryRing level={displayBattery("left")} charging={state.accessory.leftCharging} label="Battery" size={52} stroke={5} />
              ) : (
                <>
                  <BatteryRing level={displayBattery("left")} charging={state.accessory.leftCharging} label="Left" size={52} stroke={5} />
                  <BatteryRing level={displayBattery("right")} charging={state.accessory.rightCharging} label="Right" size={52} stroke={5} />
                  <BatteryRing level={displayBattery("case")} charging={state.accessory.caseCharging} label="Case" size={52} stroke={5} />
                </>
              )}
            </div>
            {modes.length > 0 && (
              <ModeSelector compact className="mt-3" value={state.mode} supported={modes} onChange={(m) => actions.setMode(m, "live status")} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
