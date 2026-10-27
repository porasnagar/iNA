import { z } from "zod";

import { aapControlCommand, aapModeCommand, toHex } from "./protocol";

const hexBytes = z
  .string()
  .regex(/^([0-9A-Fa-f]{2})( [0-9A-Fa-f]{2})*$/, "Opcode must be space-separated hex bytes");

export const otaManifestSchema = z.object({
  version: z.string().min(1),
  issued_at: z.string().min(1),
  l2cap_psm: z.string().regex(/^0x[0-9A-Fa-f]{1,4}$/, "PSM must look like 0x1001"),
  opcodes: z.object({
    anc_off: hexBytes,
    anc_on: hexBytes,
    transparency: hexBytes,
    adaptive: hexBytes,
    conversation_awareness: hexBytes,
    personalized_volume: hexBytes,
  }),
  models: z.record(z.string().regex(/^0x[0-9A-Fa-f]{4}$/, "Model IDs look like 0x2720"), z.string().min(1)),
  signature: z.string().min(1),
});

export type OtaManifest = z.infer<typeof otaManifestSchema>;

export const DEFAULT_MANIFEST: OtaManifest = {
  version: "2026.10.3",
  issued_at: "2026-10-20T09:00:00Z",
  l2cap_psm: "0x1001",
  opcodes: {
    anc_off: toHex(aapModeCommand("off")),
    anc_on: toHex(aapModeCommand("anc")),
    transparency: toHex(aapModeCommand("transparency")),
    adaptive: toHex(aapModeCommand("adaptive")),
    conversation_awareness: toHex(aapControlCommand(0x28, 0x01)),
    personalized_volume: toHex(aapControlCommand(0x26, 0x01)),
  },
  models: {
    "0x2720": "AirPods 5",
    "0x2820": "AirPods 5 (ANC)",
    "0x2520": "AirPods Pro 3",
    "0x2920": "AirPods Max 2",
  },
  signature: "ed25519:9f3c…a71e",
};

/** Newer manifest returned by "Sync OTA Rules" in the prototype (offline hot-reload source). */
export const REMOTE_MANIFEST: OtaManifest = {
  ...DEFAULT_MANIFEST,
  version: "2026.10.4",
  issued_at: "2026-10-26T18:30:00Z",
  models: {
    ...DEFAULT_MANIFEST.models,
    "0x2A20": "Beats Solo 4",
  },
  signature: "ed25519:4b07…c2d9",
};

export function parseManifest(json: string): { ok: true; manifest: OtaManifest } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
  const result = otaManifestSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, error: issue ? `${issue.path.join(".") || "manifest"}: ${issue.message}` : "Invalid manifest" };
  }
  return { ok: true, manifest: result.data };
}
