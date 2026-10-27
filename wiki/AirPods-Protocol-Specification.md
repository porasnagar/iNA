# AirPods Protocol Specification

This document details the reverse-engineered Apple BLE advertising format and Apple Accessory Protocol (AAP) byte structures used by iNA.

---

## 1. BLE Continuity Advertising Frame (`0x07` Proximity Pairing)

AirPods broadcast Bluetooth Low Energy manufacturer data frames containing:
- **Manufacturer Company ID**: `0x004C` (Apple Inc.)
- **Continuity Type**: `0x07` (Proximity Pairing)
- **Length**: `27` bytes (0x1B)

### Packet Layout & Byte Indexing

| Offset | Field | Description |
| :---: | :--- | :--- |
| `0x00` | `Company ID Low` | `0x4C` |
| `0x01` | `Company ID High` | `0x00` |
| `0x02` | `Type` | `0x07` (Proximity Frame) |
| `0x03` | `Length` | `0x19` (Remaining payload length) |
| `0x04` | `Status` | Device status flags |
| `0x05` | `Device Model & Side` | Bits 0–3: Model ID prefix. Bit 5: Active broadcasting earbud (0=Right, 1=Left). |
| `0x06` | `Battery Left / Right` | Nibble-packed: Upper 4 bits = Primary Bud (0–10=0–100%, 0xF=Disconnected). Lower 4 bits = Secondary Bud. |
| `0x07` | `Battery Case & Charging` | Upper 4 bits = Case battery (0–10=0–100%, 0xF=Disconnected). Bit 0: Left charging, Bit 1: Right charging, Bit 2: Case charging. |
| `0x08` | `Lid & In-Ear State` | Bit 3: Lid Open (`1`) / Lid Closed (`0`). Bits 1–2: In-ear presence detection bits. |
| `0x09..0x1A`| `Auth & Encrypted Payload`| Rolling pairing identifier and authentication hash. |

### Battery Value Decoding
Battery nibbles represent percentages in steps of 10%:
- `0x0` to `0xA`: `0%` to `100%` (value * 10)
- `0xF`: Disconnected / Not Available (`--%` displayed, internally represented as `-1`)

---

## 2. Apple Accessory Protocol (AAP) over L2CAP (PSM `0x1001`)

When an insecure L2CAP channel is opened to PSM `0x1001`, iNA communicates directly with the AirPods DSP controller using AAP command packets.

### Noise Control Switch Command

```text
Header: [ 0x04, 0x00, 0x04, 0x00 ]
Opcode: [ 0x01, 0x0E ]
Payload: [ Mode ]
```

Modes:
- `0x01`: **Off** (Passive isolation only)
- `0x02`: **Active Noise Cancellation (ANC)**
- `0x03`: **Transparency Mode**
- `0x04`: **Adaptive Audio** (AirPods Pro 2 & AirPods 4 with ANC)

### Conversational Awareness Command
```text
Header: [ 0x04, 0x00, 0x04, 0x00 ]
Opcode: [ 0x01, 0x1F ]
Payload: [ 0x01 (Enable) / 0x00 (Disable) ]
```

### Ear Tip Fit Test Trigger
```text
Header: [ 0x04, 0x00, 0x05, 0x00 ]
Opcode: [ 0x01, 0x22 ]
Payload: [ 0x01 (Start calibration audio sweep) ]
```

---

## 3. Cryptographically Signed Over-the-Air (OTA) Rule Manifests

When Apple releases a new accessory (e.g. AirPods Pro 3), its model ID and packet offsets may change. iNA includes a dynamic rule engine (`OtaProtocolRuleManager.kt` and `ota.ts`) that loads signed JSON rule envelopes:

```json
{
  "payload_b64": "<base64 encoded JSON model rules>",
  "sig_b64": "<base64 encoded P-256 ECDSA signature>"
}
```

The app verifies the payload using its built-in ECDSA public key before parsing. If verification fails, the payload is rejected and bundled local fallback rules remain active.
