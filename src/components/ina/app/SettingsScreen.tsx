import { Link } from "@tanstack/react-router";
import { BatteryCharging, Bell, Bluetooth, Code2, Info, Layers, Power, RotateCcw, Unlink, type LucideIcon } from "lucide-react";

import { useSim, type PermissionKey } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { PreviewToggleCard } from "./ConnectScreen";
import { Group, Row, ScreenHeader } from "./ui";

const PERMS: { key: PermissionKey; title: string; detail: string; icon: LucideIcon; tint: string }[] = [
  { key: "bluetooth", title: "Nearby devices", detail: "BLUETOOTH_SCAN · BLUETOOTH_CONNECT", icon: Bluetooth, tint: "bg-tint-blue" },
  { key: "overlay", title: "Display over other apps", detail: "SYSTEM_ALERT_WINDOW", icon: Layers, tint: "bg-tint-purple" },
  { key: "companion", title: "Companion & battery", detail: "CompanionDeviceManager · battery exemption", icon: BatteryCharging, tint: "bg-tint-green" },
  { key: "notifications", title: "Notification access", detail: "NotificationListenerService", icon: Bell, tint: "bg-tint-orange" },
];

export function SettingsScreen() {
  const { state, actions } = useSim();
  return (
    <div className="space-y-5 pb-6">
      <ScreenHeader title="Settings" />
      <PreviewToggleCard className="mx-4" />

      <Group title="Permissions">
        {PERMS.map((p) => {
          const ok = state.permissions[p.key];
          return (
            <Row
              key={p.key}
              icon={p.icon}
              tint={p.tint}
              title={p.title}
              detail={p.detail}
              onClick={ok ? undefined : () => actions.grantPermission(p.key)}
              value={<span className={cn("text-xs font-medium", ok ? "text-success" : "text-primary")}>{ok ? "Allowed" : "Allow"}</span>}
            />
          );
        })}
        <Row icon={RotateCcw} tint="bg-elevated" title="Run setup again" onClick={actions.resetOnboarding} />
      </Group>

      <Group title="Background" footer="Starts on boot so the case-open pop-up works without opening iNA.">
        <Row icon={Power} tint="bg-tint-green" title="IBridgeForegroundService" detail="connectedDevice · BOOT_COMPLETED" value="Running" />
        <Row icon={Unlink} tint="bg-destructive" title="Forget paired accessories" detail={`${state.pairedIds.length} bonded`} onClick={actions.forgetPairings} />
      </Group>

      <Group title="About">
        <Row icon={Info} tint="bg-elevated" title="iNA" detail="dev.ibridge.android" value="1.0.0" />
        <Link to="/source" className="flex min-h-12 items-center gap-3 px-4 py-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
            <Code2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate pr-3 text-[15px]">View Android source</span>
        </Link>
      </Group>
    </div>
  );
}
