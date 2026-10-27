import { Check, Home, Music2, Pause, Play, SkipBack, SkipForward, Smartphone, Speaker, Volume2, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { clampVolume, HOMEPOD_ROOMS, HOMEPOD_SETUP_STAGES } from "@/lib/ina/devices";
import type { PairedHomePod } from "@/lib/ina/paired";
import { cn } from "@/lib/utils";
import { Chip, Group, Row, ToggleRow } from "../ui";
import { BackLink, ProximityCard, StageList, playChime, useInterval, useScrollTop } from "./parts";

type Phase = "detect" | "room" | "stereo" | "setup" | "controls";

const TRACK = { title: "Midnight City", artist: "M83", duration: 243 };

export function HomePodFlow({ paired, onSave, onForget, onClose }: { paired: PairedHomePod | null; onSave: (p: PairedHomePod) => void; onForget: () => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>(paired ? "controls" : "detect");
  const [room, setRoom] = useState<string>(HOMEPOD_ROOMS[0]);
  const [stereo, setStereo] = useState(false);
  const top = useScrollTop(phase === "controls");

  const inCard = phase === "detect" || phase === "room" || phase === "stereo" || phase === "setup";
  return (
    <div ref={top}>
      {inCard && (
        <>
          <div className="space-y-4 px-5 pb-6 pt-2">
            <BackLink onClick={onClose} />
            <h3 className="text-[26px] font-bold tracking-tight">HomePod</h3>
            <div className="flex h-56 items-center justify-center gap-2 rounded-[24px] bg-card text-[13px] text-muted-foreground">
              <Wifi className="size-4 animate-pulse" /> Looking for HomePod on Wi-Fi…
            </div>
          </div>
          <ProximityCard
            title={phase === "detect" ? "Set Up HomePod" : phase === "room" ? "Choose a Room" : phase === "stereo" ? "Use as Stereo Pair?" : "Setting Up"}
            subtitle={phase === "detect" ? "HomePod mini nearby" : phase === "room" ? "Where is this HomePod?" : phase === "stereo" ? `Another HomePod mini is in ${room}.` : `${room} · Home Wi-Fi`}
            onClose={onClose}
          >
            {phase === "detect" && (
              <>
                <Art pair={false} />
                <Button className="h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={() => setPhase("room")}>
                  Set Up
                </Button>
              </>
            )}
            {phase === "room" && (
              <>
                <div className="my-4 grid grid-cols-2 gap-2">
                  {HOMEPOD_ROOMS.map((r) => (
                    <button key={r} type="button" onClick={() => setRoom(r)} aria-pressed={room === r} className={cn("flex h-11 items-center justify-center gap-1.5 rounded-2xl text-[13.5px] font-medium", room === r ? "bg-primary text-primary-foreground" : "bg-glass-tile")}>
                      {room === r && <Check className="size-3.5" />} {r}
                    </button>
                  ))}
                </div>
                <Button className="h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={() => setPhase("stereo")}>
                  Continue
                </Button>
              </>
            )}
            {phase === "stereo" && (
              <>
                <Art pair />
                <p className="mb-4 text-[12.5px] text-muted-foreground">Two HomePods play left and right channels for wider sound.</p>
                <div className="space-y-2">
                  <Button
                    className="h-12 w-full rounded-2xl text-[15px] font-semibold"
                    onClick={() => {
                      setStereo(true);
                      setPhase("setup");
                    }}
                  >
                    Use as Stereo Pair
                  </Button>
                  <button
                    type="button"
                    className="w-full py-2 text-[15px] text-primary"
                    onClick={() => {
                      setStereo(false);
                      setPhase("setup");
                    }}
                  >
                    Not Now
                  </button>
                </div>
              </>
            )}
            {phase === "setup" && (
              <Setup
                onDone={() => {
                  onSave({ name: stereo ? "HomePod mini Pair" : "HomePod mini", room, stereo });
                  setPhase("controls");
                }}
              />
            )}
          </ProximityCard>
        </>
      )}
      {phase === "controls" && paired && (
        <Controls
          pod={paired}
          onChange={onSave}
          onRemove={() => {
            onForget();
            setStereo(false);
            setPhase("detect");
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function Art({ pair }: { pair: boolean }) {
  return (
    <div className="relative mx-auto my-3 flex h-36 w-full justify-center gap-2">
      <div className="absolute inset-0 bg-stage" />
      <ProductImage product="homepod" alt="HomePod mini" eager className="relative h-full animate-float" />
      {pair && <ProductImage product="homepod" alt="Second HomePod mini" className="relative h-full animate-float [animation-delay:0.6s]" />}
    </div>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useInterval(() => setStage((s) => s + 1), stage < HOMEPOD_SETUP_STAGES.length ? 1100 : null);
  useEffect(() => {
    if (stage < HOMEPOD_SETUP_STAGES.length) return;
    playChime([660, 990, 1320], 0.16);
    const t = setTimeout(() => done.current(), 600);
    return () => clearTimeout(t);
  }, [stage]);
  return (
    <div className="mt-4">
      <StageList stages={HOMEPOD_SETUP_STAGES} current={stage} />
    </div>
  );
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function Controls({ pod, onChange, onRemove, onClose }: { pod: PairedHomePod; onChange: (p: PairedHomePod) => void; onRemove: () => void; onClose: () => void }) {
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(62);
  const [vol, setVol] = useState(40);
  const [target, setTarget] = useState<"homepod" | "phone">("homepod");
  useInterval(() => setPos((p) => (p + 1) % TRACK.duration), playing ? 1000 : null);
  const roomIdx = Math.max(0, HOMEPOD_ROOMS.indexOf(pod.room as (typeof HOMEPOD_ROOMS)[number]));
  return (
    <div className="space-y-5 pb-6">
      <div className="px-5 pt-2">
        <BackLink onClick={onClose} />
        <div className="mt-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          <span className="text-[13px] font-medium text-muted-foreground">{pod.room} · simulated</span>
          <Chip className="ml-auto">AirPlay 2</Chip>
        </div>
        <h3 className="mt-1 truncate text-[28px] font-bold tracking-tight">{pod.name}</h3>
      </div>
      <Art pair={pod.stereo} />
      <section className="mx-4 space-y-3 rounded-[24px] bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Music2 className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{TRACK.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {TRACK.artist} · {target === "homepod" ? `AirPlay to ${pod.room}` : "This phone"}
            </div>
          </div>
        </div>
        <div>
          <div className="h-1 overflow-hidden rounded-full bg-foreground/12">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-1000 ease-linear" style={{ width: `${(pos / TRACK.duration) * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{fmt(pos)}</span>
            <span>-{fmt(TRACK.duration - pos)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-8">
          <button type="button" aria-label="Previous" onClick={() => setPos(0)}>
            <SkipBack className="size-6 fill-current" />
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="grid size-12 place-items-center rounded-full bg-foreground text-background">
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>
          <button type="button" aria-label="Next" onClick={() => setPos(0)}>
            <SkipForward className="size-6 fill-current" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          <Slider value={[vol]} max={100} step={1} onValueChange={(v) => setVol(clampVolume(v[0] ?? 0))} aria-label="AirPlay volume" />
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{vol}</span>
        </div>
      </section>
      <Group title="AirPlay">
        <Row icon={Smartphone} title="This Phone" onClick={() => setTarget("phone")}>
          {target === "phone" && <Check className="size-4 shrink-0 text-primary" />}
        </Row>
        <Row icon={Speaker} title={pod.name} detail={pod.room} onClick={() => setTarget("homepod")}>
          {target === "homepod" && <Check className="size-4 shrink-0 text-primary" />}
        </Row>
      </Group>
      <Group title="HomePod">
        <ToggleRow icon={Speaker} title="Stereo pair" detail={pod.stereo ? "Left + right HomePod mini" : "Single speaker"} checked={pod.stereo} onCheckedChange={(v) => onChange({ ...pod, stereo: v, name: v ? "HomePod mini Pair" : "HomePod mini" })} />
        <Row icon={Home} title="Room" value={pod.room} onClick={() => onChange({ ...pod, room: HOMEPOD_ROOMS[(roomIdx + 1) % HOMEPOD_ROOMS.length]! })} />
      </Group>
      <div className="mx-4">
        <Button variant="secondary" className="h-11 w-full rounded-2xl text-destructive" onClick={onRemove}>
          Remove Accessory
        </Button>
      </div>
    </div>
  );
}
