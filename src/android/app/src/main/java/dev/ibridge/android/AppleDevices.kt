@file:Suppress("FunctionName")

package dev.ibridge.android

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import android.view.KeyEvent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Speaker
import androidx.compose.material.icons.rounded.Watch
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.Locale
import java.util.UUID
import kotlin.math.pow
import kotlin.math.roundToInt

/* ═══════════════════════════════════════════════════════════════════════════
 * OTHER APPLE DEVICES — Apple Watch, AirTag, HomePod
 *
 * What runs natively (no root, public APIs only):
 *  • Apple Watch — Bluetooth LE GATT client for the standard Heart Rate (0x180D) and Battery
 *    (0x180F) services a Watch exposes while broadcasting heart rate, plus the ANCS
 *    notification bridge in InaNotificationListener.
 *  • AirTag — Find My (0x004C / 0x12) advertisement scanner with RSSI distance + warmer/colder
 *    finding; Play Sound over the non-owner sound characteristic (only for AirTags that are
 *    separated from their owner — Apple restricts the owner's sound to Find My).
 *  • HomePod — mDNS / Bonjour discovery of _airplay._tcp speakers on the current Wi-Fi.
 *  Playback and volume cards drive this phone's media session and STREAM_MUSIC volume.
 * ═══════════════════════════════════════════════════════════════════════════ */

enum class OtherDeviceKind(val title: String, val detail: String, val art: ProductArtKey, val chip: String, val icon: ImageVector) {
    WATCH("Apple Watch", "Notifications, heart rate and media", ProductArtKey.APPLE_WATCH, "GATT · ANCS", Icons.Rounded.Watch),
    AIRTAG("AirTag", "Find, ring and track distance", ProductArtKey.AIRTAG, "0x12 · Find My", Icons.Rounded.MyLocation),
    HOMEPOD("HomePod", "Discover, play and volume", ProductArtKey.HOMEPOD, "mDNS · AirPlay", Icons.Rounded.Speaker),
}

private const val PERMISSION_HINT = "Allow Nearby devices in Settings › Permissions."

/* ---------- Apple Watch: GATT heart rate + battery ---------- */

@Immutable
data class WatchState(
    val scanning: Boolean = false,
    val connected: Boolean = false,
    val name: String? = null,
    val address: String? = null,
    /** -1 = unknown → renders "--%". */
    val battery: Int = -1,
    /** -1 = no reading yet. */
    val heartRate: Int = -1,
    val error: String? = null,
)

@SuppressLint("MissingPermission")
class WatchLink(private val context: Context) {
    private val _state = MutableStateFlow(WatchState())
    val state: StateFlow<WatchState> = _state.asStateFlow()

    private val adapter: BluetoothAdapter? get() = context.getSystemService(BluetoothManager::class.java)?.adapter
    private val handler = Handler(Looper.getMainLooper())
    private var gatt: BluetoothGatt? = null

    private val timeout = Runnable {
        if (!_state.value.connected) {
            stopScan()
            _state.update { it.copy(error = "No heart-rate broadcast found. Start a workout with heart-rate broadcasting on your Watch, then try again.") }
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            if (gatt != null) return
            stopScan()
            connect(result.device, result.scanRecord?.deviceName)
        }

        override fun onScanFailed(errorCode: Int) {
            _state.update { it.copy(scanning = false, error = "Bluetooth scan failed ($errorCode)") }
        }
    }

    fun start() {
        if (_state.value.scanning || gatt != null) return
        val scanner = adapter?.bluetoothLeScanner ?: run {
            _state.value = WatchState(error = "Turn on Bluetooth to find your Watch.")
            return
        }
        val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(HEART_RATE_SERVICE)).build()
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        runCatching { scanner.startScan(listOf(filter), settings, scanCallback) }
            .onSuccess {
                _state.value = WatchState(scanning = true)
                handler.postDelayed(timeout, 20_000)
            }
            .onFailure { _state.value = WatchState(error = PERMISSION_HINT) }
    }

    fun stop() {
        handler.removeCallbacks(timeout)
        stopScan()
        runCatching { gatt?.disconnect(); gatt?.close() }
        gatt = null
        _state.value = WatchState()
    }

    private fun stopScan() {
        runCatching { adapter?.bluetoothLeScanner?.stopScan(scanCallback) }
        _state.update { it.copy(scanning = false) }
    }

    private fun connect(device: BluetoothDevice, advertisedName: String?) {
        handler.removeCallbacks(timeout)
        val name = advertisedName ?: runCatching { device.name }.getOrNull() ?: "Apple Watch"
        _state.update { it.copy(name = name, address = device.address, error = null) }
        gatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    _state.update { it.copy(connected = true) }
                    g.discoverServices()
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    g.close()
                    if (gatt === g) gatt = null
                    _state.update { it.copy(connected = false, heartRate = -1, battery = -1, error = "Watch disconnected.") }
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            val hr = g.getService(HEART_RATE_SERVICE)?.getCharacteristic(HEART_RATE_MEASUREMENT)
            val cccd = hr?.getDescriptor(CCCD)
            if (hr == null || cccd == null) {
                readBattery(g)
                return
            }
            g.setCharacteristicNotification(hr, true)
            writeDescriptor(g, cccd, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
        }

        // GATT is one-operation-at-a-time: read battery only after the CCCD write lands.
        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) = readBattery(g)

        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) = handle(c, value)

        @Deprecated("Called below Android 13")
        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
            c.value?.let { handle(c, it) }
        }

        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray, status: Int) = handle(c, value)

        @Deprecated("Called below Android 13")
        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
            c.value?.let { handle(c, it) }
        }
    }

    private fun readBattery(g: BluetoothGatt) {
        g.getService(BATTERY_SERVICE)?.getCharacteristic(BATTERY_LEVEL)?.let { g.readCharacteristic(it) }
    }

    private fun handle(c: BluetoothGattCharacteristic, value: ByteArray) {
        when (c.uuid) {
            HEART_RATE_MEASUREMENT -> parseHeartRate(value)?.let { bpm -> _state.update { it.copy(heartRate = bpm) } }
            BATTERY_LEVEL -> value.firstOrNull()?.let { b ->
                val level = (b.toInt() and 0xFF).takeIf { it in 0..100 } ?: -1
                _state.update { it.copy(battery = level) }
            }
        }
    }

    companion object {
        val HEART_RATE_SERVICE: UUID = UUID.fromString("0000180D-0000-1000-8000-00805F9B34FB")
        val HEART_RATE_MEASUREMENT: UUID = UUID.fromString("00002A37-0000-1000-8000-00805F9B34FB")
        val BATTERY_SERVICE: UUID = UUID.fromString("0000180F-0000-1000-8000-00805F9B34FB")
        val BATTERY_LEVEL: UUID = UUID.fromString("00002A19-0000-1000-8000-00805F9B34FB")
        val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805F9B34FB")

        /** Heart Rate Measurement 0x2A37: flags bit 0 selects UINT8 or UINT16 BPM. */
        fun parseHeartRate(v: ByteArray): Int? {
            if (v.size < 2) return null
            val uint16 = (v[0].toInt() and 0x01) != 0
            return when {
                !uint16 -> v[1].toInt() and 0xFF
                v.size >= 3 -> (v[1].toInt() and 0xFF) or ((v[2].toInt() and 0xFF) shl 8)
                else -> null
            }
        }
    }
}

@SuppressLint("MissingPermission")
@Suppress("DEPRECATION")
private fun writeDescriptor(g: BluetoothGatt, d: BluetoothGattDescriptor, value: ByteArray) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        g.writeDescriptor(d, value)
    } else {
        d.value = value
        g.writeDescriptor(d)
    }
}

@SuppressLint("MissingPermission")
@Suppress("DEPRECATION")
private fun writeCharacteristic(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        g.writeCharacteristic(c, value, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
    } else {
        c.value = value
        c.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        g.writeCharacteristic(c)
    }
}

/* ---------- AirTag: Find My advertisement scanner ---------- */

/** Parsed Apple Find My (Offline Finding) advertisement, manufacturer data type 0x12. */
data class FindMyAdvertisement(val separated: Boolean, val deviceType: Int, val batteryPercent: Int) {
    companion object {
        const val TYPE_FIND_MY = 0x12
        const val TYPE_AIRTAG = 1
        private const val TX_POWER_1M = -60.0
        private const val PATH_LOSS = 2.2

        /** [data] = ScanRecord.getManufacturerSpecificData(0x004C). */
        fun parse(data: ByteArray?): FindMyAdvertisement? {
            if (data == null || data.size < 3) return null
            if ((data[0].toInt() and 0xFF) != TYPE_FIND_MY) return null
            val length = data[1].toInt() and 0xFF
            val status = data[2].toInt() and 0xFF
            // Full 25-byte key payload = separated from owner; 2-byte payload = near owner.
            val separated = length == 0x19
            val battery = when ((status shr 6) and 0x03) {
                0 -> 100
                1 -> 60
                2 -> 25
                else -> 10
            }
            return FindMyAdvertisement(separated, (status shr 4) and 0x03, if (separated) battery else -1)
        }

        /** Log-distance path-loss estimate from a smoothed RSSI. */
        fun distanceMeters(rssi: Double): Double = 10.0.pow((TX_POWER_1M - rssi) / (10 * PATH_LOSS)).coerceIn(0.1, 60.0)
    }
}

enum class FindTrend(val label: String) { STEADY("Hold steady"), CLOSER("Getting closer"), FARTHER("Moving away") }

@Immutable
data class AirTagState(
    val scanning: Boolean = false,
    val found: Boolean = false,
    val address: String? = null,
    val rssi: Int = Int.MIN_VALUE,
    val distanceMeters: Double = -1.0,
    val separated: Boolean = false,
    /** -1 unless the AirTag advertises its battery (separated mode). */
    val battery: Int = -1,
    val trend: FindTrend = FindTrend.STEADY,
    val ringing: Boolean = false,
    val error: String? = null,
)

@SuppressLint("MissingPermission")
class AirTagFinder(private val context: Context) {
    private val _state = MutableStateFlow(AirTagState())
    val state: StateFlow<AirTagState> = _state.asStateFlow()

    private val adapter: BluetoothAdapter? get() = context.getSystemService(BluetoothManager::class.java)?.adapter
    private val handler = Handler(Looper.getMainLooper())
    private var smoothed: Double? = null

    private val notFound = Runnable {
        if (!_state.value.found) _state.update { it.copy(error = "No AirTag nearby yet. Keep this screen open and move closer.") }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) = onAdvert(result)
        override fun onBatchScanResults(results: MutableList<ScanResult>) = results.forEach(::onAdvert)
        override fun onScanFailed(errorCode: Int) {
            _state.update { it.copy(scanning = false, error = "Bluetooth scan failed ($errorCode)") }
        }
    }

    fun start() {
        if (_state.value.scanning) return
        val scanner = adapter?.bluetoothLeScanner ?: run {
            _state.value = AirTagState(error = "Turn on Bluetooth to find AirTags.")
            return
        }
        val filter = ScanFilter.Builder()
            .setManufacturerData(AppleProtocolSpec.APPLE_COMPANY_ID, byteArrayOf(FindMyAdvertisement.TYPE_FIND_MY.toByte()), byteArrayOf(0xFF.toByte()))
            .build()
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        smoothed = null
        runCatching { scanner.startScan(listOf(filter), settings, scanCallback) }
            .onSuccess {
                _state.value = AirTagState(scanning = true)
                handler.postDelayed(notFound, 15_000)
            }
            .onFailure { _state.value = AirTagState(error = PERMISSION_HINT) }
    }

    fun stop() {
        handler.removeCallbacksAndMessages(null)
        runCatching { adapter?.bluetoothLeScanner?.stopScan(scanCallback) }
        _state.value = AirTagState()
    }

    private fun onAdvert(r: ScanResult) {
        val ad = FindMyAdvertisement.parse(r.scanRecord?.getManufacturerSpecificData(AppleProtocolSpec.APPLE_COMPANY_ID)) ?: return
        if (ad.deviceType != FindMyAdvertisement.TYPE_AIRTAG) return
        val current = _state.value
        val address = r.device.address
        // Stay locked to one tag unless another is clearly stronger.
        if (current.address != null && current.address != address && r.rssi < current.rssi + 10) return
        val previous = smoothed.takeIf { current.address == address }
        val ema = previous?.let { it + 0.25 * (r.rssi - it) } ?: r.rssi.toDouble()
        smoothed = ema
        val trend = when {
            previous == null -> FindTrend.STEADY
            ema > previous + 0.6 -> FindTrend.CLOSER
            ema < previous - 0.6 -> FindTrend.FARTHER
            else -> FindTrend.STEADY
        }
        _state.update {
            it.copy(
                found = true, address = address, rssi = r.rssi, distanceMeters = FindMyAdvertisement.distanceMeters(ema),
                separated = ad.separated, battery = ad.batteryPercent, trend = trend, error = null,
            )
        }
    }

    /** Non-owner Play Sound: only AirTags separated from their owner accept it. */
    fun playSound() {
        val s = _state.value
        val address = s.address ?: return
        if (!s.separated) {
            _state.update { it.copy(error = "This AirTag is with its owner. Apple only lets the owner ring it from Find My.") }
            return
        }
        val device = adapter?.getRemoteDevice(address) ?: return
        _state.update { it.copy(ringing = true, error = null) }
        runCatching {
            device.connectGatt(context, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        g.discoverServices()
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        g.close()
                        _state.update { it.copy(ringing = false) }
                    }
                }

                override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
                    val c = g.getService(SOUND_SERVICE)?.getCharacteristic(SOUND_CHARACTERISTIC)
                    if (c == null) {
                        _state.update { it.copy(error = "The AirTag didn't accept the sound request.") }
                        g.disconnect()
                        return
                    }
                    writeCharacteristic(g, c, byteArrayOf(SOUND_START))
                }

                override fun onCharacteristicWrite(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
                    handler.postDelayed({ runCatching { g.disconnect() } }, 5_000)
                }
            }, BluetoothDevice.TRANSPORT_LE)
        }.onFailure {
            Log.w("iNA", "AirTag sound failed", it)
            _state.update { s2 -> s2.copy(ringing = false, error = PERMISSION_HINT) }
        }
    }

    companion object {
        val SOUND_SERVICE: UUID = UUID.fromString("7DFC9000-7D1C-4951-86AA-8D9728F8D66C")
        val SOUND_CHARACTERISTIC: UUID = UUID.fromString("7DFC9001-7D1C-4951-86AA-8D9728F8D66C")
        const val SOUND_START: Byte = 0xAF.toByte()
    }
}

/* ---------- HomePod: Bonjour discovery ---------- */

@Immutable
data class HomePodInfo(val name: String, val model: String, val host: String?, val port: Int)

@Immutable
data class HomePodState(
    val discovering: Boolean = false,
    val speakers: List<HomePodInfo> = emptyList(),
    val selected: String? = null,
    val error: String? = null,
)

class HomePodBrowser(context: Context) {
    private val nsd = context.getSystemService(NsdManager::class.java)
    private val _state = MutableStateFlow(HomePodState())
    val state: StateFlow<HomePodState> = _state.asStateFlow()

    private val pending = ArrayDeque<NsdServiceInfo>()
    @Volatile private var resolving = false
    private var listener: NsdManager.DiscoveryListener? = null

    fun start() {
        if (listener != null || nsd == null) return
        val l = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) = _state.update { it.copy(discovering = true, error = null) }
            override fun onServiceFound(info: NsdServiceInfo) {
                synchronized(pending) { pending.addLast(info) }
                resolveNext()
            }
            override fun onServiceLost(info: NsdServiceInfo) = _state.update { s ->
                s.copy(speakers = s.speakers.filterNot { it.name == displayName(info) })
            }
            override fun onDiscoveryStopped(serviceType: String) = _state.update { it.copy(discovering = false) }
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                listener = null
                _state.update { it.copy(discovering = false, error = "Wi-Fi discovery failed ($errorCode). Join the same Wi-Fi as your HomePod.") }
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
        }
        listener = l
        runCatching { nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, l) }
            .onFailure { listener = null; _state.update { s -> s.copy(error = "Wi-Fi discovery unavailable.") } }
    }

    fun stop() {
        listener?.let { runCatching { nsd?.stopServiceDiscovery(it) } }
        listener = null
        synchronized(pending) { pending.clear() }
        resolving = false
        _state.update { it.copy(discovering = false) }
    }

    fun select(name: String) = _state.update { it.copy(selected = name) }

    @Suppress("DEPRECATION")
    private fun resolveNext() {
        val next = synchronized(pending) {
            if (resolving) return
            pending.removeFirstOrNull()?.also { resolving = true }
        } ?: return
        runCatching {
            nsd?.resolveService(next, object : NsdManager.ResolveListener {
                override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
                    resolving = false
                    resolveNext()
                }

                override fun onServiceResolved(info: NsdServiceInfo) {
                    val model = info.attributes["model"]?.toString(Charsets.UTF_8).orEmpty()
                    if (model.startsWith("AudioAccessory")) {
                        val pod = HomePodInfo(displayName(info), modelName(model), info.host?.hostAddress, info.port)
                        _state.update { s ->
                            s.copy(speakers = (s.speakers.filterNot { it.name == pod.name } + pod).sortedBy { it.name }, selected = s.selected ?: pod.name)
                        }
                    }
                    resolving = false
                    resolveNext()
                }
            })
        }.onFailure { resolving = false }
    }

    companion object {
        const val SERVICE_TYPE = "_airplay._tcp"
        fun displayName(info: NsdServiceInfo): String = info.serviceName.substringAfter('@')
        fun modelName(model: String): String = when {
            model.startsWith("AudioAccessory5") -> "HomePod mini"
            model.startsWith("AudioAccessory6") -> "HomePod (2nd generation)"
            model.startsWith("AudioAccessory1") -> "HomePod"
            else -> "HomePod · $model"
        }
    }
}

/* ---------- Phone media + hub ---------- */

/** Play/pause and volume of whatever is playing on this phone. */
class PhoneAudio(context: Context) {
    private val app = context.applicationContext
    private val audio = app.getSystemService(AudioManager::class.java)
    val isPlaying: Boolean get() = audio?.isMusicActive == true
    fun togglePlayPause() = MediaKeys.send(app, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
    var volume: Float
        get() {
            val a = audio ?: return 0f
            val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            return if (max > 0) a.getStreamVolume(AudioManager.STREAM_MUSIC) / max.toFloat() else 0f
        }
        set(value) {
            val a = audio ?: return
            val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            a.setStreamVolume(AudioManager.STREAM_MUSIC, (value.coerceIn(0f, 1f) * max).roundToInt(), 0)
        }
}

class OtherDeviceHub(context: Context) {
    val watch = WatchLink(context.applicationContext)
    val airTag = AirTagFinder(context.applicationContext)
    val homePod = HomePodBrowser(context.applicationContext)

    fun start(kind: OtherDeviceKind) = when (kind) {
        OtherDeviceKind.WATCH -> watch.start()
        OtherDeviceKind.AIRTAG -> airTag.start()
        OtherDeviceKind.HOMEPOD -> homePod.start()
    }

    fun stop(kind: OtherDeviceKind) = when (kind) {
        OtherDeviceKind.WATCH -> watch.stop()
        OtherDeviceKind.AIRTAG -> airTag.stop()
        OtherDeviceKind.HOMEPOD -> homePod.stop()
    }
}

/* ---------- Compose UI — same layout as the connected AirPods screen ---------- */

@Composable
fun OtherDevicesList(onPick: (OtherDeviceKind) -> Unit) {
    SectionTitle("Other Apple devices")
    Card {
        OtherDeviceKind.entries.forEach { k ->
            SettingRow(k.title, k.detail, icon = k.icon, tint = InaColors.Elevated, onClick = { onPick(k) }) {
                Icon(Icons.Rounded.ChevronRight, contentDescription = null, tint = InaColors.TextSecondary)
            }
        }
    }
}

@Composable
fun OtherDeviceScreen(kind: OtherDeviceKind, onClose: () -> Unit) {
    val context = LocalContext.current
    val hub = remember { InaGraph.otherDevices(context) }
    DisposableEffect(kind) {
        hub.start(kind)
        onDispose { hub.stop(kind) }
    }
    BackHandler(onBack = onClose)

    val (status, live, name) = when (kind) {
        OtherDeviceKind.WATCH -> {
            val s by hub.watch.state.collectAsStateWithLifecycle()
            Triple(
                when {
                    s.connected -> "Connected · GATT"
                    s.scanning -> "Searching for your Watch…"
                    else -> "Not connected"
                },
                s.connected,
                s.name ?: "Apple Watch",
            )
        }
        OtherDeviceKind.AIRTAG -> {
            val s by hub.airTag.state.collectAsStateWithLifecycle()
            Triple(
                when {
                    s.found && s.separated -> "Nearby · separated from owner"
                    s.found -> "Nearby · with owner"
                    s.scanning -> "Searching for AirTags…"
                    else -> "Not found"
                },
                s.found,
                "AirTag",
            )
        }
        OtherDeviceKind.HOMEPOD -> {
            val s by hub.homePod.state.collectAsStateWithLifecycle()
            Triple(
                if (s.speakers.isNotEmpty()) "${s.speakers.size} on this Wi-Fi" else if (s.discovering) "Searching on Wi-Fi…" else "Not found",
                s.speakers.isNotEmpty(),
                s.selected ?: "HomePod",
            )
        }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
        Row(
            Modifier.padding(start = 8.dp, top = 8.dp).clip(CircleShape).clickable(onClick = onClose).padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.ChevronLeft, contentDescription = null, tint = InaColors.Primary)
            Text("Connect", color = InaColors.Primary, fontSize = 15.sp)
        }
        Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(if (live) InaColors.Success else InaColors.Warning))
            Spacer(Modifier.width(8.dp))
            Text(status, color = InaColors.TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(1f).padding(end = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
            devOnly(kind.chip)?.let { Text(it, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, softWrap = false) }
        }
        Text(name, color = InaColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 20.dp))
        Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
            ProductArtImage(kind.art, kind.title, Modifier.size(180.dp))
        }
        when (kind) {
            OtherDeviceKind.WATCH -> WatchPanel(hub.watch)
            OtherDeviceKind.AIRTAG -> AirTagPanel(hub.airTag)
            OtherDeviceKind.HOMEPOD -> HomePodPanel(hub.homePod)
        }
        Spacer(Modifier.height(16.dp))
        TextButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("Disconnect", color = InaColors.Destructive) }
    }
}

@Composable
private fun Hint(text: String?) {
    if (text == null) return
    Text(text, color = InaColors.TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 28.dp, vertical = 8.dp))
}

@Composable
private fun WatchPanel(link: WatchLink) {
    val context = LocalContext.current
    val s by link.state.collectAsStateWithLifecycle()
    val store = remember { InaGraph.settings(context) }
    val settings by store.settings.collectAsStateWithLifecycle()
    Card {
        Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
            BatteryRing(s.battery, false, "Watch", 84.dp)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Rounded.Favorite, contentDescription = null, tint = InaColors.Destructive, modifier = Modifier.size(24.dp))
                Text(if (s.heartRate >= 0) "${s.heartRate}" else "--", color = InaColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                Text("BPM", color = InaColors.TextSecondary, fontSize = 11.sp)
            }
        }
    }
    Hint(s.error)
    Spacer(Modifier.height(16.dp))
    NowPlayingCard("Playing on this phone")
    SectionTitle("Watch")
    Card {
        ToggleRow("Mirror notifications", if (BuildConfig.DEBUG) "Android alerts on your wrist · ANCS" else "Android alerts on your wrist", settings.watchNotifications, Icons.Rounded.Notifications, InaColors.Elevated) { on ->
            store.update { it.copy(watchNotifications = on) }
        }
        SettingRow("Heart rate", devOnly("Standard GATT 0x180D") ?: "While your Watch shares it", if (s.heartRate >= 0) "${s.heartRate} BPM" else "--", Icons.Rounded.Favorite, InaColors.Elevated)
    }
    Hint("Heart rate and battery appear while your Watch broadcasts heart rate (for example during a workout with a broadcasting app).")
}

@Composable
private fun AirTagPanel(finder: AirTagFinder) {
    val context = LocalContext.current
    val s by finder.state.collectAsStateWithLifecycle()
    var finding by remember { mutableStateOf(false) }
    Card {
        Row(Modifier.fillMaxWidth().padding(vertical = 20.dp), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    if (s.found) String.format(Locale.US, "%.1f m", s.distanceMeters) else "-- m",
                    color = InaColors.TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, softWrap = false,
                )
                Text(
                    if (!s.found) "Searching…" else if (finding) s.trend.label else "Nearby · ${s.rssi} dBm",
                    color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, softWrap = false,
                )
            }
            BatteryRing(s.battery, false, "Battery", 72.dp)
        }
    }
    Spacer(Modifier.height(12.dp))
    Row(Modifier.padding(horizontal = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
            onClick = finder::playSound,
            enabled = s.found && !s.ringing,
            modifier = Modifier.weight(1f).height(48.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InaColors.Primary),
        ) { Text(if (s.ringing) "Playing…" else "Play Sound", fontWeight = FontWeight.SemiBold, maxLines = 1) }
        Button(
            onClick = { finding = !finding },
            enabled = s.found,
            modifier = Modifier.weight(1f).height(48.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InaColors.Elevated, contentColor = InaColors.TextPrimary),
        ) { Text(if (finding) "Stop Finding" else "Find Nearby", fontWeight = FontWeight.SemiBold, maxLines = 1) }
    }
    Hint(s.error)
    SectionTitle("Tracking")
    Card {
        SettingRow("Status", "From the Find My broadcast", if (!s.found) "--" else if (s.separated) "Separated" else "With owner", Icons.Rounded.MyLocation, InaColors.Elevated)
        SettingRow("Lost Mode", "Managed by the owner in Find My", icon = Icons.AutoMirrored.Rounded.OpenInNew, tint = InaColors.Elevated, onClick = {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.icloud.com/find")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        })
    }
    Hint("Distance is estimated from signal strength. Ultra Wideband direction needs the owner's iPhone.")
}

@Composable
private fun HomePodPanel(browser: HomePodBrowser) {
    val s by browser.state.collectAsStateWithLifecycle()
    Card {
        if (s.speakers.isEmpty()) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                if (s.discovering) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = InaColors.TextSecondary)
                Spacer(Modifier.width(12.dp))
                Text("Looking for HomePods on this Wi-Fi…", color = InaColors.TextSecondary, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        } else {
            s.speakers.forEach { pod ->
                SettingRow(pod.name, listOfNotNull(pod.model, pod.host).joinToString(" · "), icon = Icons.Rounded.Speaker, tint = InaColors.Elevated, onClick = { browser.select(pod.name) }) {
                    if (s.selected == pod.name) Icon(Icons.Rounded.Check, contentDescription = "Selected", tint = InaColors.Primary)
                }
            }
        }
    }
    Hint(s.error)
    Spacer(Modifier.height(16.dp))
    NowPlayingCard("This phone · stream to HomePod with an AirPlay sender app")
    Hint("Android can find HomePods and control this phone's playback. Sending audio to a HomePod needs an AirPlay sender app.")
}

@Composable
private fun NowPlayingCard(subtitle: String) {
    val context = LocalContext.current
    val audio = remember { PhoneAudio(context) }
    var playing by remember { mutableStateOf(audio.isPlaying) }
    var volume by remember { mutableFloatStateOf(audio.volume) }
    LaunchedEffect(Unit) {
        while (true) {
            playing = audio.isPlaying
            delay(1_000)
        }
    }
    Card {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(InaColors.Elevated), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.MusicNote, contentDescription = null, tint = InaColors.TextSecondary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f).padding(end = 12.dp)) {
                Text(if (playing) "Playing" else "Paused", color = InaColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(subtitle, color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Box(
                Modifier.size(40.dp).clip(CircleShape).background(InaColors.TextPrimary).clickable {
                    audio.togglePlayPause()
                    playing = !playing
                },
                contentAlignment = Alignment.Center,
            ) {
                Icon(if (playing) Icons.Rounded.Pause else Icons.Rounded.PlayArrow, contentDescription = if (playing) "Pause" else "Play", tint = InaColors.Background)
            }
        }
        Row(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Rounded.VolumeUp, contentDescription = null, tint = InaColors.TextSecondary, modifier = Modifier.size(18.dp))
            Slider(
                value = volume,
                onValueChange = { volume = it; audio.volume = it },
                modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
                colors = SliderDefaults.colors(thumbColor = InaColors.TextPrimary, activeTrackColor = InaColors.TextPrimary, inactiveTrackColor = InaColors.Hairline),
            )
            Text("${(volume * 100).roundToInt()}", color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, softWrap = false)
        }
    }
}
