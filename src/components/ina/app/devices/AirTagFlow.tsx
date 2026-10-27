import { Lock, Navigation, Pencil, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { AIRTAG_ITEMS, AIRTAG_SETUP_STAGES, cleanItemName, findingLabel, proximityTrend, type ProximityTrend } from "@/lib/ina/devices";
import type { PairedAirTag } from "@/lib/ina/paired";
import { cn } from "@/lib/utils";
import { Chip, Group, Row, ToggleRow } from "../ui";
import { BackLink, ProximityCard, StageList, playChime, useInterval, useScrollTop } from "./parts";

type Phase = "detect" | "connecting" | "name" | "registering" | "registered" | "find";

export function AirTagFlow({ paired, onSave, onForget, onClose }: { paired: PairedAirTag | null; onSave: (t: PairedAirTag) => void; onForget: () => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>(paired ? "find" : "detect");
  const [draft, setDraft] = useState<{ name: string; emoji: string }>({ name: paired?.name ?? "Keys", emoji: paired?.emoji ?? "🔑" });
  const top = useScrollTop(phase);

  useEffect(() => {
    if (phase !== "connecting") return;
    const t = setTimeout(() => setPhase("name"), 1300);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div ref={top}>
      {(phase === "detect" || phase === "connecting") && (
        <>
          <Searching onClose={onClose} />
          <ProximityCard title="AirTag Detected" subtitle={phase === "connecting" ? "Connecting…" : "Not registered to anyone"} onClose={onClose}>
            <div className="relative mx-auto my-3 h-36 w-full">
              <div className="absolute inset-0 bg-stage" />
              <ProductImage product="airtag" alt="AirTag" eager className="relative mx-auto h-full animate-float" />
            </div>
            <Button className="h-12 w-full rounded-2xl text-[15px] font-semibold" disabled={phase === "connecting"} onClick={() => setPhase("connecting")}>
              {phase === "connecting" ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Connect"}
            </Button>
          </ProximityCard>
        </>
      )}
      {phase === "name" && <NameStep draft={draft} onDraft={setDraft} onBack={paired ? () => setPhase("find") : onClose} onContinue={() => setPhase("registering")} />}
      {phase === "registering" && (
        <Registering
          onDone={() => {
            onSave({ name: draft.name, emoji: draft.emoji, lostMode: paired?.lostMode ?? false });
            setPhase(paired ? "find" : "registered");
          }}
        />
      )}
      {phase === "registered" && (
        <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center">
          <span className="text-[64px] leading-none animate-in zoom-in duration-500">{draft.emoji}</span>
          <h3 className="mt-4 text-[24px] font-bold tracking-tight">{draft.name} Is Registered</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">Find it here with precision distance, play a sound, or turn on Lost Mode.</p>
          <Button className="mt-8 h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={() => setPhase("find")}>
            Done
          </Button>
        </div>
      )}
      {phase === "find" && paired && (
        <FindStep
          tag={paired}
          onChange={onSave}
          onRename={() => {
            setDraft({ name: paired.name, emoji: paired.emoji });
            setPhase("name");
          }}
          onRemove={() => {
            onForget();
            setPhase("detect");
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function Searching({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 px-5 pb-6 pt-2">
      <BackLink onClick={onClose} />
      <h3 className="text-[26px] font-bold tracking-tight">AirTag</h3>
      <div className="relative flex h-56 items-center justify-center rounded-[24px] bg-card">
        {[0, 0.8, 1.6].map((d) => (
          <span key={d} className="absolute size-36 rounded-full border border-primary/40 animate-radar" style={{ animationDelay: `${d}s` }} />
        ))}
        <span className="text-[13px] text-muted-foreground">Looking for items nearby…</span>
      </div>
    </div>
  );
}

function NameStep({ draft, onDraft, onBack, onContinue }: { draft: { name: string; emoji: string }; onDraft: (d: { name: string; emoji: string }) => void; onBack: () => void; onContinue: () => void }) {
  const preset = AIRTAG_ITEMS.find((i) => i.name === draft.name);
  const [custom, setCustom] = useState(preset ? "" : draft.name);
  const clean = cleanItemName(preset ? draft.name : custom);
  return (
    <div className="space-y-5 pb-6">
      <div className="px-5 pt-2">
        <BackLink label="Back" onClick={onBack} />
        <h3 className="mt-2 text-[26px] font-bold tracking-tight">Choose a Name</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Pick what this AirTag is attached to.</p>
      </div>
      <div className="mx-4 grid grid-cols-4 gap-2">
        {AIRTAG_ITEMS.map((i) => {
          const active = draft.name === i.name && draft.emoji === i.emoji;
          return (
            <button
              key={i.name}
              type="button"
              onClick={() => {
                setCustom("");
                onDraft({ name: i.name, emoji: i.emoji });
              }}
              aria-pressed={active}
              className={cn("flex flex-col items-center gap-1 rounded-2xl bg-card py-3 ring-2 transition", active ? "ring-primary" : "ring-transparent")}
            >
              <span className="text-[26px] leading-none">{i.emoji}</span>
              <span className="text-[11.5px]">{i.name}</span>
            </button>
          );
        })}
      </div>
      <section className="mx-4 space-y-2 rounded-[20px] bg-card p-4">
        <label htmlFor="airtag-name" className="text-[13px] font-medium">
          Custom name
        </label>
        <input
          id="airtag-name"
          value={custom}
          maxLength={24}
          placeholder="e.g. Car keys"
          onChange={(e) => {
            setCustom(e.target.value);
            onDraft({ name: e.target.value, emoji: draft.emoji });
          }}
          className="h-11 w-full rounded-xl bg-elevated px-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {AIRTAG_ITEMS.map((i) => (
            <button key={i.emoji} type="button" aria-label={`Use ${i.name} emoji`} onClick={() => onDraft({ name: preset ? draft.name : custom, emoji: i.emoji })} className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[18px]", draft.emoji === i.emoji ? "bg-primary/20 ring-2 ring-primary" : "bg-elevated")}>
              {i.emoji}
            </button>
          ))}
        </div>
      </section>
      <div className="mx-4">
        <Button
          className="h-12 w-full rounded-2xl text-[15px] font-semibold"
          disabled={!clean}
          onClick={() => {
            if (!clean) return;
            onDraft({ name: clean, emoji: draft.emoji });
            onContinue();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function Registering({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useInterval(() => setStage((s) => s + 1), stage < AIRTAG_SETUP_STAGES.length ? 900 : null);
  useEffect(() => {
    if (stage < AIRTAG_SETUP_STAGES.length) return;
    const t = setTimeout(() => done.current(), 400);
    return () => clearTimeout(t);
  }, [stage]);
  return (
    <div className="space-y-5 px-4 pb-6 pt-8">
      <ProductImage product="airtag" alt="AirTag" eager className="mx-auto h-32 animate-float" />
      <h3 className="text-center text-[22px] font-bold tracking-tight">Setting Up AirTag</h3>
      <StageList stages={AIRTAG_SETUP_STAGES} current={stage} />
    </div>
  );
}

const TREND_TEXT: Record<ProximityTrend, string> = { warmer: "Warmer", colder: "Colder", steady: "Hold steady" };

function FindStep({ tag, onChange, onRename, onRemove, onClose }: { tag: PairedAirTag; onChange: (t: PairedAirTag) => void; onRename: () => void; onRemove: () => void; onClose: () => void }) {
  const [finding, setFinding] = useState(false);
  const [dist, setDist] = useState(6.4);
  const [trend, setTrend] = useState<ProximityTrend>("steady");
  const [bearing, setBearing] = useState(40);
  const [ringing, setRinging] = useState(false);
  const [lostForm, setLostForm] = useState(false);
  const [phone, setPhone] = useState("");

  const move = (delta: number) => {
    const next = Math.max(0.2, +(dist + delta).toFixed(2));
    setTrend(proximityTrend(dist, next));
    setDist(next);
  };
  useInterval(() => {
    setBearing((b) => b + (Math.random() * 16 - 8) - b * 0.08);
    setDist((d) => Math.max(0.2, +(d + Math.random() * 0.16 - 0.08).toFixed(2)));
  }, 1100);

  const chirp = () => {
    setRinging(true);
    playChime([2637, 3136, 2637, 3136, 2637, 3136], 0.12);
    setTimeout(() => setRinging(false), 3000);
  };

  const here = dist < 0.5;
  return (
    <div className="space-y-5 pb-6">
      <div className="px-5 pt-2">
        <BackLink onClick={onClose} />
        <div className="mt-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          <span className="text-[13px] font-medium text-muted-foreground">With you · simulated</span>
          <Chip className="ml-auto">0x12 · UWB</Chip>
        </div>
        <h3 className="mt-1 truncate text-[28px] font-bold tracking-tight">
          {tag.emoji} {tag.name}
        </h3>
      </div>

      {finding ? (
        <section className={cn("mx-4 overflow-hidden rounded-[28px] p-5 text-center transition-colors duration-500", here ? "bg-success text-primary-foreground" : "bg-card")}>
          <div className="relative mx-auto flex size-52 items-center justify-center">
            {[0, 0.7, 1.4].map((d) => (
              <span key={d} className={cn("absolute size-44 rounded-full border animate-radar", here ? "border-primary-foreground/60" : "border-primary/40")} style={{ animationDelay: `${d}s`, animationDuration: `${Math.max(0.8, Math.min(3, dist / 2))}s` }} />
            ))}
            {here ? (
              <span className="size-20 rounded-full bg-primary-foreground/90 animate-pulse" />
            ) : (
              <Navigation className="size-20 fill-current text-primary transition-transform duration-700" style={{ transform: `rotate(${bearing - 45}deg)` }} />
            )}
          </div>
          <div className="text-[44px] font-semibold leading-none tabular-nums">{here ? "Here" : `${dist.toFixed(1)} m`}</div>
          <div className={cn("mt-1 text-[14px] font-medium", here ? "" : "text-muted-foreground")}>{here ? "Within reach" : `${findingLabel(dist)} · ${bearing > 10 ? "to your right" : bearing < -10 ? "to your left" : "ahead"}`}</div>
          {!here && (
            <span className={cn("mt-3 inline-flex rounded-full px-3 py-1 text-[12px] font-semibold", trend === "warmer" ? "bg-warning text-background" : trend === "colder" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground")}>
              {TREND_TEXT[trend]}
            </span>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-10 rounded-xl" onClick={() => move(1)}>
              Step back
            </Button>
            <Button variant="secondary" className="h-10 rounded-xl" onClick={() => move(-1)}>
              Step closer
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-4 flex items-center justify-around rounded-[24px] bg-card px-2 py-5">
          <div className="text-center">
            <div className="text-[34px] font-semibold tabular-nums">{dist.toFixed(1)} m</div>
            <div className="text-[12px] text-muted-foreground">Nearby · Bluetooth</div>
          </div>
          <BatteryRing level={91} label="Battery" size={72} />
        </section>
      )}

      <div className="mx-4 grid grid-cols-2 gap-2">
        <Button className="h-12 rounded-2xl" onClick={chirp} disabled={ringing}>
          <Volume2 className={cn("size-4", ringing && "animate-pulse")} /> {ringing ? "Playing…" : "Play Sound"}
        </Button>
        <Button variant="secondary" className="h-12 rounded-2xl" onClick={() => setFinding((f) => !f)}>
          <Navigation className="size-4" /> {finding ? "Stop Finding" : "Find"}
        </Button>
      </div>

      <Group title="Lost Mode" footer={tag.lostMode ? "Anyone who taps your AirTag with an NFC phone sees your number." : "Get notified when it's found and share your number with whoever finds it."}>
        <ToggleRow
          icon={Lock}
          title="Mark As Lost"
          detail={tag.lostMode ? "On · notify when found" : "Off"}
          checked={tag.lostMode || lostForm}
          onCheckedChange={(v) => {
            if (v) setLostForm(true);
            else {
              setLostForm(false);
              onChange({ ...tag, lostMode: false });
            }
          }}
        />
        {lostForm && !tag.lostMode && (
          <div className="space-y-2 px-4 py-3">
            <label htmlFor="lost-phone" className="text-[13px] font-medium">
              Phone number
            </label>
            <input id="lost-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" className="h-11 w-full rounded-xl bg-elevated px-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
            <Button
              className="h-10 w-full rounded-xl"
              disabled={phone.replace(/\D/g, "").length < 6}
              onClick={() => {
                setLostForm(false);
                onChange({ ...tag, lostMode: true });
              }}
            >
              Turn On Lost Mode
            </Button>
          </div>
        )}
      </Group>

      <Group>
        <Row icon={Pencil} title="Rename Item" detail={`${tag.emoji} ${tag.name}`} onClick={onRename} />
      </Group>
      <div className="mx-4">
        <Button variant="secondary" className="h-11 w-full rounded-2xl text-destructive" onClick={onRemove}>
          Remove AirTag
        </Button>
      </div>
    </div>
  );
}
