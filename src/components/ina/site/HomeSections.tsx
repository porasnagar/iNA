import { Link } from "@tanstack/react-router";
import { ArrowRight, BatteryCharging, Ear, FileCode2, PanelTop, RadioTower, Smartphone, Volume2 } from "lucide-react";

import { BRAND } from "@/components/ina/brand";
import { Phone } from "@/components/ina/phone/Phone";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { HARDWARE_FAMILIES } from "@/lib/ina/catalog";
import { SimProvider } from "@/lib/ina/store";

import { LAYERS } from "./Architecture";
import { FloatingArt, Reveal, Stagger, StaggerItem } from "./motion";
import { GithubStarLink, OpenSourceBadge } from "./OpenSourceBadge";
import { SectionHeading } from "./SectionHeading";
import { useProjectZip } from "./useProjectZip";

const HIGHLIGHTS = [
  { icon: Smartphone, title: "Case-open pop-up", body: "Open the lid and an iPhone-style sheet slides up over any app, with one-tap Connect." },
  { icon: BatteryCharging, title: "Live battery", body: "Left, Right and Case levels with charging state, in the app, the pop-up and a live notification." },
  { icon: PanelTop, title: "Noise Control tile", body: "A Quick Settings tile that cycles ANC, Transparency, Adaptive and Off." },
  { icon: Ear, title: "Ear detection", body: "Take an AirPod out and playback pauses; put it back and it resumes." },
  { icon: Volume2, title: "Pro features", body: "Conversation Awareness, Personalized Volume, head gestures and the Ear Tip Fit Test." },
  { icon: RadioTower, title: "Find My chirp", body: "Play a sound on a lost AirPod or AirTag and follow the proximity radar." },
];

function MoreLink({ to, children }: { to: "/simulator" | "/architecture" | "/hardware" | "/source"; children: string }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

export function Highlights() {
  return (
    <section aria-labelledby="highlights" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <SectionHeading id="highlights" eyebrow="What iNA unlocks" title="The iPhone AirPods experience, on Android." />
        </Reveal>
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <StaggerItem key={h.title} className="rounded-[28px] border border-border bg-card/50 p-6 hover:bg-card">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                <h.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{h.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{h.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function SimulatorPreview() {
  return (
    <section aria-labelledby="preview" className="border-t border-border bg-stage">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-24">
        <Reveal>
          <SectionHeading id="preview" eyebrow="Live preview" title="Try it right here.">
            This phone is running iNA. Tap through onboarding, pull down Quick Settings from the status bar, or open the full simulator to fake a case
            opening, an incoming call and more.
          </SectionHeading>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full px-6 text-[15px] font-semibold transition-transform active:scale-[0.97]">
            <Link to="/simulator">
              Open the full simulator <ArrowRight />
            </Link>
          </Button>
        </Reveal>
        <Reveal delay={0.1}>
          <SimProvider>
            <Phone reserve={140} />
          </SimProvider>
        </Reveal>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="how" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading id="how" eyebrow="How it works" title="A chameleon for your Apple gear.">
              Apple accessories speak a handful of Bluetooth protocols to iPhone. iNA speaks them too, from an ordinary Android app — four layers,
              all in user space.
            </SectionHeading>
            <div className="mt-6">
              <MoreLink to="/architecture">Read the architecture deep dive</MoreLink>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <FloatingArt>
              <div className="overflow-hidden rounded-[40px] bg-paper shadow-plate">
                <img src={BRAND.banner} alt="The iNA chameleon perched next to the bitten apple á" width={1800} height={1005} loading="lazy" className="w-full" />
              </div>
            </FloatingArt>
          </Reveal>
        </div>
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LAYERS.map((l) => (
            <StaggerItem key={l.n} className="rounded-[28px] border border-border bg-card/50 p-6 hover:bg-card">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <l.icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">{l.n}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{l.title}</h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-primary">{l.tag}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function HardwareStrip() {
  return (
    <section aria-labelledby="hardware-strip" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading id="hardware-strip" eyebrow="Supported hardware" title="Every Apple accessory worth carrying." />
          <MoreLink to="/hardware">See every model and chipset</MoreLink>
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {HARDWARE_FAMILIES.map((f) => (
            <StaggerItem key={f.key} className="rounded-[24px] border border-border bg-card/50 p-4 text-center hover:bg-card">
              <ProductImage product={f.image} alt={f.title} className="mx-auto size-20" />
              <h3 className="mt-3 text-sm font-semibold tracking-tight">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground">{f.range}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function DeveloperTeaser() {
  const zip = useProjectZip();
  return (
    <section aria-labelledby="dev-teaser" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="relative overflow-hidden rounded-[36px] border border-border bg-card/50 p-8 sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[640px] bg-brand-glow" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <SectionHeading id="dev-teaser" eyebrow="Open source · Developer center" title="The whole app, in plain Kotlin.">
                Read every file in the browser, follow the build steps, or download the Android Studio project in one click. Contributions welcome.
              </SectionHeading>
              <div className="mt-6 flex flex-wrap gap-3">
                <OpenSourceBadge />
                <GithubStarLink />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 font-semibold transition-transform active:scale-[0.97]">
                <Link to="/source">
                  <FileCode2 /> Open the Developer Center
                </Link>
              </Button>
              <Button variant="secondary" size="lg" className="h-12 rounded-full px-6 transition-transform active:scale-[0.97]" onClick={() => void zip.download()} disabled={zip.busy}>
                {zip.busy ? "Packaging…" : "Download .zip"}
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
