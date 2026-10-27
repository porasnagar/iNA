import type { Capabilities, ListeningMode } from "./protocol";

/**
 * Suggested next action shown at the top of the connected AirPods screen.
 * Mirrors `NextActionAdvisor` in NextActionAdvisor.kt — change both together.
 */
export type SuggestionId =
  | "low-battery"
  | "resume"
  | "fit-test"
  | "turn-on-anc"
  | "try-adaptive"
  | "conversation-awareness"
  | "start-listening";

export interface SuggestionInput {
  caps: Pick<Capabilities, "anc" | "adaptive" | "fitTest" | "conversationAwareness" | "hasCase">;
  /** -1 = unknown. */
  left: number;
  right: number;
  leftCharging: boolean;
  rightCharging: boolean;
  leftInEar: boolean;
  rightInEar: boolean;
  mode: ListeningMode;
  conversationAwareness: boolean;
  fitTested: boolean;
  pausedByEar: boolean;
  playing: boolean;
  dismissed: readonly SuggestionId[];
}

export interface Suggestion {
  id: SuggestionId;
  title: string;
  detail: string;
  cta: string | null;
}

/** A bud at or below this level (and not charging) counts as low. */
export const LOW_BATTERY_THRESHOLD = 20;

export function suggestNextAction(i: SuggestionInput): Suggestion | null {
  const candidates: Suggestion[] = [];
  const overEar = !i.caps.hasCase;
  const wornBoth = overEar ? i.leftInEar : i.leftInEar && i.rightInEar;
  const wornAny = i.leftInEar || i.rightInEar;

  // 1. Low battery
  const buds: { label: string; level: number; charging: boolean }[] = overEar
    ? [{ label: "Battery", level: i.left, charging: i.leftCharging }]
    : [
        { label: "Left AirPod", level: i.left, charging: i.leftCharging },
        { label: "Right AirPod", level: i.right, charging: i.rightCharging },
      ];
  const low = buds
    .filter((b) => b.level >= 0 && b.level <= LOW_BATTERY_THRESHOLD && !b.charging)
    .sort((a, b) => a.level - b.level)[0];
  if (low) {
    const canSave = i.caps.anc && i.mode !== "off";
    candidates.push({
      id: "low-battery",
      title: `${low.label} at ${low.level}%`,
      detail: canSave ? "Turning off noise control makes the battery last longer." : "Put it back in the case to charge.",
      cta: canSave ? "Turn Off" : null,
    });
  }

  // 2. Music paused by ear detection
  if (i.pausedByEar && !wornBoth) {
    candidates.push({ id: "resume", title: "Music paused", detail: "Paused when an AirPod came out.", cta: "Resume" });
  }

  // 3. Fit test never run
  if (i.caps.fitTest && !i.fitTested && wornBoth) {
    candidates.push({ id: "fit-test", title: "Check your ear tip fit", detail: "A 10-second test for the best seal and sound.", cta: "Open Fit Test" });
  }

  // 4. Noise cancellation off
  if (i.caps.anc && i.mode === "off") {
    candidates.push({ id: "turn-on-anc", title: "Noise Cancellation is off", detail: "Block out the world around you.", cta: "Turn On" });
  }

  // 5. Adaptive Audio
  if (i.caps.adaptive && wornBoth && (i.mode === "anc" || i.mode === "transparency")) {
    candidates.push({ id: "try-adaptive", title: "Try Adaptive Audio", detail: "Blends noise cancellation and transparency as you move.", cta: "Try It" });
  }

  // 6. Conversation Awareness off
  if (i.caps.conversationAwareness && !i.conversationAwareness) {
    candidates.push({ id: "conversation-awareness", title: "Turn on Conversation Awareness", detail: "Lowers your media when you start speaking.", cta: "Turn On" });
  }

  // 7. Not worn yet
  if (!wornAny && !i.playing && !i.pausedByEar) {
    candidates.push({
      id: "start-listening",
      title: overEar ? "Put on your headphones" : "Put in your AirPods",
      detail: "Your music starts here as soon as they're in.",
      cta: "Play",
    });
  }

  return candidates.find((c) => !i.dismissed.includes(c.id)) ?? null;
}
