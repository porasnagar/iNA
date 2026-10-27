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
  /** Suggestions the user closed (see {@link SuggestionMemory}). */
  dismissed: readonly SuggestionId[];
  /** After a close, other tips wait until this time (ms). Alerts ignore it. */
  quietUntil?: number;
  now?: number;
}

/** Low battery and Music paused are alerts: they come back the next time it happens. */
export const ALERT_SUGGESTIONS: readonly SuggestionId[] = ["low-battery", "resume"];
/** After closing a suggestion, no other tip takes its place for this long. */
export const SUGGESTION_QUIET_MS = 24 * 60 * 60 * 1000;

/** What the user closed. Persisted so a closed card never comes back on the next visit. */
export interface SuggestionMemory {
  closed: SuggestionId[];
  quietUntil: number;
}

export const EMPTY_SUGGESTION_MEMORY: SuggestionMemory = { closed: [], quietUntil: 0 };

/** X on the card: that suggestion stays closed and no other tip pops up in its place for a day. */
export function dismissSuggestion(m: SuggestionMemory, id: SuggestionId, now: number): SuggestionMemory {
  return { closed: m.closed.includes(id) ? m.closed : [...m.closed, id], quietUntil: now + SUGGESTION_QUIET_MS };
}

/** The suggestion's button was used: hide it, without the quiet period. */
export function completeSuggestion(m: SuggestionMemory, id: SuggestionId): SuggestionMemory {
  return m.closed.includes(id) ? m : { ...m, closed: [...m.closed, id] };
}

/** Closed alerts whose condition has cleared are forgotten, so the next low battery shows again. */
export function forgetClearedAlerts(m: SuggestionMemory, current: readonly SuggestionId[]): SuggestionMemory {
  const closed = m.closed.filter((id) => !ALERT_SUGGESTIONS.includes(id) || current.includes(id));
  return closed.length === m.closed.length ? m : { ...m, closed };
}

export interface Suggestion {
  id: SuggestionId;
  title: string;
  detail: string;
  cta: string | null;
}

/** A bud at or below this level (and not charging) counts as low. */
export const LOW_BATTERY_THRESHOLD = 20;

/** Every suggestion that applies right now, most important first (ignores what was closed). */
export function suggestionCandidates(i: SuggestionInput): Suggestion[] {
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

  return candidates;
}

export function suggestNextAction(i: SuggestionInput): Suggestion | null {
  const quiet = (i.now ?? 0) < (i.quietUntil ?? 0);
  return (
    suggestionCandidates(i).find(
      (c) => !i.dismissed.includes(c.id) && (!quiet || ALERT_SUGGESTIONS.includes(c.id)),
    ) ?? null
  );
}
