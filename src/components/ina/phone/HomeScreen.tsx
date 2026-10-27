import {
  Camera,
  Chrome,
  CloudSun,
  Image,
  MapPin,
  MessageCircle,
  Mic,
  Music2,
  Phone,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { InaLogo } from "@/components/ina/InaLogo";
import { useClock } from "./StatusBar";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";

interface AppIcon {
  name: string;
  icon: LucideIcon;
  tint: string;
}

const APPS: AppIcon[] = [
  { name: "Photos", icon: Image, tint: "bg-tint-pink" },
  { name: "Maps", icon: MapPin, tint: "bg-tint-green" },
  { name: "Music", icon: Music2, tint: "bg-tint-orange" },
  { name: "Weather", icon: CloudSun, tint: "bg-tint-teal" },
  { name: "Recorder", icon: Mic, tint: "bg-tint-purple" },
  { name: "Settings", icon: Settings, tint: "bg-elevated" },
];

const DOCK: AppIcon[] = [
  { name: "Phone", icon: Phone, tint: "bg-tint-green" },
  { name: "Messages", icon: MessageCircle, tint: "bg-tint-blue" },
  { name: "Chrome", icon: Chrome, tint: "bg-tint-yellow" },
  { name: "Camera", icon: Camera, tint: "bg-elevated" },
];

function Icon({ app, onClick }: { app: AppIcon; onClick?: () => void }) {
  const I = app.icon;
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95">
      <span className={cn("grid size-[54px] place-items-center rounded-[18px] text-primary-foreground shadow-lg", app.tint)}>
        <I className="size-6" strokeWidth={2.2} />
      </span>
      <span className="text-[11px] font-medium text-foreground/90">{app.name}</span>
    </button>
  );
}

export function HomeScreen() {
  const { actions, isConnected } = useSim();
  const now = useClock();
  const demo = (name: string) => () => toast(`${name} is part of the simulated launcher`);
  return (
    <div className="absolute inset-0 bg-wallpaper pb-6 pt-10">
      <div className="flex h-full flex-col px-5">
        <div className="mt-8 text-center">
          <div className="text-[64px] font-extralight leading-none tracking-tight tabular-nums">
            {now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "") : "9:41"}
          </div>
          <div className="mt-2 text-sm font-medium text-foreground/80">
            {now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "Tuesday"}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-4 gap-y-5">
          {APPS.map((a) => (
            <Icon key={a.name} app={a} onClick={demo(a.name)} />
          ))}
          <button type="button" onClick={() => actions.setSurface("app")} className="flex flex-col items-center gap-1.5 active:scale-95">
            <InaLogo className="size-[54px] shadow-lg" />
            <span className="text-[11px] font-medium text-foreground/90">iNA</span>
          </button>
        </div>

        <div className="mt-auto space-y-4">
          {!isConnected && (
            <button
              type="button"
              onClick={() => actions.openCase()}
              className="mx-auto flex items-center gap-2 rounded-full bg-sheet px-4 py-2 text-xs font-medium backdrop-blur-xl"
            >
              <span className="size-2 animate-pulse rounded-full bg-success" />
              Simulate: open AirPods case nearby
            </button>
          )}
          <div className="grid grid-cols-4">
            {DOCK.map((a) => (
              <Icon key={a.name} app={{ ...a, name: "" }} onClick={demo(a.name)} />
            ))}
          </div>
          <div className="flex h-12 items-center gap-3 rounded-full bg-sheet px-4 text-sm text-muted-foreground backdrop-blur-xl">
            <Search className="size-4" />
            Search
          </div>
        </div>
      </div>
    </div>
  );
}
