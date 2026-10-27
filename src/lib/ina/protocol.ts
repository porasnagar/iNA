/**
 * iNA protocol core — TypeScript mirror of AppleProtocolSpec / ProximityPacketParser
 * in the Android codebase. The prototype runs every simulated BLE packet through
 * these functions so the UI behaves exactly like the native parser would.
 */

export const APPLE_COMPANY_ID = 0x004c;
export const PROXIMITY_PAIRING_TYPE = 0x07;
export const DEFAULT_L2CAP_PSM = 0x1001;
export const POPUP_RSSI_THRESHOLD = -68;

export type ListeningMode = "anc" | "transparency" | "adaptive" | "off";

export const MODE_ORDER: ListeningMode[] = ["anc", "transparency", "adaptive", "off"];

export const MODE_LABEL: Record<ListeningMode, string> = {
  anc: "Noise Cancellation",
  transparency: "Transparency",
  adaptive: "Adaptive",
  off: "Off",
};

export const MODE_SHORT: Record<ListeningMode, string> = {
  anc: "ANC",
  transparency: "Transparency",
  adaptive: "Adaptive",
  off: "Off",
};

/** AAP listening-mode value byte (04 00 04 00 09 00 0D [value] 00 00 00). */
export const MODE_AAP_VALUE: Record<ListeningMode, number> = {
  off: 0x01,
  anc: 0x02,
  transparency: 0x03,
  adaptive: 0x04,
};

export type ModelFamily = "airpods" | "airpods-pro" | "airpods-max" | "beats";
export type ProductImageKey =
  | "airpods-pro"
  | "airpods-4"
  | "airpods-max"
  | "beats-fit-pro"
  | "apple-watch"
  | "airtag"
  | "homepod";

export interface Capabilities {
  anc: boolean;
  transparency: boolean;
  adaptive: boolean;
  conversationAwareness: boolean;
  personalizedVolume: boolean;
  headGestures: boolean;
  fitTest: boolean;
  caseSpeaker: boolean;
  stemControls: boolean;
  digitalCrown: boolean;
  inEarDetection: boolean;
  hasCase: boolean;
}

export interface AppleModel {
  id: number;
  name: string;
  family: ModelFamily;
  chip: string;
  image: ProductImageKey;
  caps: Capabilities;
  /** True when the entry came from an OTA rule manifest instead of the built-in table. */
  ota?: boolean;
}

const NONE: Capabilities = {
  anc: false,
  transparency: false,
  adaptive: false,
  conversationAwareness: false,
  personalizedVolume: false,
  headGestures: false,
  fitTest: false,
  caseSpeaker: false,
  stemControls: true,
  digitalCrown: false,
  inEarDetection: true,
  hasCase: true,
};

const BASIC_BUDS = NONE;
const ANC_BUDS: Capabilities = {
  ...NONE,
  anc: true,
  transparency: true,
  adaptive: true,
  conversationAwareness: true,
  personalizedVolume: true,
  headGestures: true,
};
const PRO_1: Capabilities = { ...NONE, anc: true, transparency: true, fitTest: true };
const PRO_MODERN: Capabilities = {
  ...ANC_BUDS,
  fitTest: true,
  caseSpeaker: true,
};
const MAX_1: Capabilities = {
  ...NONE,
  anc: true,
  transparency: true,
  stemControls: false,
  digitalCrown: true,
  hasCase: false,
};
const MAX_2: Capabilities = {
  ...MAX_1,
  adaptive: true,
  conversationAwareness: true,
  personalizedVolume: true,
};
const BEATS_ANC_BUDS: Capabilities = { ...NONE, anc: true, transparency: true, fitTest: true };
const BEATS_OVEREAR_ANC: Capabilities = {
  ...NONE,
  anc: true,
  transparency: true,
  inEarDetection: false,
  hasCase: false,
};
const BEATS_OVEREAR: Capabilities = { ...NONE, inEarDetection: false, hasCase: false };

export const BUILT_IN_MODELS: AppleModel[] = [
  { id: 0x0220, name: "AirPods (1st generation)", family: "airpods", chip: "W1", image: "airpods-4", caps: BASIC_BUDS },
  { id: 0x0f20, name: "AirPods (2nd generation)", family: "airpods", chip: "H1", image: "airpods-4", caps: BASIC_BUDS },
  { id: 0x1320, name: "AirPods (3rd generation)", family: "airpods", chip: "H1", image: "airpods-4", caps: BASIC_BUDS },
  { id: 0x1920, name: "AirPods 4", family: "airpods", chip: "H2", image: "airpods-4", caps: BASIC_BUDS },
  { id: 0x1b20, name: "AirPods 4 (ANC)", family: "airpods", chip: "H2", image: "airpods-4", caps: ANC_BUDS },
  { id: 0x2720, name: "AirPods 5", family: "airpods", chip: "H3", image: "airpods-4", caps: BASIC_BUDS },
  { id: 0x2820, name: "AirPods 5 (ANC)", family: "airpods", chip: "H3", image: "airpods-4", caps: ANC_BUDS },
  { id: 0x0e20, name: "AirPods Pro", family: "airpods-pro", chip: "H1", image: "airpods-pro", caps: PRO_1 },
  { id: 0x1420, name: "AirPods Pro 2 (Lightning)", family: "airpods-pro", chip: "H2", image: "airpods-pro", caps: PRO_MODERN },
  { id: 0x2420, name: "AirPods Pro 2 (USB-C)", family: "airpods-pro", chip: "H2", image: "airpods-pro", caps: PRO_MODERN },
  { id: 0x2520, name: "AirPods Pro 3", family: "airpods-pro", chip: "H3", image: "airpods-pro", caps: PRO_MODERN },
  { id: 0x0a20, name: "AirPods Max (Lightning)", family: "airpods-max", chip: "H1", image: "airpods-max", caps: MAX_1 },
  { id: 0x1f20, name: "AirPods Max (USB-C)", family: "airpods-max", chip: "H1", image: "airpods-max", caps: MAX_1 },
  { id: 0x2920, name: "AirPods Max 2", family: "airpods-max", chip: "H3", image: "airpods-max", caps: MAX_2 },
  { id: 0x0620, name: "Beats Solo 3", family: "beats", chip: "W1", image: "beats-fit-pro", caps: BEATS_OVEREAR },
  { id: 0x0920, name: "Beats Studio 3", family: "beats", chip: "W1", image: "beats-fit-pro", caps: BEATS_OVEREAR_ANC },
  { id: 0x0b20, name: "Powerbeats Pro", family: "beats", chip: "H1", image: "beats-fit-pro", caps: BASIC_BUDS },
  { id: 0x1220, name: "Beats Fit Pro", family: "beats", chip: "H1", image: "beats-fit-pro", caps: BEATS_ANC_BUDS },
  { id: 0x1720, name: "Beats Studio Pro", family: "beats", chip: "H1", image: "beats-fit-pro", caps: BEATS_OVEREAR_ANC },
  { id: 0x2620, name: "Powerbeats Pro 2", family: "beats", chip: "H2", image: "beats-fit-pro", caps: { ...BEATS_ANC_BUDS, caseSpeaker: true } },
  { id: 0x2a20, name: "Beats Solo 4", family: "beats", chip: "H1", image: "beats-fit-pro", caps: BEATS_OVEREAR },
];

export function hexId(id: number): string {
  return "0x" + id.toString(16).toUpperCase().padStart(4, "0");
}

export function parseHexId(value: string): number | null {
  const v = value.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{1,4}$/.test(v)) return null;
  return parseInt(v, 16);
}

/** Infers capabilities for a hot-registered OTA model from its marketing name. */
export function inferModelFromName(id: number, name: string): AppleModel {
  const n = name.toLowerCase();
  if (n.includes("max")) {
    return { id, name, family: "airpods-max", chip: "H3", image: "airpods-max", caps: MAX_2, ota: true };
  }
  if (n.includes("beats")) {
    return { id, name, family: "beats", chip: "H2", image: "beats-fit-pro", caps: BEATS_ANC_BUDS, ota: true };
  }
  if (n.includes("pro")) {
    return { id, name, family: "airpods-pro", chip: "H3", image: "airpods-pro", caps: PRO_MODERN, ota: true };
  }
  const anc = n.includes("anc");
  return { id, name, family: "airpods", chip: "H3", image: "airpods-4", caps: anc ? ANC_BUDS : BASIC_BUDS, ota: true };
}

/** Merges OTA model names into the built-in table (OTA entries override built-ins by id). */
export function buildModelDatabase(otaModels: Record<string, string>): Map<number, AppleModel> {
  const db = new Map<number, AppleModel>();
  for (const m of BUILT_IN_MODELS) db.set(m.id, m);
  for (const [hex, name] of Object.entries(otaModels)) {
    const id = parseHexId(hex);
    if (id === null) continue;
    const existing = db.get(id);
    db.set(id, existing ? { ...existing, name, ota: true } : inferModelFromName(id, name));
  }
  return db;
}

export function supportedModes(caps: Capabilities): ListeningMode[] {
  return MODE_ORDER.filter((m) => {
    if (m === "off") return caps.anc || caps.transparency;
    return caps[m];
  });
}

/** Quick Settings tile cycle: ANC -> Transparency -> Adaptive -> Off, skipping unsupported modes. */
export function cycleMode(current: ListeningMode, supported: ListeningMode[] = MODE_ORDER): ListeningMode {
  if (supported.length === 0) return current;
  const order = MODE_ORDER.filter((m) => supported.includes(m));
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

/** -1 means "unknown / not connected" and must never be replaced by the phone battery. */
export function formatBattery(level: number): string {
  if (level < 0 || level > 100 || Number.isNaN(level)) return "--%";
  return `${Math.round(level)}%`;
}

export interface ProximityPacket {
  modelId: number;
  leftInEar: boolean;
  rightInEar: boolean;
  left: number;
  right: number;
  case: number;
  leftCharging: boolean;
  rightCharging: boolean;
  caseCharging: boolean;
  lidCounter: number;
  rssi: number;
}

function nibbleToBattery(n: number): number {
  return n >= 0 && n <= 10 ? n * 10 : -1;
}

function batteryToNibble(level: number): number {
  if (level < 0) return 0x0f;
  return Math.max(0, Math.min(10, Math.round(level / 10)));
}

/**
 * Parses Apple manufacturer data (company 0x004C stripped) for a 0x07 Proximity Pairing frame.
 * Returns null for any other Continuity type or a truncated frame.
 */
export function parseProximityPacket(b: Uint8Array | number[], rssi: number): ProximityPacket | null {
  if (b.length < 9 || b[0] !== PROXIMITY_PAIRING_TYPE) return null;
  const status = b[5];
  return {
    modelId: ((b[3] & 0xff) << 8) | (b[4] & 0xff),
    leftInEar: (status & 0b0000_0010) !== 0,
    rightInEar: (status & 0b0000_1000) !== 0,
    left: nibbleToBattery((b[6] >> 4) & 0x0f),
    right: nibbleToBattery(b[6] & 0x0f),
    case: nibbleToBattery(b[7] & 0x0f),
    leftCharging: (b[7] & 0b0001_0000) !== 0,
    rightCharging: (b[7] & 0b0010_0000) !== 0,
    caseCharging: (b[7] & 0b0100_0000) !== 0,
    lidCounter: b[8] & 0x07,
    rssi,
  };
}

/** Builds the 0x07 frame a real case would broadcast — used by the simulator. */
export function encodeProximityPacket(p: Omit<ProximityPacket, "rssi">): Uint8Array {
  const out = new Uint8Array(27);
  out[0] = PROXIMITY_PAIRING_TYPE;
  out[1] = 0x19;
  out[2] = 0x01;
  out[3] = (p.modelId >> 8) & 0xff;
  out[4] = p.modelId & 0xff;
  out[5] = 0x01 | (p.leftInEar ? 0b10 : 0) | (p.rightInEar ? 0b1000 : 0) | 0x20;
  out[6] = (batteryToNibble(p.left) << 4) | batteryToNibble(p.right);
  out[7] =
    batteryToNibble(p.case) |
    (p.leftCharging ? 0x10 : 0) |
    (p.rightCharging ? 0x20 : 0) |
    (p.caseCharging ? 0x40 : 0);
  out[8] = p.lidCounter & 0x07;
  // Bytes 9..26 carry the encrypted payload on real hardware; zero-filled here.
  return out;
}

/** Case-open trigger: lid counter changed and the case is physically close to the phone. */
export function shouldTriggerPopup(previousLidCounter: number | null, packet: ProximityPacket): boolean {
  if (packet.rssi <= POPUP_RSSI_THRESHOLD) return false;
  return previousLidCounter === null || previousLidCounter !== packet.lidCounter;
}

export function toHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((x) => (x & 0xff).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

export function hexToBytes(hex: string): number[] {
  return hex
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((h) => parseInt(h, 16) & 0xff);
}

export type AapSetting = "conversation_awareness" | "personalized_volume" | "loud_sound_reduction" | "head_gestures";

export const AAP_SETTING_ID: Record<AapSetting, number> = {
  conversation_awareness: 0x28,
  personalized_volume: 0x26,
  loud_sound_reduction: 0x25,
  head_gestures: 0x24,
};

/** AAP control command: 04 00 04 00 09 00 [setting] [value] 00 00 00 */
export function aapControlCommand(setting: number, value: number): number[] {
  return [0x04, 0x00, 0x04, 0x00, 0x09, 0x00, setting & 0xff, value & 0xff, 0x00, 0x00, 0x00];
}

export function aapModeCommand(mode: ListeningMode): number[] {
  return aapControlCommand(0x0d, MODE_AAP_VALUE[mode]);
}

/**
 * Bluetooth Core spec: a valid PSM has an odd least-significant octet and an even
 * most-significant octet (bit 0 of the upper byte is 0). 0x1001 is valid.
 */
export function isValidPsm(psm: number): boolean {
  if (!Number.isInteger(psm) || psm < 0x0001 || psm > 0xffff) return false;
  return (psm & 0x0001) === 1 && (psm & 0x0100) === 0;
}
