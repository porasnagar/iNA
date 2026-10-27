import { describe, expect, it } from "vitest";

import {
  checkPairingCode,
  clampGoal,
  clampHeartThreshold,
  classifyEcg,
  cleanItemName,
  findingLabel,
  formatDuration,
  heartZone,
  normalizePairingCode,
  proximityTrend,
  restingHeartRate,
  ringClosed,
  ringProgress,
  sleepBreakdown,
  spo2Status,
  stepsToKm,
  timeAsleep,
} from "./devices";

describe("Watch pairing code", () => {
  it("keeps only six digits", () => {
    expect(normalizePairingCode("48a2-91 37 5")).toBe("482913");
  });
  it("needs all six digits and the code the Watch shows", () => {
    expect(checkPairingCode("48291", "482913")).toBe("incomplete");
    expect(checkPairingCode("482913", "482 913")).toBe("match");
    expect(checkPairingCode("482914", "482913")).toBe("mismatch");
  });
});

describe("Activity rings", () => {
  it("snaps goals into watchOS ranges", () => {
    expect(clampGoal("move", 2000)).toBe(1500);
    expect(clampGoal("move", 503)).toBe(500);
    expect(clampGoal("exercise", 3)).toBe(10);
    expect(clampGoal("stand", 14)).toBe(12);
  });
  it("closes a ring at its goal and overlaps beyond it", () => {
    expect(ringClosed(499, 500)).toBe(false);
    expect(ringClosed(500, 500)).toBe(true);
    expect(ringProgress(250, 500)).toBe(0.5);
    expect(ringProgress(750, 500)).toBe(1.5);
    expect(ringProgress(5000, 500)).toBe(2);
  });
});

describe("Heart", () => {
  it("flags readings under 40 and over 120 BPM by default", () => {
    expect(heartZone(-1)).toBeNull();
    expect(heartZone(39)).toBe("low");
    expect(heartZone(72)).toBe("normal");
    expect(heartZone(121)).toBe("high");
  });
  it("alert thresholds stay within 30–50 and 100–150 BPM", () => {
    expect(clampHeartThreshold("low", 20)).toBe(30);
    expect(clampHeartThreshold("high", 200)).toBe(150);
    expect(clampHeartThreshold("high", 123)).toBe(125);
  });
  it("resting rate averages the lowest fifth", () => {
    expect(restingHeartRate([])).toBe(-1);
    expect(restingHeartRate([80, 60, 62, 90, 100, 70, 75, 85, 95, 110])).toBe(61);
  });
  it("blood oxygen 95%+ is normal", () => {
    expect(spo2Status(98)).toBe("normal");
    expect(spo2Status(92)).toBe("low");
    expect(spo2Status(88)).toBe("very-low");
  });
  it("ECG classifies by 50–150 BPM", () => {
    expect(classifyEcg(49)).toBe("low-heart-rate");
    expect(classifyEcg(72)).toBe("sinus-rhythm");
    expect(classifyEcg(151)).toBe("high-heart-rate");
  });
});

describe("Sleep", () => {
  const night = { awake: 20, rem: 95, core: 240, deep: 65 };
  it("percentages add up to 100", () => {
    const slices = sleepBreakdown(night);
    expect(slices.reduce((a, s) => a + s.percent, 0)).toBe(100);
    expect(slices.map((s) => s.percent)).toEqual([5, 23, 57, 15]);
  });
  it("time asleep leaves out awake", () => {
    expect(timeAsleep(night)).toBe(400);
    expect(formatDuration(400)).toBe("6 hr 40 min");
  });
});

describe("Steps", () => {
  it("converts steps to km with a 0.762 m stride", () => {
    expect(stepsToKm(10000)).toBe(7.62);
    expect(stepsToKm(0)).toBe(0);
  });
});

describe("AirTag", () => {
  it("cleans item names", () => {
    expect(cleanItemName("   ")).toBeNull();
    expect(cleanItemName("  My   Keys ")).toBe("My Keys");
    expect(cleanItemName("x".repeat(40))).toHaveLength(24);
  });
  it("warmer when closer by more than 5%", () => {
    expect(proximityTrend(4, 3.7)).toBe("warmer");
    expect(proximityTrend(4, 3.9)).toBe("steady");
    expect(proximityTrend(4, 4.4)).toBe("colder");
    expect(proximityTrend(1, 0.85)).toBe("warmer");
  });
  it("says Here under half a metre", () => {
    expect(findingLabel(0.4)).toBe("Here");
    expect(findingLabel(2)).toBe("Nearby");
    expect(findingLabel(5)).toBe("Far");
  });
});
