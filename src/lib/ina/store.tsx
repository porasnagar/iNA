import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { DEFAULT_MANIFEST, REMOTE_MANIFEST, type OtaManifest } from "./ota";
import {
  AAP_SETTING_ID,
  aapControlCommand,
  aapModeCommand,
  buildModelDatabase,
  cycleMode,
  encodeProximityPacket,
  hexId,
  MODE_SHORT,
  parseProximityPacket,
  shouldTriggerPopup,
  supportedModes,
  toHex,
  type AppleModel,
  type ListeningMode,
  type ProximityPacket,
} from "./protocol";

export type PermissionKey = "bluetooth" | "overlay" | "companion" | "notifications";
export type Surface = "home" | "app";
export type AppTab = "device" | "controls" | "rules" | "settings";
export type StemAction = "noise" | "assistant" | "off";
export type LogChannel = "BLE" | "AAP" | "SYS" | "OTA" | "UI";

export interface LogEntry {
  id: number;
  time: string;
  channel: LogChannel;
  text: string;
  hex?: string;
}

export interface Accessory {
  modelId: number;
  left: number;
  right: number;
  case: number;
  leftCharging: boolean;
  rightCharging: boolean;
  caseCharging: boolean;
  leftInEar: boolean;
  rightInEar: boolean;
  lidCounter: number;
  rssi: number;
}

export interface FeatureSettings {
  autoPause: boolean;
  conversationAwareness: boolean;
  personalizedVolume: boolean;
  loudSoundReduction: boolean;
  headGestures: boolean;
  stemLeft: StemAction;
  stemRight: StemAction;
  crownReversed: boolean;
}

export type SheetStage = "info" | "pairing" | "done";
export interface SheetState {
  paired: boolean;
  stage: SheetStage;
  step: number;
  via: "overlay" | "activity" | "inline";
}

export interface CallState {
  caller: string;
  state: "ringing" | "answered" | "declined";
}

export interface SimState {
  onboarded: boolean;
  permissions: Record<PermissionKey, boolean>;
  surface: Surface;
  tab: AppTab;
  previewConnected: boolean;
  connected: boolean;
  pairedIds: number[];
  accessory: Accessory;
  lastLidCounter: number | null;
  lastPacket: ProximityPacket | null;
  mode: ListeningMode;
  settings: FeatureSettings;
  sheet: SheetState | null;
  shadeOpen: boolean;
  island: { expanded: boolean; message: string | null; nonce: number };
  media: { playing: boolean; ducked: boolean; pausedByEar: boolean };
  call: CallState | null;
  chirp: "left" | "right" | "case" | null;
  manifest: OtaManifest;
  otaSyncing: boolean;
  lastSync: string | null;
  log: LogEntry[];
}

export const PAIRING_STEPS = [
  "BluetoothDevice.createBond()",
  "CompanionDeviceManager.associate()",
  "A2DP + HFP profile connect",
  "L2CAP PSM handshake (AAP)",
];

const PERSIST_KEY = "ina-prototype-v1";

const initialState: SimState = {
  onboarded: false,
  permissions: { bluetooth: false, overlay: false, companion: false, notifications: false },
  surface: "app",
  tab: "device",
  previewConnected: false,
  connected: false,
  pairedIds: [],
  accessory: {
    modelId: 0x2420,
    left: 80,
    right: 70,
    case: 50,
    leftCharging: true,
    rightCharging: true,
    caseCharging: false,
    leftInEar: false,
    rightInEar: false,
    lidCounter: 0,
    rssi: -52,
  },
  lastLidCounter: null,
  lastPacket: null,
  mode: "anc",
  settings: {
    autoPause: true,
    conversationAwareness: true,
    personalizedVolume: false,
    loudSoundReduction: true,
    headGestures: true,
    stemLeft: "noise",
    stemRight: "noise",
    crownReversed: false,
  },
  sheet: null,
  shadeOpen: false,
  island: { expanded: false, message: null, nonce: 0 },
  media: { playing: false, ducked: false, pausedByEar: false },
  call: null,
  chirp: null,
  manifest: DEFAULT_MANIFEST,
  otaSyncing: false,
  lastSync: null,
  log: [],
};

let logId = 0;
function stamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}
function entry(channel: LogChannel, text: string, hex?: string): LogEntry {
  logId += 1;
  return { id: logId, time: stamp(), channel, text, hex };
}
function withLog(s: SimState, ...entries: LogEntry[]): SimState {
  return { ...s, log: [...entries.reverse(), ...s.log].slice(0, 80) };
}
function flash(s: SimState, message: string): SimState {
  return { ...s, island: { expanded: true, message, nonce: s.island.nonce + 1 } };
}

function useSimStore() {
  const [state, setState] = useState<SimState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted prototype state after mount (never during SSR render).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PERSIST_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SimState>;
        setState((s) => ({
          ...s,
          onboarded: saved.onboarded ?? s.onboarded,
          permissions: { ...s.permissions, ...saved.permissions },
          pairedIds: saved.pairedIds ?? s.pairedIds,
          settings: { ...s.settings, ...saved.settings },
          manifest: saved.manifest ?? s.manifest,
          lastSync: saved.lastSync ?? s.lastSync,
          accessory: saved.accessory ? { ...s.accessory, ...saved.accessory, leftInEar: false, rightInEar: false } : s.accessory,
        }));
      }
    } catch {
      // ignore corrupt storage
    }
    setState((s) => withLog(s, entry("SYS", "IBridgeForegroundService started (connectedDevice)"), entry("BLE", "BluetoothLeScanner filter: manufacturer 0x004C, type 0x07")));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { onboarded, permissions, pairedIds, settings, manifest, lastSync, accessory } = state;
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ onboarded, permissions, pairedIds, settings, manifest, lastSync, accessory }),
    );
  }, [hydrated, state]);

  const models = useMemo(() => buildModelDatabase(state.manifest.models), [state.manifest.models]);
  const model: AppleModel | undefined = models.get(state.accessory.modelId);
  const isConnected = state.connected || state.previewConnected;
  const modes = model ? supportedModes(model.caps) : [];

  // Auto-collapse the live island after a transient message.
  const islandNonce = state.island.nonce;
  useEffect(() => {
    if (!state.island.message) return;
    const t = window.setTimeout(() => {
      setState((s) => (s.island.nonce === islandNonce ? { ...s, island: { ...s.island, expanded: false, message: null } } : s));
    }, 2600);
    return () => window.clearTimeout(t);
  }, [islandNonce, state.island.message]);

  const duckTimer = useRef<number | null>(null);

  const actions = useMemo(() => {
    const set = setState;
    return {
      grantPermission(key: PermissionKey) {
        set((s) => withLog({ ...s, permissions: { ...s.permissions, [key]: true } }, entry("SYS", `Permission granted: ${key}`)));
      },
      completeOnboarding() {
        set((s) => withLog({ ...s, onboarded: true, tab: "device" }, entry("SYS", "Onboarding complete")));
      },
      resetOnboarding() {
        set((s) => ({
          ...s,
          onboarded: false,
          permissions: initialState.permissions,
          surface: "app",
          sheet: null,
        }));
      },
      setSurface(surface: Surface) {
        set((s) => ({ ...s, surface, shadeOpen: false }));
      },
      setTab(tab: AppTab) {
        set((s) => ({ ...s, tab }));
      },
      setPreviewConnected(on: boolean) {
        set((s) =>
          withLog(
            { ...s, previewConnected: on, tab: on ? s.tab : "device" },
            entry("UI", on ? "Preview Connected UI enabled (simulated accessory values)" : "Preview Connected UI disabled"),
          ),
        );
      },
      updateAccessory(patch: Partial<Accessory>) {
        set((s) => ({ ...s, accessory: { ...s.accessory, ...patch } }));
      },
      setInEar(side: "left" | "right", inEar: boolean) {
        set((s) => {
          const accessory = { ...s.accessory, [side === "left" ? "leftInEar" : "rightInEar"]: inEar };
          let next: SimState = { ...s, accessory };
          const connected = s.connected || s.previewConnected;
          const label = side === "left" ? "Left" : "Right";
          next = withLog(next, entry("BLE", `In-ear optical: ${label} ${inEar ? "inserted" : "removed"}`));
          if (connected && s.settings.autoPause) {
            if (!inEar && s.media.playing) {
              next = withLog(
                flash({ ...next, media: { ...next.media, playing: false, pausedByEar: true } }, `Paused · ${label} removed`),
                entry("SYS", "AudioManager: dispatch KEYCODE_MEDIA_PAUSE (auto-pause)"),
              );
            } else if (inEar && s.media.pausedByEar && accessory.leftInEar && accessory.rightInEar) {
              next = withLog(
                flash({ ...next, media: { ...next.media, playing: true, pausedByEar: false } }, "Resumed · both in ear"),
                entry("SYS", "AudioManager: dispatch KEYCODE_MEDIA_PLAY (auto-resume)"),
              );
            }
          }
          return next;
        });
      },
      openCase() {
        set((s) => {
          const lidCounter = (s.accessory.lidCounter + 1) & 0x07;
          const accessory = { ...s.accessory, lidCounter };
          const bytes = encodeProximityPacket(accessory);
          const packet = parseProximityPacket(bytes, accessory.rssi);
          let next: SimState = withLog(
            { ...s, accessory, lastPacket: packet },
            entry("BLE", `ScanResult 0x004C type 0x07 · RSSI ${accessory.rssi} dBm`, toHex(bytes.slice(0, 9))),
          );
          if (!packet) return next;
          if (!shouldTriggerPopup(s.lastLidCounter, packet)) {
            return withLog(next, entry("BLE", `Ignored: RSSI ${packet.rssi} dBm ≤ -68 dBm threshold`));
          }
          const paired = s.pairedIds.includes(packet.modelId);
          const via: SheetState["via"] =
            s.surface === "app" ? "inline" : s.permissions.overlay ? "overlay" : "activity";
          const viaText =
            via === "inline"
              ? "AppleCaseOpenPopupSheet (in-app)"
              : via === "overlay"
                ? "WindowManager TYPE_APPLICATION_OVERLAY"
                : "CasePopupOverlayActivity (overlay permission missing)";
          next = {
            ...next,
            lastLidCounter: packet.lidCounter,
            shadeOpen: false,
            sheet: { paired, stage: paired && (s.connected || s.previewConnected) ? "info" : "info", step: 0, via },
          };
          return withLog(
            next,
            entry("BLE", `lidOpenCounter ${s.lastLidCounter ?? "–"} → ${packet.lidCounter} · model ${hexId(packet.modelId)}`),
            entry("SYS", `Show proximity sheet via ${viaText}`),
          );
        });
      },
      dismissSheet() {
        set((s) => ({ ...s, sheet: null }));
      },
      startPairing() {
        set((s) => (s.sheet ? withLog({ ...s, sheet: { ...s.sheet, stage: "pairing", step: 0 } }, entry("SYS", "Connect tapped")) : s));
      },
      advancePairing() {
        set((s) => {
          if (!s.sheet || s.sheet.stage !== "pairing") return s;
          const label = PAIRING_STEPS[s.sheet.step];
          const psm = s.manifest.l2cap_psm;
          const text = s.sheet.step === 3 ? `L2CAP PSM ${psm} open · AAP handshake OK` : `${label} ✓`;
          const step = s.sheet.step + 1;
          if (step >= PAIRING_STEPS.length) {
            return withLog(
              {
                ...s,
                connected: true,
                pairedIds: s.pairedIds.includes(s.accessory.modelId) ? s.pairedIds : [...s.pairedIds, s.accessory.modelId],
                sheet: { ...s.sheet, stage: "done", step, paired: true },
                tab: "device",
              },
              entry("AAP", text, "00 00 04 00 01 00 02 00 00 00 00 00 00 00 00 00"),
            );
          }
          return withLog({ ...s, sheet: { ...s.sheet, step } }, entry("SYS", text));
        });
      },
      connectPaired() {
        set((s) =>
          withLog(
            flash({ ...s, connected: true, sheet: s.sheet ? { ...s.sheet, stage: "done" } : null }, "Connected"),
            entry("SYS", "ACL connected · A2DP/HFP active"),
            entry("AAP", `L2CAP PSM ${s.manifest.l2cap_psm} open · AAP handshake OK`, "00 00 04 00 01 00 02 00 00 00 00 00 00 00 00 00"),
          ),
        );
      },
      disconnect() {
        set((s) =>
          withLog(
            { ...s, connected: false, previewConnected: false, media: { ...s.media, playing: false }, call: null, tab: "device" },
            entry("SYS", "Disconnected · battery values cleared to --%"),
          ),
        );
      },
      forgetPairings() {
        set((s) => withLog({ ...s, pairedIds: [], connected: false }, entry("SYS", "Bond removed for all Apple accessories")));
      },
      setMode(mode: ListeningMode, source: string) {
        set((s) =>
          withLog(
            flash({ ...s, mode }, MODE_SHORT[mode]),
            entry("AAP", `Listening mode → ${MODE_SHORT[mode]} (${source})`, toHex(aapModeCommand(mode))),
          ),
        );
      },
      cycleFromTile() {
        set((s) => {
          const m = buildModelDatabase(s.manifest.models).get(s.accessory.modelId);
          const supported = m ? supportedModes(m.caps) : [];
          if (!(s.connected || s.previewConnected) || supported.length === 0) {
            return withLog(s, entry("SYS", "Tile STATE_UNAVAILABLE · no ANC-capable accessory connected"));
          }
          const mode = cycleMode(s.mode, supported);
          return withLog(
            flash({ ...s, mode }, MODE_SHORT[mode]),
            entry("AAP", `InaQuickSettingsTileService.onClick → ${MODE_SHORT[mode]}`, toHex(aapModeCommand(mode))),
          );
        });
      },
      setSetting<K extends keyof FeatureSettings>(key: K, value: FeatureSettings[K]) {
        set((s) => {
          const next = { ...s, settings: { ...s.settings, [key]: value } };
          const aapKey: Partial<Record<keyof FeatureSettings, keyof typeof AAP_SETTING_ID>> = {
            conversationAwareness: "conversation_awareness",
            personalizedVolume: "personalized_volume",
            loudSoundReduction: "loud_sound_reduction",
            headGestures: "head_gestures",
          };
          const k = aapKey[key];
          if (k && typeof value === "boolean") {
            return withLog(next, entry("AAP", `${k} → ${value ? "on" : "off"}`, toHex(aapControlCommand(AAP_SETTING_ID[k], value ? 1 : 2))));
          }
          if (key === "stemLeft" || key === "stemRight") {
            const v = value === "noise" ? 0x05 : value === "assistant" ? 0x01 : 0x00;
            return withLog(next, entry("AAP", `${key === "stemLeft" ? "Left" : "Right"} stem long-press → ${String(value)}`, toHex(aapControlCommand(0x16, v))));
          }
          if (key === "crownReversed") {
            return withLog(next, entry("AAP", `Digital Crown direction → ${value ? "front to back" : "back to front"}`, toHex(aapControlCommand(0x1c, value ? 2 : 1))));
          }
          return withLog(next, entry("SYS", `${String(key)} → ${String(value)}`));
        });
      },
      toggleMedia() {
        set((s) => withLog({ ...s, media: { ...s.media, playing: !s.media.playing, pausedByEar: false } }, entry("SYS", s.media.playing ? "MediaSession paused" : "MediaSession playing")));
      },
      speak() {
        set((s) => {
          if (!(s.connected || s.previewConnected) || !s.settings.conversationAwareness) {
            return withLog(s, entry("SYS", "Speech detected · Conversation Awareness is off"));
          }
          return withLog(
            flash({ ...s, media: { ...s.media, ducked: true } }, "Conversation · volume lowered"),
            entry("AAP", "Voice accelerometer: speech start (0x4B)", "04 00 04 00 4B 00 02 00 01 01"),
          );
        });
        if (duckTimer.current) window.clearTimeout(duckTimer.current);
        duckTimer.current = window.setTimeout(() => {
          set((s) => (s.media.ducked ? withLog({ ...s, media: { ...s.media, ducked: false } }, entry("AAP", "Speech end · volume restored")) : s));
        }, 4000);
      },
      incomingCall() {
        set((s) => withLog({ ...s, call: { caller: "Maya Chen", state: "ringing" } }, entry("SYS", "TelecomManager: incoming call")));
      },
      headGesture(kind: "nod" | "shake") {
        set((s) => {
          if (!s.call || s.call.state !== "ringing") return s;
          if (!s.settings.headGestures) return withLog(s, entry("SYS", "Head gesture ignored · Head Gestures off"));
          const answered = kind === "nod";
          return withLog(
            flash({ ...s, call: { ...s.call, state: answered ? "answered" : "declined" } }, answered ? "Call answered · nod" : "Call declined · shake"),
            entry("AAP", `IMU head gesture: ${answered ? "nod (yes)" : "shake (no)"}`, answered ? "04 00 04 00 17 00 01" : "04 00 04 00 17 00 02"),
            entry("SYS", answered ? "TelecomManager.acceptRingingCall()" : "TelecomManager.endCall()"),
          );
        });
      },
      endCall() {
        set((s) => ({ ...s, call: null }));
      },
      setChirp(target: SimState["chirp"]) {
        set((s) =>
          withLog(
            { ...s, chirp: target },
            entry("AAP", target ? `Find My chirp → ${target}` : "Find My chirp stopped", target ? toHex(aapControlCommand(0x40, target === "left" ? 1 : target === "right" ? 2 : 3)) : undefined),
          ),
        );
      },
      setShade(open: boolean) {
        set((s) => ({ ...s, shadeOpen: open }));
      },
      setIslandExpanded(expanded: boolean) {
        set((s) => ({ ...s, island: { ...s.island, expanded, message: null } }));
      },
      applyManifest(manifest: OtaManifest, reason: string) {
        set((s) =>
          withLog(
            { ...s, manifest },
            entry("OTA", `Rules applied (${reason}) · v${manifest.version} · ${Object.keys(manifest.models).length} OTA models · PSM ${manifest.l2cap_psm}`),
          ),
        );
      },
      async syncOta() {
        set((s) => withLog({ ...s, otaSyncing: true }, entry("OTA", "GET https://rules.ibridge.dev/v1/manifest.json")));
        await new Promise((r) => window.setTimeout(r, 1400));
        set((s) => {
          const merged: OtaManifest = {
            ...REMOTE_MANIFEST,
            l2cap_psm: s.manifest.l2cap_psm,
            models: { ...REMOTE_MANIFEST.models, ...s.manifest.models },
          };
          return withLog(
            { ...s, otaSyncing: false, manifest: merged, lastSync: new Date().toISOString() },
            entry("OTA", `Signature verified (${REMOTE_MANIFEST.signature})`),
            entry("OTA", `Hot-reloaded v${merged.version} into AppleProtocolSpec.MODEL_DATABASE`),
          );
        });
      },
      log(channel: LogChannel, text: string, hex?: string) {
        set((s) => withLog(s, entry(channel, text, hex)));
      },
      clearLog() {
        set((s) => ({ ...s, log: [] }));
      },
    };
  }, []);

  const displayBattery = useCallback(
    (side: "left" | "right" | "case") => (isConnected ? state.accessory[side] : -1),
    [isConnected, state.accessory],
  );

  return { state, actions, models, model, modes, isConnected, displayBattery, hydrated };
}

type Store = ReturnType<typeof useSimStore>;
const StoreContext = createContext<Store | null>(null);

export function SimProvider({ children }: { children: ReactNode }) {
  const store = useSimStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useSim() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSim must be used inside <SimProvider>");
  return ctx;
}
