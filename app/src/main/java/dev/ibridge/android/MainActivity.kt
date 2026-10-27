package dev.ibridge.android

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.companion.AssociationRequest
import android.companion.BluetoothDeviceFilter
import android.companion.CompanionDeviceManager
import android.content.ComponentName
import android.content.Intent
import android.content.IntentSender
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.IntentCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.util.regex.Pattern

/**
 * Entry point. Hosts onboarding, the Connect a Device / Learn More screen, connected controls
 * and the OTA rule engine. The background work lives in [IBridgeForegroundService].
 */
class MainActivity : ComponentActivity() {

    private val onboarding = MutableStateFlow(OnboardingStatus())
    private val inlinePopup = MutableStateFlow<AirPodsState?>(null)
    private val rulesSyncing = MutableStateFlow(false)
    private val prefs by lazy { getSharedPreferences("ina_onboarding", MODE_PRIVATE) }

    private val bluetoothPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            refreshPermissions()
            startBridgeService()
        }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { openNotificationListenerSettings() }

    private val companionChooser =
        registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            @Suppress("DEPRECATION")
            val device = result.data?.let {
                IntentCompat.getParcelableExtra(it, CompanionDeviceManager.EXTRA_DEVICE, android.bluetooth.BluetoothDevice::class.java)
            }
            if (device != null) lifecycleScope.launch { InaGraph.controller(this@MainActivity).connect(device) }
            requestBatteryExemption()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        HighRefreshRate.apply(window) // 90/120/144 Hz where the panel supports it
        refreshPermissions()
        startBridgeService()

        val rules = InaGraph.rules(this)
        val settingsStore = InaGraph.settings(this)

        setContent {
            InaTheme {
                val state by IBridgeStateStore.state.collectAsStateWithLifecycle()
                val ruleState by rules.rules.collectAsStateWithLifecycle()
                val settings by settingsStore.settings.collectAsStateWithLifecycle()
                val status by onboarding.collectAsStateWithLifecycle()
                val popup by inlinePopup.collectAsStateWithLifecycle()
                val syncing by rulesSyncing.collectAsStateWithLifecycle()
                InaApp(
                    state = state,
                    rules = ruleState,
                    settings = settings,
                    onboarding = status,
                    inlinePopup = popup,
                    rulesSyncing = syncing,
                    actions = actions,
                    permissions = permissionActions,
                    onPopupConnect = {
                        inlinePopup.value = null
                        startActivity(CasePopupOverlayActivity.pairingIntent(this))
                    },
                    onDismissPopup = { inlinePopup.value = null },
                )
            }
        }

        // Foreground case-open events render the sheet inline instead of as a system overlay.
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                IBridgeStateStore.popupEvents.collect { inlinePopup.value = it }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        IBridgeStateStore.appInForeground = true
        refreshPermissions()
    }

    override fun onPause() {
        IBridgeStateStore.appInForeground = false
        super.onPause()
    }

    private fun startBridgeService() {
        if (!hasBluetoothPermission()) return
        ContextCompat.startForegroundService(this, Intent(this, IBridgeForegroundService::class.java))
    }

    /* ---------- Permissions ---------- */

    private fun hasBluetoothPermission(): Boolean {
        val needed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            listOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        return needed.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }
    }

    private fun refreshPermissions() {
        val power = getSystemService(PowerManager::class.java)
        onboarding.value = OnboardingStatus(
            bluetooth = hasBluetoothPermission(),
            overlay = Settings.canDrawOverlays(this),
            companion = power.isIgnoringBatteryOptimizations(packageName),
            notifications = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName),
            completed = prefs.getBoolean("completed", false),
        )
    }

    private val permissionActions = object : PermissionActions {
        override fun request(step: PermissionStep) {
            when (step) {
                PermissionStep.BLUETOOTH -> bluetoothPermissions.launch(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
                    } else {
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
                    },
                )
                PermissionStep.OVERLAY -> startActivity(
                    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")),
                )
                PermissionStep.COMPANION -> requestCompanionAssociation()
                PermissionStep.NOTIFICATIONS -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    openNotificationListenerSettings()
                }
            }
        }

        override fun finishOnboarding() {
            prefs.edit().putBoolean("completed", true).apply()
            refreshPermissions()
            startBridgeService()
        }

        override fun restartOnboarding() {
            prefs.edit().putBoolean("completed", false).apply()
            refreshPermissions()
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestCompanionAssociation() {
        val cdm = getSystemService(CompanionDeviceManager::class.java)
        val adapter = getSystemService(BluetoothManager::class.java)?.adapter
        if (cdm == null || adapter == null) {
            requestBatteryExemption()
            return
        }
        val filter = BluetoothDeviceFilter.Builder()
            .setNamePattern(Pattern.compile("(?i).*(airpods|beats|powerbeats).*"))
            .build()
        val request = AssociationRequest.Builder()
            .addDeviceFilter(filter)
            .setSingleDevice(false)
            .build()
        val callback = object : CompanionDeviceManager.Callback() {
            @Deprecated("Replaced by onAssociationPending on API 33+, which delegates here by default.")
            override fun onDeviceFound(intentSender: IntentSender) {
                companionChooser.launch(IntentSenderRequest.Builder(intentSender).build())
            }

            override fun onFailure(error: CharSequence?) {
                requestBatteryExemption()
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            cdm.associate(request, mainExecutor, callback)
        } else {
            @Suppress("DEPRECATION")
            cdm.associate(request, callback, null)
        }
    }

    @SuppressLint("BatteryLife")
    private fun requestBatteryExemption() {
        val power = getSystemService(PowerManager::class.java)
        if (!power.isIgnoringBatteryOptimizations(packageName)) {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        }
        refreshPermissions()
    }

    private fun openNotificationListenerSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                ComponentName(this, InaNotificationListener::class.java).flattenToString(),
            )
        } else {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        }
        startActivity(intent)
    }

    /* ---------- UI actions → AAP controller / rule engine ---------- */

    private val actions = object : InaActions {
        private val controller get() = InaGraph.controller(this@MainActivity)
        private val rules get() = InaGraph.rules(this@MainActivity)
        private val settings get() = InaGraph.settings(this@MainActivity)

        override fun setMode(mode: ListeningMode) = controller.setListeningMode(mode)
        override fun setConversationAwareness(on: Boolean) = controller.setConversationAwareness(on)
        override fun setPersonalizedVolume(on: Boolean) = controller.setPersonalizedVolume(on)
        override fun setHeadGestures(on: Boolean) = controller.setHeadGestures(on)

        override fun updateSettings(transform: (InaSettings) -> InaSettings) {
            val before = settings.settings.value
            settings.update(transform)
            val after = settings.settings.value
            if (before.stemLeft != after.stemLeft) controller.setStemAction(left = true, action = after.stemLeft)
            if (before.stemRight != after.stemRight) controller.setStemAction(left = false, action = after.stemRight)
            if (before.crownReversed != after.crownReversed) controller.setCrownReversed(after.crownReversed)
            if (before.loudSoundReduction != after.loudSoundReduction) controller.setLoudSoundReduction(after.loudSoundReduction)
        }

        override fun startFitTest() = controller.startFitTest()
        override fun playChirp(target: ChirpTarget?) = controller.playChirp(target)
        override fun setPreview(on: Boolean) = IBridgeStateStore.setPreview(on)
        override fun disconnect() = controller.disconnect()

        override fun resumeMedia() {
            // Preview values are simulated, so never start real playback from them.
            if (!IBridgeStateStore.state.value.isPreview) MediaKeys.send(this@MainActivity, KeyEvent.KEYCODE_MEDIA_PLAY)
            IBridgeStateStore.update { it.copy(pausedByEar = false) }
        }

        override fun syncRules() {
            lifecycleScope.launch {
                rulesSyncing.value = true
                rules.sync()
                rulesSyncing.value = false
            }
        }

        override fun applyRulesJson(json: String): String? = rules.applyJson(json).exceptionOrNull()?.message

        override fun overridePsm(hex: String): String? {
            val psm = hex.trim().removePrefix("0x").removePrefix("0X").toIntOrNull(16) ?: return "PSM must be hex, e.g. 0x1001"
            return rules.overridePsm(psm).exceptionOrNull()?.message
        }

        override fun registerModel(hex: String, name: String): String? {
            val id = hex.trim().removePrefix("0x").removePrefix("0X").toIntOrNull(16)?.takeIf { it in 0..0xFFFF }
                ?: return "Model ID must be 16-bit hex, e.g. 0x2B20"
            if (name.isBlank()) return "Give the model a name"
            return rules.registerModel(id, name.trim()).exceptionOrNull()?.message
        }

        override fun removeModel(id: Int) { rules.removeModel(id) }
        override fun resetRules() { rules.reset() }
    }
}
