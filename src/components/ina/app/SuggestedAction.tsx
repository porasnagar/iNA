import { Sparkles, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useSim } from "@/lib/ina/store";
import { suggestionCandidates, suggestNextAction, type SuggestionId, type SuggestionInput } from "@/lib/ina/suggest";

/** Contextual "what to do next" card at the top of the connected AirPods screen. */
export function SuggestedAction() {
  const { state, actions, model, displayBattery } = useSim();
  const a = state.accessory;
  const input: SuggestionInput | null = model ? {
    caps: model.caps,
    left: displayBattery("left"),
    right: displayBattery("right"),
    leftCharging: a.leftCharging,
    rightCharging: a.rightCharging,
    leftInEar: a.leftInEar,
    rightInEar: a.rightInEar,
    mode: state.mode,
    conversationAwareness: state.settings.conversationAwareness,
    fitTested: state.fitTested,
    pausedByEar: state.media.pausedByEar,
    playing: state.media.playing,
    dismissed: state.suggestions.closed,
    quietUntil: state.suggestions.quietUntil,
    now: Date.now(),
  } : null;
  const currentIds = input ? suggestionCandidates(input).map((c) => c.id).join(",") : "";
  useEffect(() => {
    actions.forgetClearedSuggestions(currentIds ? (currentIds.split(",") as SuggestionId[]) : []);
  }, [actions, currentIds]);
  const suggestion = input ? suggestNextAction(input) : null;
  if (!suggestion) return null;

  const run = () => {
    actions.log("UI", `Suggested action: ${suggestion.id}`);
    switch (suggestion.id) {
      case "low-battery":
        return actions.setMode("off", "suggestion · save battery");
      case "resume":
      case "start-listening":
        actions.completeSuggestion(suggestion.id);
        return actions.toggleMedia();
      case "fit-test":
        return actions.setTab("controls");
      case "turn-on-anc":
        return actions.setMode("anc", "suggestion");
      case "try-adaptive":
        return actions.setMode("adaptive", "suggestion");
      case "conversation-awareness":
        return actions.setSetting("conversationAwareness", true);
    }
  };

  return (
    <section
      aria-label="Suggested action"
      key={suggestion.id}
      className="mx-4 flex items-center gap-3 rounded-[24px] bg-card p-3.5 animate-in fade-in slide-in-from-top-1 duration-300"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{suggestion.title}</div>
        <div className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">{suggestion.detail}</div>
      </div>
      {suggestion.cta && (
        <Button size="sm" className="h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold" onClick={run}>
          {suggestion.cta}
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss suggestion"
        onClick={() => actions.dismissSuggestion(suggestion.id)}
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10"
      >
        <X className="size-3.5" />
      </button>
    </section>
  );
}
