import { Bluetooth, Check, Delete, Watch } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { checkPairingCode, normalizePairingCode, PAIRING_CODE_LENGTH, WATCH_PAIRING_STAGES } from "@/lib/ina/devices";
import { NEW_WATCH, type PairedWatch } from "@/lib/ina/paired";
import { cn } from "@/lib/utils";
import { Group, Row } from "../ui";
import { BackLink, FrameGuide, ParticleReticle, StageList, playChime, useInterval, useScrollTop } from "./parts";
import { WatchSuite } from "./WatchSuite";

type Phase = "camera" | "manual" | "code" | "progress" | "ready" | "reconnecting" | "suite";

const NEARBY = [
  { name: "Apple Watch Series 11", detail: "46 mm · Jet Black Aluminium", rssi: -48 },
  { name: "Apple Watch Ultra 3", detail: "49 mm · Natural Titanium", rssi: -71 },
];

const STAGE_MS = 1500;

export function WatchFlow({
  paired,
  onPaired,
  onChange,
  onForget,
  onClose,
}: {
  paired: PairedWatch | null;
  onPaired: (w: PairedWatch) => void;
  onChange: (w: PairedWatch) => void;
  onForget: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(paired ? "reconnecting" : "camera");
  const [name, setName] = useState(NEARBY[0]!.name);
  const top = useScrollTop(phase);

  useEffect(() => {
    if (phase !== "reconnecting") return;
    const t = setTimeout(() => setPhase("suite"), 1100);
    return () => clearTimeout(t);
  }, [phase]);

  const restart = () => {
    onForget();
    setPhase("camera");
  };

  return (
    <div ref={top}>
      {phase === "camera" && <CameraStep onManual={() => setPhase("manual")} onRead={() => setPhase("progress")} onClose={onClose} />}
      {phase === "manual" && (
        <ManualStep
          onBack={() => setPhase("camera")}
          onPick={(n) => {
            setName(n);
            setPhase("code");
          }}
        />
      )}
      {phase === "code" && <CodeStep name={name} onBack={() => setPhase("manual")} onMatch={() => setPhase("progress")} />}
      {phase === "progress" && <ProgressStep name={name} onDone={() => setPhase("ready")} />}
      {phase === "ready" && (
        <ReadyStep
          name={name}
          onContinue={() => {
            onPaired({ ...NEW_WATCH, name });
            setPhase("suite");
          }}
        />
      )}
      {phase === "reconnecting" && paired && (
        <div className="flex flex-col items-center px-6 pt-16 text-center">
          <ProductImage product="apple-watch" alt={paired.name} eager className="h-44 animate-float" />
          <div className="mt-6 flex items-center gap-2 text-[15px] font-medium">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Connecting to {paired.name}…
          </div>
        </div>
      )}
      {phase === "suite" && paired && <WatchSuite watch={paired} onChange={onChange} onDisconnect={onClose} onRepair={restart} />}
    </div>
  );
}

function CameraStep({ onManual, onRead, onClose }: { onManual: () => void; onRead: () => void; onClose: () => void }) {
  const [state, setState] = useState<"looking" | "steady" | "read">("looking");
  const read = useRef(onRead);
  read.current = onRead;
  useEffect(() => {
    if (state === "steady") {
      const t = setTimeout(() => setState("read"), 1400);
      return () => clearTimeout(t);
    }
    if (state === "read") {
      playChime([880, 1320], 0.12);
      const t = setTimeout(() => read.current(), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state]);
  const locked = state !== "looking";
  return (
    <div className="space-y-4 pb-6">
      <div className="px-5 pt-2">
        <BackLink onClick={onClose} />
      </div>
      <div className="relative mx-4 aspect-[4/5] overflow-hidden rounded-[28px] bg-viewfinder text-viewfinder-foreground">
        <ParticleReticle locked={locked} className="absolute inset-0" />
        <FrameGuide locked={locked} />
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-viewfinder/70 px-3 py-1.5 text-[12px] font-medium backdrop-blur">
            {state === "read" ? <Check className="size-3.5 text-success" /> : <span className="size-1.5 animate-pulse rounded-full bg-success" />}
            {state === "looking" ? "Looking for Apple Watch…" : state === "steady" ? "Hold steady…" : "Apple Watch found"}
          </span>
        </div>
      </div>
      <div className="px-6 text-center">
        <h3 className="text-[22px] font-bold leading-tight tracking-tight">Hold Apple Watch up to the Camera</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Position the animation on your Watch in the viewfinder to pair.</p>
      </div>
      <div className="mx-4 space-y-2">
        <Button className="h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={() => setState("steady")} disabled={locked}>
          Simulate holding up your Watch
        </Button>
        <button type="button" onClick={onManual} className="w-full py-2 text-[15px] text-primary">
          Pair Apple Watch Manually
        </button>
      </div>
    </div>
  );
}

function ManualStep({ onBack, onPick }: { onBack: () => void; onPick: (name: string) => void }) {
  const [found, setFound] = useState(0);
  useInterval(() => setFound((f) => Math.min(NEARBY.length, f + 1)), found < NEARBY.length ? 900 : null);
  return (
    <div className="space-y-4 pb-6">
      <div className="px-5 pt-2">
        <BackLink label="Camera" onClick={onBack} />
        <h3 className="mt-2 text-[26px] font-bold leading-tight tracking-tight">Pair Apple Watch Manually</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">On your Watch, tap the ⓘ in the corner, then choose it below.</p>
      </div>
      <Group title="Nearby" footer="Found over Bluetooth. Pick the name your Watch shows.">
        {NEARBY.slice(0, found).map((w) => (
          <Row key={w.name} icon={Watch} title={w.name} detail={w.detail} onClick={() => onPick(w.name)}>
            <SignalBars rssi={w.rssi} />
          </Row>
        ))}
        {found < NEARBY.length && (
          <div className="flex items-center gap-3 px-4 py-3 text-[13px] text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <Bluetooth className="size-4" /> Searching…
          </div>
        )}
      </Group>
    </div>
  );
}

function SignalBars({ rssi }: { rssi: number }) {
  const bars = rssi > -55 ? 3 : rssi > -70 ? 2 : 1;
  return (
    <span className="flex h-3.5 shrink-0 items-end gap-0.5" aria-label={`Signal ${bars} of 3`}>
      {[1, 2, 3].map((b) => (
        <span key={b} className={cn("w-1 rounded-sm", b <= bars ? "bg-foreground" : "bg-foreground/20")} style={{ height: `${b * 33}%` }} />
      ))}
    </span>
  );
}

function CodeStep({ name, onBack, onMatch }: { name: string; onBack: () => void; onMatch: () => void }) {
  const shown = useMemo(() => String(Math.floor(100000 + Math.random() * 900000)), []);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const type = (next: string) => {
    const c = normalizePairingCode(next);
    setCode(c);
    setWrong(false);
    const result = checkPairingCode(c, shown);
    if (result === "match") setTimeout(onMatch, 350);
    if (result === "mismatch") {
      setWrong(true);
      setTimeout(() => setCode(""), 700);
    }
  };
  return (
    <div className="space-y-4 pb-6">
      <div className="px-5 pt-2">
        <BackLink label="Nearby" onClick={onBack} />
        <h3 className="mt-2 text-[24px] font-bold leading-tight tracking-tight">Enter Code</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Type the 6-digit code shown on {name}.</p>
      </div>
      <div className="mx-auto flex w-40 flex-col items-center rounded-[36px] bg-viewfinder px-4 py-5 text-viewfinder-foreground shadow-plate">
        <span className="text-[10px] uppercase tracking-wider opacity-60">On your Watch</span>
        <span className="mt-1 font-mono text-[22px] font-semibold tracking-[0.2em]">{shown}</span>
      </div>
      <label className="sr-only" htmlFor="watch-code">
        Pairing code
      </label>
      <input id="watch-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => type(e.target.value)} className="sr-only" />
      <div className={cn("flex justify-center gap-2", wrong && "animate-pulse")}>
        {Array.from({ length: PAIRING_CODE_LENGTH }, (_, i) => (
          <span key={i} className={cn("grid h-12 w-10 place-items-center rounded-xl bg-card text-[22px] font-semibold tabular-nums", i === code.length && "ring-2 ring-primary", wrong && "text-destructive")}>
            {code[i] ?? ""}
          </span>
        ))}
      </div>
      <p className={cn("h-4 text-center text-[12px]", wrong ? "text-destructive" : "text-muted-foreground")}>{wrong ? "That code doesn't match. Try again." : ""}</p>
      <div className="mx-6 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
          k === "" ? (
            <span key="blank" />
          ) : (
            <button
              key={k}
              type="button"
              aria-label={k === "del" ? "Delete" : k}
              onClick={() => type(k === "del" ? code.slice(0, -1) : code + k)}
              className="grid h-12 place-items-center rounded-2xl bg-card text-[20px] font-medium active:bg-elevated"
            >
              {k === "del" ? <Delete className="size-5" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function ProgressStep({ name, onDone }: { name: string; onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const total = WATCH_PAIRING_STAGES.length * STAGE_MS;
  useInterval(() => setElapsed((e) => Math.min(total, e + 100)), elapsed < total ? 100 : null);
  useEffect(() => {
    if (elapsed < total) return;
    const t = setTimeout(onDone, 500);
    return () => clearTimeout(t);
  }, [elapsed, total, onDone]);
  const stage = Math.min(WATCH_PAIRING_STAGES.length, Math.floor(elapsed / STAGE_MS));
  const pct = elapsed / total;
  const size = 200;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="space-y-5 px-4 pb-6 pt-6">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-foreground/10" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} className="text-primary transition-[stroke-dasharray] duration-100" />
        </svg>
        <ProductImage product="apple-watch" alt={name} eager className="absolute inset-6 m-auto h-[150px]" />
      </div>
      <div className="text-center">
        <h3 className="text-[22px] font-bold tracking-tight">Pairing {name}</h3>
        <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">{Math.round(pct * 100)}% · keep your Watch close</p>
      </div>
      <StageList stages={WATCH_PAIRING_STAGES} current={stage} />
    </div>
  );
}

function ReadyStep({ name, onContinue }: { name: string; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-success text-primary-foreground animate-in zoom-in duration-500">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <h3 className="mt-5 text-[24px] font-bold tracking-tight">Your Apple Watch Is Ready</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{name} is paired. Notifications, Activity and Health are now on your wrist and in iNA.</p>
      <Button className="mt-8 h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
