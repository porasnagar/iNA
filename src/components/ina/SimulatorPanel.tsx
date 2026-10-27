import { Home, Mic, PanelTopOpen, PhoneIncoming, Smartphone, Trash2, Unplug, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { encodeProximityPacket, formatBattery, hexId, parseProximityPacket, POPUP_RSSI_THRESHOLD, toHex, type ModelFamily } from "@/lib/ina/protocol";
import { useSim, type LogChannel } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function SwitchField({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-foreground/5 px-3 py-2">
      <Label htmlFor={id} className="min-w-0 flex-1 truncate text-[13px] font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const FAMILY_LABEL: Record<ModelFamily, string> = {
  airpods: "AirPods",
  "airpods-pro": "AirPods Pro",
  "airpods-max": "AirPods Max",
  beats: "Beats",
};

const CHANNEL_TONE: Record<LogChannel, string> = {
  BLE: "text-tint-blue",
  AAP: "text-tint-purple",
  SYS: "text-success",
  OTA: "text-warning",
  UI: "text-muted-foreground",
};

const BYTE_NOTES: Record<number, string> = {
  0: "type",
  3: "model",
  4: "model",
  5: "in-ear",
  6: "L|R",
  7: "case+chg",
  8: "lid",
};

export function SimulatorPanel() {
  const { state, actions, models, model, isConnected } = useSim();
  const a = state.accessory;
  const bytes = Array.from(encodeProximityPacket(a).slice(0, 9));
  const parsed = parseProximityPacket(bytes, a.rssi);
  const families = (Object.keys(FAMILY_LABEL) as ModelFamily[]).map((f) => ({
    family: f,
    models: Array.from(models.values()).filter((m) => m.family === f),
  }));
  const hasCase = model?.caps.hasCase ?? true;

  return (
    <div className="space-y-4">
      <Panel title="Simulator" hint="Drive the phone like real hardware would.">
        <div className="grid grid-cols-2 gap-2">
          <Button className="col-span-2 h-11 rounded-xl" onClick={actions.openCase}>
            Open case near phone
            <span className="ml-1 rounded-md bg-primary-foreground/15 px-1.5 font-mono text-[11px]">lid #{a.lidCounter}</span>
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={() => actions.setSurface(state.surface === "home" ? "app" : "home")}>
            {state.surface === "home" ? <Smartphone className="size-4" /> : <Home className="size-4" />}
            {state.surface === "home" ? "Open iNA" : "Home Screen"}
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={() => actions.setShade(!state.shadeOpen)}>
            <PanelTopOpen className="size-4" /> Quick Settings
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={actions.incomingCall} disabled={!!state.call}>
            <PhoneIncoming className="size-4" /> Incoming call
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={actions.speak}>
            <Mic className="size-4" /> Start speaking
          </Button>
          {state.call?.state === "ringing" && (
            <>
              <Button variant="outline" className="rounded-xl" onClick={() => actions.headGesture("nod")}>
                Nod (yes)
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => actions.headGesture("shake")}>
                Shake (no)
              </Button>
            </>
          )}
          <Button variant="ghost" className="rounded-xl text-destructive" onClick={actions.disconnect} disabled={!isConnected}>
            <Unplug className="size-4" /> Disconnect
          </Button>
          <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={actions.forgetPairings}>
            Forget pairing
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <SwitchField id="sim-preview" label="Preview Connected UI" checked={state.previewConnected} onChange={actions.setPreviewConnected} />
          <SwitchField id="sim-overlay" label="Overlay permission granted" checked={state.permissions.overlay} onChange={(v) => actions.setPermission("overlay", v)} />
        </div>
      </Panel>

      <Panel title="Virtual accessory" hint="What the case broadcasts. The app shows these only once connected.">
        <div className="space-y-4">
          <Select value={String(a.modelId)} onValueChange={(v) => actions.updateAccessory({ modelId: Number(v) })}>
            <SelectTrigger className="h-11 rounded-xl" aria-label="Accessory model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {families.map((g) => (
                <SelectGroup key={g.family}>
                  <SelectLabel>{FAMILY_LABEL[g.family]}</SelectLabel>
                  {g.models.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} · {hexId(m.id)}
                      {m.ota ? " · OTA" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {(hasCase ? (["left", "right", "case"] as const) : (["left"] as const)).map((k) => {
            const chargingKey = `${k}Charging` as "leftCharging" | "rightCharging" | "caseCharging";
            return (
              <div key={k} className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">{!hasCase ? "Battery" : k === "case" ? "Case" : k === "left" ? "Left" : "Right"}</span>
                  <button
                    type="button"
                    onClick={() => actions.updateAccessory({ [chargingKey]: !a[chargingKey] })}
                    className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums", a[chargingKey] ? "bg-success/15 text-success" : "bg-foreground/5 text-muted-foreground")}
                    aria-pressed={a[chargingKey]}
                  >
                    <Zap className={cn("size-3", a[chargingKey] && "fill-current")} />
                    {formatBattery(a[k])}
                  </button>
                </div>
                <Slider value={[a[k]]} min={0} max={100} step={10} onValueChange={([v]) => actions.updateAccessory({ [k]: v ?? a[k] })} aria-label={`${k} battery`} />
              </div>
            );
          })}

          <div className="space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Distance (RSSI)</span>
              <span className={cn("font-mono text-xs", a.rssi > POPUP_RSSI_THRESHOLD ? "text-success" : "text-warning")}>
                {a.rssi} dBm {a.rssi > POPUP_RSSI_THRESHOLD ? "· near" : "· too far"}
              </span>
            </div>
            <Slider value={[a.rssi]} min={-100} max={-30} step={1} onValueChange={([v]) => actions.updateAccessory({ rssi: v ?? a.rssi })} aria-label="RSSI" />
          </div>

          {model?.caps.inEarDetection && (
            <div className="grid grid-cols-2 gap-2">
              <SwitchField id="sim-l-ear" label={hasCase ? "Left in ear" : "On head"} checked={a.leftInEar} onChange={(v) => actions.setInEar("left", v)} />
              {hasCase && <SwitchField id="sim-r-ear" label="Right in ear" checked={a.rightInEar} onChange={(v) => actions.setInEar("right", v)} />}
            </div>
          )}
          {model?.caps.fitTest && (
            <SwitchField id="sim-tip" label="Loose right ear tip (fit test)" checked={a.looseRightTip} onChange={(v) => actions.updateAccessory({ looseRightTip: v })} />
          )}
        </div>
      </Panel>

      <Panel title="0x07 packet inspector" hint="Manufacturer data after company ID 0x004C, decoded by ProximityPacketParser.">
        <div className="grid grid-cols-9 gap-1">
          {bytes.map((b, i) => (
            <div key={i} className="text-center">
              <div className={cn("rounded-md py-1.5 font-mono text-[12px]", BYTE_NOTES[i] ? "bg-primary/15 text-primary" : "bg-foreground/5 text-muted-foreground")}>
                {b.toString(16).toUpperCase().padStart(2, "0")}
              </div>
              <div className="mt-1 truncate text-[9px] text-muted-foreground">{BYTE_NOTES[i] ?? `b${i}`}</div>
            </div>
          ))}
        </div>
        {parsed && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
            <dt className="text-muted-foreground">model</dt>
            <dd className="truncate text-right">{hexId(parsed.modelId)}</dd>
            <dt className="text-muted-foreground">L / R / Case</dt>
            <dd className="text-right">
              {formatBattery(parsed.left)} / {formatBattery(parsed.right)} / {formatBattery(parsed.case)}
            </dd>
            <dt className="text-muted-foreground">in-ear L / R</dt>
            <dd className="text-right">
              {String(parsed.leftInEar)} / {String(parsed.rightInEar)}
            </dd>
            <dt className="text-muted-foreground">lidOpenCounter</dt>
            <dd className="text-right">{parsed.lidCounter}</dd>
          </dl>
        )}
      </Panel>

      <Panel title="Event log" hint="BLE scans, AAP writes over L2CAP and system calls.">
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={actions.clearLog} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Trash2 className="size-3" /> Clear
          </button>
        </div>
        <ol className="max-h-80 space-y-1.5 overflow-y-auto pr-1 font-mono text-[11px]" aria-live="polite">
          {state.log.length === 0 && <li className="text-muted-foreground">No events yet.</li>}
          {state.log.map((e) => (
            <li key={e.id} className="rounded-lg bg-foreground/[0.03] px-2.5 py-1.5">
              <div className="flex gap-2">
                <span className="shrink-0 text-muted-foreground/70">{e.time}</span>
                <span className={cn("w-8 shrink-0 font-semibold", CHANNEL_TONE[e.channel])}>{e.channel}</span>
                <span className="min-w-0 break-words">{e.text}</span>
              </div>
              {e.hex && <div className="mt-0.5 truncate pl-[5.5rem] text-muted-foreground">{e.hex}</div>}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[10px] text-muted-foreground">{toHex([0x4c, 0x00])} = Apple company ID (little-endian)</p>
      </Panel>
    </div>
  );
}
