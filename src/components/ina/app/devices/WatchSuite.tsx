import { Activity, Bell, BellRing, Footprints, Heart, Minus, Moon, Plus, Vibrate, Wind } from "lucide-react";
import { useState } from "react";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import {
  clampGoal,
  clampHeartThreshold,
  classifyEcg,
  ECG_LABEL,
  formatDuration,
  GOAL_LIMITS,
  heartZone,
  restingHeartRate,
  ringClosed,
  sleepBreakdown,
  SLEEP_LABEL,
  spo2Status,
  stepsToKm,
  timeAsleep,
  type RingKind,
  type SleepStage,
} from "@/lib/ina/devices";
import type { PairedWatch } from "@/lib/ina/paired";
import { cn } from "@/lib/utils";
import { Chip, Group, Row, Segmented, ToggleRow } from "../ui";
import { ActivityRings, BackLink, EcgTrace, HeartTrace, playChime, useInterval } from "./parts";

type Tab = "activity" | "health" | "watch";

const RING_META: Record<RingKind, { label: string; text: string; bg: string }> = {
  move: { label: "Move", text: "text-activity-move", bg: "bg-activity-move" },
  exercise: { label: "Exercise", text: "text-activity-exercise", bg: "bg-activity-exercise" },
  stand: { label: "Stand", text: "text-activity-stand", bg: "bg-activity-stand" },
};

const SLEEP_BG: Record<SleepStage, string> = { awake: "bg-sleep-awake", rem: "bg-sleep-rem", core: "bg-sleep-core", deep: "bg-sleep-deep" };
const LAST_NIGHT: Record<SleepStage, number> = { awake: 22, rem: 98, core: 236, deep: 61 };

export const WATCH_FACES = [
  { id: "modular", name: "Modular" },
  { id: "activity", name: "Activity Digital" },
  { id: "solar", name: "Solar Dial" },
  { id: "photos", name: "Photos" },
  { id: "unity", name: "Unity" },
] as const;

export function WatchSuite({ watch, onChange, onDisconnect, onRepair }: { watch: PairedWatch; onChange: (w: PairedWatch) => void; onDisconnect: () => void; onRepair: () => void }) {
  const [tab, setTab] = useState<Tab>("activity");
  const [workout, setWorkout] = useState(false);
  const [bpm, setBpm] = useState(72);
  const [samples, setSamples] = useState<number[]>(() => Array.from({ length: 40 }, (_, i) => 70 + Math.round(Math.sin(i / 3) * 4)));
  const [activity, setActivity] = useState({ move: 342, exercise: 22, stand: 9, steps: 7842 });

  useInterval(() => {
    const target = workout ? 132 : 72;
    const next = Math.round(bpm + (target - bpm) * 0.18 + (Math.random() * 6 - 3));
    setBpm(next);
    setSamples((s) => [...s.slice(-39), next]);
    setActivity((a) => ({
      move: a.move + (workout ? 4 : 1),
      exercise: a.exercise + (workout ? 1 : 0),
      stand: a.stand,
      steps: a.steps + (workout ? 28 : 6),
    }));
  }, 1200);

  return (
    <div className="space-y-5 pb-6">
      <div className="px-5 pt-2">
        <BackLink onClick={onDisconnect} />
        <div className="mt-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          <span className="text-[13px] font-medium text-muted-foreground">Connected · simulated</span>
          <Chip className="ml-auto">GATT · ANCS</Chip>
        </div>
        <h3 className="mt-1 truncate text-[28px] font-bold tracking-tight">{watch.name}</h3>
      </div>
      <div className="mx-4 flex items-center justify-around gap-2 rounded-[24px] bg-card px-2 py-4">
        <ProductImage product="apple-watch" alt={watch.name} eager className="h-24 w-24 shrink-0 object-contain animate-float" />
        <BatteryRing level={78} label="Watch" size={72} />
        <div className="flex w-12 shrink-0 flex-col items-center">
          <Heart className="size-6 animate-pulse fill-current text-destructive" style={{ animationDuration: `${60 / Math.max(40, bpm)}s` }} />
          <span className="text-[22px] font-semibold tabular-nums">{bpm}</span>
          <span className="text-[11px] text-muted-foreground">BPM</span>
        </div>
      </div>
      <div className="mx-4">
        <Segmented value={tab} onChange={setTab} options={[{ value: "activity", label: "Activity" }, { value: "health", label: "Health" }, { value: "watch", label: "Watch" }]} />
      </div>
      {tab === "activity" && <ActivityTab watch={watch} onChange={onChange} values={activity} />}
      {tab === "health" && <HealthTab watch={watch} onChange={onChange} bpm={bpm} samples={samples} workout={workout} onWorkout={setWorkout} />}
      {tab === "watch" && <WatchTab watch={watch} onChange={onChange} />}
      <div className="mx-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-11 rounded-2xl" onClick={onDisconnect}>
          Disconnect
        </Button>
        <Button variant="secondary" className="h-11 rounded-2xl text-destructive" onClick={onRepair}>
          Unpair & Re-pair
        </Button>
      </div>
    </div>
  );
}

function ActivityTab({ watch, onChange, values }: { watch: PairedWatch; onChange: (w: PairedWatch) => void; values: { move: number; exercise: number; stand: number; steps: number } }) {
  const [editing, setEditing] = useState(false);
  const allClosed = (["move", "exercise", "stand"] as const).every((k) => ringClosed(values[k], watch.goals[k]));
  const setGoal = (k: RingKind, d: number) => onChange({ ...watch, goals: { ...watch.goals, [k]: clampGoal(k, watch.goals[k] + d * GOAL_LIMITS[k].step) } });
  return (
    <>
      <section className="mx-4 rounded-[24px] bg-card p-4">
        <div className="flex items-center gap-4">
          <ActivityRings values={values} goals={watch.goals} />
          <div className="min-w-0 flex-1 space-y-2">
            {(["move", "exercise", "stand"] as const).map((k) => (
              <div key={k}>
                <div className={cn("text-[12px] font-semibold", RING_META[k].text)}>{RING_META[k].label}</div>
                <div className="truncate text-[17px] font-semibold tabular-nums">
                  {values[k]}
                  <span className="text-muted-foreground">/{watch.goals[k]}</span> <span className="text-[12px] font-normal text-muted-foreground">{GOAL_LIMITS[k].unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {allClosed && <p className="mt-3 rounded-xl bg-elevated px-3 py-2 text-center text-[12.5px] font-medium">All three rings closed today</p>}
        <button type="button" onClick={() => setEditing((e) => !e)} className="mt-3 w-full text-[14px] text-primary">
          {editing ? "Done" : "Change Goals"}
        </button>
        {editing && (
          <div className="mt-2 space-y-2">
            {(["move", "exercise", "stand"] as const).map((k) => (
              <div key={k} className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2">
                <span className={cn("size-2.5 rounded-full", RING_META[k].bg)} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{RING_META[k].label} goal</span>
                <Stepper value={`${watch.goals[k]} ${GOAL_LIMITS[k].unit}`} onMinus={() => setGoal(k, -1)} onPlus={() => setGoal(k, 1)} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mx-4 grid grid-cols-2 gap-2">
        <Stat icon={Footprints} label="Steps" value={values.steps.toLocaleString("en-US")} />
        <Stat icon={Activity} label="Distance" value={`${stepsToKm(values.steps).toFixed(2)} km`} />
      </section>
    </>
  );
}

function Stat({ icon: I, label, value, tint }: { icon: typeof Heart; label: string; value: string; tint?: string }) {
  return (
    <div className="rounded-[20px] bg-card p-4">
      <div className={cn("flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground", tint)}>
        <I className="size-3.5" /> {label}
      </div>
      <div className="mt-1 truncate text-[22px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button type="button" aria-label="Decrease" onClick={onMinus} className="grid size-7 place-items-center rounded-full bg-card">
        <Minus className="size-3.5" />
      </button>
      <span className="w-16 text-center text-[13px] font-medium tabular-nums">{value}</span>
      <button type="button" aria-label="Increase" onClick={onPlus} className="grid size-7 place-items-center rounded-full bg-card">
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}

function HealthTab({ watch, onChange, bpm, samples, workout, onWorkout }: { watch: PairedWatch; onChange: (w: PairedWatch) => void; bpm: number; samples: number[]; workout: boolean; onWorkout: (v: boolean) => void }) {
  const zone = heartZone(bpm, watch.heart);
  const resting = restingHeartRate(samples);
  const setThreshold = (which: "low" | "high", d: number) => onChange({ ...watch, heart: { ...watch.heart, [which]: clampHeartThreshold(which, watch.heart[which] + d * 5) } });
  return (
    <>
      <section className="mx-4 rounded-[24px] bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-destructive">
            <Heart className="size-4 fill-current" /> Heart Rate
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", zone === "high" ? "bg-warning text-background" : zone === "low" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground")}>
            {zone === "high" ? `Above ${watch.heart.high}` : zone === "low" ? `Below ${watch.heart.low}` : "Normal range"}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-[38px] font-semibold leading-none tabular-nums">{bpm}</span>
          <span className="text-[13px] text-muted-foreground">BPM · live</span>
        </div>
        <HeartTrace samples={samples} low={watch.heart.low} high={watch.heart.high} className="mt-2" />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Mini label="Resting" value={resting > 0 ? `${resting}` : "--"} />
          <Mini label="High alert" value={`${watch.heart.high}`} tone="text-warning" />
          <Mini label="Low alert" value={`${watch.heart.low}`} tone="text-primary" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13.5px]">High heart rate</span>
            <Stepper value={`${watch.heart.high} BPM`} onMinus={() => setThreshold("high", -1)} onPlus={() => setThreshold("high", 1)} />
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13.5px]">Low heart rate</span>
            <Stepper value={`${watch.heart.low} BPM`} onMinus={() => setThreshold("low", -1)} onPlus={() => setThreshold("low", 1)} />
          </div>
        </div>
        <Button variant="secondary" className="mt-3 h-10 w-full rounded-xl" onClick={() => onWorkout(!workout)}>
          {workout ? "End simulated workout" : "Simulate a workout"}
        </Button>
      </section>
      <BloodOxygen />
      <Ecg bpm={bpm} />
      <Sleep />
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-elevated px-2 py-2">
      <div className={cn("text-[17px] font-semibold tabular-nums", tone)}>{value}</div>
      <div className="truncate text-[10.5px] text-muted-foreground">{label}</div>
    </div>
  );
}

function BloodOxygen() {
  const [left, setLeft] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  useInterval(() => {
    if (left === null) return;
    if (left <= 1) {
      setResult(96 + Math.floor(Math.random() * 4));
      setLeft(null);
    } else setLeft(left - 1);
  }, left !== null ? 1000 : null);
  const status = result !== null ? spo2Status(result) : null;
  return (
    <section className="mx-4 rounded-[24px] bg-card p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
        <Wind className="size-4" /> Blood Oxygen
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div>
          <span className="text-[34px] font-semibold leading-none tabular-nums">{left !== null ? `${left}s` : result !== null ? `${result}%` : "--%"}</span>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {left !== null ? "Keep your wrist flat and still…" : status === "normal" ? "Within the normal range" : status ? "Lower than usual" : "No reading yet"}
          </div>
        </div>
        <Button className="h-10 shrink-0 rounded-xl px-4" disabled={left !== null} onClick={() => setLeft(15)}>
          Measure
        </Button>
      </div>
    </section>
  );
}

function Ecg({ bpm }: { bpm: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const [readings, setReadings] = useState<number[]>([]);
  const [result, setResult] = useState<{ label: string; avg: number } | null>(null);
  useInterval(() => {
    if (left === null) return;
    const all = [...readings, bpm];
    setReadings(all);
    if (left <= 1) {
      const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
      setResult({ label: ECG_LABEL[classifyEcg(avg)], avg });
      setLeft(null);
    } else setLeft(left - 1);
  }, left !== null ? 1000 : null);
  return (
    <section className="mx-4 rounded-[24px] bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-destructive">
          <Activity className="size-4" /> ECG
        </span>
        {left !== null && <span className="text-[12px] tabular-nums text-muted-foreground">{left}s left</span>}
      </div>
      <EcgTrace bpm={bpm} running={left !== null} />
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold">{left !== null ? "Recording…" : (result?.label ?? "No recording yet")}</div>
          <div className="text-[12px] text-muted-foreground">{left !== null ? "Hold your finger on the Digital Crown" : result ? `Average ${result.avg} BPM · 30 s` : "Takes 30 seconds"}</div>
        </div>
        <Button
          className="h-10 shrink-0 rounded-xl px-4"
          disabled={left !== null}
          onClick={() => {
            setReadings([]);
            setResult(null);
            setLeft(30);
          }}
        >
          Record
        </Button>
      </div>
    </section>
  );
}

function Sleep() {
  const slices = sleepBreakdown(LAST_NIGHT);
  return (
    <section className="mx-4 rounded-[24px] bg-card p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-sleep-rem">
        <Moon className="size-4" /> Sleep · last night
      </div>
      <div className="mt-1 text-[26px] font-semibold tabular-nums">{formatDuration(timeAsleep(LAST_NIGHT))}</div>
      <div className="text-[12px] text-muted-foreground">Time asleep</div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full">
        {slices.map((s) => (
          <span key={s.stage} className={SLEEP_BG[s.stage]} style={{ width: `${s.percent}%` }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {slices.map((s) => (
          <div key={s.stage} className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2">
            <span className={cn("size-2.5 shrink-0 rounded-full", SLEEP_BG[s.stage])} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium">{SLEEP_LABEL[s.stage]}</span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {formatDuration(s.minutes)} · {s.percent}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WatchTab({ watch, onChange }: { watch: PairedWatch; onChange: (w: PairedWatch) => void }) {
  const [pinging, setPinging] = useState(false);
  const ping = () => {
    setPinging(true);
    playChime([1568, 2093, 1568, 2093], 0.18);
    setTimeout(() => setPinging(false), 2500);
  };
  return (
    <>
      <section className="space-y-2">
        <h4 className="px-7 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Watch Faces</h4>
        <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
          {WATCH_FACES.map((f) => (
            <button key={f.id} type="button" onClick={() => onChange({ ...watch, face: f.id })} className="shrink-0 text-center" aria-pressed={watch.face === f.id}>
              <FacePreview id={f.id} active={watch.face === f.id} />
              <span className={cn("mt-1.5 block text-[11.5px]", watch.face === f.id ? "font-semibold text-primary" : "text-muted-foreground")}>{f.name}</span>
            </button>
          ))}
        </div>
      </section>
      <Group title="Watch" footer="Ping My Watch plays a sound on your Apple Watch, even in silent mode.">
        <ToggleRow icon={Bell} title="Mirror notifications" detail="Android alerts on your wrist · ANCS" checked={watch.mirrorNotifications} onCheckedChange={(v) => onChange({ ...watch, mirrorNotifications: v })} />
        <ToggleRow icon={Vibrate} title="Wrist haptics" detail="Tap your wrist for alerts" checked={watch.haptics} onCheckedChange={(v) => onChange({ ...watch, haptics: v })} />
        <ToggleRow icon={Vibrate} title="Prominent haptic" detail="Extra tap before common alerts" checked={watch.prominentHaptics && watch.haptics} disabled={!watch.haptics} onCheckedChange={(v) => onChange({ ...watch, prominentHaptics: v })} />
        <Row icon={BellRing} title="Ping My Watch" detail={pinging ? "Playing a sound on your Watch…" : "Find a Watch nearby"} onClick={pinging ? undefined : ping}>
          <span className={cn("shrink-0 text-[14px]", pinging ? "text-muted-foreground" : "text-primary")}>{pinging ? "Pinging…" : "Ping"}</span>
        </Row>
      </Group>
    </>
  );
}

function FacePreview({ id, active }: { id: string; active: boolean }) {
  return (
    <span className={cn("relative block h-[112px] w-[92px] overflow-hidden rounded-[26px] bg-viewfinder p-2 text-viewfinder-foreground ring-2 transition", active ? "ring-primary" : "ring-transparent")}>
      {id === "modular" && (
        <span className="flex h-full flex-col justify-between text-left">
          <span className="text-[9px] text-activity-stand">TUE 27</span>
          <span className="text-[26px] font-semibold leading-none tabular-nums">10:09</span>
          <span className="grid grid-cols-2 gap-1">
            <span className="h-3 rounded bg-activity-move/60" />
            <span className="h-3 rounded bg-activity-exercise/60" />
          </span>
        </span>
      )}
      {id === "activity" && (
        <span className="flex h-full flex-col items-center justify-center gap-1">
          <span className="text-[16px] font-semibold tabular-nums">10:09</span>
          <span className="relative size-12">
            <span className="absolute inset-0 rounded-full border-4 border-activity-move" />
            <span className="absolute inset-[6px] rounded-full border-4 border-activity-exercise" />
            <span className="absolute inset-[12px] rounded-full border-4 border-activity-stand" />
          </span>
        </span>
      )}
      {id === "solar" && (
        <span className="relative flex h-full items-center justify-center">
          <span className="absolute size-16 rounded-full bg-warning/30 blur-md" />
          <span className="relative size-14 rounded-full border border-viewfinder-foreground/40">
            <span className="absolute left-1/2 top-1/2 h-5 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rotate-[-60deg] bg-viewfinder-foreground" />
            <span className="absolute left-1/2 top-1/2 h-6 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rotate-[55deg] bg-warning" />
          </span>
        </span>
      )}
      {id === "photos" && (
        <span className="flex h-full items-end rounded-[20px] bg-gradient-to-br from-sleep-core via-activity-move/70 to-warning p-1.5">
          <span className="text-[18px] font-semibold tabular-nums">10:09</span>
        </span>
      )}
      {id === "unity" && (
        <span className="flex h-full flex-col items-center justify-center">
          <span className="bg-gradient-to-b from-activity-exercise via-warning to-activity-move bg-clip-text text-[30px] font-black leading-none text-transparent">10</span>
          <span className="bg-gradient-to-b from-activity-move via-warning to-activity-exercise bg-clip-text text-[30px] font-black leading-none text-transparent">09</span>
        </span>
      )}
    </span>
  );
}
