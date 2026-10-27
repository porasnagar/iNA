import { createFileRoute } from "@tanstack/react-router";

import { Phone } from "@/components/ina/phone/Phone";
import { SimulatorPanel } from "@/components/ina/SimulatorPanel";
import { Architecture } from "@/components/ina/site/Architecture";
import { DeveloperCenter } from "@/components/ina/site/DeveloperCenter";
import { HardwareMatrix } from "@/components/ina/site/HardwareMatrix";
import { Hero } from "@/components/ina/site/Hero";
import { SectionHeading } from "@/components/ina/site/SectionHeading";
import { SimProvider } from "@/lib/ina/store";

const TITLE = "iNA — Universal Apple Hardware Interoperability Suite for Android";
const DESCRIPTION =
  "AirPods, Beats, Apple Watch, AirTag and HomePod features on Android 10–16+. 100% user-space: zero root, zero Magisk, zero iOS VM. Try the live simulator.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://apple-device-orbit.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://apple-device-orbit.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Hero />

      <section id="simulator" className="scroll-mt-16 border-t border-border bg-stage">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <SectionHeading eyebrow="Live app simulator" title="Try iNA before you install it." className="mb-12">
            A full Android 16 handset running iNA. Open the case to see the pop-up, pull down Quick Settings to cycle noise control, and explore every
            control iNA unlocks.
          </SectionHeading>
          <SimProvider>
            <div className="grid items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
              <div className="lg:sticky lg:top-20">
                <Phone />
                <p className="mt-4 text-center text-xs text-muted-foreground">Tap the status bar for Quick Settings · tap the gesture bar for Home</p>
              </div>
              <SimulatorPanel />
            </div>
          </SimProvider>
        </div>
      </section>

      <Architecture />
      <HardwareMatrix />
      <DeveloperCenter />
    </main>
  );
}
