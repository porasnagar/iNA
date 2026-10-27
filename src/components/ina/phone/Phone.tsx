import { useEffect, useState } from "react";

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

/** Design size of the simulated handset (incl. bezel). */
export const PHONE_W = 390;
export const PHONE_H = 844;
/** Below this width the simulator can switch to an edge-to-edge native preview. */
export const BARE_BREAKPOINT = 768;

/**
 * Scale the handset so the whole frame fits the viewport.
 * `reserve` is the vertical space (px) taken by the header and padding around the phone.
 */
export function phoneScale(viewportW: number, viewportH: number, reserve: number): number {
  const s = Math.min(1, (viewportH - reserve) / PHONE_H, (viewportW - 32) / PHONE_W);
  return Math.max(0.5, Math.round(s * 1000) / 1000);
}

function usePhoneFit(reserve: number, allowBare: boolean) {
  const [fit, setFit] = useState({ bare: false, scale: 1 });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (allowBare && w < BARE_BREAKPOINT) setFit({ bare: true, scale: 1 });
      else setFit({ bare: false, scale: phoneScale(w, h, reserve) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [reserve, allowBare]);
  return fit;
}

/**
 * Simulated Android 16 handset: status bar, launcher or iNA app, overlays and gesture bar.
 * The frame is laid out at its design size and scaled to fit the viewport; with `allowBare`,
 * small screens get an edge-to-edge screen without the mock bezel.
 */
/** True when the visitor's system prefers light mode (read after mount, so SSR stays dark). */
function useSystemLight() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setLight(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return light;
}

export function Phone({ reserve = 128, allowBare = false }: { reserve?: number; allowBare?: boolean }) {
  const { state } = useSim();
  useChirp();
  const fit = usePhoneFit(reserve, allowBare);
  const systemLight = useSystemLight();
  const light = state.appearance === "light" || (state.appearance === "system" && systemLight);

  const screen = (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-background",
        !fit.bare && "rounded-[48px]",
        light && "phone-light",
        state.reduceTransparency && "reduce-transparency",
      )}
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
  );

  if (fit.bare) {
    return (
      <div role="group" aria-label="Simulated Android phone running iNA" className="theme-apple relative h-[calc(100dvh-7.5rem)] min-h-[560px] w-full overflow-hidden rounded-[28px]">
        {screen}
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-full shrink-0" style={{ width: PHONE_W * fit.scale, height: PHONE_H * fit.scale }}>
      <div
        role="group"
        aria-label="Simulated Android phone running iNA"
        className="theme-apple absolute left-0 top-0 origin-top-left rounded-[58px] bg-bezel p-[11px] shadow-phone"
        style={{ width: PHONE_W, height: PHONE_H, transform: fit.scale === 1 ? undefined : `scale(${fit.scale})` }}
      >
        <span aria-hidden className="absolute -right-[3px] top-[22%] h-16 w-[3px] rounded-r bg-elevated" />
        <span aria-hidden className="absolute -right-[3px] top-[33%] h-24 w-[3px] rounded-r bg-elevated" />
        {screen}
      </div>
    </div>
  );
}
