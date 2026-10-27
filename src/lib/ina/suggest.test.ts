import { describe, expect, it } from "vitest";

import { LOW_BATTERY_THRESHOLD, suggestNextAction, type SuggestionInput } from "./suggest";

const base: SuggestionInput = {
  caps: { anc: true, adaptive: true, fitTest: true, conversationAwareness: true, hasCase: true },
  left: 80,
  right: 70,
  leftCharging: false,
  rightCharging: false,
  leftInEar: true,
  rightInEar: true,
  mode: "adaptive",
  conversationAwareness: true,
  fitTested: true,
  pausedByEar: false,
  playing: true,
  dismissed: [],
};

describe("suggestNextAction", () => {
  it("returns nothing when everything is already set up", () => {
    expect(suggestNextAction(base)).toBeNull();
  });

  it("treats 20% as low and 21% as fine", () => {
    expect(LOW_BATTERY_THRESHOLD).toBe(20);
    expect(suggestNextAction({ ...base, right: 20 })?.title).toBe("Right AirPod at 20%");
    expect(suggestNextAction({ ...base, right: 21 })).toBeNull();
  });

  it("ignores a low bud that is charging", () => {
    expect(suggestNextAction({ ...base, left: 10, leftCharging: true })).toBeNull();
  });

  it("never treats an unknown (-1) battery as low", () => {
    expect(suggestNextAction({ ...base, left: -1, right: -1 })).toBeNull();
  });

  it("offers to turn off noise control only when it is on", () => {
    expect(suggestNextAction({ ...base, left: 12 })?.cta).toBe("Turn Off");
    expect(suggestNextAction({ ...base, left: 12, mode: "off" })?.cta).toBeNull();
  });

  it("puts low battery ahead of every other suggestion", () => {
    const s = suggestNextAction({ ...base, left: 5, mode: "off", fitTested: false, conversationAwareness: false });
    expect(s?.id).toBe("low-battery");
  });

  it("suggests the fit test only while both AirPods are in", () => {
    expect(suggestNextAction({ ...base, fitTested: false })?.id).toBe("fit-test");
    expect(suggestNextAction({ ...base, fitTested: false, rightInEar: false })?.id).not.toBe("fit-test");
  });

  it("offers Resume after ear detection paused the music", () => {
    expect(suggestNextAction({ ...base, rightInEar: false, pausedByEar: true, playing: false })?.id).toBe("resume");
  });

  it("skips dismissed suggestions and shows the next one", () => {
    const input = { ...base, mode: "off" as const, conversationAwareness: false };
    expect(suggestNextAction(input)?.id).toBe("turn-on-anc");
    expect(suggestNextAction({ ...input, dismissed: ["turn-on-anc"] })?.id).toBe("conversation-awareness");
  });

  it("uses the single battery for over-ear headphones", () => {
    const max = { ...base, caps: { ...base.caps, hasCase: false, fitTest: false }, left: 15, right: -1 };
    expect(suggestNextAction(max)?.title).toBe("Battery at 15%");
  });
});
