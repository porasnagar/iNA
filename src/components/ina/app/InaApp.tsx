import { Braces, Headphones, Settings, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { useSim, type AppTab } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { ConnectScreen } from "./ConnectScreen";
import { ControlsScreen } from "./ControlsScreen";
import { DeviceScreen } from "./DeviceScreen";
import { Onboarding } from "./Onboarding";
import { RulesScreen } from "./RulesScreen";
import { SettingsScreen } from "./SettingsScreen";

const TABS: { key: AppTab; label: string; icon: LucideIcon }[] = [
  { key: "device", label: "Device", icon: Headphones },
  { key: "controls", label: "Controls", icon: SlidersHorizontal },
  { key: "rules", label: "Rules", icon: Braces },
  { key: "settings", label: "Settings", icon: Settings },
];

export function InaApp() {
  const { state, actions, isConnected } = useSim();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [state.tab, isConnected]);

  if (!state.onboarded) {
    return (
      <div className="absolute inset-0 bg-background pb-6 pt-10">
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background pt-10">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24 scrollbar-none">
        {state.tab === "device" && (isConnected ? <DeviceScreen /> : <ConnectScreen />)}
        {state.tab === "controls" && <ControlsScreen />}
        {state.tab === "rules" && <RulesScreen />}
        {state.tab === "settings" && <SettingsScreen />}
      </div>
      {/* Floating Liquid Glass tab bar — content scrolls underneath it. */}
      <nav className="absolute inset-x-3 bottom-6 z-10 grid grid-cols-4 rounded-[28px] py-1.5 shadow-sheet liquid-glass">
        {TABS.map((t) => {
          const active = state.tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => actions.setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-0.5 py-1 text-[10.5px] font-medium", active ? "text-primary" : "text-muted-foreground")}
            >
              <t.icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
