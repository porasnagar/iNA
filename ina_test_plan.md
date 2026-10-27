# iNA — iBridgeAndroid Test Plan
**Version:** 1.0.0 | **Date:** 2026-10-25 | **Target:** Android 10–16+ (no root)

---

## 1. Test Scope

| Layer | Tool | Runner | File |
|-------|------|--------|------|
| Unit Tests | JUnit 4 + MockK + Coroutines Test | `./gradlew testDebugUnitTest` | `IBridgeAndroidUnitTest.kt` |
| Compose UI Tests | Compose Test Rule + Espresso | `./gradlew connectedDebugAndroidTest` | `IBridgeComposeUITest.kt` |
| CI Lint | Android Lint | `./gradlew lint` | Automated in CI |
| CI Build | Gradle + AGP 8.7 | `./gradlew assembleDebug` | Automated in CI |
| Release APK | Signed + R8 | `./gradlew assembleRelease` | Tags only |

---

## 2. Unit Test Cases

### 2.1 AppleProtocolSpec Constants
| TC | Test | Expected |
|----|------|----------|
| UT-001 | Apple Company ID | `0x004C` |
| UT-002 | L2CAP PSM | `0x1001` |
| UT-003 | AirPods Pro 2 in product table | `modelId=0x2014`, category=AIRPODS_PRO, ANC=true |
| UT-004 | AirPods Max has Digital Crown | `hasDigitalCrown=true` |
| UT-005 | AirTag has no ANC | `supportsAnc=false` |
| UT-006 | Hot-patch product table at runtime | Size increments by 1 |

### 2.2 ListeningMode Enum
| TC | Input | Expected |
|----|-------|----------|
| UT-007 | `fromByte(0x02)` | `ANC` |
| UT-008 | `fromByte(0x03)` | `TRANSPARENCY` |
| UT-009 | `fromByte(0x04)` | `ADAPTIVE` |
| UT-010 | `fromByte(0x99)` | `ADAPTIVE` (unknown → default) |
| UT-011 | All byte values are unique | No duplicates |

### 2.3 EarState Enum
| TC | Input | Expected |
|----|-------|----------|
| UT-012 | `fromByte(0x00)` | `IN_EAR` |
| UT-013 | `fromByte(0x01)` | `OUT_OF_EAR` |
| UT-014 | `fromByte(0x02)` | `IN_CASE` |
| UT-015 | `fromByte(0xFF)` | `OUT_OF_EAR` (unknown → default) |

### 2.4 AirPodsState Data Class
| TC | Test | Expected |
|----|------|----------|
| UT-016 | Default battery values | L=97%, R=97%, Case=88% |
| UT-017 | Default mode | `ADAPTIVE` |
| UT-018 | `copy()` is independent | Original unaffected |

### 2.5 EcosystemRepository StateFlows
| TC | Test | Expected |
|----|------|----------|
| UT-019 | `updateAirPods` changes listening mode | State updated atomically |
| UT-020 | `updateWatch` changes battery | New value visible in flow |
| UT-021 | `updateOta` changes progress | OTA percentage updated |

### 2.6 AACP Packets
| TC | Test | Expected |
|----|------|----------|
| UT-022 | Handshake packet size | 16 bytes |
| UT-023 | Notification filter packet size | 10 bytes |

### 2.7 WatchHealthState
| TC | Test | Expected |
|----|------|----------|
| UT-024 | Heart rate in valid range | 40–200 BPM |
| UT-025 | Blood oxygen in valid range | 85–100% |

---

## 3. Compose UI Test Cases (Instrumented — API 34 Emulator)

### 3.1 Bottom Navigation
| TC | Action | Expected |
|----|--------|----------|
| UI-001 | App launch | All 4 tabs visible (AirPods, HUD, My Watch, Camera) |
| UI-002 | Tap "HUD" | Navigates to HUD screen, model name shown |
| UI-003 | Tap "My Watch" | Watch screen with "Danny's Apple Watch" |
| UI-004 | Tap "Camera" | Camera pair screen with viewfinder text |

### 3.2 AirPods Settings Screen
| TC | Element | Expected |
|----|---------|----------|
| UI-005 | Model name | "Daniel's AirPods Pro" displayed |
| UI-006 | Battery | "97%" displayed |
| UI-007 | Listening mode section | "Listening Mode" label visible |
| UI-008 | Mode options | Transparency / Adaptive / Noise Cancellation |
| UI-009 | OTA row | "Silent Protocol & Firmware OTA" visible |
| UI-010 | Backcompat row | "Android 10–16 Backwards Compatibility" visible |
| UI-011 | Tap Transparency pill | State updates (no crash) |

### 3.3 HUD Screen (Dark Background)
| TC | Element | Expected |
|----|---------|----------|
| UI-012 | Volume pill | "Vol 78%" shown |
| UI-013 | Tone pill | "Tone" shown |
| UI-014 | Three circle buttons | "Listening Mode", "Conversation\nAwareness", "Spatialize Stereo" |

### 3.4 Apple Watch Screen
| TC | Element | Expected |
|----|---------|----------|
| UI-015 | Search bar | "Search Settings" placeholder |
| UI-016 | My Faces | "My Faces" header, "Flow" card |
| UI-017 | Health data | "72 BPM • 540 CAL" in row |
| UI-018 | Calling row | "Wrist Voice Calling (HFP + Wi-Fi)" |
| UI-019 | ANCS status | "ANCS Active" badge |
| UI-020 | Wi-Fi IP | "192.168.1.48" |

### 3.5 Camera Pair Screen
| TC | Element | Expected |
|----|---------|----------|
| UI-021 | Instruction text | "Align it with the viewfinder above." |
| UI-022 | Manual link | "ⓘ Pair Apple Watch Manually" |
| UI-023 | Tap manual link | Navigates back to Watch screen |

---

## 4. GitHub Actions CI Matrix

```
Push / PR → main or develop
    └── Job 1: build_and_unit_test (ubuntu-latest)
            ├── Android Lint
            ├── compileDebugKotlin
            ├── testDebugUnitTest  ← 25 unit tests
            └── assembleDebug → uploads iNA-debug-{sha}.apk

Push → main  OR  workflow_dispatch(run_ui_tests=true)
    └── Job 2: ui_tests (ubuntu-latest + KVM + AVD API 34 x86_64)
            └── connectedDebugAndroidTest  ← 23 UI tests

Push tag v*.*.* (e.g. v1.0.0)
    └── Job 3: release
            ├── assembleRelease (signed via KEYSTORE_BASE64 secret)
            ├── bundleRelease (.aab for Play Store)
            └── Creates GitHub Release with APK + AAB attached
```

---

## 5. GitHub Secrets Required for Release Job

| Secret Name | Description |
|-------------|-------------|
| `KEYSTORE_BASE64` | Base64-encoded `.jks` keystore file |
| `STORE_PASS` | Keystore store password |
| `KEY_ALIAS` | Key alias inside keystore |
| `KEY_PASS` | Key password |

Generate a debug keystore for testing:
```bash
keytool -genkeypair -v -keystore iNA_release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias iNA -storepass YOUR_STORE_PASS -keypass YOUR_KEY_PASS \
  -dname "CN=iBridge, OU=Android, O=iNA, C=IN"

# Base64-encode for GitHub secret:
base64 -w 0 iNA_release.jks
```

---

## 6. Known Issues & Mitigations

| Issue | Severity | Mitigation |
|-------|----------|------------|
| L2CAP PSM 0x1001 requires BR/EDR (not BLE) pairing | Medium | Tier 4 fallback activates automatically via GATT ATT |
| `createInsecureL2capChannel` not available below API 29 | High | `minSdk=29` enforced in `build.gradle.kts` |
| VMRuntime hidden API reflection may be blocked on MIUI/ColorOS | Medium | Tier 3 (Shizuku) + Tier 4 fallback |
| UWB ranging requires Pixel 6+ or Galaxy S22+ | Low | Feature-flagged behind `PackageManager.hasSystemFeature` |
| `WatchTelecomInCallService` requires default dialer or system grant | Medium | Graceful no-op if not granted |
| OTA manifest fetch fails on airplane mode | Low | Local cache loaded first (fallback) |

---

## 7. Running Tests Locally

```bash
# Unit tests only (fast, no device needed)
./gradlew testDebugUnitTest

# Lint
./gradlew lint

# Build debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug

# Instrumented UI tests (requires connected device or running emulator)
./gradlew connectedDebugAndroidTest

# Full check
./gradlew check
```

---

## 8. Coverage Targets

| Module | Target Coverage |
|--------|----------------|
| `AppleProtocolSpec` | 100% (constants + enums) |
| `EcosystemRepository` | 90%+ |
| `AirPodsState` / data classes | 85%+ |
| Compose screens (UI tests) | All critical paths |
| `AirPodsAacpController` | Mocked at integration level |
