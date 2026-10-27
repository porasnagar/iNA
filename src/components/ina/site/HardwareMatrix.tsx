import { Check } from "lucide-react";

import { ProductImage } from "@/components/ina/product";
import { HARDWARE_FAMILIES } from "@/lib/ina/catalog";
import { BUILT_IN_MODELS } from "@/lib/ina/protocol";

import { SectionHeading } from "./SectionHeading";

function modelsFor(family: (typeof HARDWARE_FAMILIES)[number]) {
  if (family.modelFamily) {
    return BUILT_IN_MODELS.filter((m) => m.family === family.modelFamily).map((m) => ({ name: m.name, chip: m.chip }));
  }
  return (family.models ?? []).map((name) => ({ name, chip: undefined as string | undefined }));
}

export function HardwareMatrix() {
  const total = BUILT_IN_MODELS.length;
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading as="h1" eyebrow="Supported hardware" title="AirPods, Beats, Apple Watch, AirTag and HomePod on Android">
            {total} audio models are recognised by model ID out of the box, and new ones arrive through rule updates — plus Apple Watch, AirTag and HomePod.
          </SectionHeading>
          <div className="flex gap-6 font-mono text-xs text-muted-foreground">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{HARDWARE_FAMILIES.length}</div>
              families
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{total}+</div>
              model IDs
            </div>
          </div>
        </header>

        <section aria-labelledby="matrix" className="mt-12">
        <h2 id="matrix" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Compatibility matrix
        </h2>
        <p className="mt-2 text-muted-foreground">Every model, its chipset, how iNA connects to it and the features you get.</p>
        <div className="mt-8 overflow-hidden rounded-[28px] border border-border">
          <div aria-hidden className="hidden grid-cols-[240px_minmax(0,1.3fr)_200px_minmax(0,1fr)] gap-6 border-b border-border bg-card/60 px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Device</span>
            <span>Models</span>
            <span>Link</span>
            <span>What you get</span>
          </div>
          {HARDWARE_FAMILIES.map((f, i) => (
            <article
              key={f.key}
              className={`grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1.3fr)_200px_minmax(0,1fr)] lg:gap-6 ${i % 2 ? "bg-card/30" : "bg-card/10"} ${i ? "border-t border-border" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-foreground/5">
                  <ProductImage product={f.image} alt={f.title} className="size-14" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-tight">{f.title}</h3>
                  <div className="text-xs text-muted-foreground">{f.range}</div>
                </div>
              </div>
              <ul aria-label={`${f.title} models`} className="flex flex-wrap content-start gap-1.5">
                {modelsFor(f).map((m) => (
                  <li key={m.name} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-xs">
                    {m.name}
                    {m.chip && <span className="font-mono text-[10px] text-muted-foreground">{m.chip} chip</span>}
                  </li>
                ))}
              </ul>
              <div className="font-mono text-xs leading-relaxed text-muted-foreground">{f.transport}</div>
              <ul aria-label={`${f.title} features`} className="space-y-1.5 text-sm">
                {f.features.map((feat) => (
                  <li key={feat} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        </section>
    </div>
  );
}
