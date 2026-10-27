import { useEffect } from "react";

import { useSim } from "@/lib/ina/store";

/** Plays a Find My-style rising chirp through Web Audio while a chirp target is active. */
export function useChirp() {
  const { state, actions } = useSim();
  const target = state.chirp;

  useEffect(() => {
    if (!target) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const pan = ctx.createStereoPanner();
    pan.pan.value = target === "left" ? -0.9 : target === "right" ? 0.9 : 0;
    pan.connect(ctx.destination);

    const burst = () => {
      const t0 = ctx.currentTime;
      [0, 0.14, 0.28].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1800 + i * 450, t0 + offset);
        gain.gain.setValueAtTime(0.0001, t0 + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, t0 + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.12);
        osc.connect(gain).connect(pan);
        osc.start(t0 + offset);
        osc.stop(t0 + offset + 0.13);
      });
    };
    burst();
    const loop = window.setInterval(burst, 900);
    const stop = window.setTimeout(() => actions.setChirp(null), 7000);
    return () => {
      window.clearInterval(loop);
      window.clearTimeout(stop);
      void ctx.close();
    };
  }, [target, actions]);
}
