# 4-Tier L2CAP Architecture

Android security policy historically restricted non-system third-party applications from allocating non-standard Logical Link Control and Adaptation Protocol (L2CAP) channels over classic Bluetooth.

Apple hardware relies on an insecure L2CAP socket connected to Protocol/Service Multiplexer (PSM) `0x1001` for the Apple Accessory Protocol (AAP). Without an L2CAP channel, third-party apps can only listen to passive BLE advertisement frames and cannot command noise control switches, conversational awareness, or ear-tip fit tests.

**iNA solves this without root access** by utilizing an adaptive 4-tier fallback stack.

---

## Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      iNA L2CAP Connection Engine                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌─────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────────┐
│         Tier 1          │   │          Tier 2           │   │          Tier 3          │
│   Native Insecure L2CAP │   │ Hidden API Exemption      │   │ Direct Constructor       │
│   Android 16 QPR3+,     │   │ dalvik.system.VMRuntime   │   │ BluetoothSocket (type 3) │
│   OxygenOS 16+, OneUI 9 │   │ Android 10 through 15     │   │ Android 10 through 14    │
└─────────────────────────┘   └───────────────────────────┘   └──────────────────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │          Tier 4           │
                      │ Universal BLE GATT &      │
                      │ Continuity Frames (0x004C)│
                      │ Android 8 through 16+     │
                      └───────────────────────────┘
```

---

## Detailed Tier Implementation

### Tier 1: Native Insecure L2CAP Channel
- **Target OS**: Android 16 QPR3+, OxygenOS 16+, OneUI 9+
- **Mechanism**: Modern OEM implementations have begun exposing unprivileged L2CAP socket creation through standard platform APIs:
  ```kotlin
  device.createInsecureL2capChannel(0x1001)
  ```
- **Advantages**: 100% CTS-compliant, zero reflection overhead, natively supported by OS Bluetooth stack.

---

### Tier 2: Hidden API Exemption (VMRuntime Bypass)
- **Target OS**: Android 10, 11, 12, 13, 14, 15
- **Mechanism**: Google introduced the Hidden API blacklist (greylist/dark greylist) in Android 9. iNA uses targeted runtime double-reflection on `dalvik.system.VMRuntime` via `HiddenApiBypass`:
  ```kotlin
  // Temporarily relaxes hidden API restrictions for the iNA process
  val getRuntime = VMRuntime::class.java.getDeclaredMethod("getRuntime")
  val setExemption = VMRuntime::class.java.getDeclaredMethod(
      "setHiddenApiExemptions", 
      Array<String>::class.java
  )
  val vm = getRuntime.invoke(null)
  setExemption.invoke(vm, arrayOf("Landroid/bluetooth/BluetoothDevice;->createInsecureL2capSocket"))
  
  // Safely invokes the hidden method:
  val socket = device.javaClass
      .getMethod("createInsecureL2capSocket", Int::class.javaPrimitiveType)
      .invoke(device, 0x1001) as BluetoothSocket
  ```
- **Advantages**: Transparent to the user, does not require ADB debugging, does not require root permissions.

---

### Tier 3: Direct Socket Constructor Reflection
- **Target OS**: Android 10 through 14 (custom OEM ROMs)
- **Mechanism**: Certain OEM kernels (MIUI, ColorOS, FunTouch OS) modify or remove `createInsecureL2capSocket`. Tier 3 invokes the internal constructor of `android.bluetooth.BluetoothSocket` directly:
  ```kotlin
  // Type 3 represents TYPE_L2CAP, auth=false, encrypt=false
  val constructor = BluetoothSocket::class.java.getDeclaredConstructor(
      Int::class.javaPrimitiveType, // type
      Int::class.javaPrimitiveType, // fd
      Boolean::class.javaPrimitiveType, // auth
      Boolean::class.javaPrimitiveType, // encrypt
      BluetoothDevice::class.java, // device
      Int::class.javaPrimitiveType, // port / PSM
      ParcelUuid::class.java // uuid
  )
  constructor.isAccessible = true
  val socket = constructor.newInstance(3, -1, false, false, device, 0x1001, null)
  ```
- **Advantages**: Bypasses OEM vendor modifications on Qualcomm and MediaTek Bluetooth stacks.

---

### Tier 4: Universal BLE GATT Fallback
- **Target OS**: Android 8 through 16+ (All devices)
- **Mechanism**: If L2CAP socket allocation fails or Bluetooth permissions are restricted, iNA gracefully degrades to standard BLE scanner filtering on Apple Company ID `0x004C` (type `0x07` proximity frames and `0x12` Find My frames).
- **Functionality**: Popups, Left / Right / Case battery gauges, and in-ear presence detection remain 100% operational.
