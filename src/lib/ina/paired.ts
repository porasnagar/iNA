import { useCallback, useEffect, useState } from "react";

import { DEFAULT_GOALS, DEFAULT_HEART_THRESHOLDS, type ActivityGoals } from "./devices";

/** Paired Apple Watch / AirTag / HomePod in the simulated phone (PairedDevicesStore on Android). */
export interface PairedWatch {
  name: string;
  face: string;
  goals: ActivityGoals;
  heart: { low: number; high: number };
  mirrorNotifications: boolean;
  haptics: boolean;
  prominentHaptics: boolean;
}

export interface PairedAirTag {
  name: string;
  emoji: string;
  lostMode: boolean;
}

export interface PairedHomePod {
  name: string;
  room: string;
  stereo: boolean;
}

export interface PairedDevices {
  watch: PairedWatch | null;
  airtag: PairedAirTag | null;
  homepod: PairedHomePod | null;
}

export const NEW_WATCH: PairedWatch = {
  name: "Apple Watch Series 11",
  face: "modular",
  goals: DEFAULT_GOALS,
  heart: DEFAULT_HEART_THRESHOLDS,
  mirrorNotifications: true,
  haptics: true,
  prominentHaptics: false,
};

const KEY = "ina.paired-devices.v1";
const EMPTY: PairedDevices = { watch: null, airtag: null, homepod: null };

export function usePairedDevices() {
  const [paired, setPaired] = useState<PairedDevices>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setPaired({ ...EMPTY, ...(JSON.parse(raw) as Partial<PairedDevices>) });
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  const update = useCallback((fn: (p: PairedDevices) => PairedDevices) => {
    setPaired((p) => {
      const next = fn(p);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage full or blocked
      }
      return next;
    });
  }, []);

  return { paired, ready, update };
}
