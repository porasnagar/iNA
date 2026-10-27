package dev.ibridge.android

import android.graphics.drawable.Icon
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * "iNA Noise Control" Quick Settings tile. One tap cycles
 * ANC → Transparency → Adaptive → Off (skipping modes the connected model lacks).
 */
class InaQuickSettingsTileService : TileService() {

    private var scope: CoroutineScope? = null

    override fun onStartListening() {
        super.onStartListening()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate).also { s ->
            s.launch { IBridgeStateStore.state.collectLatest(::render) }
        }
    }

    override fun onStopListening() {
        scope?.cancel()
        scope = null
        super.onStopListening()
    }

    override fun onClick() {
        super.onClick()
        val state = IBridgeStateStore.state.value
        if (!state.connected) {
            // Make sure the listener is running so the next case-open is caught.
            runCatching { IBridgeForegroundService.start(this) }
            return
        }
        InaGraph.controller(this).cycleListeningMode()
        render(IBridgeStateStore.state.value)
    }

    private fun render(state: AirPodsState) {
        val tile = qsTile ?: return
        val modes = state.model?.caps?.supportedModes.orEmpty()
        val available = state.connected && modes.isNotEmpty()
        tile.label = getString(R.string.tile_label)
        tile.icon = Icon.createWithResource(this, R.drawable.ic_ina_tile)
        tile.state = when {
            !available -> Tile.STATE_UNAVAILABLE
            state.listeningMode == ListeningMode.OFF -> Tile.STATE_INACTIVE
            else -> Tile.STATE_ACTIVE
        }
        val subtitle = if (available) state.listeningMode.label else getString(R.string.tile_unavailable)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tile.subtitle = subtitle
        tile.contentDescription = "${getString(R.string.tile_label)}: $subtitle"
        tile.updateTile()
    }
}
