/**
 * Rules for the Apple Watch, AirTag and HomePod flows.
 * Mirrored one-to-one by DeviceRules.kt in the Android app; change both together and keep
 * devices.test.ts and DeviceRulesTest.kt passing.
 */

/* ---------- Apple Watch pairing ---------- */

export const PAIRING_CODE_LENGTH = 6;

/** Keeps digits only, at most six of them. */
export function normalizePairingCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, PAIRING_CODE_LENGTH);
}

export type CodeCheck = "incomplete" | "match" | "mismatch";

/** The code typed on the phone must match the six digits the Watch shows. */
export function checkPairingCode(entered: string, shown: string): CodeCheck {
  const code = normalizePairingCode(entered);
  if (code.length < PAIRING_CODE_LENGTH) return "incomplete";
  return code === normalizePairingCode(shown) ? "match" : "mismatch";
}

export const WATCH_PAIRING_STAGES = [
  "Pairing",
  "Syncing settings",
  "Registering ANCS notification listener & HealthKit GATT telemetry",
] as const;

/* ---------- Activity rings ---------- */

export type RingKind = "move" | "exercise" | "stand";

export interface ActivityGoals {
  move: number;
  exercise: number;
  stand: number;
}

export const DEFAULT_GOALS: ActivityGoals = { move: 500, exercise: 30, stand: 12 };

/** Allowed goal range and step for each ring (watchOS limits). */
export const GOAL_LIMITS: Record<RingKind, { min: number; max: number; step: number; unit: string }> = {
  move: { min: 100, max: 1500, step: 10, unit: "kcal" },
  exercise: { min: 10, max: 60, step: 5, unit: "min" },
  stand: { min: 6, max: 12, step: 1, unit: "hrs" },
};

export function clampGoal(kind: RingKind, value: number): number {
  const { min, max, step } = GOAL_LIMITS[kind];
  const snapped = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, snapped));
}

/** Fraction of the goal; above 1 once the ring is closed (drawn as an overlap lap, capped at 2). */
export function ringProgress(value: number, goal: number): number {
  if (goal <= 0 || value <= 0) return 0;
  return Math.min(2, value / goal);
}

export function ringClosed(value: number, goal: number): boolean {
  return goal > 0 && value >= goal;
}

/* ---------- Heart ---------- */

/** Apple Watch defaults for high / low heart rate notifications. */
export const DEFAULT_HEART_THRESHOLDS = { low: 40, high: 120 };

/** Notification thresholds you can pick in the Watch app. */
export const HEART_THRESHOLD_LIMITS = { low: { min: 30, max: 50, step: 5 }, high: { min: 100, max: 150, step: 5 } };

export function clampHeartThreshold(which: "low" | "high", value: number): number {
  const { min, max, step } = HEART_THRESHOLD_LIMITS[which];
  return Math.max(min, Math.min(max, Math.round(value / step) * step));
}

export type HeartZone = "low" | "normal" | "high";

/** null while there is no reading (-1). */
export function heartZone(bpm: number, t = DEFAULT_HEART_THRESHOLDS): HeartZone | null {
  if (bpm < 0) return null;
  if (bpm < t.low) return "low";
  if (bpm > t.high) return "high";
  return "normal";
}

/** Average of the lowest fifth of readings (at least one); -1 with no readings. */
export function restingHeartRate(samples: readonly number[]): number {
  const valid = samples.filter((s) => s > 0).sort((a, b) => a - b);
  if (valid.length === 0) return -1;
  const n = Math.max(1, Math.floor(valid.length / 5));
  const low = valid.slice(0, n);
  return Math.round(low.reduce((a, b) => a + b, 0) / n);
}

export type Spo2Status = "normal" | "low" | "very-low";

export function spo2Status(percent: number): Spo2Status | null {
  if (percent < 0) return null;
  if (percent >= 95) return "normal";
  if (percent >= 90) return "low";
  return "very-low";
}

export type EcgResult = "sinus-rhythm" | "low-heart-rate" | "high-heart-rate";

/** ECG app classification by average heart rate (valid range 50–150 BPM). */
export function classifyEcg(averageBpm: number): EcgResult {
  if (averageBpm < 50) return "low-heart-rate";
  if (averageBpm > 150) return "high-heart-rate";
  return "sinus-rhythm";
}

export const ECG_LABEL: Record<EcgResult, string> = {
  "sinus-rhythm": "Sinus Rhythm",
  "low-heart-rate": "Heart Rate Under 50",
  "high-heart-rate": "Heart Rate Over 150",
};

/* ---------- Sleep ---------- */

export type SleepStage = "awake" | "rem" | "core" | "deep";
export const SLEEP_STAGES: readonly SleepStage[] = ["awake", "rem", "core", "deep"];
export const SLEEP_LABEL: Record<SleepStage, string> = { awake: "Awake", rem: "REM", core: "Core", deep: "Deep" };

export interface SleepSlice {
  stage: SleepStage;
  minutes: number;
  percent: number;
}

/** Whole-number percentages that always add up to 100 (largest remainder). */
export function sleepBreakdown(minutes: Record<SleepStage, number>): SleepSlice[] {
  const total = SLEEP_STAGES.reduce((a, s) => a + Math.max(0, minutes[s]), 0);
  if (total === 0) return SLEEP_STAGES.map((stage) => ({ stage, minutes: 0, percent: 0 }));
  const raw = SLEEP_STAGES.map((s) => (Math.max(0, minutes[s]) * 100) / total);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    left--;
  }
  return SLEEP_STAGES.map((stage, i) => ({ stage, minutes: Math.max(0, minutes[stage]), percent: floors[i] ?? 0 }));
}

/** Time asleep leaves out Awake. */
export function timeAsleep(minutes: Record<SleepStage, number>): number {
  return Math.max(0, minutes.rem) + Math.max(0, minutes.core) + Math.max(0, minutes.deep);
}

export function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} hr` : `${h} hr ${r} min`;
}

/* ---------- Steps ---------- */

export const DEFAULT_STRIDE_M = 0.762;

export function stepsToKm(steps: number, strideM = DEFAULT_STRIDE_M): number {
  if (steps <= 0) return 0;
  return Math.round(steps * strideM) / 1000;
}

/* ---------- AirTag ---------- */

export const AIRTAG_ITEMS = [
  { name: "Keys", emoji: "🔑" },
  { name: "Backpack", emoji: "🎒" },
  { name: "Wallet", emoji: "👛" },
  { name: "Bag", emoji: "👜" },
  { name: "Luggage", emoji: "🧳" },
  { name: "Bike", emoji: "🚲" },
  { name: "Car", emoji: "🚗" },
  { name: "Pet", emoji: "🐶" },
] as const;

export const AIRTAG_NAME_MAX = 24;

/** Trimmed item name, or null when empty. Long names are cut to 24 characters. */
export function cleanItemName(name: string): string | null {
  const t = name.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return Array.from(t).slice(0, AIRTAG_NAME_MAX).join("");
}

export const AIRTAG_SETUP_STAGES = ["Connecting to AirTag", "Registering to your account", "Turning on Find My"] as const;

export type ProximityTrend = "warmer" | "colder" | "steady";

/** Warmer when the distance shrinks by more than 5% (at least 10 cm), colder when it grows as much. */
export function proximityTrend(previousM: number, currentM: number): ProximityTrend {
  if (previousM < 0 || currentM < 0) return "steady";
  const threshold = Math.max(0.1, previousM * 0.05);
  if (currentM < previousM - threshold) return "warmer";
  if (currentM > previousM + threshold) return "colder";
  return "steady";
}

/** "Here" under half a metre, like Precision Finding. */
export function findingLabel(distanceM: number): string {
  if (distanceM < 0) return "Searching";
  if (distanceM < 0.5) return "Here";
  if (distanceM < 3) return "Nearby";
  return "Far";
}

/* ---------- HomePod ---------- */

export const HOMEPOD_ROOMS = ["Living Room", "Bedroom", "Kitchen", "Office", "Dining Room", "Den"] as const;

export const HOMEPOD_SETUP_STAGES = ["Sharing Wi-Fi settings", "Setting up HomePod", "Adding to Home"] as const;

export function clampVolume(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}
