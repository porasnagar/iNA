# Hardware Compatibility Matrix

iNA is engineered to provide referential fair-use interoperability for Apple and Beats hardware connected to Android 10 through 16+ devices.

---

## Supported Accessory Families

### 1. In-Ear Audio (AirPods)

| Model | Model ID | Battery (L/R/Case) | Noise Control (ANC/Trans/Adapt) | In-Ear Detection | Conversation Awareness | Fit Test |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **AirPods Pro (2nd Gen, USB-C)** | `0x14` | Yes | Yes (Full 4 Modes) | Yes | Yes | Yes |
| **AirPods Pro (2nd Gen, Lightning)**| `0x14` | Yes | Yes (Full 4 Modes) | Yes | Yes | Yes |
| **AirPods Pro (1st Gen)** | `0x0E` | Yes | Yes (ANC / Trans / Off) | Yes | No (HW Limit) | Yes |
| **AirPods 4 with ANC** | `0x1B` | Yes | Yes (Full 4 Modes) | Yes | Yes | N/A (Open) |
| **AirPods 4 (Standard)** | `0x1B` | Yes | No (HW Limit) | Yes | No | N/A (Open) |
| **AirPods (3rd Gen)** | `0x13` | Yes | No (HW Limit) | Yes | No | N/A (Open) |
| **AirPods (2nd Gen)** | `0x0F` | Yes | No (HW Limit) | Yes | No | N/A (Open) |

---

### 2. Over-Ear Audio (AirPods Max)

| Model | Model ID | Battery (Headphones) | Noise Control | Digital Crown Invert | Smart Case Detection |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **AirPods Max (USB-C)** | `0x0A` | Yes | Yes (ANC / Trans / Off) | Yes | Yes (Ultra Low Power) |
| **AirPods Max (Lightning)** | `0x0A` | Yes | Yes (ANC / Trans / Off) | Yes | Yes (Ultra Low Power) |

*Note: AirPods Max do not have an external charging case with separate battery; battery reporting reflects the headset battery.*

---

### 3. Beats Audio

| Model | Model ID | Battery Telemetry | Noise Control | In-Ear Detection | Quick Pairing |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Beats Studio Pro** | `0x17` | Yes | Yes (ANC / Trans / Off) | Yes | Yes |
| **Beats Fit Pro** | `0x10` | Yes | Yes (ANC / Trans / Off) | Yes | Yes |
| **Beats Solo 4** | `0x19` | Yes | No (HW Limit) | Yes | Yes |
| **Powerbeats Pro 2** | `0x18` | Yes | Yes (Full Modes) | Yes | Yes |

---

### 4. Smartwatches (Apple Watch)

| Model | ANCS Notifications | AMS Media Controls | GATT Heart Rate | Incoming Call Alert |
| :--- | :---: | :---: | :---: | :---: |
| **Apple Watch Ultra & Ultra 2** | Yes | Yes | Yes | Yes |
| **Apple Watch Series 7, 8, 9, 10**| Yes | Yes | Yes | Yes |
| **Apple Watch Series 4, 5, 6, SE**| Yes | Yes | Yes | Yes |

*Protocol mechanism: iNA hosts a local GATT server with the Apple Notification Center Service (ANCS) UUID `7905F431-B5CE-4E99-A40F-4B1E122D00D0` and Apple Media Service (AMS) UUID `89D3502B-0F36-433A-8EF4-C502AD55F8DC`.*

---

### 5. Trackers & Smart Home

| Model | Beacon Detection | Precision Proximity | Audible Chime Trigger | Bonjour Discovery |
| :--- | :---: | :---: | :---: | :---: |
| **AirTag** | Yes (BLE `0x12`) | Yes (RSSI Distance Curve) | Yes (Find My GATT) | N/A |
| **Find My Network Accessories** | Yes | Yes | Yes | N/A |
| **HomePod & HomePod mini** | Yes (`0x004C`) | N/A | N/A | Yes (mDNS Bonjour) |
