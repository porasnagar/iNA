import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Phone } from "@/components/ina/phone/Phone";
import { SimulatorPanel } from "@/components/ina/SimulatorPanel";
import { SimProvider } from "@/lib/ina/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iNA Prototype — AirPods pop-up & controls on Android" },
      {
        name: "description",
        content:
          "Interactive iNA prototype: case-open pop-up, Quick Settings noise control, live status, onboarding and AirPods feature controls on Android.",
      },
      { property: "og:title", content: "iNA Prototype — AirPods pop-up & controls on Android" },
      {
        property: "og:description",
        content: "Try the case-open pop-up, noise control tile, live status and AirPods controls iNA brings to Android 10–16+.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SimProvider>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Interactive prototype · Android 10–16+</p>
            <h1 className="mt-2 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              iPhone-grade AirPods features, on any Android phone.
            </h1>
            <p className="mt-3 text-pretty text-muted-foreground">
              Open the case to see the pop-up, pull down Quick Settings to cycle noise control, and explore every control iNA unlocks — no root required.
            </p>
          </div>
          <Link
            to="/source"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-elevated lg:self-auto"
          >
            Get the Android source <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-20">
            <Phone />
            <p className="mt-4 text-center text-xs text-muted-foreground">Tap the status bar for Quick Settings · tap the gesture bar for Home</p>
          </div>
          <SimulatorPanel />
        </div>
      </main>
    </SimProvider>
  );
}
