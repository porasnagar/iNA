import { createFileRoute } from "@tanstack/react-router";

import { HardwareMatrix } from "@/components/ina/site/HardwareMatrix";

const TITLE = "Supported Apple Hardware — AirPods, Beats, Watch, AirTag | iNA";
const DESCRIPTION =
  "Every Apple device iNA supports on Android: AirPods 1–5, AirPods Pro 1–3, AirPods Max 1–2, Beats, Apple Watch, AirTag and HomePod, with chipsets and features.";

export const Route = createFileRoute("/hardware")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: HardwarePage,
});

function HardwarePage() {
  return (
    <main>
      <HardwareMatrix />
    </main>
  );
}
