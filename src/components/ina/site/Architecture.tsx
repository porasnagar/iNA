import { AppWindow, Bluetooth, Cable, RefreshCcwDot } from "lucide-react";

import { BRAND } from "@/components/ina/brand";
import { PACKET_LAYOUT } from "@/lib/ina/catalog";

import { SectionHeading } from "./SectionHeading";

const LAYERS = [
  {
    n: "01",
    icon: Bluetooth,
    title: "Listen",
    tag: "Bluetooth LE · Company ID 0x004C · type 0x07",
    body: "A foreground service scans for Apple Continuity manufacturer data. Proximity Pairing packets carry the model ID, in-ear status, Left / Right / Case battery and the lid-open counter — enough to pop up the moment you open the case.",
    points: ["BluetoothLeScanner with a 0x004C filter", "RSSI gate so only the case in your hand triggers", "Disconnected battery stays --%, never guessed"],
  },
  {
    n: "02",
    icon: Cable,
    title: "Talk",
    tag: "L2CAP CoC · PSM 0x1001 · AAP",
    body: "Once paired, iNA opens a raw connection-oriented L2CAP channel and speaks the Apple Accessory Protocol directly — the same channel an iPhone uses for listening modes and sensor events.",
    points: ["ANC · Transparency · Adaptive · Off", "Conversation Awareness 0x28 · Personalized Volume 0x26", "Ear detection, head gestures and stem events"],
  },
  {
    n: "03",
    icon: RefreshCcwDot,
    title: "Adapt",
    tag: "ORT / OTA dynamic rule engine",
    body: "OtaProtocolRuleManager loads signed JSON rules, so new model IDs, opcodes and PSM overrides ship without an app update. Models can be hot-registered at runtime and inspected in the app.",
    points: ["Signed rule bundles with version pinning", "Dynamic L2CAP PSM override", "Model hot-registration"],
  },
  {
    n: "04",
    icon: AppWindow,
    title: "Surface",
    tag: "WindowManager · TYPE_APPLICATION_OVERLAY",
    body: "The case-open sheet is drawn as a system overlay above whatever app you're in, with a fallback Activity when overlay access isn't granted — plus a Quick Settings tile and a live status notification.",
    points: ["One-tap Connect via CompanionDeviceManager", "iNA Noise Control Quick Settings tile", "Persistent live status with battery"],
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="overflow-hidden rounded-[40px] bg-paper shadow-plate">
            <img src={BRAND.banner} alt="The iNA chameleon perched next to the bitten apple á" width={1800} height={1005} loading="lazy" className="w-full" />
          </div>
          <SectionHeading eyebrow="All about iNA" title="A chameleon for your Apple gear.">
            Apple accessories speak a handful of Bluetooth protocols to iPhone. iNA speaks them too, from an ordinary Android app — no root, no
            Magisk modules and no iOS virtual machine. Four layers, all in user space.
          </SectionHeading>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {LAYERS.map((l) => (
            <article key={l.n} className="flex flex-col rounded-[28px] border border-border bg-card/50 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <l.icon className="size-5" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">{l.n}</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">{l.title}</h3>
              <p className="mt-1 font-mono text-xs text-primary">{l.tag}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{l.body}</p>
              <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                {l.points.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-[28px] border border-border bg-card/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">Anatomy of a Proximity Pairing packet</h3>
            <span className="font-mono text-xs text-muted-foreground">manufacturer data · 0x004C</span>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PACKET_LAYOUT.map((row) => (
              <div key={row.byte} className="flex gap-3 rounded-2xl bg-foreground/5 p-3">
                <span className="grid h-8 min-w-12 shrink-0 place-items-center rounded-lg bg-background px-2 font-mono text-xs text-primary">{row.byte}</span>
                <span className="text-sm leading-snug text-muted-foreground">{row.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
