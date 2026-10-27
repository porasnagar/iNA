package dev.ibridge.android

import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.Bluetooth
import androidx.compose.material.icons.rounded.Memory
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Radar
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/*
 * Pieces that make the Android screens match the website simulator: the floating Liquid Glass
 * tab bar, the searching radar, the three Connect steps, Learn More tabs, Now Playing and the
 * in-ear status row.
 */

/** Space screens leave at the bottom so their last row clears the floating tab bar. */
val TAB_BAR_CLEARANCE = 112.dp

/** Floating Liquid Glass tab bar; content scrolls underneath it, like the simulator. */
@Composable
fun FloatingTabBar(items: List<Pair<String, ImageVector>>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(28.dp)
    val glass = LocalGlass.current
    Row(
        modifier
            .padding(start = 12.dp, end = 12.dp, bottom = 12.dp)
            .fillMaxWidth()
            .shadow(18.dp, shape, clip = false, ambientColor = Color.Black.copy(alpha = 0.3f), spotColor = Color.Black.copy(alpha = 0.3f))
            // Nothing blurs what scrolls underneath, so keep the bar near-solid for legibility.
            .background(InaColors.Card.copy(alpha = 0.92f), shape)
            .liquidGlass(shape, glass.reduceTransparency, backdropBlurred = false)
            .padding(vertical = 6.dp),
    ) {
        items.forEachIndexed { i, (label, icon) ->
            val active = i == selected
            val tint = if (active) InaColors.Primary else InaColors.TextSecondary
            Column(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(20.dp))
                    .semantics { role = Role.Tab; this.selected = active }
                    .clickable { onSelect(i) }
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
                Text(label, color = tint, fontSize = 10.5.sp, fontWeight = FontWeight.Medium, maxLines = 1, softWrap = false)
            }
        }
    }
}

/** Three expanding rings behind the product while iNA searches. */
@Composable
fun BoxScope.RadarRings() {
    val t = rememberInfiniteTransition(label = "radar")
    val phase by t.animateFloat(0f, 1f, infiniteRepeatable(tween(2_400, easing = LinearEasing), RepeatMode.Restart), label = "radarPhase")
    val color = InaColors.Primary
    Canvas(Modifier.matchParentSize().clipToBounds()) {
        val base = size.minDimension * 0.36f
        for (i in 0 until 3) {
            val p = (phase + i / 3f) % 1f
            drawCircle(color.copy(alpha = 0.4f * (1f - p)), radius = base * (0.6f + p * 0.75f), style = Stroke(width = 1.dp.toPx()))
        }
    }
}

/** Gentle up-and-down float for the product picture, like the simulator. */
@Composable
fun Modifier.floating(): Modifier {
    val t = rememberInfiniteTransition(label = "float")
    val y by t.animateFloat(-5f, 5f, infiniteRepeatable(tween(3_000), RepeatMode.Reverse), label = "floatY")
    return this.graphicsLayer { translationY = y * density }
}

/** Soft spotlight behind the product picture. */
fun Modifier.stage(): Modifier = this.background(
    Brush.radialGradient(listOf(InaColors.TextPrimary.copy(alpha = 0.08f), Color.Transparent)),
)

@Composable
fun PulseDot() {
    val t = rememberInfiniteTransition(label = "pulse")
    val a by t.animateFloat(0.35f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulseAlpha")
    Box(Modifier.size(8.dp).graphicsLayer { alpha = a }.clip(CircleShape).background(InaColors.Primary))
}

/** "Open the case → Tap Connect → Done" steps under the battery card. */
@Composable
fun ConnectSteps() {
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("Open the case lid next to your phone", "Tap Connect on the pop-up", "Done — controls unlock here").forEachIndexed { i, text ->
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(InaColors.Card).padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(24.dp).clip(CircleShape).background(InaColors.Elevated), contentAlignment = Alignment.Center) {
                    Text("${i + 1}", color = InaColors.TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.width(12.dp))
                Text(text, color = InaColors.TextPrimary, fontSize = 14.sp)
            }
        }
    }
}

private val OEM_SKINS = listOf("Pixel UI", "Samsung One UI 6–9", "OxygenOS 14–16", "Xiaomi HyperOS", "Nothing OS")

/** Learn More with the same two tabs as the simulator: Supported Hardware / How iNA Works. */
@Composable
fun LearnMoreSection(hardware: @Composable () -> Unit) {
    var tab by rememberSaveable { mutableStateOf(0) }
    Column {
        Text("Learn More", color = InaColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(Modifier.height(10.dp))
        SegmentedPicker(listOf(0, 1), tab, { if (it == 0) "Supported Hardware" else "How iNA Works" }, Modifier.padding(horizontal = 16.dp).fillMaxWidth()) { tab = it }
        Spacer(Modifier.height(10.dp))
        if (tab == 0) {
            hardware()
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                HowCard(
                    Icons.Rounded.VerifiedUser, InaColors.Success, "No root needed",
                    if (BuildConfig.DEBUG) "100% user-space on Android 10–16+, public Bluetooth APIs with careful fallbacks." else "Runs as a normal app on Android 10 and later, using standard Bluetooth.",
                )
                HowCard(
                    Icons.Rounded.Radar, InaColors.Primary, "Listens for the case opening",
                    if (BuildConfig.DEBUG) "BLE scanner filters 0x004C type 0x07 frames; lid counter + lid bit with RSSI > ${AppleProtocolSpec.POPUP_RSSI_THRESHOLD} dBm opens the pop-up."
                    else "Open the lid next to your phone and the battery pop-up appears, like on iPhone. Close it and it stays closed until you open the lid again.",
                )
                HowCard(
                    Icons.Rounded.Bluetooth, InaColors.Primary, "Talks to your AirPods directly",
                    if (BuildConfig.DEBUG) "AAP on L2CAP PSM 0x1001 switches noise modes, toggles 0x28 / 0x26 and reads head gestures."
                    else "Change noise control and hearing features here, from Quick Settings or from the notification.",
                )
                HowCard(
                    Icons.Rounded.Refresh, InaColors.Warning, "Learns new hardware over the air",
                    if (BuildConfig.DEBUG) "Signed OTA rules add model IDs, opcodes and PSM overrides without an app update." else "New AirPods models are added without an app update.",
                )
                HowCard(Icons.Rounded.Memory, InaColors.Elevated, "Works on every major Android skin", null) {
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OEM_SKINS.forEach { s ->
                            Text(s, color = InaColors.TextSecondary, fontSize = 11.sp, maxLines = 1, softWrap = false,
                                modifier = Modifier.clip(CircleShape).background(InaColors.Hairline).padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HowCard(icon: ImageVector, tint: Color, title: String, body: String?, extra: @Composable () -> Unit = {}) {
    Column(Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(InaColors.Card).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(tint), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(12.dp))
            Text(title, color = InaColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        body?.let {
            Text(
                it, color = InaColors.TextSecondary, fontSize = 13.sp, lineHeight = 18.sp,
                fontFamily = FontFamily.Default, modifier = Modifier.padding(top = 8.dp),
            )
        }
        extra()
    }
}

/* ---------- Now Playing ---------- */

@Immutable
data class NowPlaying(val title: String?, val artist: String?, val playing: Boolean)

/**
 * Reads the track of the active media app. Android only shares it with apps that have
 * notification access (already asked for during setup); without it, play/pause still works.
 */
class NowPlayingReader(context: Context) {
    private val app = context.applicationContext
    private val sessions = app.getSystemService(MediaSessionManager::class.java)
    private val audio = PhoneAudio(app)

    private fun controller(): MediaController? = runCatching {
        sessions?.getActiveSessions(ComponentName(app, InaNotificationListener::class.java))?.firstOrNull()
    }.getOrNull()

    fun read(): NowPlaying {
        val c = controller()
        val meta = c?.metadata
        val playing = c?.playbackState?.state == PlaybackState.STATE_PLAYING || audio.isPlaying
        return NowPlaying(meta?.getString(MediaMetadata.METADATA_KEY_TITLE), meta?.getString(MediaMetadata.METADATA_KEY_ARTIST), playing)
    }

    fun togglePlayPause(playing: Boolean) {
        val controls = controller()?.transportControls
        when {
            controls == null -> audio.togglePlayPause()
            playing -> controls.pause()
            else -> controls.play()
        }
    }

    val volume: Float get() = audio.volume
}

/** Now Playing card on the AirPods screen, like the simulator's. */
@Composable
fun AirPodsNowPlayingCard(state: AirPodsState, onResume: () -> Unit) {
    val context = LocalContext.current
    val reader = remember { NowPlayingReader(context) }
    var now by remember { mutableStateOf(reader.read()) }
    var volume by remember { mutableStateOf(reader.volume) }
    LaunchedEffect(Unit) {
        while (true) {
            now = reader.read()
            volume = reader.volume
            delay(1_000)
        }
    }
    val playing = now.playing && !state.isPreview
    Row(
        Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(InaColors.Card).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(InaColors.Primary), contentAlignment = Alignment.Center) {
            EqualizerBars(playing)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f).padding(end = 8.dp)) {
            Text(now.title ?: if (playing) "Playing" else "Nothing playing", color = InaColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                when {
                    state.pausedByEar -> "Paused · AirPod removed"
                    now.artist != null -> now.artist!!
                    else -> "Media on this phone"
                },
                color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Rounded.VolumeUp, contentDescription = null, tint = InaColors.TextSecondary, modifier = Modifier.size(12.dp))
                Spacer(Modifier.width(6.dp))
                Box(Modifier.weight(1f).height(4.dp).clip(CircleShape).background(InaColors.Hairline)) {
                    Box(Modifier.fillMaxHeight().fillMaxWidth(volume.coerceIn(0f, 1f)).clip(CircleShape).background(InaColors.TextPrimary))
                }
            }
        }
        Box(
            Modifier.size(40.dp).clip(CircleShape).background(InaColors.TextPrimary).clickable {
                if (state.isPreview) return@clickable
                if (state.pausedByEar && !playing) onResume() else reader.togglePlayPause(playing)
                now = now.copy(playing = !playing)
            },
            contentAlignment = Alignment.Center,
        ) {
            Icon(if (playing) Icons.Rounded.Pause else Icons.Rounded.PlayArrow, contentDescription = if (playing) "Pause" else "Play", tint = InaColors.Background)
        }
    }
}

@Composable
private fun EqualizerBars(playing: Boolean) {
    val t = rememberInfiniteTransition(label = "eq")
    val phase by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1_200, easing = LinearEasing)), label = "eqPhase")
    Row(Modifier.height(20.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
        for (i in 0 until 4) {
            val h = if (playing) 0.35f + 0.65f * kotlin.math.abs(kotlin.math.sin((phase + i * 0.15f) * Math.PI.toFloat() * 2f)) else 0.5f
            Box(Modifier.width(4.dp).fillMaxHeight(h).clip(CircleShape).background(Color.White))
        }
    }
}

/** Left / Right in-ear status (read from the AirPods), like the simulator's pair of chips. */
@Composable
fun EarStatusRow(state: AirPodsState) {
    val caps = state.model?.caps ?: return
    if (!caps.inEarDetection) return
    val overEar = !caps.hasCase
    val sides = if (overEar) listOf("On head" to state.leftInEar) else listOf("Left" to state.leftInEar, "Right" to state.rightInEar)
    Row(Modifier.padding(horizontal = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        sides.forEach { (label, worn) ->
            val color = if (worn) InaColors.Success else InaColors.TextSecondary
            Column(
                Modifier.weight(1f).clip(RoundedCornerShape(16.dp))
                    .background(if (worn) InaColors.Success.copy(alpha = 0.15f) else InaColors.Card)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Text(label, color = color, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(
                    when {
                        overEar -> if (worn) "Worn" else "Off head"
                        worn -> "In ear"
                        else -> "Out of ear"
                    },
                    color = color, fontSize = 12.sp, maxLines = 1,
                )
            }
        }
    }
}
