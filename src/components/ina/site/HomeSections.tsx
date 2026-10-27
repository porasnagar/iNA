import { Link } from "@tanstack/react-router";
import { ArrowRight, BatteryCharging, Cpu, Ear, FileCode2, PanelTop, RadioTower, Smartphone, Volume2 } from "lucide-react";

import { Phone } from "@/components/ina/phone/Phone";
import { Button } from "@/components/ui/button";
import { SimProvider } from "@/lib/ina/store";

import { SectionHeading } from "./SectionHeading";

const HIGHLIGHTS = [
  { icon: Smartphone, title: "Case-open pop-up", body: "Open the lid and an iPhone-style sheet slides up over any app, with one-tap Connect." },
  { icon: BatteryCharging, title: "Live battery", body: "Left, Right and Case levels with charging state, in the app, the pop-up and a live notification." },
  { icon: PanelTop, title: "Noise Control tile", body: "A Quick Settings tile that cycles ANC, Transparency, Adaptive and Off." },
  { icon: Ear, title: "Ear detection", body: "Take an AirPod out and playback pauses; put it back and it resumes." },
  { icon: Volume2, title: "Pro features", body: "Conversation Awareness, Personalized Volume, head gestures and the Ear Tip Fit Test." },
  { icon: RadioTower, title: "Find My chirp", body: "Play a sound on a lost AirPod or AirTag and follow the proximity radar." },
];

const EXPLORE = [
  { to: "/architecture" as const, icon: Cpu, title: "Architecture", body: "BLE 0x004C, L2CAP PSM 0x1001 AAP, the rule engine and the system overlay." },
  { to: "/hardware" as const, icon: Ear, title: "Supported hardware", body: "Every AirPods, Beats, Apple Watch, AirTag and HomePod model, with chipsets." },
  { to: "/source" as const, icon: FileCode2, title: "Developer center", body: "Read the Kotlin source, follow the build steps and export the project." },
];

export function Highlights() {
  return (
    <section aria-labelledby="highlights" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading id="highlights" eyebrow="What iNA unlocks" title="The iPhone AirPods experience, on Android." />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <li key={h.title} className="rounded-[28px] border border-border bg-card/50 p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                <h.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{h.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{h.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SimulatorPreview() {
  return (
    <section aria-labelledby="preview" className="border-t border-border bg-stage">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-24">
        <div>
          <SectionHeading id="preview" eyebrow="Live preview" title="Try it right here.">
            This phone is running iNA. Tap through onboarding, pull down Quick Settings from the status bar, or open the full simulator to fake a case
            opening, an incoming call and more.
          </SectionHeading>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full px-6 text-[15px] font-semibold">
            <Link to="/simulator">
              Open the full simulator <ArrowRight />
            </Link>
          </Button>
        </div>
        <SimProvider>
          <Phone />
        </SimProvider>
      </div>
    </section>
  );
}

export function Explore() {
  return (
    <section aria-labelledby="explore" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading id="explore" eyebrow="Explore" title="Go deeper." />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {EXPLORE.map((e) => (
            <li key={e.to}>
              <Link to={e.to} className="group flex h-full flex-col rounded-[28px] border border-border bg-card/50 p-6 transition-colors hover:bg-card">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <e.icon className="size-5" />
                  </span>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{e.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{e.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
