import type { ModelFamily, ProductImageKey } from "./protocol";

export interface HardwareFamily {
  key: string;
  title: string;
  range: string;
  image: ProductImageKey;
  /** Audio families list models from MODEL_DATABASE by family; others list fixed names. */
  modelFamily?: ModelFamily;
  models?: string[];
  transport: string;
  features: string[];
}

export const HARDWARE_FAMILIES: HardwareFamily[] = [
  {
    key: "airpods",
    title: "AirPods",
    range: "AirPods 1 – 5",
    image: "airpods-4",
    modelFamily: "airpods",
    transport: "BLE Continuity 0x07 · L2CAP 0x1001",
    features: ["Case-open pop-up", "L / R / Case battery", "In-ear auto-pause", "Stem gestures", "ANC & Conversation Awareness (ANC models)", "Find My chirp"],
  },
  {
    key: "airpods-pro",
    title: "AirPods Pro",
    range: "AirPods Pro 1 – 3",
    image: "airpods-pro",
    modelFamily: "airpods-pro",
    transport: "BLE Continuity 0x07 · L2CAP 0x1001",
    features: ["ANC · Transparency · Adaptive · Off", "Conversation Awareness", "Personalized Volume", "Head Gestures", "Ear Tip Fit Test", "MagSafe case speaker chirp"],
  },
  {
    key: "airpods-max",
    title: "AirPods Max",
    range: "AirPods Max 1 – 2",
    image: "airpods-max",
    modelFamily: "airpods-max",
    transport: "BLE Continuity 0x07 · L2CAP 0x1001",
    features: ["Smart Case pop-up", "Battery telemetry", "ANC · Transparency · Adaptive", "Digital Crown direction", "On-head auto-pause"],
  },
  {
    key: "beats",
    title: "Beats",
    range: "Solo, Studio, Fit Pro, Powerbeats",
    image: "beats-fit-pro",
    modelFamily: "beats",
    transport: "BLE Continuity 0x07 · W1 / H1 / H2",
    features: ["Home Screen pop-up", "L / R / Case battery", "ANC / Transparency switching"],
  },
  {
    key: "watch",
    title: "Apple Watch",
    range: "Series 4 – 11 · SE 1–3 · Ultra 1–3",
    image: "apple-watch",
    models: ["Series 4–10", "Series 11", "SE (1st–3rd gen)", "Ultra 1 · 2 · 3"],
    transport: "BLE GATT · ANCS · AMS · Companion Bridge",
    features: ["Android notifications on your wrist (ANCS)", "Now Playing & Crown volume (AMS)", "Heart Rate 0x180D & Activity Rings", "Watch face gallery"],
  },
  {
    key: "airtag",
    title: "AirTag",
    range: "AirTag 1 – 2",
    image: "airtag",
    models: ["AirTag (1st gen)", "AirTag 2 (U2)", "Find My network items"],
    transport: "Continuity 0x12 · GATT 0x1802 · FiRa UWB",
    features: ["RSSI proximity radar", "UWB distance & direction (Android 12+)", "Play sound on the piezo speaker"],
  },
  {
    key: "homepod",
    title: "HomePod",
    range: "HomePod & HomePod mini",
    image: "homepod",
    models: ["HomePod (1st & 2nd gen)", "HomePod mini (1st & 2nd gen)"],
    transport: "mDNS _airplay._tcp · Continuity 0x09 / 0x0B",
    features: ["Local network discovery", "Stereo pair status", "Proximity handoff detection"],
  },
];

export const PACKET_LAYOUT = [
  { byte: "0", meaning: "0x07 — Proximity Pairing type" },
  { byte: "3–4", meaning: "16-bit model ID (e.g. 0x2420)" },
  { byte: "5", meaning: "Status · bit 1 Left in ear · bit 3 Right in ear" },
  { byte: "6", meaning: "Left battery (high nibble) · Right battery (low nibble), ×10%" },
  { byte: "7", meaning: "Case battery (low nibble) · bits 4/5/6 L/R/Case charging" },
  { byte: "8", meaning: "Lid-open counter (low 3 bits)" },
];

export const OEM_SKINS = ["Pixel UI", "Samsung One UI 6–9", "OxygenOS 14–16", "Xiaomi HyperOS", "Nothing OS"];
