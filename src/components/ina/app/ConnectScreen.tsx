import { Bluetooth, ChevronDown, Cpu, Radio, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { OtherDeviceScreen, OtherDevicesList, type OtherDeviceKind } from "./OtherDeviceScreen";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HARDWARE_FAMILIES, OEM_SKINS, PACKET_LAYOUT } from "@/lib/ina/catalog";
import { hexId } from "@/lib/ina/protocol";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { Chip, ScreenHeader, Segmented } from "./ui";

export function PreviewToggleCard({ className }: { className?: string }) {
  const { state, actions } = useSim();
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-[20px] border border-primary/30 bg-primary/10 p-4", className)}>
      <span className="min-w-0 flex-1 pr-3">
        <span className="block text-[15px] font-semibold">Preview Connected UI</span>
        <span className="block text-[12px] leading-snug text-muted-foreground">
          Explore the connected screens with simulated accessory values.
        </span>
      </span>
      <Switch checked={state.previewConnected} onCheckedChange={actions.setPreviewConnected} className="shrink-0" aria-label="Preview Connected UI" />
    </label>
  );
}

function LearnMore() {
  const { models } = useSim();
  const [tab, setTab] = useState<"hardware" | "how">("hardware");
  const [open, setOpen] = useState<string | null>("airpods-pro");
  const all = Array.from(models.values());

  return (
    <section className="px-4 pb-6">
      <h4 className="px-1 text-[22px] font-bold tracking-tight">Learn More</h4>
      <Segmented
        className="mt-3"
        value={tab}
        onChange={setTab}
        options={[
          { value: "hardware", label: "Supported Hardware" },
          { value: "how", label: "How iNA Works" },
        ]}
      />

      {tab === "hardware" ? (
        <div className="mt-3 space-y-2">
          {HARDWARE_FAMILIES.map((f) => {
            const expanded = open === f.key;
            const familyModels = f.modelFamily ? all.filter((m) => m.family === f.modelFamily) : [];
            return (
              <div key={f.key} className="overflow-hidden rounded-[20px] bg-card">
                <button type="button" onClick={() => setOpen(expanded ? null : f.key)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={expanded}>
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-foreground/5">
                    <ProductImage product={f.image} alt={f.title} className="size-12 drop-shadow-md" />
                  </span>
                  <span className="min-w-0 flex-1 pr-2">
                    <span className="block truncate text-[15px] font-semibold">{f.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{f.range}</span>
                  </span>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </button>
                {expanded && (
                  <div className="space-y-3 border-t border-border px-4 pb-4 pt-3 animate-in fade-in">
                    <div className="flex flex-wrap gap-1.5">
                      {familyModels.length > 0
                        ? familyModels.map((m) => (
                            <Chip key={m.id} className={m.ota ? "bg-primary/15 text-primary" : undefined}>
                              {m.name} · {hexId(m.id)}
                            </Chip>
                          ))
                        : f.models?.map((m) => <Chip key={m}>{m}</Chip>)}
                    </div>
                    <ul className="space-y-1">
                      {f.features.map((feat) => (
                        <li key={feat} className="flex gap-2 text-[13px]">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                          <span className="min-w-0">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="font-mono text-[10.5px] text-muted-foreground">{f.transport}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <HowCard icon={ShieldCheck} tint="bg-tint-green" title="Zero root, all user-space" body="Runs as a normal app on Android 10–16+. No root, no Magisk, no iOS emulation — just public Bluetooth APIs with careful fallbacks." />
          <HowCard icon={Radio} tint="bg-tint-blue" title="Listens for the case opening" body="A background scanner filters Apple's manufacturer ID 0x004C for type 0x07 Proximity Pairing frames. When the lid counter changes and the case is close (RSSI > -68 dBm), the pop-up appears.">
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              {PACKET_LAYOUT.map((r) => (
                <div key={r.byte} className="flex gap-3 border-b border-border px-3 py-1.5 last:border-0">
                  <span className="w-8 shrink-0 font-mono text-[11px] text-primary">b[{r.byte}]</span>
                  <span className="min-w-0 text-[11.5px] text-muted-foreground">{r.meaning}</span>
                </div>
              ))}
            </div>
          </HowCard>
          <HowCard icon={Bluetooth} tint="bg-tint-purple" title="Talks to the earbuds directly" body="Opens Apple's accessory protocol (AAP) on L2CAP PSM 0x1001 to switch noise modes, toggle Conversation Awareness (0x28) and Personalized Volume (0x26), and read head gestures.">
            <ol className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
              <li><span className="font-medium text-foreground">Tier 1</span> · createL2capChannel(0x1001) on API 29+</li>
              <li><span className="font-medium text-foreground">Tier 2</span> · reflected createL2capSocket for OEM stacks</li>
              <li><span className="font-medium text-foreground">Tier 3</span> · BLE 0x07 telemetry + A2DP/AVRCP fallback</li>
            </ol>
          </HowCard>
          <HowCard icon={RefreshCw} tint="bg-tint-orange" title="Learns new hardware over the air" body="A signed rule manifest adds new model IDs, opcodes and PSM overrides without an app update — so AirPods 5 and Pro 3 work on day one." />
          <HowCard icon={Cpu} tint="bg-elevated" title="Works on every major Android skin" body="">
            <div className="mt-1 flex flex-wrap gap-1.5">
              {OEM_SKINS.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </HowCard>
        </div>
      )}
    </section>
  );
}

function HowCard({
  icon: I,
  tint,
  title,
  body,
  children,
}: {
  icon: typeof Radio;
  tint: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-card p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px] text-primary-foreground", tint)}>
          <I className="size-4" />
        </span>
        <span className="min-w-0 truncate text-[15px] font-semibold">{title}</span>
      </div>
      {body && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>}
      {children}
    </div>
  );
}

export function ConnectScreen() {
  const { actions } = useSim();
  const [other, setOther] = useState<OtherDeviceKind | null>(null);
  if (other) return <OtherDeviceScreen kind={other} onClose={() => setOther(null)} />;
  return (
    <div className="space-y-5 pb-4">
      <ScreenHeader title="Connect a Device" subtitle="Bring your Apple accessory close to this phone." />

      <div className="mx-4 overflow-hidden rounded-[24px] bg-card">
        <div className="relative flex h-52 items-center justify-center">
          {[0, 0.8, 1.6].map((d) => (
            <span key={d} className="absolute size-40 rounded-full border border-primary/40 animate-radar" style={{ animationDelay: `${d}s` }} />
          ))}
          <ProductImage product="airpods-pro" alt="AirPods Pro" eager className="relative h-32 opacity-90" />
        </div>
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
          <span className="min-w-0 flex-1 truncate pr-2 text-[13px]">Searching for nearby Apple accessories…</span>
          <Chip className="shrink-0">0x004C · 0x07</Chip>
        </div>
      </div>

      <div className="mx-4 rounded-[24px] bg-card p-4">
        <div className="flex justify-around">
          <BatteryRing level={-1} label="Left" size={64} />
          <BatteryRing level={-1} label="Right" size={64} />
          <BatteryRing level={-1} label="Case" size={64} />
        </div>
        <p className="mt-3 text-center text-[11.5px] leading-snug text-muted-foreground">
          Battery levels appear once an accessory connects. iNA never shows your phone's battery in their place.
        </p>
      </div>

      <ol className="mx-4 space-y-2">
        {["Open the case lid next to your phone", "Tap Connect on the pop-up", "Done — controls unlock here"].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-elevated text-xs font-semibold">{i + 1}</span>
            <span className="min-w-0 text-[14px]">{t}</span>
          </li>
        ))}
      </ol>

      <div className="mx-4 space-y-2">
        <Button size="lg" className="h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={actions.openCase}>
          Simulate opening the case
        </Button>
        <PreviewToggleCard />
      </div>

      <OtherDevicesList onPick={setOther} />

      <LearnMore />
    </div>
  );
}
