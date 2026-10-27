import { describe, expect, it } from "vitest";

import { DEFAULT_MANIFEST, parseManifest } from "./ota";
import {
  aapModeCommand,
  buildModelDatabase,
  cycleMode,
  encodeProximityPacket,
  formatBattery,
  isValidPsm,
  parseProximityPacket,
  shouldTriggerPopup,
  supportedModes,
  toHex,
} from "./protocol";

describe("battery display", () => {
  it("shows --% when the accessory battery is unknown (-1)", () => {
    expect(formatBattery(-1)).toBe("--%");
  });

  it("shows the real accessory percentage when known", () => {
    expect(formatBattery(80)).toBe("80%");
  });
});

describe("0x07 proximity packet parsing", () => {
  const bytes = [0x07, 0x19, 0x01, 0x24, 0x20, 0x2b, 0x87, 0x35, 0x03];

  it("reads the 16-bit model ID from bytes 3..4", () => {
    expect(parseProximityPacket(bytes, -50)?.modelId).toBe(0x2420);
  });

  it("reads left battery from the high nibble and right from the low nibble of byte 6", () => {
    const p = parseProximityPacket(bytes, -50);
    expect(p?.left).toBe(80);
    expect(p?.right).toBe(70);
  });

  it("reads case battery and charging bits from byte 7", () => {
    const p = parseProximityPacket(bytes, -50);
    expect(p?.case).toBe(50);
    expect(p?.leftCharging).toBe(true);
    expect(p?.rightCharging).toBe(true);
    expect(p?.caseCharging).toBe(false);
  });

  it("reads in-ear flags from bits 1 and 3 of byte 5", () => {
    const p = parseProximityPacket(bytes, -50);
    expect(p?.leftInEar).toBe(true);
    expect(p?.rightInEar).toBe(true);
  });

  it("reads the lid-open counter from the low 3 bits of byte 8", () => {
    expect(parseProximityPacket(bytes, -50)?.lidCounter).toBe(3);
  });

  it("maps an out-of-range battery nibble to unknown (-1)", () => {
    expect(parseProximityPacket([0x07, 0x19, 0x01, 0x24, 0x20, 0x00, 0xff, 0x0f, 0x00], -50)?.left).toBe(-1);
  });

  it("ignores non-0x07 Continuity frames", () => {
    expect(parseProximityPacket([0x10, 0x05, 0x01, 0x24, 0x20, 0, 0, 0, 0], -50)).toBeNull();
  });

  it("round-trips through the simulator encoder", () => {
    const encoded = encodeProximityPacket({
      modelId: 0x2720, leftInEar: false, rightInEar: true, left: 40, right: 100, case: 10,
      leftCharging: false, rightCharging: false, caseCharging: true, lidCounter: 5,
    });
    const p = parseProximityPacket(encoded, -40);
    expect(p).toMatchObject({ modelId: 0x2720, left: 40, right: 100, case: 10, rightInEar: true, caseCharging: true, lidCounter: 5 });
  });
});

describe("case-open pop-up trigger", () => {
  const packet = (lidCounter: number, rssi: number) =>
    parseProximityPacket(encodeProximityPacket({
      modelId: 0x2420, leftInEar: false, rightInEar: false, left: 80, right: 80, case: 50,
      leftCharging: false, rightCharging: false, caseCharging: false, lidCounter,
    }), rssi)!;

  it("fires when the lid counter changes and RSSI is above -68 dBm", () => {
    expect(shouldTriggerPopup(1, packet(2, -60))).toBe(true);
  });

  it("does not fire when the case is too far (RSSI -68 dBm or weaker)", () => {
    expect(shouldTriggerPopup(1, packet(2, -68))).toBe(false);
  });

  it("does not fire again for the same lid counter", () => {
    expect(shouldTriggerPopup(2, packet(2, -50))).toBe(false);
  });
});

describe("Quick Settings tile cycle", () => {
  it("cycles ANC → Transparency → Adaptive → Off → ANC", () => {
    expect(cycleMode("anc")).toBe("transparency");
    expect(cycleMode("transparency")).toBe("adaptive");
    expect(cycleMode("adaptive")).toBe("off");
    expect(cycleMode("off")).toBe("anc");
  });

  it("skips Adaptive on models without it (AirPods Pro 1st gen)", () => {
    const pro1 = buildModelDatabase({}).get(0x0e20)!;
    expect(cycleMode("transparency", supportedModes(pro1.caps))).toBe("off");
  });
});

describe("AAP commands", () => {
  it("encodes listening mode as 04 00 04 00 09 00 0D [01..04]", () => {
    expect(toHex(aapModeCommand("off"))).toBe("04 00 04 00 09 00 0D 01 00 00 00");
    expect(toHex(aapModeCommand("adaptive"))).toBe("04 00 04 00 09 00 0D 04 00 00 00");
  });
});

describe("OTA rule engine", () => {
  it("accepts 0x1001 as the default L2CAP PSM", () => {
    expect(isValidPsm(0x1001)).toBe(true);
  });

  it("rejects even PSMs", () => {
    expect(isValidPsm(0x1002)).toBe(false);
  });

  it("hot-registers a new model ID from the manifest", () => {
    const db = buildModelDatabase({ "0x2B20": "AirPods Pro 4" });
    expect(db.get(0x2b20)?.name).toBe("AirPods Pro 4");
    expect(db.get(0x2b20)?.family).toBe("airpods-pro");
  });

  it("rejects a manifest with a malformed model ID", () => {
    const bad = JSON.stringify({ ...DEFAULT_MANIFEST, models: { "2B20": "x" } });
    expect(parseManifest(bad).ok).toBe(false);
  });
});
