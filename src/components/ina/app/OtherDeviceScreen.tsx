import { Activity, Bell, ChevronLeft, ChevronRight, Heart, Locate, Music2, Pause, Play, Speaker, Volume2, Watch } from "lucide-react";
import { useEffect, useState } from "react";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ProductImageKey } from "@/lib/ina/protocol";
import { cn } from "@/lib/utils";
import { Chip, Group, Row, Segmented, ToggleRow } from "./ui";

export type OtherDeviceKind = "watch" | "airtag" | "homepod";

const META: Record<OtherDeviceKind, { name: string; image: ProductImageKey; chip: string; detail: string }> = {
  watch: { name: "Apple Watch Series 11", image: "apple-watch", chip: "GATT · ANCS", detail: "Notifications, media and health" },
  airtag: { name: "AirTag", image: "airtag", chip: "0x12 · UWB", detail: "Find, ring and track distance" },
  homepod: { name: "HomePod mini", image: "homepod", chip: "AirPlay", detail: "Play, volume and stereo pair" },
};

export function OtherDevicesList({ onPick }: { onPick: (k: OtherDeviceKind) => void }) {
  return (
    <Group title="Other Apple devices" footer="Simulated connection — opens the same connected layout as AirPods.">
      {(Object.keys(META) as OtherDeviceKind[]).map((k) => (
        <Row key={k} icon={k === "watch" ? Watch : k === "airtag" ? Locate : Speaker} title={META[k].name} detail={META[k].detail} onClick={() => onPick(k)}>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Row>
      ))}
    </Group>
  );
}

export function OtherDeviceScreen({ kind, onClose }: { kind: OtherDeviceKind; onClose: () => void }) {
  const m = META[kind];
  return (
    <div className="space-y-5 pb-6">
      <div className="px-5 pt-2">
        <button type="button" onClick={onClose} className="-ml-1.5 flex items-center text-[15px] text-primary">
          <ChevronLeft className="size-5" /> Connect
        </button>
        <div className="mt-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          <span className="text-[13px] font-medium text-muted-foreground">Connected · simulated</span>
          <Chip className="ml-auto">{m.chip}</Chip>
        </div>
        <h3 className="mt-1 truncate text-[28px] font-bold tracking-tight">{m.name}</h3>
      </div>
      <div className="relative mx-4 h-48">
        <div className="absolute inset-0 bg-stage" />
        <ProductImage product={m.image} alt={m.name} eager className="relative mx-auto h-full animate-float" />
      </div>
      {kind === "watch" && <WatchControls />}
      {kind === "airtag" && <AirTagControls />}
      {kind === "homepod" && <HomePodControls />}
      <div className="mx-4">
        <Button variant="secondary" className="h-11 w-full rounded-2xl text-destructive" onClick={onClose}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function NowPlaying({ playing, onToggle, volume, onVolume, title }: { playing: boolean; onToggle: () => void; volume: number; onVolume: (v: number) => void; title: string }) {
  return (
    <section className="mx-4 space-y-3 rounded-[24px] bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-elevated">
          <Music2 className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">Midnight City</div>
          <div className="truncate text-xs text-muted-foreground">{title}</div>
        </div>
        <button type="button" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background">
          {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 className="size-4 shrink-0 text-muted-foreground" />
        <Slider value={[volume]} max={100} step={1} onValueChange={(v) => onVolume(v[0] ?? 0)} aria-label="Volume" />
        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{volume}</span>
      </div>
    </section>
  );
}

function WatchControls() {
  const [bpm, setBpm] = useState(72);
  const [playing, setPlaying] = useState(true);
  const [vol, setVol] = useState(50);
  const [notif, setNotif] = useState(true);
  const [hr, setHr] = useState(true);
  const [face, setFace] = useState<"modular" | "solar" | "photos">("modular");
  useEffect(() => {
    if (!hr) return;
    const t = setInterval(() => setBpm((b) => Math.max(58, Math.min(96, b + Math.round(Math.random() * 6 - 3)))), 1500);
    return () => clearInterval(t);
  }, [hr]);
  return (
    <>
      <div className="mx-4 flex justify-around rounded-[24px] bg-card px-2 py-4">
        <BatteryRing level={78} label="Watch" size={84} />
        <div className="flex flex-col items-center justify-center gap-1">
          <Heart className={cn("size-6 text-destructive", hr && "animate-pulse")} />
          <span className="text-[22px] font-semibold tabular-nums">{hr ? bpm : "--"}</span>
          <span className="text-[11px] text-muted-foreground">BPM</span>
        </div>
      </div>
      <NowPlaying playing={playing} onToggle={() => setPlaying((p) => !p)} volume={vol} onVolume={setVol} title="Controlled from Digital Crown · AMS" />
      <Group title="Watch">
        <ToggleRow icon={Bell} title="Mirror notifications" detail="Android alerts on your wrist · ANCS" checked={notif} onCheckedChange={setNotif} />
        <ToggleRow icon={Activity} title="Heart rate" detail="Live from 0x180D" checked={hr} onCheckedChange={setHr} />
      </Group>
      <section className="mx-4 space-y-2 rounded-[24px] bg-card p-4">
        <span className="text-[15px] font-semibold">Watch Face</span>
        <Segmented value={face} onChange={setFace} options={[{ value: "modular", label: "Modular" }, { value: "solar", label: "Solar" }, { value: "photos", label: "Photos" }]} />
      </section>
    </>
  );
}

function AirTagControls() {
  const [dist, setDist] = useState(4.2);
  const [ringing, setRinging] = useState(false);
  const [lost, setLost] = useState(false);
  const [precision, setPrecision] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setDist((d) => Math.max(0.3, +(d + (precision ? -0.4 : Math.random() * 0.6 - 0.3)).toFixed(1))), 1000);
    return () => clearInterval(t);
  }, [precision]);
  useEffect(() => {
    if (!ringing) return;
    const t = setTimeout(() => setRinging(false), 4000);
    return () => clearTimeout(t);
  }, [ringing]);
  return (
    <>
      <section className="mx-4 flex items-center justify-around rounded-[24px] bg-card px-2 py-5">
        <div className="text-center">
          <div className="text-[34px] font-semibold tabular-nums">{dist.toFixed(1)} m</div>
          <div className="text-[12px] text-muted-foreground">{precision ? "Ahead · UWB" : "Nearby · RSSI"}</div>
        </div>
        <BatteryRing level={91} label="Battery" size={72} />
      </section>
      <div className="mx-4 grid grid-cols-2 gap-2">
        <Button className="h-12 rounded-2xl" onClick={() => setRinging(true)} disabled={ringing}>
          {ringing ? "Playing…" : "Play Sound"}
        </Button>
        <Button variant="secondary" className="h-12 rounded-2xl" onClick={() => setPrecision((p) => !p)}>
          {precision ? "Stop Finding" : "Find Nearby"}
        </Button>
      </div>
      <Group title="Tracking" footer="Lost Mode shows your contact info to anyone who taps the AirTag with NFC.">
        <ToggleRow icon={Locate} title="Lost Mode" detail="Notify when found" checked={lost} onCheckedChange={setLost} />
      </Group>
    </>
  );
}

function HomePodControls() {
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(35);
  const [stereo, setStereo] = useState(false);
  const [handoff, setHandoff] = useState(true);
  return (
    <>
      <NowPlaying playing={playing} onToggle={() => setPlaying((p) => !p)} volume={vol} onVolume={setVol} title={playing ? "Playing on HomePod mini · AirPlay" : "Paused"} />
      <Group title="HomePod">
        <ToggleRow icon={Speaker} title="Stereo pair" detail="Living Room · 2 speakers" checked={stereo} onCheckedChange={setStereo} />
        <ToggleRow icon={Music2} title="Proximity handoff" detail="Move audio when phone is near" checked={handoff} onCheckedChange={setHandoff} />
      </Group>
    </>
  );
}
