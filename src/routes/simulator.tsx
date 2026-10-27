import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal, Smartphone } from "lucide-react";
import { useState } from "react";

import { Phone } from "@/components/ina/phone/Phone";
import { SimulatorPanel } from "@/components/ina/SimulatorPanel";
import { SimProvider } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

const TITLE = "iNA App Simulator — AirPods pop-up & controls on Android";
const DESCRIPTION =
  "Test iNA in your browser: case-open proximity pop-up, Quick Settings noise control tile, live status and connected AirPods feature controls.";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: SimulatorPage,
});

type Tab = "phone" | "controls";

function SimulatorPage() {
  const [tab, setTab] = useState<Tab>("phone");
  const tabs: { key: Tab; label: string; icon: typeof Smartphone }[] = [
    { key: "phone", label: "Virtual phone", icon: Smartphone },
    { key: "controls", label: "Simulation controls", icon: SlidersHorizontal },
  ];
  return (
    <main className="bg-stage">
      <SimProvider>
        <div className="mx-auto grid max-w-7xl items-start gap-x-10 gap-y-4 px-3 pb-10 pt-4 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)] md:pt-4">
          <header className="px-1 md:col-start-2 md:row-start-1 md:px-0 md:pt-2">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">Interactive app simulator</p>
            <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-4xl">Try the iNA Android app in your browser</h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-base">
              Open the case for the proximity pop-up, tap the phone's status bar for Quick Settings, and explore every control iNA unlocks once
              connected.
            </p>
          </header>

          <div role="tablist" aria-label="Simulator view" className="sticky top-14 z-30 grid grid-cols-2 gap-1 rounded-full border border-border bg-card/90 p-1 backdrop-blur-xl md:hidden">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-medium transition-colors",
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className={cn("md:sticky md:top-[72px] md:col-start-1 md:row-span-2 md:row-start-1 md:pt-2", tab !== "phone" && "max-md:hidden")}>
            <Phone allowBare reserve={96} />
          </div>

          <section aria-label="Simulation controls" className={cn("md:col-start-2 md:row-start-2", tab !== "controls" && "max-md:hidden")}>
            <SimulatorPanel />
          </section>
        </div>
      </SimProvider>
    </main>
  );
}
