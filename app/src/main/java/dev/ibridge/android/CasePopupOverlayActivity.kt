package dev.ibridge.android

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.companion.AssociationRequest
import android.companion.BluetoothDeviceFilter
import android.companion.CompanionDeviceManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.IntentSender
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.util.regex.Pattern
import kotlin.coroutines.resume

/**
 * Translucent bottom-sheet Activity used when the overlay window cannot be shown, and for the
 * connect flow (CompanionDeviceManager needs an Activity to present its chooser).
 */
class CasePopupOverlayActivity : ComponentActivity() {

    private var associationResult: CompletableDeferred<BluetoothDevice?>? = null

    private val chooser = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        @Suppress("DEPRECATION")
        val device = result.data?.let { IntentCompat.getParcelableExtra(it, CompanionDeviceManager.EXTRA_DEVICE, BluetoothDevice::class.java) }
        associationResult?.complete(device)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HighRefreshRate.apply(window)
        val autoPair = intent.getBooleanExtra(EXTRA_START_PAIRING, false)
        // Liquid Glass: blur the Home Screen / app behind the sheet on Android 12+.
        val reduceTransparency = InaGraph.settings(this).settings.value.reduceTransparency
        val blurred = LiquidGlass.applyBlurBehind(window, reduceTransparency)
        val scrim = when {
            blurred -> 0.25f
            reduceTransparency -> 0.62f
            else -> 0.45f
        }
        setContent {
            InaTheme {
                CompositionLocalProvider(LocalGlass provides LocalGlass.current.copy(backdropBlurred = blurred)) {
                    val state by IBridgeStateStore.state.collectAsStateWithLifecycle()
                    var stage by remember { mutableStateOf(if (state.connected) PopupStage.INFO_PAIRED else PopupStage.INFO_UNPAIRED) }
                    var step by remember { mutableIntStateOf(0) }
                    var message by remember { mutableStateOf<String?>(null) }
                    var offerSettings by remember { mutableStateOf(false) }
                    val startPairing = {
                        if (stage != PopupStage.PAIRING) {
                            stage = PopupStage.PAIRING
                            message = null
                            offerSettings = false
                            lifecycleScope.launch {
                                val result = PairingCoordinator(this@CasePopupOverlayActivity, ::associate)
                                    .pair(IBridgeStateStore.state.value.model?.name) { step = it }
                                stage = if (result.connected) PopupStage.DONE else PopupStage.INFO_UNPAIRED
                                message = result.message
                                offerSettings = result.offerBluetoothSettings
                            }
                        }
                        Unit
                    }
                    LaunchedEffect(Unit) {
                        if (autoPair && stage == PopupStage.INFO_UNPAIRED) startPairing()
                    }
                    Box(
                        Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = scrim))
                            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { finish() },
                        contentAlignment = Alignment.BottomCenter,
                    ) {
                        AppleCaseOpenPopupSheet(
                            state = state,
                            stage = stage,
                            pairingStep = step,
                            onConnect = startPairing,
                            onDismiss = ::finish,
                            modifier = Modifier.navigationBarsPadding().padding(8.dp),
                            message = message,
                            secondaryLabel = if (offerSettings) "Open Bluetooth Settings" else null,
                            onSecondary = {
                                startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                finish()
                            },
                        )
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        // Closing the sheet (X, Done, tap outside, back) keeps it closed for this case.
        if (isFinishing) CasePopupGate.onDismissed(IBridgeStateStore.state.value.modelId, SystemClock.elapsedRealtime())
        super.onDestroy()
    }

    /** Presents the CompanionDeviceManager chooser and returns the selected classic device. */
    @SuppressLint("MissingPermission")
    private suspend fun associate(): BluetoothDevice? {
        val cdm = getSystemService(CompanionDeviceManager::class.java) ?: return null
        val deferred = CompletableDeferred<BluetoothDevice?>().also { associationResult = it }
        val request = AssociationRequest.Builder()
            .addDeviceFilter(BluetoothDeviceFilter.Builder().setNamePattern(Pattern.compile("(?i).*(airpods|beats|powerbeats).*")).build())
            .setSingleDevice(true)
            .build()
        val callback = object : CompanionDeviceManager.Callback() {
            @Deprecated("Replaced by onAssociationPending on API 33+, which delegates here by default.")
            override fun onDeviceFound(intentSender: IntentSender) {
                chooser.launch(IntentSenderRequest.Builder(intentSender).build())
            }
            override fun onFailure(error: CharSequence?) { deferred.complete(null) }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            cdm.associate(request, mainExecutor, callback)
        } else {
            @Suppress("DEPRECATION")
            cdm.associate(request, callback, null)
        }
        return withTimeoutOrNull(60_000) { deferred.await() }
    }

    companion object {
        const val EXTRA_START_PAIRING = "start_pairing"

        fun popupIntent(context: Context) = Intent(context, CasePopupOverlayActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)

        fun pairingIntent(context: Context) = popupIntent(context).putExtra(EXTRA_START_PAIRING, true)
    }
}

/** Outcome of a Connect tap, with the message the sheet shows when it did not fully work. */
enum class PairResult(val connected: Boolean, val message: String?, val offerBluetoothSettings: Boolean = false) {
    CONNECTED(true, null),
    BATTERY_ONLY(true, "Connected for battery and case status. Noise control isn't available on this phone yet."),
    BLUETOOTH_OFF(false, "Turn on Bluetooth, then try again.", offerBluetoothSettings = true),
    NOT_FOUND(false, "No AirPods found. Open the case next to the phone and hold its button until the light flashes white.", offerBluetoothSettings = true),
    FAILED(false, "Couldn't reach your AirPods. Take them out of the case, or pick them in Bluetooth settings.", offerBluetoothSettings = true),
}

/**
 * Connect flow. AirPods already paired in Android Bluetooth are connected straight away; only
 * new AirPods go through the CompanionDeviceManager chooser and createBond().
 * createBond() → A2DP/HFP → AAP on L2CAP.
 */
@SuppressLint("MissingPermission")
class PairingCoordinator(
    private val context: Context,
    private val associate: suspend () -> BluetoothDevice?,
) {
    private val adapter: BluetoothAdapter? = context.getSystemService(BluetoothManager::class.java)?.adapter

    suspend fun pair(modelName: String?, onStep: (Int) -> Unit): PairResult {
        onStep(0)
        if (adapter?.isEnabled != true) return PairResult.BLUETOOTH_OFF
        // Step 0: prefer AirPods that are already paired with this phone (no chooser, no searching).
        val device = BluetoothLink.bondedAppleAudio(context, modelName).firstOrNull() ?: run {
            val found = associate() ?: return PairResult.NOT_FOUND
            onStep(1)
            if (found.bondState != BluetoothDevice.BOND_BONDED) {
                if (!found.createBond() && found.bondState != BluetoothDevice.BOND_BONDING) return PairResult.FAILED
                if (!awaitBond(found)) return PairResult.FAILED
            }
            found
        }
        onStep(2)
        if (!BluetoothLink.isAclConnected(device)) {
            connectProfile(BluetoothProfile.A2DP, device)
            connectProfile(BluetoothProfile.HEADSET, device)
            for (i in 0 until 10) {
                if (BluetoothLink.isAclConnected(device)) break
                delay(300)
            }
        }
        onStep(3)
        val tier = InaGraph.controller(context).connect(device)
        onStep(4)
        return when {
            tier.hasControls -> PairResult.CONNECTED
            tier == LinkTier.BLE_ONLY -> PairResult.BATTERY_ONLY
            else -> PairResult.FAILED
        }
    }

    private suspend fun awaitBond(device: BluetoothDevice): Boolean = withTimeoutOrNull(30_000) {
        suspendCancellableCoroutine { cont ->
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context, intent: Intent) {
                    val d = IntentCompat.getParcelableExtra(intent, BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    if (d?.address != device.address) return
                    when (intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)) {
                        BluetoothDevice.BOND_BONDED -> { runCatching { context.unregisterReceiver(this) }; if (cont.isActive) cont.resume(true) }
                        BluetoothDevice.BOND_NONE -> { runCatching { context.unregisterReceiver(this) }; if (cont.isActive) cont.resume(false) }
                    }
                }
            }
            ContextCompat.registerReceiver(context, receiver, IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED), ContextCompat.RECEIVER_EXPORTED)
            cont.invokeOnCancellation { runCatching { context.unregisterReceiver(receiver) } }
        }
    } ?: false

    /** BluetoothA2dp/BluetoothHeadset#connect is @SystemApi; reflection works on some OEM stacks. */
    private suspend fun connectProfile(profile: Int, device: BluetoothDevice) {
        BluetoothLink.allowHiddenApis()
        val proxy = withTimeoutOrNull(3_000) {
            suspendCancellableCoroutine<BluetoothProfile?> { cont ->
                val ok = adapter?.getProfileProxy(context, object : BluetoothProfile.ServiceListener {
                    override fun onServiceConnected(p: Int, proxy: BluetoothProfile) { if (cont.isActive) cont.resume(proxy) }
                    override fun onServiceDisconnected(p: Int) = Unit
                }, profile) ?: false
                if (!ok && cont.isActive) cont.resume(null)
            }
        } ?: return
        runCatching { proxy.javaClass.getMethod("connect", BluetoothDevice::class.java).invoke(proxy, device) }
        adapter?.closeProfileProxy(profile, proxy)
    }
}

/**
 * System-wide case-open bottom sheet drawn with WindowManager + TYPE_APPLICATION_OVERLAY, so it
 * appears over the Android Home Screen or any app while iNA is closed.
 */
class CaseOverlayWindow(private val context: Context) {
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val handler = Handler(Looper.getMainLooper())
    private var view: ComposeView? = null
    private var owner: OverlayOwner? = null
    private var shownModelId = -1
    private val autoDismiss = Runnable { hide(CloseReason.IGNORED) }

    private enum class CloseReason { DISMISSED, IGNORED, CONNECT }

    fun show(state: AirPodsState) = handler.post {
        removeView()
        shownModelId = state.modelId
        val lifecycleOwner = OverlayOwner().also { it.start() }
        val compose = ComposeView(context).apply {
            setViewTreeLifecycleOwner(lifecycleOwner)
            setViewTreeSavedStateRegistryOwner(lifecycleOwner)
            setContent {
                InaTheme {
                    val live by IBridgeStateStore.state.collectAsStateWithLifecycle()
                    val shown = if (live.modelId == state.modelId) live else state
                    AppleCaseOpenPopupSheet(
                        state = shown,
                        stage = if (shown.connected) PopupStage.INFO_PAIRED else PopupStage.INFO_UNPAIRED,
                        pairingStep = 0,
                        onConnect = {
                            hide(CloseReason.CONNECT)
                            context.startActivity(CasePopupOverlayActivity.pairingIntent(context))
                        },
                        onDismiss = { hide(CloseReason.DISMISSED) },
                        modifier = Modifier.navigationBarsPadding().padding(8.dp),
                    )
                }
            }
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.BOTTOM
            windowAnimations = android.R.style.Animation_InputMethod
            HighRefreshRate.apply(context, this)
        }
        runCatching { windowManager.addView(compose, params) }
            .onSuccess {
                view = compose
                owner = lifecycleOwner
                handler.postDelayed(autoDismiss, 12_000)
            }
            .onFailure {
                lifecycleOwner.stop()
                CasePopupGate.onHidden(state.modelId, SystemClock.elapsedRealtime())
            }
    }

    /** Removes the overlay without telling the gate (service shutting down). */
    fun dismiss() = handler.post { removeView() }

    private fun hide(reason: CloseReason) {
        if (view == null) return
        removeView()
        val now = SystemClock.elapsedRealtime()
        when (reason) {
            CloseReason.DISMISSED -> CasePopupGate.onDismissed(shownModelId, now)
            CloseReason.IGNORED -> CasePopupGate.onHidden(shownModelId, now, ignored = true)
            CloseReason.CONNECT -> CasePopupGate.onHidden(shownModelId, now)
        }
    }

    private fun removeView() {
        handler.removeCallbacks(autoDismiss)
        view?.let { runCatching { windowManager.removeView(it) } }
        owner?.stop()
        view = null
        owner = null
    }
}

/** Lifecycle + SavedState owner so a ComposeView can live outside an Activity. */
private class OverlayOwner : SavedStateRegistryOwner {
    private val registry = LifecycleRegistry(this)
    private val savedState = SavedStateRegistryController.create(this)
    override val lifecycle: Lifecycle get() = registry
    override val savedStateRegistry: SavedStateRegistry get() = savedState.savedStateRegistry

    fun start() {
        savedState.performRestore(null)
        registry.currentState = Lifecycle.State.RESUMED
    }

    fun stop() {
        registry.currentState = Lifecycle.State.DESTROYED
    }
}
