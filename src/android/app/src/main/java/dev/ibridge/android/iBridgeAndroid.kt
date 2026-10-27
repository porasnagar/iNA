@file:Suppress("FunctionName")

package dev.ibridge.android

import android.annotation.SuppressLint
import android.app.Activity
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.ParcelUuid
import android.os.SystemClock
import android.telecom.TelecomManager
import android.util.Base64
import android.util.Log
import android.view.KeyEvent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.BatteryChargingFull
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Bluetooth
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Contrast
import androidx.compose.material.icons.rounded.DataObject
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Headphones
import androidx.compose.material.icons.rounded.Hearing
import androidx.compose.material.icons.rounded.HearingDisabled
import androidx.compose.material.icons.rounded.Layers
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.URL
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.concurrent.ConcurrentHashMap
import javax.net.ssl.HttpsURLConnection
import org.lsposed.hiddenapibypass.HiddenApiBypass

private const val TAG = "iNA"

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. PROTOCOL SPEC — Apple Continuity 0x004C / 0x07 + AAP over L2CAP 0x1001
 * ═══════════════════════════════════════════════════════════════════════════ */

enum class ListeningMode(val aapValue: Int, val label: String, val shortLabel: String, val opcodeKey: String) {
    ANC(0x02, "Noise Cancellation", "ANC", "anc_on"),
    TRANSPARENCY(0x03, "Transparency", "Transparency", "transparency"),
    ADAPTIVE(0x04, "Adaptive", "Adaptive", "adaptive"),
    OFF(0x01, "Off", "Off", "anc_off");

    companion object {
        /** Quick Settings tile order: ANC → Transparency → Adaptive → Off. */
        val CYCLE: List<ListeningMode> = listOf(ANC, TRANSPARENCY, ADAPTIVE, OFF)
        fun fromAap(value: Int): ListeningMode? = entries.firstOrNull { it.aapValue == value }
    }
}

enum class ModelFamily { AIRPODS, AIRPODS_PRO, AIRPODS_MAX, BEATS }

/** Real 3D product renders shipped as PNGs in res/drawable-nodpi. */
enum class ProductArtKey(val drawable: Int) {
    AIRPODS_PRO(R.drawable.product_airpods_pro),
    AIRPODS_4(R.drawable.product_airpods_4),
    AIRPODS_MAX(R.drawable.product_airpods_max),
    BEATS_FIT_PRO(R.drawable.product_beats_fit_pro),
    APPLE_WATCH(R.drawable.product_apple_watch),
    AIRTAG(R.drawable.product_airtag),
    HOMEPOD(R.drawable.product_homepod),
}

@Immutable
data class Capabilities(
    val anc: Boolean = false,
    val transparency: Boolean = false,
    val adaptive: Boolean = false,
    val conversationAwareness: Boolean = false,
    val personalizedVolume: Boolean = false,
    val headGestures: Boolean = false,
    val fitTest: Boolean = false,
    val caseSpeaker: Boolean = false,
    val stemControls: Boolean = true,
    val digitalCrown: Boolean = false,
    val inEarDetection: Boolean = true,
    val hasCase: Boolean = true,
) {
    val supportedModes: List<ListeningMode>
        get() = ListeningMode.CYCLE.filter {
            when (it) {
                ListeningMode.ANC -> anc
                ListeningMode.TRANSPARENCY -> transparency
                ListeningMode.ADAPTIVE -> adaptive
                ListeningMode.OFF -> anc || transparency
            }
        }
}

@Immutable
data class AppleModel(
    val id: Int,
    val name: String,
    val family: ModelFamily,
    val chip: String,
    val art: ProductArtKey,
    val caps: Capabilities,
    val fromOta: Boolean = false,
)

object AppleProtocolSpec {
    const val APPLE_COMPANY_ID = 0x004C
    const val TYPE_PROXIMITY_PAIRING = 0x07
    const val DEFAULT_L2CAP_PSM = 0x1001
    const val POPUP_RSSI_THRESHOLD = -68

    /** SDP record AirPods publish for AAP. BluetoothSocket needs a UUID even for a raw L2CAP PSM. */
    const val AAP_UUID = "74ec2172-0bad-4d01-8f77-997b2be0722a"

    // AAP control setting identifiers (04 00 04 00 09 00 [id] [value] 00 00 00)
    const val SETTING_LISTENING_MODE = 0x0D
    const val SETTING_STEM_LONG_PRESS = 0x16
    const val SETTING_CROWN_DIRECTION = 0x1C
    const val SETTING_HEAD_GESTURES = 0x24
    const val SETTING_LOUD_SOUND_REDUCTION = 0x25
    const val SETTING_PERSONALIZED_VOLUME = 0x26
    const val SETTING_CONVERSATION_AWARENESS = 0x28
    const val SETTING_FIND_MY_CHIRP = 0x40

    // AAP notification opcodes (byte 4 of an incoming packet)
    const val OPCODE_BATTERY = 0x04
    const val OPCODE_EAR_DETECTION = 0x06
    const val OPCODE_CONTROL = 0x09
    const val OPCODE_HEAD_GESTURE = 0x17
    const val OPCODE_FIT_TEST = 0x1B
    const val OPCODE_CONVERSATION = 0x4B

    val HANDSHAKE: ByteArray = byteArrayOf(0x00, 0x00, 0x04, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
    /** Turns on the extended feature set (gestures, conversation awareness) before notifications. */
    val SET_FEATURES: ByteArray = byteArrayOf(0x04, 0x00, 0x04, 0x00, 0x4D, 0x00, 0xFF.toByte(), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
    val ENABLE_NOTIFICATIONS: ByteArray = byteArrayOf(0x04, 0x00, 0x04, 0x00, 0x0F, 0x00, 0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte())
    val FIT_TEST_START: ByteArray = byteArrayOf(0x04, 0x00, 0x04, 0x00, 0x1B, 0x00, 0x01, 0x00)

    private val BASIC = Capabilities()
    private val ANC_BUDS = Capabilities(anc = true, transparency = true, adaptive = true, conversationAwareness = true, personalizedVolume = true, headGestures = true)
    private val PRO_1 = Capabilities(anc = true, transparency = true, fitTest = true)
    private val PRO_MODERN = ANC_BUDS.copy(fitTest = true, caseSpeaker = true)
    private val MAX_1 = Capabilities(anc = true, transparency = true, stemControls = false, digitalCrown = true, hasCase = false)
    private val MAX_2 = MAX_1.copy(adaptive = true, conversationAwareness = true, personalizedVolume = true)
    private val BEATS_BUDS = Capabilities(anc = true, transparency = true, fitTest = true)
    private val BEATS_OVEREAR_ANC = Capabilities(anc = true, transparency = true, inEarDetection = false, hasCase = false)
    private val BEATS_OVEREAR = Capabilities(inEarDetection = false, hasCase = false)

    private val BUILT_IN: List<AppleModel> = listOf(
        AppleModel(0x0220, "AirPods (1st generation)", ModelFamily.AIRPODS, "W1", ProductArtKey.AIRPODS_4, BASIC),
        AppleModel(0x0F20, "AirPods (2nd generation)", ModelFamily.AIRPODS, "H1", ProductArtKey.AIRPODS_4, BASIC),
        AppleModel(0x1320, "AirPods (3rd generation)", ModelFamily.AIRPODS, "H1", ProductArtKey.AIRPODS_4, BASIC),
        AppleModel(0x1920, "AirPods 4", ModelFamily.AIRPODS, "H2", ProductArtKey.AIRPODS_4, BASIC),
        AppleModel(0x1B20, "AirPods 4 (ANC)", ModelFamily.AIRPODS, "H2", ProductArtKey.AIRPODS_4, ANC_BUDS),
        AppleModel(0x2720, "AirPods 5", ModelFamily.AIRPODS, "H3", ProductArtKey.AIRPODS_4, BASIC),
        AppleModel(0x2820, "AirPods 5 (ANC)", ModelFamily.AIRPODS, "H3", ProductArtKey.AIRPODS_4, ANC_BUDS),
        AppleModel(0x0E20, "AirPods Pro", ModelFamily.AIRPODS_PRO, "H1", ProductArtKey.AIRPODS_PRO, PRO_1),
        AppleModel(0x1420, "AirPods Pro 2 (Lightning)", ModelFamily.AIRPODS_PRO, "H2", ProductArtKey.AIRPODS_PRO, PRO_MODERN),
        AppleModel(0x2420, "AirPods Pro 2 (USB-C)", ModelFamily.AIRPODS_PRO, "H2", ProductArtKey.AIRPODS_PRO, PRO_MODERN),
        AppleModel(0x2520, "AirPods Pro 3", ModelFamily.AIRPODS_PRO, "H3", ProductArtKey.AIRPODS_PRO, PRO_MODERN),
        AppleModel(0x0A20, "AirPods Max (Lightning)", ModelFamily.AIRPODS_MAX, "H1", ProductArtKey.AIRPODS_MAX, MAX_1),
        AppleModel(0x1F20, "AirPods Max (USB-C)", ModelFamily.AIRPODS_MAX, "H1", ProductArtKey.AIRPODS_MAX, MAX_1),
        AppleModel(0x2920, "AirPods Max 2", ModelFamily.AIRPODS_MAX, "H3", ProductArtKey.AIRPODS_MAX, MAX_2),
        AppleModel(0x0620, "Beats Solo 3", ModelFamily.BEATS, "W1", ProductArtKey.BEATS_FIT_PRO, BEATS_OVEREAR),
        AppleModel(0x0920, "Beats Studio 3", ModelFamily.BEATS, "W1", ProductArtKey.BEATS_FIT_PRO, BEATS_OVEREAR_ANC),
        AppleModel(0x0B20, "Powerbeats Pro", ModelFamily.BEATS, "H1", ProductArtKey.BEATS_FIT_PRO, BASIC),
        AppleModel(0x1220, "Beats Fit Pro", ModelFamily.BEATS, "H1", ProductArtKey.BEATS_FIT_PRO, BEATS_BUDS),
        AppleModel(0x1720, "Beats Studio Pro", ModelFamily.BEATS, "H1", ProductArtKey.BEATS_FIT_PRO, BEATS_OVEREAR_ANC),
        AppleModel(0x2620, "Powerbeats Pro 2", ModelFamily.BEATS, "H2", ProductArtKey.BEATS_FIT_PRO, BEATS_BUDS.copy(caseSpeaker = true)),
        AppleModel(0x2A20, "Beats Solo 4", ModelFamily.BEATS, "H1", ProductArtKey.BEATS_FIT_PRO, BEATS_OVEREAR),
    )

    /** Live model table. OtaProtocolRuleManager merges hot-registered IDs into it at runtime. */
    val MODEL_DATABASE: MutableMap<Int, AppleModel> = ConcurrentHashMap<Int, AppleModel>().apply {
        BUILT_IN.forEach { put(it.id, it) }
    }

    fun model(id: Int): AppleModel? = MODEL_DATABASE[id]

    fun registerModel(id: Int, name: String) {
        val existing = MODEL_DATABASE[id]
        MODEL_DATABASE[id] = existing?.copy(name = name, fromOta = true) ?: inferModel(id, name)
    }

    private fun inferModel(id: Int, name: String): AppleModel {
        val n = name.lowercase()
        return when {
            "max" in n -> AppleModel(id, name, ModelFamily.AIRPODS_MAX, "H3", ProductArtKey.AIRPODS_MAX, MAX_2, true)
            "beats" in n -> AppleModel(id, name, ModelFamily.BEATS, "H2", ProductArtKey.BEATS_FIT_PRO, BEATS_BUDS, true)
            "pro" in n -> AppleModel(id, name, ModelFamily.AIRPODS_PRO, "H3", ProductArtKey.AIRPODS_PRO, PRO_MODERN, true)
            "anc" in n -> AppleModel(id, name, ModelFamily.AIRPODS, "H3", ProductArtKey.AIRPODS_4, ANC_BUDS, true)
            else -> AppleModel(id, name, ModelFamily.AIRPODS, "H3", ProductArtKey.AIRPODS_4, BASIC, true)
        }
    }

    fun controlCommand(setting: Int, value: Int): ByteArray =
        byteArrayOf(0x04, 0x00, 0x04, 0x00, 0x09, 0x00, setting.toByte(), value.toByte(), 0x00, 0x00, 0x00)

    fun modeCommand(mode: ListeningMode): ByteArray = controlCommand(SETTING_LISTENING_MODE, mode.aapValue)

    /** Bluetooth Core spec: LSB of the low octet must be 1, LSB of the high octet must be 0. */
    fun isValidPsm(psm: Int): Boolean = psm in 0x0001..0xFFFF && (psm and 0x0001) == 1 && (psm and 0x0100) == 0

    fun hex(id: Int): String = "0x%04X".format(id)
}

fun ByteArray.toHex(): String = joinToString(" ") { "%02X".format(it) }

fun String.hexToBytes(): ByteArray =
    trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.map { it.toInt(16).toByte() }.toByteArray()

/** `-1` means unknown. Never substitute the phone's own battery for an accessory level. */
fun formatBattery(level: Int): String = if (level in 0..100) "$level%" else "--%"

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. STATE
 * ═══════════════════════════════════════════════════════════════════════════ */

/** [label] is the developer wording (debug builds); [userLabel] is what release builds show. */
enum class LinkTier(val label: String, val userLabel: String) {
    NONE("Not connected", "Not connected"),
    L2CAP_DIRECT("Tier 1 · L2CAP 0x1001", "Connected"),
    L2CAP_REFLECTION("Tier 2 · reflected L2CAP", "Connected"),
    L2CAP_COC("Tier 2 · LE CoC", "Connected"),
    BLE_ONLY("Tier 3 · BLE telemetry", "Connected · battery only"),
    ;

    val hasControls: Boolean get() = this != NONE && this != BLE_ONLY
    val display: String get() = if (BuildConfig.DEBUG) label else userLabel
}

enum class StemAction(val label: String, val aapValue: Int) {
    NOISE_CONTROL("Noise Control", 0x05),
    VOICE_ASSISTANT("Voice Assistant", 0x01),
    OFF("Off", 0x00),
}

enum class ChirpTarget(val aapValue: Int) { LEFT(1), RIGHT(2), CASE(3) }

@Immutable
data class AirPodsState(
    val connected: Boolean = false,
    val isPreview: Boolean = false,
    val modelId: Int = -1,
    val leftBattery: Int = -1,
    val rightBattery: Int = -1,
    val caseBattery: Int = -1,
    val leftCharging: Boolean = false,
    val rightCharging: Boolean = false,
    val caseCharging: Boolean = false,
    val leftInEar: Boolean = false,
    val rightInEar: Boolean = false,
    val lidOpenCounter: Int = -1,
    /** true = lid closed, false = open, null = this advert doesn't say. */
    val lidClosed: Boolean? = null,
    val rssi: Int = Int.MIN_VALUE,
    val listeningMode: ListeningMode = ListeningMode.OFF,
    val conversationAwareness: Boolean = false,
    val personalizedVolume: Boolean = false,
    val headGestures: Boolean = false,
    val linkTier: LinkTier = LinkTier.NONE,
    val deviceAddress: String? = null,
    val fitTestResult: Pair<Boolean, Boolean>? = null,
    /** Media was paused by in-ear detection (feeds the "Resume" suggestion). */
    val pausedByEar: Boolean = false,
) {
    val model: AppleModel? get() = AppleProtocolSpec.model(modelId)
    val isPaired: Boolean get() = deviceAddress != null

    companion object {
        val DISCONNECTED = AirPodsState()

        /** Explicitly labelled simulated values for the "Preview Connected UI" toggle. */
        fun preview(modelId: Int = 0x2420) = AirPodsState(
            connected = true, isPreview = true, modelId = modelId,
            leftBattery = 80, rightBattery = 70, caseBattery = 50,
            leftCharging = true, rightCharging = true,
            listeningMode = ListeningMode.ANC, conversationAwareness = true, headGestures = true,
            linkTier = LinkTier.NONE,
        )
    }
}

object ProximityPacketParser {
    private fun nibble(n: Int): Int = if (n in 0..10) n * 10 else -1

    /**
     * [data] is the manufacturer-specific payload for company 0x004C
     * (ScanRecord.getManufacturerSpecificData(0x004C)).
     *
     * Byte 5 bit 5 says which AirPod is broadcasting. When it is the left one, byte 6 carries
     * left in the low nibble and right in the high nibble; when it is the right one they swap,
     * and so do the charging bits. Without this, half of all AirPods show left/right swapped.
     * Byte 8: bits 0-2 lid-open counter, bit 3 lid closed (only meaningful while the
     * broadcasting AirPod sits in the case, byte 5 bit 6).
     * Mirrors parseProximityPacket in src/lib/ina/protocol.ts.
     */
    fun parse(data: ByteArray?, rssi: Int): AirPodsState? {
        if (data == null || data.size < 9) return null
        if (data[0].toInt() and 0xFF != AppleProtocolSpec.TYPE_PROXIMITY_PAIRING) return null
        val b = IntArray(data.size) { data[it].toInt() and 0xFF }
        val status = b[5]
        val leftPrimary = status and 0x20 != 0
        val podInCase = status and 0x40 != 0
        val swapEar = !leftPrimary xor podInCase
        val hi = (b[6] shr 4) and 0x0F
        val lo = b[6] and 0x0F
        return AirPodsState(
            modelId = (b[3] shl 8) or b[4],
            leftInEar = status and (if (swapEar) 0b0000_1000 else 0b0000_0010) != 0,
            rightInEar = status and (if (swapEar) 0b0000_0010 else 0b0000_1000) != 0,
            leftBattery = nibble(if (leftPrimary) lo else hi),
            rightBattery = nibble(if (leftPrimary) hi else lo),
            caseBattery = nibble(b[7] and 0x0F),
            leftCharging = b[7] and (if (leftPrimary) 0x10 else 0x20) != 0,
            rightCharging = b[7] and (if (leftPrimary) 0x20 else 0x10) != 0,
            caseCharging = b[7] and 0x40 != 0,
            lidOpenCounter = b[8] and 0x07,
            lidClosed = if (podInCase) (b[8] and 0x08) != 0 else null,
            rssi = rssi,
        )
    }

    fun shouldTriggerPopup(previousCounter: Int, packet: AirPodsState): Boolean =
        packet.rssi > AppleProtocolSpec.POPUP_RSSI_THRESHOLD && packet.lidOpenCounter != previousCounter
}

object IBridgeStateStore {
    private val _state = MutableStateFlow(AirPodsState.DISCONNECTED)
    val state: StateFlow<AirPodsState> = _state.asStateFlow()

    private val _popupEvents = MutableSharedFlow<AirPodsState>(extraBufferCapacity = 4)
    val popupEvents: SharedFlow<AirPodsState> = _popupEvents.asSharedFlow()

    @Volatile var appInForeground: Boolean = false

    fun update(transform: (AirPodsState) -> AirPodsState) = _state.update(transform)
    fun emitPopup(state: AirPodsState) { _popupEvents.tryEmit(state) }

    fun setPreview(on: Boolean) = _state.update { current ->
        when {
            on && !current.connected -> AirPodsState.preview()
            !on && current.isPreview -> AirPodsState.DISCONNECTED
            else -> current
        }
    }

    /** Merges a BLE advertisement without clobbering AAP-only fields. */
    fun mergeAdvertisement(packet: AirPodsState) = _state.update { s ->
        if (s.isPreview) s else s.copy(
            modelId = packet.modelId,
            leftBattery = if (s.connected || packet.leftBattery >= 0) packet.leftBattery else s.leftBattery,
            rightBattery = if (s.connected || packet.rightBattery >= 0) packet.rightBattery else s.rightBattery,
            caseBattery = packet.caseBattery,
            leftCharging = packet.leftCharging,
            rightCharging = packet.rightCharging,
            caseCharging = packet.caseCharging,
            leftInEar = packet.leftInEar,
            rightInEar = packet.rightInEar,
            lidOpenCounter = packet.lidOpenCounter,
            rssi = packet.rssi,
        )
    }

    fun reset() = _state.update { AirPodsState.DISCONNECTED }
}

/**
 * Decides when the case-open pop-up may appear, so it behaves like iPhone: every time the lid
 * opens, never stacked, and once closed it stays closed until the lid is shut and opened again.
 * Shared by the in-app sheet, the overlay window, the fallback Activity and the heads-up
 * notification. Covered by CasePopupGateTest.
 */
object CasePopupGate {
    /** No adverts from a model for this long means the case was closed or carried away. */
    const val CASE_AWAY_MS = 10_000L
    /** Minimum gap between two pop-ups, so one lid opening never shows two. */
    const val MIN_INTERVAL_MS = 4_000L
    /** Safety net: if the lid closing is never seen, a closed pop-up may return after this. */
    const val DISMISS_SNOOZE_MS = 10 * 60_000L
    /** A pop-up that never reported back is considered gone after this. */
    const val SHOWING_TIMEOUT_MS = 60_000L

    private class Seen(val counter: Int, val at: Long, val closed: Boolean)

    private val seen = HashMap<Int, Seen>()
    private val snoozedUntil = HashMap<Int, Long>()
    private var lastShownAt = Long.MIN_VALUE / 2
    private var showing = false

    /**
     * True when this advert is a fresh case opening: first sighting, the lid was seen closed
     * before, the case reappeared after being away, or the lid counter moved.
     * Seeing the lid closed (or the case going quiet) re-arms a pop-up the user had closed.
     */
    @Synchronized
    fun isNewCaseOpen(packet: AirPodsState, now: Long): Boolean {
        val prev = seen[packet.modelId]
        val closedNow = packet.lidClosed == true
        val away = prev != null && now - prev.at > CASE_AWAY_MS
        if (closedNow || away) snoozedUntil.remove(packet.modelId)
        seen[packet.modelId] = Seen(packet.lidOpenCounter, now, closedNow)
        if (closedNow) return false
        if (packet.rssi <= AppleProtocolSpec.POPUP_RSSI_THRESHOLD) return false
        if (prev == null) return true
        return prev.closed || away || prev.counter != packet.lidOpenCounter
    }

    /** Reserves the pop-up slot. Call [onDismissed] or [onHidden] when it goes away. */
    @Synchronized
    fun tryOpen(modelId: Int, now: Long, myModelId: Int = -1): Boolean {
        if (myModelId >= 0 && modelId != myModelId) return false
        if (showing && now - lastShownAt < SHOWING_TIMEOUT_MS) return false
        if (now < (snoozedUntil[modelId] ?: Long.MIN_VALUE)) return false
        if (now - lastShownAt < MIN_INTERVAL_MS) return false
        showing = true
        lastShownAt = now
        return true
    }

    /** The user closed it (X, swipe, tap outside, Done): it stays closed for this lid opening. */
    @Synchronized
    fun onDismissed(modelId: Int, now: Long) {
        showing = false
        snoozedUntil[modelId] = now + DISMISS_SNOOZE_MS
    }

    /** It hid itself ([ignored]) or the user tapped Connect. Ignored ones also stay away for this opening. */
    @Synchronized
    fun onHidden(modelId: Int, now: Long, ignored: Boolean = false) {
        showing = false
        if (ignored) snoozedUntil[modelId] = now + DISMISS_SNOOZE_MS
    }

    @Synchronized
    fun reset() {
        seen.clear()
        snoozedUntil.clear()
        lastShownAt = Long.MIN_VALUE / 2
        showing = false
    }
}

/** User preferences that are not stored on the accessory itself. */
@Immutable
data class InaSettings(
    val autoPause: Boolean = true,
    val stemLeft: StemAction = StemAction.NOISE_CONTROL,
    val stemRight: StemAction = StemAction.NOISE_CONTROL,
    val crownReversed: Boolean = false,
    val loudSoundReduction: Boolean = true,
    /** Display › Reduce Transparency: solid surfaces instead of Liquid Glass. */
    val reduceTransparency: Boolean = false,
    /** Forward Android notifications to Apple Watch over ANCS. */
    val watchNotifications: Boolean = true,
    /** Display › Appearance. */
    val appearance: Appearance = Appearance.SYSTEM,
    /** Model of the AirPods last connected here; pop-ups for other people's AirPods are ignored. */
    val myModelId: Int = -1,
)

enum class Appearance(val label: String) { SYSTEM("Automatic"), LIGHT("Light"), DARK("Dark") }

class InaSettingsStore(context: Context) {
    private val prefs = context.getSharedPreferences("ina_settings", Context.MODE_PRIVATE)
    private val _settings = MutableStateFlow(read())
    val settings: StateFlow<InaSettings> = _settings.asStateFlow()

    private fun read() = InaSettings(
        autoPause = prefs.getBoolean("auto_pause", true),
        stemLeft = StemAction.valueOf(prefs.getString("stem_left", StemAction.NOISE_CONTROL.name)!!),
        stemRight = StemAction.valueOf(prefs.getString("stem_right", StemAction.NOISE_CONTROL.name)!!),
        crownReversed = prefs.getBoolean("crown_reversed", false),
        loudSoundReduction = prefs.getBoolean("loud_sound_reduction", true),
        reduceTransparency = prefs.getBoolean("reduce_transparency", false),
        watchNotifications = prefs.getBoolean("watch_notifications", true),
        appearance = runCatching { Appearance.valueOf(prefs.getString("appearance", Appearance.SYSTEM.name)!!) }.getOrDefault(Appearance.SYSTEM),
        myModelId = prefs.getInt("my_model_id", -1),
    )

    fun update(transform: (InaSettings) -> InaSettings) {
        val next = transform(_settings.value)
        prefs.edit()
            .putBoolean("auto_pause", next.autoPause)
            .putString("stem_left", next.stemLeft.name)
            .putString("stem_right", next.stemRight.name)
            .putBoolean("crown_reversed", next.crownReversed)
            .putBoolean("loud_sound_reduction", next.loudSoundReduction)
            .putBoolean("reduce_transparency", next.reduceTransparency)
            .putBoolean("watch_notifications", next.watchNotifications)
            .putString("appearance", next.appearance.name)
            .putInt("my_model_id", next.myModelId)
            .apply()
        _settings.value = next
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. OTA / ORT DYNAMIC PROTOCOL RULE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════ */

@Immutable
data class OtaRules(
    val version: String,
    val issuedAt: String,
    val l2capPsm: Int,
    val opcodes: Map<String, ByteArray>,
    val models: Map<Int, String>,
    val signature: String,
    val rawJson: String,
)

class OtaProtocolRuleManager(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val _rules = MutableStateFlow(load())
    val rules: StateFlow<OtaRules> = _rules.asStateFlow()

    init { mergeModels(_rules.value) }

    private fun load(): OtaRules =
        prefs.getString(KEY_JSON, null)?.let { parse(it).getOrNull() } ?: parse(DEFAULT_JSON).getOrThrow()

    fun opcode(key: String): ByteArray? = _rules.value.opcodes[key]

    /** Validates, persists and hot-reloads a manifest. Returns an error message on failure. */
    fun applyJson(json: String): Result<OtaRules> = parse(json).onSuccess { rules ->
        prefs.edit().putString(KEY_JSON, rules.rawJson).apply()
        mergeModels(rules)
        _rules.value = rules
    }

    fun overridePsm(psm: Int): Result<OtaRules> {
        if (!AppleProtocolSpec.isValidPsm(psm)) return Result.failure(IllegalArgumentException("Invalid PSM ${AppleProtocolSpec.hex(psm)}"))
        val obj = JSONObject(_rules.value.rawJson).put("l2cap_psm", AppleProtocolSpec.hex(psm))
        return applyJson(obj.toString(2))
    }

    fun registerModel(id: Int, name: String): Result<OtaRules> {
        val obj = JSONObject(_rules.value.rawJson)
        obj.getJSONObject("models").put(AppleProtocolSpec.hex(id), name)
        return applyJson(obj.toString(2))
    }

    fun removeModel(id: Int): Result<OtaRules> {
        val obj = JSONObject(_rules.value.rawJson)
        obj.getJSONObject("models").remove(AppleProtocolSpec.hex(id))
        return applyJson(obj.toString(2))
    }

    fun reset(): Result<OtaRules> = applyJson(DEFAULT_JSON)

    /**
     * Fetches the signed envelope `{ "payload_b64": "...", "sig_b64": "..." }`.
     * Falls back to the cached rules (offline hot-reload) on any network or signature failure.
     */
    suspend fun sync(url: String = MANIFEST_URL): Result<OtaRules> = withContext(Dispatchers.IO) {
        runCatching {
            val conn = (URL(url).openConnection() as HttpsURLConnection).apply {
                connectTimeout = 8_000
                readTimeout = 8_000
                setRequestProperty("Accept", "application/json")
            }
            try {
                if (conn.responseCode != 200) throw IOException("HTTP ${conn.responseCode}")
                val envelope = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                val payload = Base64.decode(envelope.getString("payload_b64"), Base64.DEFAULT)
                val signature = Base64.decode(envelope.getString("sig_b64"), Base64.DEFAULT)
                if (!verify(payload, signature)) throw SecurityException("Rule manifest signature rejected")
                applyJson(String(payload, Charsets.UTF_8)).getOrThrow()
            } finally {
                conn.disconnect()
            }
        }.onFailure { Log.w(TAG, "OTA sync failed, keeping cached rules v${_rules.value.version}", it) }
    }

    private fun verify(payload: ByteArray, signature: ByteArray): Boolean = runCatching {
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(Base64.decode(RULES_PUBLIC_KEY_B64, Base64.DEFAULT)))
        Signature.getInstance("SHA256withECDSA").run {
            initVerify(key)
            update(payload)
            verify(signature)
        }
    }.getOrDefault(false)

    private fun mergeModels(rules: OtaRules) {
        rules.models.forEach { (id, name) -> AppleProtocolSpec.registerModel(id, name) }
    }

    companion object {
        const val PREFS = "ibridge_ota_rules"
        private const val KEY_JSON = "rules_json"
        const val MANIFEST_URL = "https://rules.ibridge.dev/v1/manifest.json"

        /** Replace with the DER/X.509 base64 of your P-256 rule-signing public key. */
        const val RULES_PUBLIC_KEY_B64 = "REPLACE_WITH_YOUR_P256_PUBLIC_KEY"

        val DEFAULT_JSON = """
            {
              "version": "2026.10.3",
              "issued_at": "2026-10-20T09:00:00Z",
              "l2cap_psm": "0x1001",
              "opcodes": {
                "anc_off": "04 00 04 00 09 00 0D 01 00 00 00",
                "anc_on": "04 00 04 00 09 00 0D 02 00 00 00",
                "transparency": "04 00 04 00 09 00 0D 03 00 00 00",
                "adaptive": "04 00 04 00 09 00 0D 04 00 00 00",
                "conversation_awareness": "04 00 04 00 09 00 28 01 00 00 00",
                "personalized_volume": "04 00 04 00 09 00 26 01 00 00 00"
              },
              "models": {
                "0x2720": "AirPods 5",
                "0x2820": "AirPods 5 (ANC)",
                "0x2520": "AirPods Pro 3",
                "0x2920": "AirPods Max 2"
              },
              "signature": "bundled"
            }
        """.trimIndent()

        fun parse(json: String): Result<OtaRules> = runCatching {
            val o = JSONObject(json)
            val psm = o.getString("l2cap_psm").removePrefix("0x").toInt(16)
            require(AppleProtocolSpec.isValidPsm(psm)) { "l2cap_psm is not a valid PSM" }
            val ops = o.getJSONObject("opcodes")
            val opcodes = ops.keys().asSequence().associateWith { ops.getString(it).hexToBytes() }
            val m = o.getJSONObject("models")
            val models = m.keys().asSequence().associate { it.removePrefix("0x").toInt(16) to m.getString(it) }
            OtaRules(
                version = o.getString("version"),
                issuedAt = o.optString("issued_at"),
                l2capPsm = psm,
                opcodes = opcodes,
                models = models,
                signature = o.optString("signature", "unsigned"),
                rawJson = o.toString(2),
            )
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. AAP CONTROLLER — Tiered L2CAP link for Android 10–16+ (no root)
 * ═══════════════════════════════════════════════════════════════════════════ */

@SuppressLint("MissingPermission")
class AirPodsProController(
    private val context: Context,
    private val rules: OtaProtocolRuleManager,
    private val scope: CoroutineScope,
) {
    private var socket: BluetoothSocket? = null
    private var readJob: Job? = null
    private val writeLock = Mutex()
    private val autoPause = MediaAutoPauseController(context)
    private val ducker = ConversationDucker(context)
    var settingsProvider: () -> InaSettings = { InaSettings() }

    val isLinked: Boolean get() = socket?.isConnected == true

    /**
     * Opens the AAP control channel. Returns [LinkTier.NONE] when the AirPods are not actually
     * linked to this phone, so the UI never claims a connection that does not exist.
     */
    suspend fun connect(device: BluetoothDevice): LinkTier = withContext(Dispatchers.IO) {
        disconnect(resetState = false)
        val psm = rules.rules.value.l2capPsm
        val opened = openSocket(device, psm)
        if (opened == null) {
            if (!BluetoothLink.isAclConnected(device)) {
                Log.i(TAG, "AAP link failed and ${device.address} is not connected")
                IBridgeStateStore.update { it.copy(connected = false, isPreview = false, linkTier = LinkTier.NONE) }
                return@withContext LinkTier.NONE
            }
            // Audio is up but the control channel is not: BLE 0x07 still delivers battery, lid and in-ear state.
            IBridgeStateStore.update { it.copy(connected = true, isPreview = false, linkTier = LinkTier.BLE_ONLY, deviceAddress = device.address) }
            rememberModel()
            return@withContext LinkTier.BLE_ONLY
        }
        val (sock, tier) = opened
        socket = sock
        runCatching {
            sock.outputStream.write(AppleProtocolSpec.HANDSHAKE)
            sock.outputStream.flush()
            delay(150)
            sock.outputStream.write(AppleProtocolSpec.SET_FEATURES)
            sock.outputStream.write(AppleProtocolSpec.ENABLE_NOTIFICATIONS)
            sock.outputStream.flush()
        }.onFailure { Log.w(TAG, "AAP handshake failed", it) }
        IBridgeStateStore.update { it.copy(connected = true, isPreview = false, linkTier = tier, deviceAddress = device.address) }
        rememberModel()
        readJob = scope.launch(Dispatchers.IO) { readLoop(sock) }
        Log.i(TAG, "AAP link up on PSM ${AppleProtocolSpec.hex(psm)} via $tier")
        tier
    }

    private fun rememberModel() {
        val id = IBridgeStateStore.state.value.modelId
        if (id >= 0) InaGraph.settings(context).update { it.copy(myModelId = id) }
    }

    private fun openSocket(device: BluetoothDevice, psm: Int): Pair<BluetoothSocket, LinkTier>? {
        BluetoothLink.allowHiddenApis()
        // Tier 1 — classic BR/EDR L2CAP socket on the AAP PSM, which is what AirPods listen on.
        for (s in BluetoothLink.classicL2capSockets(device, psm)) {
            runCatching { s.connect(); return s to LinkTier.L2CAP_DIRECT }
                .onFailure { Log.d(TAG, "Tier 1 failed: ${it.message}"); runCatching { s.close() } }
        }
        // Tier 2a — hidden BluetoothDevice#createL2capSocket / createInsecureL2capSocket.
        for (name in listOf("createL2capSocket", "createInsecureL2capSocket")) {
            runCatching {
                val method = BluetoothDevice::class.java.getMethod(name, Int::class.javaPrimitiveType)
                val s = method.invoke(device, psm) as BluetoothSocket
                try { s.connect() } catch (e: IOException) { runCatching { s.close() }; throw e }
                return s to LinkTier.L2CAP_REFLECTION
            }.onFailure { Log.d(TAG, "Tier 2 ($name) failed: ${it.message}") }
        }
        // Tier 2b — public LE connection-oriented channel (some newer firmwares).
        for (secure in listOf(false, true)) {
            runCatching {
                val s = if (secure) device.createL2capChannel(psm) else device.createInsecureL2capChannel(psm)
                try { s.connect() } catch (e: IOException) { runCatching { s.close() }; throw e }
                return s to LinkTier.L2CAP_COC
            }.onFailure { Log.d(TAG, "LE CoC (${if (secure) "secure" else "insecure"}) failed: ${it.message}") }
        }
        return null
    }

    fun disconnect(resetState: Boolean = true) {
        readJob?.cancel()
        readJob = null
        runCatching { socket?.close() }
        socket = null
        if (resetState) IBridgeStateStore.reset()
    }

    private suspend fun readLoop(sock: BluetoothSocket) {
        val buffer = ByteArray(1024)
        val input = sock.inputStream
        try {
            while (scope.isActive) {
                val n = input.read(buffer)
                if (n <= 0) break
                handlePacket(buffer.copyOf(n))
            }
        } catch (e: IOException) {
            Log.i(TAG, "AAP link closed: ${e.message}")
        } finally {
            IBridgeStateStore.update { it.copy(linkTier = LinkTier.BLE_ONLY) }
        }
    }

    private fun handlePacket(p: ByteArray) {
        if (p.size < 6 || p[0].toInt() != 0x04 || p[2].toInt() != 0x04) return
        val b = IntArray(p.size) { p[it].toInt() and 0xFF }
        when (b[4]) {
            AppleProtocolSpec.OPCODE_BATTERY -> parseBattery(b)
            AppleProtocolSpec.OPCODE_EAR_DETECTION -> if (b.size >= 8) {
                val before = IBridgeStateStore.state.value
                val left = b[6] == 0x00
                val right = b[7] == 0x00
                IBridgeStateStore.update { it.copy(leftInEar = left, rightInEar = right) }
                if (settingsProvider().autoPause) autoPause.onEarStateChanged(before.leftInEar, before.rightInEar, left, right)
            }
            AppleProtocolSpec.OPCODE_CONTROL -> if (b.size >= 8) when (b[6]) {
                AppleProtocolSpec.SETTING_LISTENING_MODE -> ListeningMode.fromAap(b[7])?.let { m -> IBridgeStateStore.update { it.copy(listeningMode = m) } }
                AppleProtocolSpec.SETTING_CONVERSATION_AWARENESS -> IBridgeStateStore.update { it.copy(conversationAwareness = b[7] == 0x01) }
                AppleProtocolSpec.SETTING_PERSONALIZED_VOLUME -> IBridgeStateStore.update { it.copy(personalizedVolume = b[7] == 0x01) }
                AppleProtocolSpec.SETTING_HEAD_GESTURES -> IBridgeStateStore.update { it.copy(headGestures = b[7] == 0x01) }
            }
            AppleProtocolSpec.OPCODE_HEAD_GESTURE -> if (b.size >= 7 && IBridgeStateStore.state.value.headGestures) {
                HeadGestureHandler.handle(context, nod = b[6] == 0x01)
            }
            AppleProtocolSpec.OPCODE_CONVERSATION -> if (b.size >= 10 && IBridgeStateStore.state.value.conversationAwareness) {
                ducker.onSpeechLevel(b[9])
            }
            AppleProtocolSpec.OPCODE_FIT_TEST -> if (b.size >= 8) {
                IBridgeStateStore.update { it.copy(fitTestResult = (b[6] == 0x00) to (b[7] == 0x00)) }
            }
        }
    }

    /** 04 00 04 00 04 00 [count] ([component] 01 [level] [status] 01)* — 0x02 right, 0x04 left, 0x08 case. */
    private fun parseBattery(b: IntArray) {
        val count = b.getOrNull(6) ?: return
        var s = IBridgeStateStore.state.value
        for (i in 0 until count) {
            val base = 7 + i * 5
            if (base + 3 >= b.size) break
            val level = b[base + 2].takeIf { it in 0..100 } ?: -1
            val charging = b[base + 3] == 0x01
            s = when (b[base]) {
                0x04 -> s.copy(leftBattery = level, leftCharging = charging)
                0x02 -> s.copy(rightBattery = level, rightCharging = charging)
                0x08 -> s.copy(caseBattery = level, caseCharging = charging)
                else -> s
            }
        }
        val next = s
        IBridgeStateStore.update { next }
    }

    private fun send(bytes: ByteArray, onSent: () -> Unit = {}) {
        val current = IBridgeStateStore.state.value
        if (current.isPreview) { onSent(); return }
        val sock = socket ?: return
        scope.launch(Dispatchers.IO) {
            writeLock.withLock {
                runCatching {
                    sock.outputStream.write(bytes)
                    sock.outputStream.flush()
                }.onSuccess { onSent() }.onFailure { Log.w(TAG, "AAP write failed", it) }
            }
        }
    }

    private fun ByteArray.withValue(value: Int): ByteArray = copyOf().also { if (it.size > 7) it[7] = value.toByte() }

    fun setListeningMode(mode: ListeningMode) {
        val bytes = rules.opcode(mode.opcodeKey) ?: AppleProtocolSpec.modeCommand(mode)
        send(bytes) { IBridgeStateStore.update { it.copy(listeningMode = mode) } }
    }

    fun cycleListeningMode(): ListeningMode? {
        val s = IBridgeStateStore.state.value
        val supported = s.model?.caps?.supportedModes.orEmpty()
        if (!s.connected || supported.isEmpty()) return null
        val idx = supported.indexOf(s.listeningMode)
        val next = supported[(idx + 1).mod(supported.size)]
        setListeningMode(next)
        return next
    }

    fun setConversationAwareness(on: Boolean) {
        val base = rules.opcode("conversation_awareness") ?: AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_CONVERSATION_AWARENESS, 1)
        send(base.withValue(if (on) 1 else 2)) { IBridgeStateStore.update { it.copy(conversationAwareness = on) } }
    }

    fun setPersonalizedVolume(on: Boolean) {
        val base = rules.opcode("personalized_volume") ?: AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_PERSONALIZED_VOLUME, 1)
        send(base.withValue(if (on) 1 else 2)) { IBridgeStateStore.update { it.copy(personalizedVolume = on) } }
    }

    fun setHeadGestures(on: Boolean) =
        send(AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_HEAD_GESTURES, if (on) 1 else 2)) { IBridgeStateStore.update { it.copy(headGestures = on) } }

    fun setLoudSoundReduction(on: Boolean) = send(AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_LOUD_SOUND_REDUCTION, if (on) 1 else 2))

    fun setStemAction(left: Boolean, action: StemAction) {
        // Value byte encodes side in the high nibble: 0x1_ left, 0x2_ right.
        val value = (if (left) 0x10 else 0x20) or action.aapValue
        send(AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_STEM_LONG_PRESS, value))
    }

    fun setCrownReversed(reversed: Boolean) = send(AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_CROWN_DIRECTION, if (reversed) 2 else 1))

    fun startFitTest() {
        IBridgeStateStore.update { it.copy(fitTestResult = null) }
        send(AppleProtocolSpec.FIT_TEST_START) {
            if (IBridgeStateStore.state.value.isPreview) scope.launch {
                delay(3_000)
                IBridgeStateStore.update { it.copy(fitTestResult = true to true) }
            }
        }
    }

    fun playChirp(target: ChirpTarget?) = send(AppleProtocolSpec.controlCommand(AppleProtocolSpec.SETTING_FIND_MY_CHIRP, target?.aapValue ?: 0))
}

/** In-ear optical detection → Android media pause / resume. */
class MediaAutoPauseController(private val context: Context) {
    private val audio = context.getSystemService(AudioManager::class.java)

    fun onEarStateChanged(wasLeft: Boolean, wasRight: Boolean, left: Boolean, right: Boolean) {
        val removed = (wasLeft && !left) || (wasRight && !right)
        val bothIn = left && right
        val pausedByUs = IBridgeStateStore.state.value.pausedByEar
        when {
            removed && audio.isMusicActive -> {
                MediaKeys.send(context, KeyEvent.KEYCODE_MEDIA_PAUSE)
                IBridgeStateStore.update { it.copy(pausedByEar = true) }
            }
            bothIn && pausedByUs -> {
                MediaKeys.send(context, KeyEvent.KEYCODE_MEDIA_PLAY)
                IBridgeStateStore.update { it.copy(pausedByEar = false) }
            }
        }
    }
}

/** Sends a media button press to the active media session. */
object MediaKeys {
    fun send(context: Context, code: Int) {
        val audio = context.getSystemService(AudioManager::class.java) ?: return
        val now = SystemClock.uptimeMillis()
        audio.dispatchMediaKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, code, 0))
        audio.dispatchMediaKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, code, 0))
    }
}

/** Conversation Awareness: lowers media volume while the wearer speaks. */
class ConversationDucker(context: Context) {
    private val audio = context.getSystemService(AudioManager::class.java)
    private var restoreVolume: Int? = null

    fun onSpeechLevel(level: Int) {
        if (level in 1..2 && restoreVolume == null) {
            val current = audio.getStreamVolume(AudioManager.STREAM_MUSIC)
            restoreVolume = current
            audio.setStreamVolume(AudioManager.STREAM_MUSIC, (current * 0.25f).toInt().coerceAtLeast(1), 0)
        } else if (level >= 8) {
            restoreVolume?.let { audio.setStreamVolume(AudioManager.STREAM_MUSIC, it, 0) }
            restoreVolume = null
        }
    }
}

/** Head Gestures: nod answers, shake declines (requires ANSWER_PHONE_CALLS). */
object HeadGestureHandler {
    @SuppressLint("MissingPermission")
    @Suppress("DEPRECATION")
    fun handle(context: Context, nod: Boolean) {
        val telecom = context.getSystemService(TelecomManager::class.java) ?: return
        runCatching { if (nod) telecom.acceptRingingCall() else telecom.endCall() }
            .onFailure { Log.w(TAG, "Head gesture call action failed", it) }
    }
}

/** Process-wide singletons wired with the application context. */
object InaGraph {
    val appScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile private var rules: OtaProtocolRuleManager? = null
    @Volatile private var settings: InaSettingsStore? = null
    @Volatile private var controller: AirPodsProController? = null
    @Volatile private var otherDevices: OtherDeviceHub? = null

    fun otherDevices(context: Context): OtherDeviceHub =
        otherDevices ?: synchronized(this) { otherDevices ?: OtherDeviceHub(context.applicationContext).also { otherDevices = it } }

    fun rules(context: Context): OtaProtocolRuleManager =
        rules ?: synchronized(this) { rules ?: OtaProtocolRuleManager(context.applicationContext).also { rules = it } }

    fun settings(context: Context): InaSettingsStore =
        settings ?: synchronized(this) { settings ?: InaSettingsStore(context.applicationContext).also { settings = it } }

    fun controller(context: Context): AirPodsProController =
        controller ?: synchronized(this) {
            controller ?: AirPodsProController(context.applicationContext, rules(context), appScope).also { c ->
                c.settingsProvider = { settings(context).settings.value }
                controller = c
            }
        }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. BLUETOOTH LINK HELPERS — bonded AirPods, ACL state, classic L2CAP sockets
 * ═══════════════════════════════════════════════════════════════════════════ */

@SuppressLint("MissingPermission")
object BluetoothLink {
    private const val TYPE_L2CAP = 3
    private val APPLE_AUDIO = Regex("(?i).*(airpods|beats|powerbeats).*")
    @Volatile private var exempted = false

    /** Lets reflection reach BluetoothSocket / BluetoothDevice internals (no root needed). */
    fun allowHiddenApis() {
        if (exempted) return
        exempted = runCatching { HiddenApiBypass.addHiddenApiExemptions("Landroid/bluetooth/") }.getOrDefault(false)
    }

    fun isAppleAudio(device: BluetoothDevice): Boolean = runCatching { device.name }.getOrNull()?.matches(APPLE_AUDIO) == true

    /** AirPods / Beats already paired in Android Bluetooth settings, best match for [modelName] first. */
    fun bondedAppleAudio(context: Context, modelName: String?): List<BluetoothDevice> {
        val adapter = context.getSystemService(android.bluetooth.BluetoothManager::class.java)?.adapter ?: return emptyList()
        val bonded = runCatching { adapter.bondedDevices.orEmpty().filter(::isAppleAudio) }.getOrDefault(emptyList())
        val words = modelName?.lowercase()?.split(" ", "(", ")")?.filter { it.length > 1 }.orEmpty()
        return bonded.sortedByDescending { d ->
            val name = runCatching { d.name }.getOrNull()?.lowercase().orEmpty()
            (if (isAclConnected(d)) 100 else 0) + words.count { it in name }
        }
    }

    /** BluetoothDevice#isConnected is hidden; when it can't be read, assume the link is up. */
    fun isAclConnected(device: BluetoothDevice): Boolean {
        allowHiddenApis()
        return runCatching { BluetoothDevice::class.java.getMethod("isConnected").invoke(device) as Boolean }.getOrDefault(true)
    }

    /** Candidate classic L2CAP sockets, covering the BluetoothSocket constructors of Android 10–16. */
    fun classicL2capSockets(device: BluetoothDevice, psm: Int): Sequence<BluetoothSocket> = sequence {
        allowHiddenApis()
        val uuid = ParcelUuid.fromString(AppleProtocolSpec.AAP_UUID)
        val argSets: List<Array<Any?>> = listOf(
            arrayOf(device, TYPE_L2CAP, true, true, psm, uuid),
            arrayOf(device, TYPE_L2CAP, true, true, psm, uuid, false, false),
            arrayOf(TYPE_L2CAP, -1, true, true, device, psm, uuid),
            arrayOf(TYPE_L2CAP, -1, true, true, device, psm, uuid, false, false),
            arrayOf(TYPE_L2CAP, true, true, device, psm, uuid),
        )
        val constructors = runCatching { BluetoothSocket::class.java.declaredConstructors.toList() }.getOrDefault(emptyList())
        for (ctor in constructors) {
            for (args in argSets) {
                if (ctor.parameterCount != args.size) continue
                val socket = runCatching {
                    ctor.isAccessible = true
                    ctor.newInstance(*args) as BluetoothSocket
                }.getOrNull()
                if (socket != null) yield(socket)
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. DESIGN SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════ */

@Immutable
data class InaPalette(
    val isLight: Boolean,
    val background: Color,
    val card: Color,
    val elevated: Color,
    val primary: Color,
    val success: Color,
    val warning: Color,
    val destructive: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val hairline: Color,
    val iconTile: Color,
)

/** Original Apple dark palette. */
val DarkPalette = InaPalette(
    isLight = false,
    background = Color(0xFF111114),
    card = Color(0xFF1C1C1F),
    elevated = Color(0xFF2A2A2E),
    primary = Color(0xFF0A84FF),
    success = Color(0xFF30D158),
    warning = Color(0xFFFF9F0A),
    destructive = Color(0xFFFF453A),
    textPrimary = Color(0xFFF5F5F7),
    textSecondary = Color(0xFF9A9AA2),
    hairline = Color(0x17FFFFFF),
    iconTile = Color(0xFF3A3A3F),
)

/** Apple light palette: grouped grey background, white cards, same single blue accent. */
val LightPalette = InaPalette(
    isLight = true,
    background = Color(0xFFF2F2F7),
    card = Color(0xFFFFFFFF),
    elevated = Color(0xFFE9E9EE),
    primary = Color(0xFF007AFF),
    success = Color(0xFF34C759),
    warning = Color(0xFFFF9500),
    destructive = Color(0xFFFF3B30),
    textPrimary = Color(0xFF111114),
    textSecondary = Color(0xFF6E6E73),
    hairline = Color(0x1F3C3C43),
    iconTile = Color(0xFF8E8E93),
)

/**
 * Colours read from the active palette. Backed by snapshot state, so composables and draw
 * lambdas that read them update when Appearance changes. [InaTheme] sets [palette].
 */
object InaColors {
    var palette: InaPalette by mutableStateOf(DarkPalette)

    val Background: Color get() = palette.background
    val Card: Color get() = palette.card
    val Elevated: Color get() = palette.elevated
    val Primary: Color get() = palette.primary
    val Success: Color get() = palette.success
    val Warning: Color get() = palette.warning
    val Destructive: Color get() = palette.destructive
    val TextPrimary: Color get() = palette.textPrimary
    val TextSecondary: Color get() = palette.textSecondary
    val Hairline: Color get() = palette.hairline
    val Purple: Color get() = palette.iconTile
    val Teal: Color get() = palette.iconTile
    val Orange: Color get() = palette.iconTile
}

@Composable
fun InaTheme(content: @Composable () -> Unit) {
    val settings by InaGraph.settings(LocalContext.current).settings.collectAsState()
    val dark = when (settings.appearance) {
        Appearance.SYSTEM -> isSystemInDarkTheme()
        Appearance.LIGHT -> false
        Appearance.DARK -> true
    }
    // Set before any child reads a colour, so this composition is already in the right palette.
    InaColors.palette = if (dark) DarkPalette else LightPalette
    val view = LocalView.current
    SideEffect {
        val window = (view.context as? Activity)?.window ?: return@SideEffect
        WindowCompat.getInsetsController(window, view).apply {
            isAppearanceLightStatusBars = !dark
            isAppearanceLightNavigationBars = !dark
        }
    }
    val glass = LocalGlass.current.copy(reduceTransparency = settings.reduceTransparency)
    CompositionLocalProvider(LocalGlass provides glass) { InaMaterialTheme(dark, content) }
}

@Composable
private fun InaMaterialTheme(dark: Boolean, content: @Composable () -> Unit) {
    val scheme = if (dark) {
        darkColorScheme(
            primary = InaColors.Primary,
            onPrimary = Color.White,
            background = InaColors.Background,
            onBackground = InaColors.TextPrimary,
            surface = InaColors.Card,
            onSurface = InaColors.TextPrimary,
            surfaceVariant = InaColors.Elevated,
            onSurfaceVariant = InaColors.TextSecondary,
            error = InaColors.Destructive,
        )
    } else {
        lightColorScheme(
            primary = InaColors.Primary,
            onPrimary = Color.White,
            background = InaColors.Background,
            onBackground = InaColors.TextPrimary,
            surface = InaColors.Card,
            onSurface = InaColors.TextPrimary,
            surfaceVariant = InaColors.Elevated,
            onSurfaceVariant = InaColors.TextSecondary,
            error = InaColors.Destructive,
        )
    }
    MaterialTheme(colorScheme = scheme, content = content)
}

/** Developer-only text: shown in debug builds, hidden from release builds. */
fun devOnly(text: String): String? = if (BuildConfig.DEBUG) text else null

/* ═══════════════════════════════════════════════════════════════════════════
 * 7. COMPOSE UI
 * ═══════════════════════════════════════════════════════════════════════════ */

interface InaActions {
    fun setMode(mode: ListeningMode)
    fun setConversationAwareness(on: Boolean)
    fun setPersonalizedVolume(on: Boolean)
    fun setHeadGestures(on: Boolean)
    fun updateSettings(transform: (InaSettings) -> InaSettings)
    fun startFitTest()
    fun playChirp(target: ChirpTarget?)
    fun setPreview(on: Boolean)
    fun disconnect()
    fun resumeMedia()
    fun syncRules()
    fun applyRulesJson(json: String): String?
    fun overridePsm(hex: String): String?
    fun registerModel(hex: String, name: String): String?
    fun removeModel(id: Int)
    fun resetRules()
}

@Immutable
data class OnboardingStatus(
    val bluetooth: Boolean = false,
    val overlay: Boolean = false,
    val companion: Boolean = false,
    val notifications: Boolean = false,
    val completed: Boolean = false,
)

enum class PermissionStep { BLUETOOTH, OVERLAY, COMPANION, NOTIFICATIONS }

interface PermissionActions {
    fun request(step: PermissionStep)
    fun finishOnboarding()
    fun restartOnboarding()
}

private enum class InaTab(val label: String, val icon: ImageVector) {
    DEVICE("Device", Icons.Rounded.Headphones),
    CONTROLS("Controls", Icons.Rounded.Tune),
    RULES("Rules", Icons.Rounded.DataObject),
    SETTINGS("Settings", Icons.Rounded.Settings),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InaApp(
    state: AirPodsState,
    rules: OtaRules,
    settings: InaSettings,
    onboarding: OnboardingStatus,
    inlinePopup: AirPodsState?,
    rulesSyncing: Boolean,
    actions: InaActions,
    permissions: PermissionActions,
    onPopupConnect: () -> Unit,
    onDismissPopup: () -> Unit,
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(InaColors.Background)
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        if (!onboarding.completed) {
            OnboardingWizard(onboarding, permissions)
            return@Box
        }
        val tabs = remember { InaTab.entries.filter { it != InaTab.RULES || BuildConfig.DEBUG } }
        var tab by rememberSaveable { mutableStateOf(InaTab.DEVICE) }
        var other by rememberSaveable { mutableStateOf<OtherDeviceKind?>(null) }
        // Liquid Glass: blur the app behind the in-app case pop-up (Android 12+, unless Reduce Transparency).
        val blurBackdrop = inlinePopup != null && !settings.reduceTransparency && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
        Box(Modifier.fillMaxSize().then(if (blurBackdrop) Modifier.blur(24.dp) else Modifier)) {
            val openOther = other
            when (tab) {
                InaTab.DEVICE -> when {
                    openOther != null -> OtherDeviceScreen(openOther, onClose = { other = null })
                    state.connected -> DeviceScreen(state, actions, onOpenControls = { tab = InaTab.CONTROLS })
                    else -> ConnectDeviceScreen(state, actions, onOpenOther = { other = it })
                }
                InaTab.CONTROLS -> ControlsScreen(state, settings, actions)
                InaTab.RULES -> RulesScreen(rules, rulesSyncing, actions)
                InaTab.SETTINGS -> SettingsScreen(state, settings, onboarding, actions, permissions)
            }
            // Floating Liquid Glass tab bar, the same as the simulator's; screens scroll under it.
            FloatingTabBar(
                items = tabs.map { it.label to it.icon },
                selected = tabs.indexOf(tab),
                onSelect = { tab = tabs[it] },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
        if (inlinePopup != null) {
            val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ModalBottomSheet(
                onDismissRequest = onDismissPopup,
                sheetState = sheetState,
                containerColor = Color.Transparent,
                scrimColor = Color.Black.copy(alpha = if (settings.reduceTransparency) 0.62f else 0.3f),
                dragHandle = null,
            ) {
                CompositionLocalProvider(LocalGlass provides LocalGlass.current.copy(backdropBlurred = blurBackdrop)) {
                    AppleCaseOpenPopupSheet(
                        state = if (inlinePopup.modelId == state.modelId) state else inlinePopup,
                        stage = if (state.connected) PopupStage.INFO_PAIRED else PopupStage.INFO_UNPAIRED,
                        pairingStep = 0,
                        onConnect = onPopupConnect,
                        onDismiss = onDismissPopup,
                        modifier = Modifier.padding(8.dp),
                    )
                }
            }
        }
    }
}

/* ---------- Shared building blocks ---------- */

@Composable
fun ProductArtImage(key: ProductArtKey, contentDescription: String?, modifier: Modifier = Modifier) {
    Image(painter = painterResource(key.drawable), contentDescription = contentDescription, contentScale = ContentScale.Fit, modifier = modifier)
}

@Composable
fun BatteryRing(level: Int, charging: Boolean, label: String, size: Dp = 72.dp, stroke: Dp = 6.dp) {
    val known = level in 0..100
    val progress by animateFloatAsState(if (known) level / 100f else 0f, tween(700), label = "battery")
    val color = if (known && level <= 20) InaColors.Warning else InaColors.Success
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(size), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                val w = stroke.toPx()
                drawArc(InaColors.Hairline.copy(alpha = 0.18f), 0f, 360f, false, style = Stroke(w))
                if (known) drawArc(color, -90f, 360f * progress, false, style = Stroke(w, cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (charging && known) Icon(Icons.Rounded.Bolt, contentDescription = "Charging", tint = InaColors.Success, modifier = Modifier.size(14.dp))
                Text(
                    formatBattery(level),
                    color = if (known) InaColors.TextPrimary else InaColors.TextSecondary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = (size.value * 0.22f).sp,
                    maxLines = 1,
                    softWrap = false,
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(label, color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, softWrap = false)
    }
}

@Composable
private fun LargeTitle(title: String, subtitle: String? = null) {
    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 12.dp)) {
        Text(title, color = InaColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (subtitle != null) Text(subtitle, color = InaColors.TextSecondary, fontSize = 13.sp)
    }
}

@Composable
internal fun Card(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(InaColors.Card),
        content = content,
    )
}

@Composable
internal fun SectionTitle(text: String) {
    Text(
        text.uppercase(),
        color = InaColors.TextSecondary,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(start = 28.dp, end = 28.dp, top = 20.dp, bottom = 6.dp),
    )
}

/** Title uses weight(1f).padding(end = 12.dp); value uses maxLines = 1, softWrap = false. */
@Composable
internal fun SettingRow(
    title: String,
    detail: String? = null,
    value: String? = null,
    icon: ImageVector? = null,
    tint: Color = InaColors.Primary,
    onClick: (() -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Box(Modifier.size(28.dp).clip(RoundedCornerShape(8.dp)).background(tint), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = if (tint.luminance() > 0.6f) InaColors.TextPrimary else Color.White, modifier = Modifier.size(16.dp))
            }
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, color = InaColors.TextPrimary, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (detail != null) Text(detail, color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (value != null) Text(value, color = InaColors.TextSecondary, fontSize = 14.sp, maxLines = 1, softWrap = false)
        trailing?.invoke()
    }
}

@Composable
internal fun ToggleRow(title: String, detail: String?, checked: Boolean, icon: ImageVector, tint: Color, onChange: (Boolean) -> Unit) {
    SettingRow(title = title, detail = detail, icon = icon, tint = tint, onClick = { onChange(!checked) }) {
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            colors = SwitchDefaults.colors(checkedTrackColor = InaColors.Success, checkedThumbColor = Color.White),
        )
    }
}

@Composable
private fun PreviewToggleCard(state: AirPodsState, actions: InaActions) {
    if (!BuildConfig.DEBUG) return
    Row(
        Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(InaColors.Primary.copy(alpha = 0.12f))
            .border(1.dp, InaColors.Primary.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text("Preview Connected UI · debug", color = InaColors.TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1)
            Text("Explore the connected screens with simulated accessory values.", color = InaColors.TextSecondary, fontSize = 12.sp)
        }
        Switch(checked = state.isPreview, onCheckedChange = actions::setPreview)
    }
}

@Composable
fun ModeSelector(selected: ListeningMode, supported: List<ListeningMode>, onSelect: (ListeningMode) -> Unit, compact: Boolean = false) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        supported.forEach { mode ->
            val active = mode == selected
            Column(
                Modifier
                    .weight(1f)
                    .height(if (compact) 48.dp else 68.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (active) InaColors.TextPrimary else InaColors.TextPrimary.copy(alpha = 0.08f))
                    .clickable { onSelect(mode) },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    when (mode) {
                        ListeningMode.ANC -> Icons.Rounded.HearingDisabled
                        ListeningMode.TRANSPARENCY -> Icons.Rounded.Hearing
                        ListeningMode.ADAPTIVE -> Icons.Rounded.AutoAwesome
                        ListeningMode.OFF -> Icons.Rounded.Block
                    },
                    contentDescription = null,
                    tint = if (active) InaColors.Background else InaColors.TextPrimary,
                    modifier = Modifier.size(if (compact) 16.dp else 20.dp),
                )
                Text(
                    mode.shortLabel,
                    color = if (active) InaColors.Background else InaColors.TextPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    softWrap = false,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/* ---------- Onboarding & permission wizard ---------- */

private data class PermissionPage(val step: PermissionStep, val title: String, val body: String, val tech: String, val icon: ImageVector, val tint: Color)

private val PERMISSION_PAGES = listOf(
    PermissionPage(PermissionStep.BLUETOOTH, "Find nearby Apple devices", "iNA listens for the Continuity broadcast your case sends when it opens, then opens a private control channel to your AirPods.", "BLUETOOTH_SCAN · BLUETOOTH_CONNECT · BLE 0x004C · L2CAP 0x1001", Icons.Rounded.Bluetooth, InaColors.Primary),
    PermissionPage(PermissionStep.OVERLAY, "Show the case-open pop-up", "Lets the battery pop-up slide up over your Home Screen or any app — exactly like on iPhone — even when iNA is closed.", "SYSTEM_ALERT_WINDOW · TYPE_APPLICATION_OVERLAY", Icons.Rounded.Layers, InaColors.Purple),
    PermissionPage(PermissionStep.COMPANION, "Stay connected in the background", "Registers your accessory as a companion device and exempts iNA from battery optimisation so the listener is never killed.", "CompanionDeviceManager · REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", Icons.Rounded.BatteryChargingFull, InaColors.Success),
    PermissionPage(PermissionStep.NOTIFICATIONS, "Mirror notifications to Apple Watch", "Forwards Android notifications to Apple Watch over ANCS and powers the live status notification.", "BIND_NOTIFICATION_LISTENER_SERVICE · POST_NOTIFICATIONS", Icons.Rounded.Notifications, InaColors.Orange),
)

private fun OnboardingStatus.granted(step: PermissionStep) = when (step) {
    PermissionStep.BLUETOOTH -> bluetooth
    PermissionStep.OVERLAY -> overlay
    PermissionStep.COMPANION -> companion
    PermissionStep.NOTIFICATIONS -> notifications
}

@Composable
fun OnboardingWizard(status: OnboardingStatus, permissions: PermissionActions) {
    var index by rememberSaveable { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        when {
            index == 0 -> {
                Spacer(Modifier.height(24.dp))
                Text("Your Apple gear,\nat home on Android.", color = InaColors.TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.Bold, lineHeight = 38.sp)
                Spacer(Modifier.height(12.dp))
                Text("Case-open pop-ups, noise control, ear detection and more — for AirPods, Beats, Apple Watch and AirTag. No root.", color = InaColors.TextSecondary, fontSize = 15.sp)
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    ProductArtImage(ProductArtKey.AIRPODS_PRO, "AirPods Pro", Modifier.size(200.dp))
                }
                PrimaryButton("Get Started") { index = 1 }
            }
            index > PERMISSION_PAGES.size -> {
                Spacer(Modifier.height(24.dp))
                Text("You're all set", color = InaColors.TextPrimary, fontSize = 32.sp, fontWeight = FontWeight.Bold)
                Text("Open your AirPods case near the phone — the pop-up appears even when iNA is closed.", color = InaColors.TextSecondary, fontSize = 15.sp)
                Spacer(Modifier.height(20.dp))
                PERMISSION_PAGES.forEach { p ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(16.dp)).background(InaColors.Card).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(p.title, color = InaColors.TextPrimary, fontSize = 14.sp, modifier = Modifier.weight(1f).padding(end = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        val ok = status.granted(p.step)
                        Text(if (ok) "Allowed" else "Skipped", color = if (ok) InaColors.Success else InaColors.Warning, fontSize = 12.sp, maxLines = 1, softWrap = false)
                    }
                }
                Spacer(Modifier.weight(1f))
                PrimaryButton("Continue") { permissions.finishOnboarding() }
            }
            else -> {
                val page = PERMISSION_PAGES[index - 1]
                val granted = status.granted(page.step)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    PERMISSION_PAGES.forEachIndexed { i, _ ->
                        Box(Modifier.weight(1f).height(4.dp).clip(CircleShape).background(if (i < index) InaColors.Primary else InaColors.Hairline))
                    }
                }
                Spacer(Modifier.height(40.dp))
                Box(Modifier.size(64.dp).clip(RoundedCornerShape(20.dp)).background(page.tint), contentAlignment = Alignment.Center) {
                    Icon(page.icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                }
                Spacer(Modifier.height(20.dp))
                Text(page.title, color = InaColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold, lineHeight = 32.sp)
                Spacer(Modifier.height(12.dp))
                Text(page.body, color = InaColors.TextSecondary, fontSize = 15.sp)
                Spacer(Modifier.height(16.dp))
                devOnly(page.tech)?.let { Text(it, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace) }
                Spacer(Modifier.weight(1f))
                if (granted) PrimaryButton("Allowed · Continue") { index++ }
                else {
                    PrimaryButton("Allow") { permissions.request(page.step) }
                    TextButton(onClick = { index++ }, modifier = Modifier.fillMaxWidth()) { Text("Not now", color = InaColors.TextSecondary) }
                }
            }
        }
    }
}

@Composable
private fun PrimaryButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = InaColors.Primary),
    ) { Text(text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, maxLines = 1) }
}

/* ---------- Connect a Device + Learn More ---------- */

private data class FamilyInfo(val title: String, val range: String, val art: ProductArtKey, val family: ModelFamily?, val fixedModels: List<String>, val features: List<String>)

private val LEARN_MORE = listOf(
    FamilyInfo("AirPods", "AirPods 1 – 5", ProductArtKey.AIRPODS_4, ModelFamily.AIRPODS, emptyList(), listOf("Case-open pop-up", "L / R / Case battery", "In-ear auto-pause", "ANC & Conversation Awareness (ANC models)")),
    FamilyInfo("AirPods Pro", "AirPods Pro 1 – 3", ProductArtKey.AIRPODS_PRO, ModelFamily.AIRPODS_PRO, emptyList(), listOf("ANC · Transparency · Adaptive · Off", "Personalized Volume", "Head Gestures", "Ear Tip Fit Test", "Case speaker chirp")),
    FamilyInfo("AirPods Max", "AirPods Max 1 – 2", ProductArtKey.AIRPODS_MAX, ModelFamily.AIRPODS_MAX, emptyList(), listOf("Smart Case pop-up", "Digital Crown direction", "On-head auto-pause")),
    FamilyInfo("Beats", "Solo · Studio · Fit Pro · Powerbeats", ProductArtKey.BEATS_FIT_PRO, ModelFamily.BEATS, emptyList(), listOf("Home Screen pop-up", "Battery", "ANC / Transparency")),
    FamilyInfo("Apple Watch", "Series 4 – 11 · SE · Ultra", ProductArtKey.APPLE_WATCH, null, listOf("Series 4–11", "SE 1–3", "Ultra 1–3"), listOf("ANCS notification mirroring", "AMS Now Playing", "Heart Rate 0x180D")),
    FamilyInfo("AirTag", "AirTag 1 – 2", ProductArtKey.AIRTAG, null, listOf("AirTag", "AirTag 2"), listOf("RSSI radar", "UWB distance & direction", "Play sound")),
    FamilyInfo("HomePod", "HomePod & HomePod mini", ProductArtKey.HOMEPOD, null, listOf("HomePod 1–2", "HomePod mini 1–2"), listOf("mDNS discovery", "Stereo pair status")),
)

@Composable
fun ConnectDeviceScreen(state: AirPodsState, actions: InaActions, onOpenOther: (OtherDeviceKind) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        LargeTitle("Connect a Device", "Bring your Apple accessory close to this phone.")
        Card {
            Box(Modifier.fillMaxWidth().height(208.dp), contentAlignment = Alignment.Center) {
                RadarRings()
                ProductArtImage(ProductArtKey.AIRPODS_PRO, "AirPods Pro", Modifier.size(128.dp))
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(InaColors.Hairline))
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                PulseDot()
                Spacer(Modifier.width(8.dp))
                Text("Searching for nearby Apple accessories…", color = InaColors.TextPrimary, fontSize = 13.sp, modifier = Modifier.weight(1f).padding(end = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                devOnly("0x004C · 0x07")?.let { Text(it, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, softWrap = false) }
            }
        }
        Spacer(Modifier.height(16.dp))
        Card {
            Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceAround) {
                // Disconnected: always -1 → "--%". The phone's own battery is never shown here.
                BatteryRing(-1, false, "Left", 64.dp)
                BatteryRing(-1, false, "Right", 64.dp)
                BatteryRing(-1, false, "Case", 64.dp)
            }
            Text(
                "Battery levels appear once an accessory connects. iNA never shows your phone's battery in their place.",
                color = InaColors.TextSecondary, fontSize = 12.sp, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
            )
        }
        Spacer(Modifier.height(16.dp))
        ConnectSteps()
        if (BuildConfig.DEBUG) {
            Spacer(Modifier.height(16.dp))
            PreviewToggleCard(state, actions)
        }
        OtherDevicesList(onOpenOther)
        Spacer(Modifier.height(24.dp))
        LearnMoreSection {
            Column {
                LEARN_MORE.forEachIndexed { i, f -> LearnMoreFamily(f, startExpanded = i == 1); Spacer(Modifier.height(8.dp)) }
            }
        }
    }
}

@Composable
private fun LearnMoreFamily(f: FamilyInfo, startExpanded: Boolean = false) {
    var expanded by rememberSaveable(f.title) { mutableStateOf(startExpanded) }
    Card {
        Row(Modifier.fillMaxWidth().clickable { expanded = !expanded }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            ProductArtImage(f.art, f.title, Modifier.size(52.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f).padding(end = 12.dp)) {
                Text(f.title, color = InaColors.TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1)
                Text(f.range, color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Rounded.ExpandMore, contentDescription = null, tint = InaColors.TextSecondary)
        }
        AnimatedVisibility(expanded) {
            Column(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                val names = f.family?.let { fam -> AppleProtocolSpec.MODEL_DATABASE.values.filter { it.family == fam }.sortedBy { it.id }.map { if (BuildConfig.DEBUG) "${it.name} · ${AppleProtocolSpec.hex(it.id)}" else it.name } } ?: f.fixedModels
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    names.forEach { n ->
                        Text(n, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = if (BuildConfig.DEBUG) FontFamily.Monospace else FontFamily.Default, maxLines = 1, softWrap = false,
                            modifier = Modifier.clip(CircleShape).background(InaColors.Hairline).padding(horizontal = 8.dp, vertical = 3.dp))
                    }
                }
                f.features.forEach { Text("• $it", color = InaColors.TextPrimary, fontSize = 13.sp) }
            }
        }
    }
}

/* ---------- Connected device dashboard ---------- */

@Composable
fun DeviceScreen(state: AirPodsState, actions: InaActions, onOpenControls: () -> Unit) {
    val model = state.model
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(if (state.isPreview) InaColors.Warning else InaColors.Success))
            Spacer(Modifier.width(8.dp))
            val status = when {
                state.isPreview -> "Preview · simulated values"
                BuildConfig.DEBUG -> "Connected · ${state.linkTier.label}"
                else -> state.linkTier.userLabel
            }
            Text(status, color = InaColors.TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(1f).padding(end = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
            devOnly(AppleProtocolSpec.hex(state.modelId))?.let { Text(it, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, softWrap = false) }
        }
        Text(model?.name ?: "Apple accessory", color = InaColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 20.dp))
        SuggestedActionCard(state, actions, onOpenControls)
        if (!state.isPreview && state.linkTier == LinkTier.BLE_ONLY) {
            Text(
                "Battery and case status work. Noise control needs a direct link this phone's Bluetooth didn't allow; reconnect from the pop-up to try again.",
                color = InaColors.TextSecondary, fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )
        }
        Box(Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(200.dp).stage(), contentAlignment = Alignment.Center) {
            ProductArtImage(model?.art ?: ProductArtKey.AIRPODS_PRO, model?.name, Modifier.size(180.dp).floating())
        }
        Card {
            Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.SpaceAround) {
                if (model?.caps?.hasCase == false) {
                    BatteryRing(state.leftBattery, state.leftCharging, "Battery", 84.dp)
                } else {
                    BatteryRing(state.leftBattery, state.leftCharging, "Left")
                    BatteryRing(state.rightBattery, state.rightCharging, "Right")
                    BatteryRing(state.caseBattery, state.caseCharging, "Case")
                }
            }
        }
        // Without the control channel, mode buttons would do nothing, so they are hidden.
        val canControl = state.isPreview || state.linkTier.hasControls
        val modes = if (canControl) model?.caps?.supportedModes.orEmpty() else emptyList()
        if (modes.isNotEmpty()) {
            Spacer(Modifier.height(16.dp))
            Card {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Listening Mode", color = InaColors.TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.weight(1f).padding(end = 12.dp), maxLines = 1)
                        Text(state.listeningMode.label, color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, softWrap = false)
                    }
                    Spacer(Modifier.height(12.dp))
                    ModeSelector(state.listeningMode, modes, actions::setMode)
                }
            }
        }
        if (modes.isEmpty() && model != null && model.caps.supportedModes.isEmpty()) {
            Text("${model.name} has no noise control hardware.", color = InaColors.TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
        }
        Spacer(Modifier.height(16.dp))
        AirPodsNowPlayingCard(state, onResume = actions::resumeMedia)
        Spacer(Modifier.height(8.dp))
        EarStatusRow(state)
        if (canControl && model != null && (model.caps.conversationAwareness || model.caps.personalizedVolume)) {
            SectionTitle("Hearing")
            Card {
                if (model.caps.conversationAwareness) ToggleRow("Conversation Awareness", if (BuildConfig.DEBUG) "Lowers media when you speak · 0x28" else "Lowers media when you speak", state.conversationAwareness, Icons.Rounded.Hearing, InaColors.Teal, actions::setConversationAwareness)
                if (model.caps.personalizedVolume) ToggleRow("Personalized Volume", if (BuildConfig.DEBUG) "Adapts to your environment · 0x26" else "Adapts to your environment", state.personalizedVolume, Icons.Rounded.Tune, InaColors.Primary, actions::setPersonalizedVolume)
            }
        }
        Spacer(Modifier.height(16.dp))
        Row(Modifier.padding(horizontal = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val secondary = ButtonDefaults.buttonColors(containerColor = InaColors.Elevated, contentColor = InaColors.TextPrimary)
            Button(onClick = onOpenControls, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(16.dp), colors = secondary) {
                Icon(Icons.Rounded.Tune, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("All controls", fontSize = 14.sp, maxLines = 1, softWrap = false)
            }
            Button(onClick = actions::disconnect, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(16.dp), colors = secondary) {
                Text(if (state.isPreview) "Exit preview" else "Disconnect", color = InaColors.Destructive, fontSize = 14.sp, maxLines = 1, softWrap = false)
            }
        }
    }
}

/* ---------- Apple hardware feature controls ---------- */

@Composable
fun ControlsScreen(state: AirPodsState, settings: InaSettings, actions: InaActions) {
    val model = state.model
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        LargeTitle("Controls", model?.name)
        if (!state.connected || model == null) {
            Card { Text("Connect a device to adjust controls.", color = InaColors.TextSecondary, modifier = Modifier.padding(20.dp)) }
            if (BuildConfig.DEBUG) {
                Spacer(Modifier.height(16.dp))
                PreviewToggleCard(state, actions)
            }
            return@Column
        }
        val c = model.caps
        if (c.inEarDetection) {
            SectionTitle("Detection")
            Card { ToggleRow(if (c.hasCase) "Automatic Ear Detection" else "Automatic Head Detection", "Pauses when you take them out", settings.autoPause, Icons.Rounded.Hearing, InaColors.Success) { on -> actions.updateSettings { it.copy(autoPause = on) } } }
        }
        if (c.conversationAwareness || c.personalizedVolume || c.anc) {
            SectionTitle("Hearing")
            Card {
                if (c.conversationAwareness) ToggleRow("Conversation Awareness", if (BuildConfig.DEBUG) "0x28 · voice accelerometer" else "Lowers media when you speak", state.conversationAwareness, Icons.Rounded.Hearing, InaColors.Teal, actions::setConversationAwareness)
                if (c.personalizedVolume) ToggleRow("Personalized Volume", if (BuildConfig.DEBUG) "0x26 · environment-aware" else "Adapts to your environment", state.personalizedVolume, Icons.Rounded.Tune, InaColors.Primary, actions::setPersonalizedVolume)
                if (c.anc) ToggleRow("Loud Sound Reduction", "Limits sudden loud noise", settings.loudSoundReduction, Icons.Rounded.HearingDisabled, InaColors.Orange) { on -> actions.updateSettings { it.copy(loudSoundReduction = on) } }
            }
        }
        if (c.headGestures) {
            SectionTitle("Head Gestures")
            Card { ToggleRow("Head Gestures", "Nod Yes · Shake No", state.headGestures, Icons.Rounded.AutoAwesome, InaColors.Purple, actions::setHeadGestures) }
        }
        if (c.stemControls) {
            SectionTitle("Press and Hold")
            Card {
                StemPicker("Left", settings.stemLeft) { a -> actions.updateSettings { it.copy(stemLeft = a) } }
                StemPicker("Right", settings.stemRight) { a -> actions.updateSettings { it.copy(stemRight = a) } }
            }
        }
        if (c.digitalCrown) {
            SectionTitle("Digital Crown")
            Card { ToggleRow("Reverse direction", "Front to back raises volume", settings.crownReversed, Icons.Rounded.Tune, InaColors.Primary) { on -> actions.updateSettings { it.copy(crownReversed = on) } } }
        }
        if (c.fitTest) {
            SectionTitle("Ear Tip Fit Test")
            Card {
                val result = state.fitTestResult
                SettingRow(
                    title = if (result == null) "Begin Fit Test" else "Test again",
                    detail = result?.let { "Left ${if (it.first) "Good Seal" else "Adjust"} · Right ${if (it.second) "Good Seal" else "Adjust"}" } ?: "Both AirPods must be in your ears",
                    icon = Icons.Rounded.Check, tint = InaColors.Success, onClick = actions::startFitTest,
                )
            }
        }
        SectionTitle("Find My")
        Card {
            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val targets = if (!c.hasCase) listOf(ChirpTarget.CASE) else if (c.caseSpeaker) ChirpTarget.entries else listOf(ChirpTarget.LEFT, ChirpTarget.RIGHT)
                var playing by remember { mutableStateOf<ChirpTarget?>(null) }
                targets.forEach { t ->
                    val active = playing == t
                    Button(
                        onClick = { playing = if (active) null else t; actions.playChirp(playing) },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = if (active) InaColors.Primary else InaColors.Elevated),
                    ) {
                        Icon(if (active) Icons.Rounded.Stop else Icons.Rounded.NotificationsActive, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(if (!c.hasCase) "Play" else t.name.lowercase().replaceFirstChar { it.uppercase() }, fontSize = 12.sp, maxLines = 1, softWrap = false)
                    }
                }
            }
        }
    }
}

@Composable
private fun StemPicker(side: String, value: StemAction, onChange: (StemAction) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(side, color = InaColors.TextPrimary, fontSize = 15.sp, modifier = Modifier.width(52.dp), maxLines = 1)
        Row(Modifier.weight(1f).clip(RoundedCornerShape(10.dp)).background(InaColors.Hairline).padding(2.dp)) {
            StemAction.entries.forEach { a ->
                Text(
                    a.label,
                    color = if (a == value) InaColors.TextPrimary else InaColors.TextSecondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                    softWrap = false,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (a == value) (if (InaColors.palette.isLight) InaColors.Card else InaColors.Elevated) else Color.Transparent)
                        .clickable { onChange(a) }
                        .padding(vertical = 6.dp),
                )
            }
        }
    }
}

@Composable
internal fun <T> SegmentedPicker(options: List<T>, selected: T, label: (T) -> String, modifier: Modifier = Modifier, onSelect: (T) -> Unit) {
    Row(modifier.clip(RoundedCornerShape(10.dp)).background(InaColors.Hairline).padding(2.dp)) {
        options.forEach { o ->
            val active = o == selected
            Text(
                label(o),
                color = if (active) InaColors.TextPrimary else InaColors.TextSecondary,
                fontSize = 12.sp,
                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (active) (if (InaColors.palette.isLight) InaColors.Card else InaColors.Elevated) else Color.Transparent)
                    .clickable { onSelect(o) }
                    .padding(vertical = 6.dp),
            )
        }
    }
}

/* ---------- OTA rule engine view ---------- */

@Composable
fun RulesScreen(rules: OtaRules, syncing: Boolean, actions: InaActions) {
    var psm by rememberSaveable(rules.l2capPsm) { mutableStateOf(AppleProtocolSpec.hex(rules.l2capPsm)) }
    var newId by rememberSaveable { mutableStateOf("0x2B20") }
    var newName by rememberSaveable { mutableStateOf("AirPods Pro 4") }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf(rules.rawJson) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        LargeTitle("Protocol Rules", "OtaProtocolRuleManager")
        Card {
            SettingRow("Rules v${rules.version}", "Signature: ${rules.signature}", icon = Icons.Rounded.Check, tint = InaColors.Success)
            Box(Modifier.padding(12.dp)) {
                Button(onClick = actions::syncRules, enabled = !syncing, modifier = Modifier.fillMaxWidth().height(44.dp), shape = RoundedCornerShape(12.dp)) {
                    if (syncing) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White) else Icon(Icons.Rounded.Refresh, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (syncing) "Syncing…" else "Sync OTA Rules")
                }
            }
        }
        SectionTitle("L2CAP PSM override")
        Card {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(psm, { psm = it }, singleLine = true, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions.Default)
                Spacer(Modifier.width(8.dp))
                Button(onClick = { error = actions.overridePsm(psm) }, shape = RoundedCornerShape(12.dp)) { Text("Apply") }
            }
        }
        SectionTitle("Model hot-registration")
        Card {
            Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(newId, { newId = it }, singleLine = true, modifier = Modifier.width(110.dp))
                OutlinedTextField(newName, { newName = it }, singleLine = true, modifier = Modifier.weight(1f))
            }
            TextButton(onClick = { error = actions.registerModel(newId, newName) }, modifier = Modifier.padding(horizontal = 4.dp)) {
                Icon(Icons.Rounded.Add, contentDescription = null); Text("Register model")
            }
            rules.models.toSortedMap().forEach { (id, name) ->
                SettingRow(name, "OTA model", AppleProtocolSpec.hex(id)) {
                    Icon(Icons.Rounded.Delete, contentDescription = "Remove", tint = InaColors.TextSecondary, modifier = Modifier.padding(start = 8.dp).clickable { actions.removeModel(id) })
                }
            }
        }
        error?.let { Text(it, color = InaColors.Destructive, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 28.dp, vertical = 6.dp)) }
        SectionTitle("Opcodes")
        Card {
            rules.opcodes.forEach { (k, v) ->
                Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Text(k, color = InaColors.TextPrimary, fontSize = 13.sp)
                    Text(v.toHex(), color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
        SectionTitle("Rule JSON")
        Card {
            if (editing) {
                OutlinedTextField(draft, { draft = it }, modifier = Modifier.fillMaxWidth().padding(8.dp), textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace))
                Row(Modifier.padding(8.dp)) {
                    TextButton(onClick = { editing = false }) { Text("Cancel") }
                    TextButton(onClick = { error = actions.applyRulesJson(draft); if (error == null) editing = false }) { Text("Apply") }
                }
            } else {
                Text(rules.rawJson, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(16.dp))
                Row(Modifier.padding(8.dp)) {
                    TextButton(onClick = { draft = rules.rawJson; editing = true }) { Text("Edit") }
                    TextButton(onClick = actions::resetRules) { Text("Reset") }
                }
            }
        }
    }
}

/* ---------- Settings ---------- */

@Composable
fun SettingsScreen(state: AirPodsState, settings: InaSettings, status: OnboardingStatus, actions: InaActions, permissions: PermissionActions) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        LargeTitle("Settings")
        PreviewToggleCard(state, actions)
        SectionTitle("Display")
        Card {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Appearance", color = InaColors.TextPrimary, fontSize = 15.sp, modifier = Modifier.padding(end = 12.dp), maxLines = 1)
                SegmentedPicker(Appearance.entries, settings.appearance, { it.label }, Modifier.weight(1f)) { a -> actions.updateSettings { it.copy(appearance = a) } }
            }
            ToggleRow(
                "Reduce Transparency",
                if (settings.reduceTransparency) "Solid surfaces" else "Liquid Glass",
                settings.reduceTransparency,
                Icons.Rounded.Contrast,
                InaColors.Elevated,
            ) { on -> actions.updateSettings { it.copy(reduceTransparency = on) } }
        }
        Text(
            "Makes the case pop-up and other sheets solid for higher contrast.",
            color = InaColors.TextSecondary, fontSize = 12.sp,
            modifier = Modifier.padding(start = 28.dp, end = 28.dp, top = 6.dp),
        )
        SectionTitle("Permissions")
        Card {
            PERMISSION_PAGES.forEach { p ->
                val ok = status.granted(p.step)
                SettingRow(p.title, devOnly(p.tech), if (ok) "Allowed" else "Allow", p.icon, p.tint, onClick = if (ok) null else ({ permissions.request(p.step) }))
            }
            SettingRow("Run setup again", icon = Icons.Rounded.Refresh, tint = InaColors.Elevated, onClick = permissions::restartOnboarding)
        }
        SectionTitle("Background")
        Card {
            SettingRow("Case pop-up listener", devOnly("IBridgeForegroundService · connectedDevice · BOOT_COMPLETED"), if (status.bluetooth) "On" else "Off", Icons.Rounded.Bolt, InaColors.Success)
        }
        Text(
            if (status.overlay) "Starts with your phone, so the case pop-up shows on the Home Screen without opening iNA."
            else "Allow \"Display over other apps\" above so the case pop-up can show on the Home Screen. Until then it arrives as a notification.",
            color = InaColors.TextSecondary, fontSize = 12.sp,
            modifier = Modifier.padding(start = 28.dp, end = 28.dp, top = 6.dp),
        )
        SectionTitle("About")
        Card { SettingRow("iNA", if (BuildConfig.DEBUG) "Debug build · dev.ibridge.android" else null, BuildConfig.VERSION_NAME) }
    }
}

/* ---------- Case-open proximity sheet (shared by overlay, activity and in-app) ---------- */

enum class PopupStage { INFO_PAIRED, INFO_UNPAIRED, PAIRING, DONE }

/** Connect steps: user wording first, developer detail (debug builds) second. */
val PAIRING_STEPS = listOf(
    "Finding your AirPods" to "bonded devices · CompanionDeviceManager",
    "Pairing" to "BluetoothDevice.createBond()",
    "Connecting audio" to "A2DP + HFP profile connect",
    "Turning on controls" to "L2CAP PSM 0x1001 · AAP handshake",
)

@Composable
fun AppleCaseOpenPopupSheet(
    state: AirPodsState,
    stage: PopupStage,
    pairingStep: Int,
    onConnect: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    message: String? = null,
    secondaryLabel: String? = null,
    onSecondary: () -> Unit = {},
) {
    val model = state.model
    Column(
        modifier
            .fillMaxWidth()
            .glassSurface(RoundedCornerShape(42.dp))
            .padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.fillMaxWidth()) {
            Text(
                model?.name ?: if (BuildConfig.DEBUG) "Apple accessory ${AppleProtocolSpec.hex(state.modelId)}" else "AirPods",
                color = InaColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
                modifier = Modifier.align(Alignment.Center).padding(horizontal = 40.dp),
            )
            Box(
                Modifier.align(Alignment.CenterEnd).size(32.dp).clip(CircleShape).background(InaColors.Hairline).clickable(onClick = onDismiss),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Close, contentDescription = "Close", tint = InaColors.TextSecondary, modifier = Modifier.size(16.dp)) }
        }
        Text(
            when (stage) {
                PopupStage.INFO_PAIRED -> if (state.connected) "Connected" else "Paired with this phone"
                PopupStage.INFO_UNPAIRED -> "Not connected to this phone"
                PopupStage.PAIRING -> "Connecting…"
                PopupStage.DONE -> "Connected to this phone"
            },
            color = InaColors.TextSecondary, fontSize = 12.sp,
        )
        ProductArtImage(model?.art ?: ProductArtKey.AIRPODS_PRO, model?.name, Modifier.padding(vertical = 12.dp).size(170.dp))
        if (stage == PopupStage.INFO_PAIRED || stage == PopupStage.DONE) {
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                if (model?.caps?.hasCase == false) {
                    BatteryRing(state.leftBattery, state.leftCharging, "Battery")
                } else {
                    BatteryRing(state.leftBattery, state.leftCharging, "Left")
                    BatteryRing(state.rightBattery, state.rightCharging, "Right")
                    BatteryRing(state.caseBattery, state.caseCharging, "Case")
                }
            }
        }
        if (stage == PopupStage.PAIRING) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PAIRING_STEPS.forEachIndexed { i, (label, tech) ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(20.dp).clip(CircleShape).background(if (i < pairingStep) InaColors.Success else InaColors.Hairline), contentAlignment = Alignment.Center) {
                            if (i < pairingStep) Icon(Icons.Rounded.Check, contentDescription = null, tint = InaColors.Background, modifier = Modifier.size(12.dp))
                            else if (i == pairingStep) CircularProgressIndicator(Modifier.size(12.dp), strokeWidth = 1.5.dp, color = InaColors.TextPrimary)
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(label, color = if (i <= pairingStep) InaColors.TextPrimary else InaColors.TextSecondary, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            devOnly(tech)?.let { Text(it, color = InaColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                        }
                    }
                }
                if (pairingStep == 0) {
                    Text(
                        "New AirPods? Keep the case open and hold its button until the light flashes white.",
                        color = InaColors.TextSecondary, fontSize = 12.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }
        if (message != null && stage != PopupStage.PAIRING) {
            Text(message, color = InaColors.TextPrimary, fontSize = 13.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
        }
        Spacer(Modifier.height(20.dp))
        when (stage) {
            PopupStage.INFO_UNPAIRED -> Button(onClick = onConnect, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(16.dp)) {
                Text(if (message != null) "Try Again" else "Connect", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            }
            PopupStage.INFO_PAIRED -> if (!state.connected) Button(onClick = onConnect, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(16.dp)) {
                Text("Connect", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            } else Button(
                onClick = onDismiss, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = InaColors.Elevated, contentColor = InaColors.TextPrimary),
            ) { Text("Done", fontWeight = FontWeight.SemiBold, fontSize = 16.sp) }
            PopupStage.DONE -> Button(
                onClick = onDismiss, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = InaColors.Elevated, contentColor = InaColors.TextPrimary),
            ) { Text("Done", fontWeight = FontWeight.SemiBold, fontSize = 16.sp) }
            PopupStage.PAIRING -> Unit
        }
        if (secondaryLabel != null && stage == PopupStage.INFO_UNPAIRED) {
            TextButton(onClick = onSecondary, modifier = Modifier.fillMaxWidth()) {
                Text(secondaryLabel, color = InaColors.Primary, fontSize = 14.sp)
            }
        }
    }
}
