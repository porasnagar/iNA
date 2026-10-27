import { Phone, PhoneOff } from "lucide-react";
import { useEffect } from "react";

import { useSim } from "@/lib/ina/store";

/** Heads-up incoming call card used to demo Head Gestures (nod = answer, shake = decline). */
export function CallOverlay() {
  const { state, actions, model } = useSim();
  const call = state.call;

  useEffect(() => {
    if (!call || call.state === "ringing") return;
    const t = window.setTimeout(() => actions.endCall(), call.state === "answered" ? 3500 : 1600);
    return () => window.clearTimeout(t);
  }, [call, actions]);

  if (!call) return null;
  const gesturesOn = state.settings.headGestures && !!model?.caps.headGestures && (state.connected || state.previewConnected);

  return (
    <div className="absolute inset-x-2 top-12 z-30 rounded-[28px] bg-card p-4 shadow-2xl animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-teal text-lg font-semibold text-primary-foreground">M</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{call.caller}</div>
          <div className="truncate text-xs text-muted-foreground">
            {call.state === "ringing" ? "Incoming call" : call.state === "answered" ? "On call · via head nod" : "Declined · via head shake"}
          </div>
        </div>
        {call.state === "ringing" && (
          <div className="flex shrink-0 gap-2">
            <button type="button" aria-label="Decline" onClick={() => actions.headGesture("shake")} className="grid size-10 place-items-center rounded-full bg-destructive text-destructive-foreground">
              <PhoneOff className="size-4" />
            </button>
            <button type="button" aria-label="Answer" onClick={() => actions.headGesture("nod")} className="grid size-10 place-items-center rounded-full bg-success text-background">
              <Phone className="size-4" />
            </button>
          </div>
        )}
      </div>
      {call.state === "ringing" && (
        <p className="mt-3 rounded-xl bg-foreground/5 px-3 py-2 text-[11px] text-muted-foreground">
          {gesturesOn ? "Nod your head to answer, shake to decline." : "Head Gestures are off or unsupported on this accessory."}
        </p>
      )}
    </div>
  );
}
