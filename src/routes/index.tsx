import { createFileRoute } from "@tanstack/react-router";

import { Hero } from "@/components/ina/site/Hero";
import { DeveloperTeaser, HardwareStrip, Highlights, HowItWorks, SimulatorPreview } from "@/components/ina/site/HomeSections";

const TITLE = "iNA — Universal Apple Hardware Interoperability Suite for Android";
const DESCRIPTION =
  "AirPods, Beats, Apple Watch, AirTag and HomePod features on Android 10–16+. 100% user-space: zero root, zero Magisk, zero iOS VM. Open source.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Hero />
      <Highlights />
      <SimulatorPreview />
      <HowItWorks />
      <HardwareStrip />
      <DeveloperTeaser />
    </main>
  );
}
