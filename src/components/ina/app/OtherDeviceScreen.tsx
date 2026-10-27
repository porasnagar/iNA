import { ChevronRight, Locate, Speaker, Watch } from "lucide-react";

import { usePairedDevices } from "@/lib/ina/paired";
import { AirTagFlow } from "./devices/AirTagFlow";
import { HomePodFlow } from "./devices/HomePodFlow";
import { WatchFlow } from "./devices/WatchFlow";
import { Group, Row } from "./ui";

export type OtherDeviceKind = "watch" | "airtag" | "homepod";

const META: Record<OtherDeviceKind, { name: string; detail: string; paired: string }> = {
  watch: { name: "Apple Watch", detail: "Pair, Activity rings and Health", paired: "Paired" },
  airtag: { name: "AirTag", detail: "Register, find and ring", paired: "Registered" },
  homepod: { name: "HomePod", detail: "Set up, AirPlay and stereo pair", paired: "Set up" },
};

const ICON = { watch: Watch, airtag: Locate, homepod: Speaker } as const;

export function OtherDevicesList({ onPick }: { onPick: (k: OtherDeviceKind) => void }) {
  const { paired } = usePairedDevices();
  return (
    <Group title="Other Apple devices" footer="Each one starts with the same set-up steps as on iPhone.">
      {(Object.keys(META) as OtherDeviceKind[]).map((k) => {
        const p = paired[k];
        const detail = p ? `${META[k].paired} · ${k === "airtag" && paired.airtag ? `${paired.airtag.emoji} ${paired.airtag.name}` : k === "homepod" && paired.homepod ? paired.homepod.room : (paired.watch?.name ?? "")}` : META[k].detail;
        return (
          <Row key={k} icon={ICON[k]} title={META[k].name} detail={detail} onClick={() => onPick(k)}>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Row>
        );
      })}
    </Group>
  );
}

export function OtherDeviceScreen({ kind, onClose }: { kind: OtherDeviceKind; onClose: () => void }) {
  const { paired, ready, update } = usePairedDevices();
  if (!ready) return null;
  if (kind === "watch") {
    return (
      <WatchFlow
        paired={paired.watch}
        onPaired={(w) => update((p) => ({ ...p, watch: w }))}
        onChange={(w) => update((p) => ({ ...p, watch: w }))}
        onForget={() => update((p) => ({ ...p, watch: null }))}
        onClose={onClose}
      />
    );
  }
  if (kind === "airtag") {
    return <AirTagFlow paired={paired.airtag} onSave={(t) => update((p) => ({ ...p, airtag: t }))} onForget={() => update((p) => ({ ...p, airtag: null }))} onClose={onClose} />;
  }
  return <HomePodFlow paired={paired.homepod} onSave={(h) => update((p) => ({ ...p, homepod: h }))} onForget={() => update((p) => ({ ...p, homepod: null }))} onClose={onClose} />;
}
