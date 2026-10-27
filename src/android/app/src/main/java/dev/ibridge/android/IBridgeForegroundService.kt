package dev.ibridge.android

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.service.quicksettings.TileService
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Persistent `connectedDevice` foreground service. Listens for Apple Continuity 0x07 frames,
 * shows the case-open pop-up over any app, keeps the AAP link alive and publishes the live
 * status notification. Started from MainActivity and on BOOT_COMPLETED.
 */
@SuppressLint("MissingPermission")
class IBridgeForegroundService : LifecycleService() {

    private val bluetooth by lazy { getSystemService(BluetoothManager::class.java)?.adapter }
    private val notifications by lazy { getSystemService(NotificationManager::class.java) }
    private val controller by lazy { InaGraph.controller(this) }
    private lateinit var overlay: CaseOverlayWindow
    private var scanning = false

    override fun onCreate() {
        super.onCreate()
        overlay = CaseOverlayWindow(this)
        createChannels()
        startInForeground(buildStatusNotification(IBridgeStateStore.state.value))
        registerAclReceiver()
        startScan()

        // Keep the live status notification and Quick Settings tile in sync with the accessory.
        lifecycleScope.launch {
            IBridgeStateStore.state
                .map { s -> listOf(s.connected, s.modelId, s.leftBattery, s.rightBattery, s.caseBattery, s.leftCharging, s.rightCharging, s.caseCharging, s.listeningMode) }
                .distinctUntilChanged()
                .collect {
                    val s = IBridgeStateStore.state.value
                    notifications.notify(NOTIFICATION_ID, buildStatusNotification(s))
                    TileService.requestListeningState(this@IBridgeForegroundService, android.content.ComponentName(this@IBridgeForegroundService, InaQuickSettingsTileService::class.java))
                }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        when (intent?.action) {
            ACTION_SET_MODE -> intent.getStringExtra(EXTRA_MODE)?.let { name ->
                runCatching { ListeningMode.valueOf(name) }.getOrNull()?.let(controller::setListeningMode)
            }
            ACTION_CYCLE_MODE -> controller.cycleListeningMode()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopScan()
        runCatching { unregisterReceiver(aclReceiver) }
        overlay.dismiss()
        super.onDestroy()
    }

    private fun startInForeground(notification: Notification) {
        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE else 0,
            )
        } catch (e: SecurityException) {
            // Android 14+: connectedDevice requires BLUETOOTH_CONNECT/SCAN to be granted first.
            Log.w(TAG, "Cannot enter foreground yet", e)
            stopSelf()
        }
    }

    /* ---------- BLE Continuity scanner ---------- */

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) = handleAdvertisement(result)
        override fun onBatchScanResults(results: MutableList<ScanResult>) = results.forEach(::handleAdvertisement)
        override fun onScanFailed(errorCode: Int) {
            Log.w(TAG, "BLE scan failed: $errorCode")
            scanning = false
        }
    }

    private fun startScan() {
        val scanner = bluetooth?.bluetoothLeScanner ?: return
        if (scanning) return
        val filter = ScanFilter.Builder()
            .setManufacturerData(
                AppleProtocolSpec.APPLE_COMPANY_ID,
                byteArrayOf(AppleProtocolSpec.TYPE_PROXIMITY_PAIRING.toByte()),
                byteArrayOf(0xFF.toByte()),
            )
            .build()
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            .setReportDelay(0)
            .build()
        runCatching { scanner.startScan(listOf(filter), settings, scanCallback) }
            .onSuccess { scanning = true }
            .onFailure { Log.w(TAG, "startScan failed", it) }
    }

    private fun stopScan() {
        if (!scanning) return
        runCatching { bluetooth?.bluetoothLeScanner?.stopScan(scanCallback) }
        scanning = false
    }

    private fun handleAdvertisement(result: ScanResult) {
        val data = result.scanRecord?.getManufacturerSpecificData(AppleProtocolSpec.APPLE_COMPANY_ID) ?: return
        val packet = ProximityPacketParser.parse(data, result.rssi) ?: return
        val current = IBridgeStateStore.state.value
        // While your AirPods are connected, other people's AirPods nearby are ignored.
        if (current.connected && !current.isPreview && current.modelId >= 0 && packet.modelId != current.modelId) return
        IBridgeStateStore.mergeAdvertisement(packet)
        val now = SystemClock.elapsedRealtime()
        if (!CasePopupGate.isNewCaseOpen(packet, now)) return
        showCaseOpenPopup(IBridgeStateStore.state.value, now)
    }

    /**
     * Foreground → inline sheet. Home Screen / other apps → WindowManager overlay. Without the
     * "Display over other apps" permission, Android silently blocks background Activity starts
     * (no exception), so only apps with a companion association try the Activity; everyone
     * else gets a heads-up notification that opens the sheet.
     * [CasePopupGate] makes sure only one shows at a time and a closed pop-up stays closed.
     */
    private fun showCaseOpenPopup(state: AirPodsState, now: Long) {
        if (state.isPreview) return
        if (!CasePopupGate.tryOpen(state.modelId, now)) return
        when {
            IBridgeStateStore.appInForeground -> IBridgeStateStore.emitPopup(state)
            Settings.canDrawOverlays(this) -> overlay.show(state)
            hasCompanionAssociation() -> runCatching { startActivity(CasePopupOverlayActivity.popupIntent(this)) }
                .onFailure { postHeadsUpFallback(state) }
            else -> postHeadsUpFallback(state)
        }
    }

    @Suppress("DEPRECATION")
    private fun hasCompanionAssociation(): Boolean = runCatching {
        val cdm = getSystemService(android.companion.CompanionDeviceManager::class.java) ?: return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) cdm.myAssociations.isNotEmpty() else cdm.associations.isNotEmpty()
    }.getOrDefault(false)

    private fun postHeadsUpFallback(state: AirPodsState) {
        val n = NotificationCompat.Builder(this, CHANNEL_POPUP)
            .setSmallIcon(R.drawable.ic_ina_tile)
            .setContentTitle(state.model?.name ?: getString(R.string.popup_unknown_accessory))
            .setContentText(getString(R.string.popup_tap_to_connect))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setTimeoutAfter(20_000)
            .setContentIntent(PendingIntent.getActivity(this, 2, CasePopupOverlayActivity.popupIntent(this), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            .build()
        notifications.notify(POPUP_NOTIFICATION_ID, n)
        // A notification can't report a swipe-away here, so treat it as seen and snooze briefly.
        CasePopupGate.onHidden(state.modelId, SystemClock.elapsedRealtime(), ignored = true)
    }

    /* ---------- Classic ACL events ---------- */

    private val aclReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val device = IntentCompat.getParcelableExtra(intent, BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java) ?: return
            if (!BluetoothLink.isAppleAudio(device)) return
            when (intent.action) {
                // Auto-reconnects happen all the time (taking an AirPod out, walking back in range),
                // so they only update the app; the pop-up belongs to opening the lid.
                BluetoothDevice.ACTION_ACL_CONNECTED -> lifecycleScope.launch {
                    if (IBridgeStateStore.state.value.isPreview) IBridgeStateStore.reset()
                    controller.connect(device)
                    notifications.cancel(POPUP_NOTIFICATION_ID)
                }
                BluetoothDevice.ACTION_ACL_DISCONNECTED -> {
                    val current = IBridgeStateStore.state.value
                    if (current.deviceAddress == null || current.deviceAddress == device.address) controller.disconnect()
                }
            }
        }
    }

    private fun registerAclReceiver() {
        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_ACL_CONNECTED)
            addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
        }
        ContextCompat.registerReceiver(this, aclReceiver, filter, ContextCompat.RECEIVER_EXPORTED)
    }

    /* ---------- Live status notification ---------- */

    private fun createChannels() {
        notifications.createNotificationChannel(
            NotificationChannel(CHANNEL_STATUS, getString(R.string.channel_status), NotificationManager.IMPORTANCE_LOW).apply {
                description = getString(R.string.channel_status_desc)
                setShowBadge(false)
            },
        )
        notifications.createNotificationChannel(
            NotificationChannel(CHANNEL_POPUP, getString(R.string.channel_popup), NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private fun modeAction(mode: ListeningMode, code: Int): NotificationCompat.Action {
        val intent = Intent(this, IBridgeForegroundService::class.java).setAction(ACTION_SET_MODE).putExtra(EXTRA_MODE, mode.name)
        val pi = PendingIntent.getService(this, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Action.Builder(0, mode.shortLabel, pi).build()
    }

    private fun buildStatusNotification(s: AirPodsState): Notification {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val builder = NotificationCompat.Builder(this, CHANNEL_STATUS)
            .setSmallIcon(R.drawable.ic_ina_tile)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(open)
        if (!s.connected || s.isPreview) {
            return builder
                .setContentTitle(getString(R.string.status_listening))
                .setContentText(getString(R.string.status_listening_desc))
                .build()
        }
        val bolt = { on: Boolean -> if (on) " ⚡" else "" }
        val line = if (s.model?.caps?.hasCase == false) {
            "${formatBattery(s.leftBattery)}${bolt(s.leftCharging)}"
        } else {
            "L ${formatBattery(s.leftBattery)}${bolt(s.leftCharging)} · R ${formatBattery(s.rightBattery)}${bolt(s.rightCharging)} · Case ${formatBattery(s.caseBattery)}${bolt(s.caseCharging)}"
        }
        builder
            .setContentTitle(s.model?.name ?: getString(R.string.popup_unknown_accessory))
            .setContentText("$line · ${s.listeningMode.label}")
            .setSubText(s.linkTier.display)
        val modes = s.model?.caps?.supportedModes.orEmpty().filter { it != ListeningMode.OFF }
        modes.forEachIndexed { i, m -> builder.addAction(modeAction(m, 10 + i)) }
        return builder.build()
    }

    companion object {
        private const val TAG = "iNA.Service"
        const val NOTIFICATION_ID = 0x1001
        const val POPUP_NOTIFICATION_ID = 0x1002
        const val CHANNEL_STATUS = "ina_live_status"
        const val CHANNEL_POPUP = "ina_case_popup"
        const val ACTION_SET_MODE = "dev.ibridge.android.action.SET_MODE"
        const val ACTION_CYCLE_MODE = "dev.ibridge.android.action.CYCLE_MODE"
        const val EXTRA_MODE = "mode"

        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, IBridgeForegroundService::class.java))
        }
    }
}

/** Restarts the case-open listener after a reboot. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            runCatching { IBridgeForegroundService.start(context) }
        }
    }
}

/** Mirrors Android notifications to a connected Apple Watch through an ANCS GATT server. */
class InaNotificationListener : NotificationListenerService() {
    private var bridge: AncsBridge? = null

    override fun onListenerConnected() {
        bridge = AncsBridge(this).also { it.open() }
    }

    override fun onListenerDisconnected() {
        bridge?.close()
        bridge = null
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName || sbn.isOngoing) return
        if (!InaGraph.settings(this).settings.value.watchNotifications) return
        bridge?.notifyAdded(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        bridge?.notifyRemoved(sbn)
    }
}

/**
 * Minimal ANCS (Apple Notification Center Service) peripheral. Apple Watch subscribes to the
 * Notification Source characteristic and receives 8-byte event records.
 */
@SuppressLint("MissingPermission")
class AncsBridge(private val context: Context) {
    private var server: BluetoothGattServer? = null
    private val subscribers = mutableSetOf<BluetoothDevice>()
    private val ids = mutableMapOf<String, Int>()
    private var nextUid = 1

    private val notificationSource = BluetoothGattCharacteristic(
        UUID.fromString("9FBF120D-6301-42D9-8C58-25E699A21DBD"),
        BluetoothGattCharacteristic.PROPERTY_NOTIFY,
        BluetoothGattCharacteristic.PERMISSION_READ,
    )

    fun open() {
        val manager = context.getSystemService(BluetoothManager::class.java) ?: return
        server = runCatching {
            manager.openGattServer(context, object : BluetoothGattServerCallback() {
                override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
                    if (newState == android.bluetooth.BluetoothProfile.STATE_CONNECTED) subscribers += device else subscribers -= device
                }
            })
        }.getOrNull()
        val service = BluetoothGattService(UUID.fromString("7905F431-B5CE-4E99-A40F-4B1E122D00D0"), BluetoothGattService.SERVICE_TYPE_PRIMARY)
        service.addCharacteristic(notificationSource)
        runCatching { server?.addService(service) }
    }

    fun close() {
        runCatching { server?.close() }
        server = null
        subscribers.clear()
    }

    fun notifyAdded(sbn: StatusBarNotification) = push(0x00, sbn, ids.getOrPut(sbn.key) { nextUid++ })

    fun notifyRemoved(sbn: StatusBarNotification) {
        val uid = ids.remove(sbn.key) ?: return
        push(0x02, sbn, uid)
    }

    private fun push(eventId: Int, sbn: StatusBarNotification, uid: Int) {
        val category = when (sbn.notification.category) {
            Notification.CATEGORY_CALL -> 1
            Notification.CATEGORY_MESSAGE -> 4
            Notification.CATEGORY_EMAIL -> 6
            Notification.CATEGORY_EVENT -> 5
            else -> 0
        }
        val record = byteArrayOf(
            eventId.toByte(), 0x00, category.toByte(), 0x01,
            (uid and 0xFF).toByte(), ((uid shr 8) and 0xFF).toByte(), ((uid shr 16) and 0xFF).toByte(), ((uid shr 24) and 0xFF).toByte(),
        )
        val gatt = server ?: return
        subscribers.forEach { device ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                gatt.notifyCharacteristicChanged(device, notificationSource, false, record)
            } else {
                @Suppress("DEPRECATION")
                notificationSource.value = record
                @Suppress("DEPRECATION")
                gatt.notifyCharacteristicChanged(device, notificationSource, false)
            }
        }
    }
}
