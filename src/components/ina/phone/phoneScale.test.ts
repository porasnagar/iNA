import { describe, expect, it } from "vitest";

import { PHONE_H, PHONE_W, phoneScale } from "./Phone";

describe("phoneScale", () => {
  it("fits the whole phone inside a 1366x768 laptop screen", () => {
    const s = phoneScale(1366, 768, 96);
    expect(PHONE_H * s).toBeLessThanOrEqual(768 - 96);
  });

  it("keeps the design size on tall desktop screens", () => {
    expect(phoneScale(1920, 1080, 96)).toBe(1);
  });

  it("never gets wider than a narrow screen allows", () => {
    expect(PHONE_W * phoneScale(375, 1200, 96)).toBeLessThanOrEqual(375 - 32);
  });
});
