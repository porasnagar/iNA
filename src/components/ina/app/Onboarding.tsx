import { BatteryCharging, Bell, Bluetooth, Check, ChevronRight, Layers, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { InaLogo } from "@/components/ina/InaLogo";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSim, type PermissionKey } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

interface PermStep {
  key: PermissionKey;
  icon: LucideIcon;
  tint: string;
  title: string;
  body: string;
  tech: string[];
  dialog: { kind: "dialog" | "settings"; title: string; body: string; allow: string; deny: string };
}

const STEPS: PermStep[] = [
  {
    key: "bluetooth",
    icon: Bluetooth,
    tint: "bg-tint-blue",
    title: "Find nearby Apple devices",
    body: "iNA listens for the Apple Continuity broadcast your case sends when you open it, then opens a private control channel to your AirPods.",
    tech: ["BLUETOOTH_SCAN", "BLUETOOTH_CONNECT", "BLE 0x004C", "L2CAP 0x1001"],
    dialog: {
      kind: "dialog",
      title: "Allow iNA to find, connect to, and determine the relative position of nearby devices?",
      body: "",
      allow: "Allow",
      deny: "Don't allow",
    },
  },
  {
    key: "overlay",
    icon: Layers,
    tint: "bg-tint-purple",
    title: "Show the case-open pop-up",
    body: "Lets the battery pop-up slide up over your Home Screen or any app — exactly like on iPhone — even when iNA is closed.",
    tech: ["SYSTEM_ALERT_WINDOW", "TYPE_APPLICATION_OVERLAY"],
    dialog: {
      kind: "settings",
      title: "Display over other apps",
      body: "Allow this app to display on top of other apps you're using. It may interfere with your use of those apps.",
      allow: "Allow display over other apps",
      deny: "Back",
    },
  },
  {
    key: "companion",
    icon: BatteryCharging,
    tint: "bg-tint-green",
    title: "Stay connected in the background",
    body: "Registers your accessory as a companion device and exempts iNA from battery optimisation so One UI, OxygenOS and HyperOS never stop the listener.",
    tech: ["CompanionDeviceManager", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"],
    dialog: {
      kind: "dialog",
      title: "Let iNA always run in background?",
      body: "Allowing iNA to always run in the background may reduce battery life. You can change this later from Settings › Apps.",
      allow: "Allow",
      deny: "Deny",
    },
  },
  {
    key: "notifications",
    icon: Bell,
    tint: "bg-tint-orange",
    title: "Mirror notifications to Apple Watch",
    body: "Forwards your Android notifications to Apple Watch over ANCS and powers the live status notification.",
    tech: ["BIND_NOTIFICATION_LISTENER_SERVICE", "POST_NOTIFICATIONS", "ANCS"],
    dialog: {
      kind: "dialog",
      title: "Allow notification access for iNA?",
      body: "iNA will be able to read all notifications, including personal information such as contact names and the text of messages you receive.",
      allow: "Allow",
      deny: "Deny",
    },
  },
];

function SystemDialog({ step, onAllow, onDeny }: { step: PermStep; onAllow: () => void; onDeny: () => void }) {
  const [on, setOn] = useState(false);
  if (step.dialog.kind === "settings") {
    return (
      <div className="absolute inset-0 z-10 bg-background pt-10 animate-in slide-in-from-right duration-300">
        <div className="px-5 py-4 text-2xl font-semibold">{step.dialog.title}</div>
        <div className="mx-4 flex items-center gap-3 rounded-[24px] bg-card p-4">
          <InaLogo className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">iNA</div>
            <div className="text-xs text-muted-foreground">dev.ibridge.android</div>
          </div>
        </div>
        <label className="mx-4 mt-3 flex items-center gap-3 rounded-[24px] bg-card p-4">
          <span className="min-w-0 flex-1 pr-3 text-[15px]">{step.dialog.allow}</span>
          <Switch
            checked={on}
            onCheckedChange={(v) => {
              setOn(v);
              if (v) window.setTimeout(onAllow, 450);
            }}
          />
        </label>
        <p className="mx-6 mt-3 text-xs text-muted-foreground">{step.dialog.body}</p>
        <button type="button" onClick={onDeny} className="mx-6 mt-6 text-sm font-medium text-primary">
          ← Back to iNA
        </button>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-10 flex items-end bg-scrim p-3 pb-8 animate-in fade-in">
      <div className="w-full rounded-[28px] bg-elevated p-6 animate-in slide-in-from-bottom-8">
        <step.icon className="mx-auto size-6 text-primary" />
        <p className="mt-4 text-center text-[17px] leading-snug">{step.dialog.title}</p>
        {step.dialog.body && <p className="mt-2 text-center text-xs text-muted-foreground">{step.dialog.body}</p>}
        <div className="mt-5 space-y-2">
          <button type="button" onClick={onAllow} className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {step.dialog.allow}
          </button>
          <button type="button" onClick={onDeny} className="h-11 w-full rounded-full bg-foreground/8 text-sm font-semibold text-primary">
            {step.dialog.deny}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Onboarding() {
  const { state, actions } = useSim();
  const [index, setIndex] = useState(0); // 0 = welcome, 1..4 = permissions, 5 = done
  const [dialog, setDialog] = useState(false);

  const next = () => {
    setDialog(false);
    setIndex((i) => i + 1);
  };

  if (index === 0) {
    return (
      <div className="flex h-full flex-col px-6 pb-6 pt-14">
        <InaLogo className="size-16" />
        <h1 className="mt-6 text-[34px] font-bold leading-[1.05] tracking-tight">
          Your Apple gear,
          <br />
          at home on Android.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Case-open pop-ups, noise control, ear detection and more — for AirPods, Beats, Apple Watch and AirTag. No root, no workarounds.
        </p>
        <div className="relative mt-6 flex flex-1 items-center justify-center">
          <div className="absolute inset-0 bg-stage" />
          <ProductImage product="airpods-pro" alt="AirPods Pro" eager className="relative h-44 animate-float" />
        </div>
        <Button size="lg" className="h-13 rounded-2xl py-3.5 text-base font-semibold" onClick={() => setIndex(1)}>
          Get Started
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Takes about a minute · 4 permissions</p>
      </div>
    );
  }

  if (index > STEPS.length) {
    return (
      <div className="flex h-full flex-col px-6 pb-6 pt-14">
        <div className="grid size-16 place-items-center rounded-full bg-success text-background">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-tight">You're all set</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Open your AirPods case near the phone — the pop-up will appear even when iNA is closed.</p>
        <ul className="mt-6 space-y-2">
          {STEPS.map((s) => (
            <li key={s.key} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <span className={cn("grid size-7 place-items-center rounded-lg text-foreground", s.tint)}>
                <s.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate pr-3 text-sm">{s.title}</span>
              <span className={cn("shrink-0 whitespace-nowrap text-xs font-medium", state.permissions[s.key] ? "text-success" : "text-warning")}>
                {state.permissions[s.key] ? "Allowed" : "Skipped"}
              </span>
            </li>
          ))}
        </ul>
        <Button size="lg" className="mt-auto h-13 rounded-2xl py-3.5 text-base font-semibold" onClick={actions.completeOnboarding}>
          Continue
        </Button>
      </div>
    );
  }

  const step = STEPS[index - 1];
  if (!step) return null;
  const granted = state.permissions[step.key];
  return (
    <div className="relative flex h-full flex-col px-6 pb-6 pt-12">
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <span key={s.key} className={cn("h-1 flex-1 rounded-full", i < index ? "bg-primary" : "bg-foreground/12")} />
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Step {index} of {STEPS.length}
      </div>
      <div className={cn("mt-10 grid size-16 place-items-center rounded-[20px] text-foreground", step.tint)}>
        <step.icon className="size-8" />
      </div>
      <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-tight">{step.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {step.tech.map((t) => (
          <span key={t} className="rounded-full bg-foreground/8 px-2.5 py-1 font-mono text-[10.5px] text-muted-foreground">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-auto space-y-2">
        {granted ? (
          <Button size="lg" className="h-13 w-full rounded-2xl py-3.5 text-base font-semibold" onClick={next}>
            <Check className="size-4" /> Allowed · Continue
          </Button>
        ) : (
          <Button size="lg" className="h-13 w-full rounded-2xl py-3.5 text-base font-semibold" onClick={() => setDialog(true)}>
            Allow <ChevronRight className="size-4" />
          </Button>
        )}
        {!granted && (
          <button type="button" onClick={next} className="h-10 w-full text-sm font-medium text-muted-foreground">
            Not now
          </button>
        )}
      </div>
      {dialog && (
        <SystemDialog
          step={step}
          onAllow={() => {
            actions.grantPermission(step.key);
            if (step.key === "companion") actions.log("SYS", "CompanionDeviceManager.associate() · BluetoothLeDeviceFilter 0x004C");
            next();
          }}
          onDeny={() => setDialog(false)}
        />
      )}
    </div>
  );
}
