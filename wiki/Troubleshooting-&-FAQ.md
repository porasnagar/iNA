# Troubleshooting & Frequently Asked Questions (FAQ)

---

## Frequently Asked Questions

### Q: Does iNA require root access or Magisk?
**No.** iNA operates 100% within user-space Android permissions. It does not touch system partitions, does not require an unlocked bootloader, and does not require Magisk or KernelSU modules.

### Q: Why do my battery percentages show `--%`?
Disconnected battery values are strictly represented as `--%` (internally `-1`). iNA **never** fabricates or estimates battery percentages. As soon as the case lid opens or the buds are placed in-ear, live hardware telemetry updates the percentage.

### Q: Why is a foreground service notification shown?
Android 12+ strictly throttles or kills background BLE scanning after several seconds if no foreground service is active. The persistent status notification keeps the Bluetooth scanning engine alive so that proximity popups appear the moment you open your AirPods case.

---

## Troubleshooting Guide

### 1. Proximity Pop-Up Not Appearing
- **Check Overlay Permission**: Ensure "Appear on top" / "Draw over other apps" is enabled in **Settings → Apps → iNA → Appear on top**.
- **Check Bluetooth Permissions**: On Android 12+, ensure **Nearby devices** permission is granted.
- **Location Permission (Android 10 & 11)**: Ensure Location is set to "Allow all the time", as required by Google on older Android versions for Bluetooth LE beacons.

### 2. OEM Battery Killers & Background Restrictions
Certain Android manufacturers (Samsung, Xiaomi, OnePlus, Vivo) aggressively kill background services to save battery:
- **Samsung OneUI**: Go to **Settings → Apps → iNA → Battery → Unrestricted**.
- **Xiaomi MIUI / HyperOS**: Go to **App Info → Battery Saver → No restrictions**, and enable **Autostart**.
- **OnePlus / Oppo / Realme (ColorOS / OxygenOS)**: Go to **App Info → Battery usage → Allow background activity** and **Allow auto-launch**.

### 3. Noise Cancellation Toggles Not Responding
- Verify that your AirPods are paired via classic Android Bluetooth in **Settings → Connected Devices**.
- If your device runs Android 10–14, verify that hidden API exemptions are functioning (check the live logs in the app's Developer view).
