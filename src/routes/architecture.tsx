import { createFileRoute } from "@tanstack/react-router";

import { Architecture } from "@/components/ina/site/Architecture";

const TITLE = "iNA Architecture — Apple BLE 0x004C, L2CAP AAP & overlays";
const DESCRIPTION =
  "How iNA works: Apple Continuity BLE 0x004C scanning, the 0x07 packet byte by byte, L2CAP CoC PSM 0x1001 AAP, the ORT/OTA rule engine and WindowManager overlays.";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  return (
    <main>
      <Architecture />
    </main>
  );
}
