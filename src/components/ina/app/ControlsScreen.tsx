import {
  BellRing,
  CircleDot,
  Ear,
  Lock,
  MessageCircleMore,
  PhoneIncoming,
  ScanFace,
  ShieldAlert,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSim, type StemAction } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { PreviewToggleCard } from "./ConnectScreen";
import { Group, ScreenHeader, Segmented, ToggleRow } from "./ui";

const STEM_OPTIONS: { value: StemAction; label: string }[] = [
  { value: "noise", label: "Noise Control" },
  { value: "assistant", label: "Assistant" },
  { value: "off", label: "Off" },
];

type FitResult = "good" | "adjust";

function FitTest() {
  const { state, actions } = useSim();
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "blocked">("idle");
  const [result, setResult] = useState<{ left: FitResult; right: FitResult } | null>(null);
  const bothIn = state.accessory.leftInEar && state.accessory.rightInEar;

  useEffect(() => {
    if (phase !== "running") return;
    const t = window.setTimeout(() => {
      setResult({ left: "good", right: state.accessory.looseRightTip ? "adjust" : "good" });
      setPhase("done");
      actions.log("AAP", "Ear Tip Fit Test complete", "04 00 04 00 1B 00 01 01");
      actions.markFitTested();
    }, 3200);
    return () => window.clearTimeout(t);
  }, [phase, actions, state.accessory.looseRightTip]);

  return (
    <div className="space-y-3 p-4">
      {phase === "running" ? (
        <div className="flex h-12 items-end justify-center gap-1">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="w-1.5 origin-bottom rounded-full bg-primary animate-wave" style={{ height: "100%", animationDelay: `${(i % 6) * 0.1}s` }} />
          ))}
        </div>
      ) : phase === "done" && result ? (
        <div className="grid grid-cols-2 gap-2">
          {(["left", "right"] as const).map((s) => (
            <div key={s} className={cn("rounded-2xl p-3 text-center", result[s] === "good" ? "bg-success/15" : "bg-warning/15")}>
              <div className="text-xs text-muted-foreground">{s === "left" ? "Left" : "Right"}</div>
              <div className={cn("text-sm font-semibold", result[s] === "good" ? "text-success" : "text-warning")}>
                {result[s] === "good" ? "Good Seal" : "Adjust or try another tip"}
              </div>
            </div>
          ))}
        </div>
      ) : phase === "blocked" ? (
        <p className="text-center text-xs text-warning">Put both AirPods in your ears to start the test.</p>
      ) : (
        <p className="text-[12.5px] leading-snug text-muted-foreground">
          Plays a short tone and measures the seal with the inner microphones to find the best ear tip size.
        </p>
      )}
      <Button
        variant="secondary"
        className="h-10 w-full rounded-xl"
        disabled={phase === "running"}
        onClick={() => {
          if (!bothIn) return setPhase("blocked");
          setResult(null);
          setPhase("running");
          actions.log("AAP", "Ear Tip Fit Test started", "04 00 04 00 1B 00 01 00");
        }}
      >
        {phase === "running" ? "Testing…" : phase === "done" ? "Test again" : "Begin Fit Test"}
      </Button>
    </div>
  );
}

export function ControlsScreen() {
  const { state, actions, model, isConnected } = useSim();

  if (!isConnected || !model) {
    return (
      <div className="space-y-4">
        <ScreenHeader title="Controls" />
        <div className="mx-4 rounded-[24px] bg-card p-6 text-center">
          <Lock className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 text-[15px] font-semibold">Connect a device to adjust controls</p>
          <p className="mt-1 text-xs text-muted-foreground">Ear detection, gestures, fit test and Find My appear here once an accessory is connected.</p>
        </div>
        <PreviewToggleCard className="mx-4" />
      </div>
    );
  }

  const c = model.caps;
  const s = state.settings;

  return (
    <div className="space-y-5 pb-6">
      <ScreenHeader title="Controls" subtitle={model.name} />

      {c.inEarDetection && (
        <Group title="Detection" footer={c.hasCase ? "Pauses playback when you remove an AirPod and resumes when you put it back." : "Pauses when you take the headphones off your head."}>
          <ToggleRow
            icon={Ear}
            tint="bg-tint-green"
            title={c.hasCase ? "Automatic Ear Detection" : "Automatic Head Detection"}
            detail="In-ear optical sensor · auto-pause"
            checked={s.autoPause}
            onCheckedChange={(v) => actions.setSetting("autoPause", v)}
          />
        </Group>
      )}

      {(c.conversationAwareness || c.personalizedVolume || c.anc) && (
        <Group title="Hearing">
          {c.conversationAwareness && (
            <ToggleRow icon={MessageCircleMore} tint="bg-tint-teal" title="Conversation Awareness" detail="0x28 · voice accelerometer" checked={s.conversationAwareness} onCheckedChange={(v) => actions.setSetting("conversationAwareness", v)} />
          )}
          {c.personalizedVolume && (
            <ToggleRow icon={Volume2} tint="bg-tint-blue" title="Personalized Volume" detail="0x26 · environment-aware" checked={s.personalizedVolume} onCheckedChange={(v) => actions.setSetting("personalizedVolume", v)} />
          )}
          {c.anc && (
            <ToggleRow icon={ShieldAlert} tint="bg-tint-orange" title="Loud Sound Reduction" detail="Limits sudden loud noise" checked={s.loudSoundReduction} onCheckedChange={(v) => actions.setSetting("loudSoundReduction", v)} />
          )}
        </Group>
      )}

      {c.headGestures && (
        <Group title="Head Gestures" footer="Nod to answer a call or accept, shake to decline or dismiss.">
          <ToggleRow icon={ScanFace} tint="bg-tint-purple" title="Head Gestures" detail="Nod Yes · Shake No" checked={s.headGestures} onCheckedChange={(v) => actions.setSetting("headGestures", v)} />
          <div className="p-3">
            <Button variant="secondary" className="h-10 w-full rounded-xl" onClick={actions.incomingCall} disabled={!!state.call}>
              <PhoneIncoming className="size-4" /> Try it with a test call
            </Button>
          </div>
        </Group>
      )}

      {c.stemControls && (
        <Group title="Press and Hold" footer="Choose what a long press on each stem does.">
          {(["stemLeft", "stemRight"] as const).map((k) => (
            <div key={k} className="flex items-center gap-3 px-4 py-3">
              <span className="w-12 shrink-0 text-[15px]">{k === "stemLeft" ? "Left" : "Right"}</span>
              <Segmented className="min-w-0 flex-1" value={s[k]} options={STEM_OPTIONS} onChange={(v) => actions.setSetting(k, v)} />
            </div>
          ))}
        </Group>
      )}

      {c.digitalCrown && (
        <Group title="Digital Crown" footer="Sets which way turning the crown raises the volume.">
          <div className="px-4 py-3">
            <Segmented
              value={s.crownReversed ? "front" : "back"}
              options={[
                { value: "back", label: "Back to Front" },
                { value: "front", label: "Front to Back" },
              ]}
              onChange={(v) => actions.setSetting("crownReversed", v === "front")}
            />
          </div>
        </Group>
      )}

      {c.fitTest && (
        <Group title="Ear Tip Fit Test">
          <FitTest />
        </Group>
      )}

      <Group title="Find My" footer="Plays a loud chirp so you can find a misplaced earbud or case.">
        <div className="grid gap-2 p-3" style={{ gridTemplateColumns: `repeat(${c.hasCase ? (c.caseSpeaker ? 3 : 2) : 1}, minmax(0,1fr))` }}>
          {(c.hasCase ? (c.caseSpeaker ? (["left", "right", "case"] as const) : (["left", "right"] as const)) : (["case"] as const)).map((t) => {
            const active = state.chirp === t;
            return (
              <Button key={t} variant={active ? "default" : "secondary"} className="h-14 flex-col gap-0.5 rounded-xl" onClick={() => actions.setChirp(active ? null : t)}>
                {active ? <Square className="size-4 fill-current" /> : <BellRing className="size-4" />}
                <span className="text-[11px]">{!c.hasCase ? "Play sound" : t === "left" ? "Left" : t === "right" ? "Right" : "Case"}</span>
              </Button>
            );
          })}
        </div>
      </Group>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <CircleDot className="size-3" /> Every change is sent over L2CAP {state.manifest.l2cap_psm}
      </p>
    </div>
  );
}
