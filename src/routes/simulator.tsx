import { createFileRoute } from "@tanstack/react-router";

import { Phone } from "@/components/ina/phone/Phone";
import { SimulatorPanel } from "@/components/ina/SimulatorPanel";
import { SectionHeading } from "@/components/ina/site/SectionHeading";
import { SimProvider } from "@/lib/ina/store";

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

function SimulatorPage() {
  return (
    <main className="bg-stage">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <SectionHeading as="h1" eyebrow="Interactive app simulator" title="Try the iNA Android app in your browser" className="mb-10">
          Open the case to see the proximity pop-up, pull down Quick Settings to cycle noise control, and explore every control iNA unlocks once
          connected.
        </SectionHeading>
        <SimProvider>
          <div className="grid items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
            <div className="lg:sticky lg:top-20">
              <Phone />
              <p className="mt-4 text-center text-xs text-muted-foreground">Tap the status bar for Quick Settings · tap the gesture bar for Home</p>
            </div>
            <section aria-label="Simulator controls">
              <SimulatorPanel />
            </section>
          </div>
        </SimProvider>
      </div>
    </main>
  );
}
