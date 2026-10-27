import { Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Download, Loader2 } from "lucide-react";

import { BRAND } from "@/components/ina/brand";
import { InaLogo } from "@/components/ina/InaLogo";
import { Button } from "@/components/ui/button";

import { useProjectZip } from "./useProjectZip";

const VALUE_PROPS = [
  { big: "100%", small: "User-Space" },
  { big: "Zero", small: "Root" },
  { big: "Zero", small: "Magisk" },
  { big: "Zero", small: "iOS VM" },
];

export function Hero() {
  const zip = useProjectZip();
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-20%] h-[900px] w-[1100px] bg-brand-glow" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Official iNA · Android 10–16+
            </span>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-tighter sm:text-6xl lg:text-7xl">
              Your Apple gear, <span className="text-primary">unlocked</span> on Android.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{BRAND.tagline}.</span> Case-open pop-ups, live battery, noise control and the
              Apple-only extras for AirPods, Beats, Apple Watch, AirTag and HomePod — on the phone you already own.
            </p>

            <dl className="mt-8 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
              {VALUE_PROPS.map((v) => (
                <div key={v.small} className="rounded-2xl border border-border bg-card/50 px-4 py-3">
                  <dt className="text-xl font-semibold tracking-tight">{v.big}</dt>
                  <dd className="text-xs text-muted-foreground">{v.small}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-[15px] font-semibold">
                <Link to="/simulator">
                  Try Live Simulator <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="h-12 rounded-full px-6 text-[15px]">
                <Link to="/source">
                  <Code2 /> View Android Source
                </Link>
              </Button>
              <Button variant="ghost" size="lg" className="h-12 rounded-full px-5 text-[15px]" onClick={() => void zip.download()} disabled={zip.busy}>
                {zip.busy ? <Loader2 className="animate-spin" /> : <Download />}
                {zip.busy ? "Packaging…" : "Download .zip"}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[44px] bg-paper pb-6 shadow-plate">
              <img src={BRAND.lockup} alt="iNA logo — unlocked padlock i, N with the chameleon, and the bitten apple á" width={1600} height={715} className="w-full" />
            </div>
            <div className="mx-auto -mt-7 flex w-fit items-center gap-3 rounded-2xl border border-border bg-card/90 py-2.5 pl-2.5 pr-4 shadow-sheet backdrop-blur-xl">
              <InaLogo className="size-11" />
              <div className="leading-tight">
                <div className="text-sm font-semibold">iNA for Android</div>
                <div className="font-mono text-[11px] text-muted-foreground">dev.ibridge.android</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
