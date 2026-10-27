import { MessageCircleMore, Pause, Play, SlidersHorizontal, Volume2 } from "lucide-react";

import { BatteryRing } from "@/components/ina/BatteryRing";
import { ModeSelector } from "@/components/ina/ModeSelector";
import { ProductImage } from "@/components/ina/product";
import { Button } from "@/components/ui/button";
import { hexId, MODE_LABEL } from "@/lib/ina/protocol";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { Chip, Group, ToggleRow } from "./ui";

export function DeviceScreen() {
  const { state, actions, model, modes, displayBattery } = useSim();
  if (!model) {
    return <div className="p-6 text-sm text-muted-foreground">Unknown accessory {hexId(state.accessory.modelId)} — add it from Rules.</div>;
  }
  const a = state.accessory;
  const overEar = !model.caps.hasCase;
  const preview = state.previewConnected && !state.connected;

  return (
    <div className="space-y-5 pb-6">
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", preview ? "bg-warning" : "bg-success")} />
          <span className="text-[13px] font-medium text-muted-foreground">{preview ? "Preview · simulated values" : "Connected"}</span>
          <Chip className="ml-auto">{hexId(model.id)} · {model.chip}</Chip>
        </div>
        <h1 className="mt-1 truncate text-[28px] font-bold tracking-tight">{model.name}</h1>
      </div>

      <div className="relative mx-4 h-48">
        <div className="absolute inset-0 bg-stage" />
        <ProductImage product={model.image} alt={model.name} eager className="relative mx-auto h-full animate-float" />
      </div>

      <div className="mx-4 flex justify-around rounded-[24px] bg-card px-2 py-4">
        {overEar ? (
          <BatteryRing level={displayBattery("left")} charging={a.leftCharging} label="Battery" size={84} />
        ) : (
          <>
            <BatteryRing level={displayBattery("left")} charging={a.leftCharging} label="Left" />
            <BatteryRing level={displayBattery("right")} charging={a.rightCharging} label="Right" />
            <BatteryRing level={displayBattery("case")} charging={a.caseCharging} label="Case" />
          </>
        )}
      </div>

      {modes.length > 0 ? (
        <section className="mx-4 rounded-[24px] bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate pr-3 text-[15px] font-semibold">Listening Mode</span>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{MODE_LABEL[state.mode]}</span>
          </div>
          <ModeSelector value={state.mode} supported={modes} onChange={(m) => actions.setMode(m, "app")} />
        </section>
      ) : (
        <p className="mx-6 text-xs text-muted-foreground">{model.name} has no noise control hardware.</p>
      )}

      <section className="mx-4 flex items-center gap-3 rounded-[24px] bg-card p-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-logo">
          <div className="flex h-5 items-end gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("w-1 origin-bottom rounded-full bg-primary-foreground", state.media.playing ? "animate-wave" : "scale-y-50")}
                style={{ height: "100%", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <div className="truncate text-[14px] font-semibold">Midnight City</div>
          <div className="truncate text-xs text-muted-foreground">
            {state.media.ducked ? "Volume lowered · conversation" : state.media.pausedByEar ? "Paused · earbud removed" : "M83"}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Volume2 className="size-3 text-muted-foreground" />
            <div className="h-1 flex-1 rounded-full bg-foreground/10">
              <div className={cn("h-full rounded-full bg-foreground transition-all duration-500", state.media.ducked ? "w-1/5" : "w-3/5")} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={actions.toggleMedia}
          aria-label={state.media.playing ? "Pause" : "Play"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background"
        >
          {state.media.playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
        </button>
      </section>

      {model.caps.inEarDetection && (
        <div className="mx-4 flex gap-2">
          {(["left", "right"] as const).map((side) => {
            const inEar = side === "left" ? a.leftInEar : a.rightInEar;
            return (
              <button
                key={side}
                type="button"
                onClick={() => actions.setInEar(side, !inEar)}
                className={cn("flex-1 rounded-2xl px-3 py-2.5 text-left text-xs", inEar ? "bg-success/15 text-success" : "bg-card text-muted-foreground")}
              >
                <span className="block font-semibold">{overEar ? "On head" : side === "left" ? "Left" : "Right"}</span>
                <span className="block">{inEar ? (overEar ? "Worn" : "In ear") : overEar ? "Off head" : "Out of ear"}</span>
              </button>
            );
          })}
        </div>
      )}

      {(model.caps.conversationAwareness || model.caps.personalizedVolume) && (
        <Group title="Hearing">
          {model.caps.conversationAwareness && (
            <ToggleRow
              icon={MessageCircleMore}
              tint="bg-tint-teal"
              title="Conversation Awareness"
              detail="Lowers media when you speak · 0x28"
              checked={state.settings.conversationAwareness}
              onCheckedChange={(v) => actions.setSetting("conversationAwareness", v)}
            />
          )}
          {model.caps.personalizedVolume && (
            <ToggleRow
              icon={Volume2}
              tint="bg-tint-blue"
              title="Personalized Volume"
              detail="Adapts to your environment · 0x26"
              checked={state.settings.personalizedVolume}
              onCheckedChange={(v) => actions.setSetting("personalizedVolume", v)}
            />
          )}
        </Group>
      )}

      <div className="mx-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-11 rounded-2xl" onClick={() => actions.setTab("controls")}>
          <SlidersHorizontal className="size-4" /> All controls
        </Button>
        <Button variant="secondary" className="h-11 rounded-2xl text-destructive" onClick={actions.disconnect}>
          {preview ? "Exit preview" : "Disconnect"}
        </Button>
      </div>
    </div>
  );
}
