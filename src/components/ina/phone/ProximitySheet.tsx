import { Check, Loader2, X } from "lucide-react";
import { useEffect } from "react";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { hexId } from "@/lib/ina/protocol";
import { PAIRING_STEPS, useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

const VIA_LABEL = {
  overlay: "WindowManager · TYPE_APPLICATION_OVERLAY",
  activity: "CasePopupOverlayActivity (fallback)",
  inline: "AppleCaseOpenPopupSheet · in-app",
} as const;

/** iOS-style proximity / case-open bottom sheet shown over the home screen or any app. */
export function ProximitySheet() {
  const { state, actions, model } = useSim();
  const sheet = state.sheet;

  // Drive the scripted pairing sequence one Android call at a time.
  useEffect(() => {
    if (sheet?.stage !== "pairing") return;
    const t = window.setTimeout(() => actions.advancePairing(), 800);
    return () => window.clearTimeout(t);
  }, [sheet?.stage, sheet?.step, actions]);

  // Already-bonded accessories reconnect automatically on ACL, like iOS.
  useEffect(() => {
    if (sheet?.paired && sheet.stage === "info" && !state.connected && !state.previewConnected) {
      const t = window.setTimeout(() => actions.connectPaired(), 900);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [sheet?.paired, sheet?.stage, state.connected, state.previewConnected, actions]);

  if (!sheet) return null;
  const name = model?.name ?? `Apple accessory ${hexId(state.accessory.modelId)}`;
  const a = state.accessory;
  const overEar = model ? !model.caps.hasCase : false;
  const showRings = sheet.paired || sheet.stage === "done";

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Dismiss" onClick={actions.dismissSheet} className="absolute inset-0 bg-scrim animate-in fade-in duration-300" />
      <div
        role="dialog"
        aria-label={`${name} nearby`}
        className="relative mx-2 mb-2 rounded-[42px] bg-sheet px-6 pb-6 pt-5 text-center shadow-sheet backdrop-blur-2xl animate-in slide-in-from-bottom-full duration-500 ease-out"
      >
        <button
          type="button"
          onClick={actions.dismissSheet}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-foreground/10 text-muted-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 className="mx-8 truncate text-xl font-semibold tracking-tight">{name}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {sheet.stage === "done"
            ? "Connected to this phone"
            : sheet.stage === "pairing"
              ? "Connecting…"
              : sheet.paired
                ? state.connected || state.previewConnected
                  ? "Connected"
                  : "Reconnecting…"
                : "Not connected to this phone"}
        </p>

        <div className="relative mx-auto my-3 h-40 w-full">
          <div className="absolute inset-0 bg-stage" />
          <ProductImage product={model?.image ?? "airpods-pro"} alt={name} eager className="relative mx-auto h-full animate-float" />
        </div>

        {showRings && (
          <div className="flex justify-center gap-6">
            {overEar ? (
              <BatteryRing level={a.left} charging={a.leftCharging} label="Battery" />
            ) : (
              <>
                <BatteryRing level={a.left} charging={a.leftCharging} label="Left" />
                <BatteryRing level={a.right} charging={a.rightCharging} label="Right" />
                <BatteryRing level={a.case} charging={a.caseCharging} label="Case" />
              </>
            )}
          </div>
        )}

        {sheet.stage === "pairing" && (
          <ol className="mx-auto mt-1 max-w-[280px] space-y-2 text-left">
            {PAIRING_STEPS.map((label, i) => {
              const done = i < sheet.step;
              const active = i === sheet.step;
              return (
                <li key={label} className={cn("flex items-center gap-2.5 text-xs", done || active ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-success text-background" : "bg-foreground/10")}>
                    {done ? <Check className="size-3" strokeWidth={3} /> : active ? <Loader2 className="size-3 animate-spin" /> : null}
                  </span>
                  <span className="truncate font-mono text-[11px]">{i === 3 ? `L2CAP PSM ${state.manifest.l2cap_psm} · AAP handshake` : label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-5">
          {sheet.stage === "info" && !sheet.paired && (
            <Button size="lg" className="h-12 w-full rounded-2xl text-base font-semibold" onClick={actions.startPairing}>
              Connect
            </Button>
          )}
          {(sheet.stage === "done" || (sheet.paired && sheet.stage === "info")) && (
            <Button size="lg" variant="secondary" className="h-12 w-full rounded-2xl text-base font-semibold" onClick={actions.dismissSheet}>
              Done
            </Button>
          )}
        </div>
        <p className="mt-3 truncate font-mono text-[10px] text-muted-foreground/70">{VIA_LABEL[sheet.via]}</p>
      </div>
    </div>
  );
}
