import { InaApp } from "@/components/ina/app/InaApp";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { CallOverlay } from "./CallOverlay";
import { HomeScreen } from "./HomeScreen";
import { LiveIsland } from "./LiveIsland";
import { ProximitySheet } from "./ProximitySheet";
import { QuickSettings } from "./QuickSettings";
import { NavHandle, StatusBar } from "./StatusBar";
import { useChirp } from "./useChirp";

/** Simulated Android 16 handset: status bar, launcher or iNA app, overlays and gesture bar. */
export function Phone() {
  const { state } = useSim();
  useChirp();
  return (
    <div className="theme-apple relative mx-auto aspect-[390/844] w-[min(390px,calc(100vw-32px))] shrink-0 rounded-[58px] bg-bezel p-[11px] shadow-phone">
      <span aria-hidden className="absolute -right-[3px] top-[22%] h-16 w-[3px] rounded-r bg-elevated" />
      <span aria-hidden className="absolute -right-[3px] top-[33%] h-24 w-[3px] rounded-r bg-elevated" />
      <div
        className={cn("relative h-full w-full overflow-hidden rounded-[48px] bg-background", state.reduceTransparency && "reduce-transparency")}
        data-testid="phone-screen"
      >
        {state.surface === "home" ? <HomeScreen /> : <InaApp />}
        <StatusBar />
        <LiveIsland />
        <CallOverlay />
        <ProximitySheet />
        <QuickSettings />
        <NavHandle />
      </div>
    </div>
  );
}
