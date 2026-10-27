import { Bluetooth, Flashlight, MoonStar, RotateCw, Settings, Sun, Wifi, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { InaLogo } from "@/components/ina/InaLogo";
import { MODE_ICON, ModeSelector } from "@/components/ina/ModeSelector";
import { useClock } from "./StatusBar";
import { formatBattery, MODE_LABEL } from "@/lib/ina/protocol";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

function Tile({
  icon: I,
  label,
  sub,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon | (() => React.ReactNode);
  label: string;
  sub: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-[68px] min-w-0 items-center gap-3 rounded-[24px] px-4 text-left transition-colors active:scale-[0.98]",
        active ? "bg-primary text-primary-foreground" : "bg-elevated text-foreground",
        disabled && "opacity-50",
      )}
    >
      <I className="size-5 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{label}</span>
        <span className={cn("block truncate text-[11px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{sub}</span>
      </span>
    </button>
  );
}

export function QuickSettings() {
  const { state, actions, model, modes, isConnected, displayBattery } = useSim();
  const now = useClock();
  const [local, setLocal] = useState({ wifi: true, bt: true, dnd: false, torch: false, rotate: true });
  const flip = (k: keyof typeof local) => () => setLocal((s) => ({ ...s, [k]: !s[k] }));
  if (!state.shadeOpen) return null;

  const tileAvailable = isConnected && modes.length > 0;
  const ModeIcon = MODE_ICON[state.mode];

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        aria-label="Close Quick Settings"
        className="absolute inset-0 bg-scrim backdrop-blur-md animate-in fade-in"
        onClick={() => actions.setShade(false)}
      />
      <div className="relative max-h-full overflow-y-auto scrollbar-none rounded-b-[36px] bg-background/95 px-4 pb-4 pt-12 backdrop-blur-2xl animate-in slide-in-from-top duration-300">
        <div className="flex items-end justify-between px-1">
          <div>
            <div className="text-4xl font-light tabular-nums">
              {now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "") : "9:41"}
            </div>
            <div className="text-xs text-muted-foreground">
              {now ? now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""}
            </div>
          </div>
          <Settings className="mb-1 size-5 text-muted-foreground" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Tile icon={Wifi} label="Internet" sub={local.wifi ? "Home-5G" : "Off"} active={local.wifi} onClick={flip("wifi")} />
          <Tile icon={Bluetooth} label="Bluetooth" sub={isConnected ? model?.name ?? "Connected" : local.bt ? "On" : "Off"} active={local.bt} onClick={flip("bt")} />
          <Tile
            icon={ModeIcon}
            label="iNA Noise Control"
            sub={tileAvailable ? MODE_LABEL[state.mode] : "Unavailable"}
            active={tileAvailable && state.mode !== "off"}
            disabled={!tileAvailable}
            onClick={() => actions.cycleFromTile()}
          />
          <Tile icon={MoonStar} label="Do Not Disturb" sub={local.dnd ? "On" : "Off"} active={local.dnd} onClick={flip("dnd")} />
          <Tile icon={Flashlight} label="Flashlight" sub={local.torch ? "On" : "Off"} active={local.torch} onClick={flip("torch")} />
          <Tile icon={RotateCw} label="Auto-rotate" sub={local.rotate ? "On" : "Off"} active={local.rotate} onClick={flip("rotate")} />
        </div>

        <div className="mt-3 flex h-11 items-center gap-3 overflow-hidden rounded-full bg-elevated pr-4">
          <div className="flex h-full w-2/3 items-center rounded-full bg-foreground/85 pl-4 text-background">
            <Sun className="size-4" />
          </div>
        </div>

        <div className="mt-5 px-1 text-xs font-semibold text-muted-foreground">Notifications</div>
        <div className="mt-2 rounded-[24px] bg-card p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <InaLogo className="size-4" />
            <span className="font-medium text-foreground">iNA</span>
            <span>· {isConnected ? "Live status" : "Background service"}</span>
          </div>
          {isConnected ? (
            <>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold">{model?.name ?? "Apple accessory"}</span>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{MODE_LABEL[state.mode]}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs tabular-nums">
                {(model?.caps.hasCase === false ? (["left"] as const) : (["left", "right", "case"] as const)).map((k) => (
                  <span key={k} className="flex items-center gap-1 whitespace-nowrap">
                    <span className="text-muted-foreground">{model?.caps.hasCase === false ? "Battery" : k === "left" ? "L" : k === "right" ? "R" : "Case"}</span>
                    <span className="font-semibold">{formatBattery(displayBattery(k))}</span>
                    {state.accessory[`${k}Charging` as "leftCharging"] && <Zap className="size-3 fill-success text-success" />}
                  </span>
                ))}
              </div>
              {modes.length > 0 && (
                <ModeSelector
                  compact
                  className="mt-3"
                  value={state.mode}
                  supported={modes.filter((m) => m !== "off")}
                  onChange={(m) => actions.setMode(m, "notification action")}
                />
              )}
            </>
          ) : (
            <>
              <div className="mt-2 text-sm font-semibold">Listening for Apple accessories</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Open your case near this phone · L {formatBattery(-1)} · R {formatBattery(-1)} · Case {formatBattery(-1)}
              </div>
            </>
          )}
        </div>

        <button type="button" aria-label="Collapse" onClick={() => actions.setShade(false)} className="mx-auto mt-4 block h-1 w-10 rounded-full bg-foreground/40" />
      </div>
    </div>
  );
}
