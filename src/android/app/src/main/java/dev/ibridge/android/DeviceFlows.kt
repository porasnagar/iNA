@file:Suppress("FunctionName")
@file:OptIn(ExperimentalMaterial3Api::class)

package dev.ibridge.android

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.DirectionsWalk
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MonitorHeart
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Speaker
import androidx.compose.material.icons.rounded.Vibration
import androidx.compose.material.icons.rounded.Air
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import java.util.Locale
import kotlin.math.PI
import kotlin.math.acos
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/* ═══════════════════════════════════════════════════════════════════════════
 * Apple Watch, AirTag and HomePod set-up flows and connected screens.
 * Same steps and layout as src/components/ina/app/devices/ in the simulator; every step here
 * is driven by the real link in AppleDevices.kt. Rules live in DeviceRules.kt.
 *  • Apple Watch only pairs fully with an iPhone, so iNA cannot read the camera pattern or check
 *    the Watch's 6-digit code. It finds the Watch over Bluetooth instead (heart-rate broadcast),
 *    and the pairing stages are the real GATT connect / service sync / notification subscribe.
 *  • Activity, Blood Oxygen, ECG and Sleep stay in Apple Health on iPhone; these panels show
 *    "--" unless a debug build pairs with the sample Watch.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Data colours for Activity rings, sleep stages and the always-dark camera viewfinder. */
object DeviceArtColors {
    val Move = Color(0xFFFA114F)
    val Exercise = Color(0xFF92E82A)
    val Stand = Color(0xFF1EEAEF)
    val Awake = Color(0xFFFF8A65)
    val Rem = Color(0xFF7FC4FF)
    val Core = Color(0xFF3D7BFF)
    val Deep = Color(0xFF4B3BBE)
    val Viewfinder = Color(0xFF0E0E11)
    val ViewfinderText = Color(0xFFF5F5F7)

    fun ring(r: DeviceRules.Ring) = when (r) {
        DeviceRules.Ring.MOVE -> Move
        DeviceRules.Ring.EXERCISE -> Exercise
        DeviceRules.Ring.STAND -> Stand
    }

    fun sleep(s: DeviceRules.SleepStage) = when (s) {
        DeviceRules.SleepStage.AWAKE -> Awake
        DeviceRules.SleepStage.REM -> Rem
        DeviceRules.SleepStage.CORE -> Core
        DeviceRules.SleepStage.DEEP -> Deep
    }
}

/* ---------- Shared parts ---------- */

@Composable
private fun BackLink(label: String, onClick: () -> Unit) {
    Row(
        Modifier.padding(start = 8.dp, top = 8.dp).clip(CircleShape).clickable(onClick = onClick).padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.ChevronLeft, contentDescription = null, tint = InaColors.Primary)
        Text(label, color = InaColors.Primary, fontSize = 15.sp)
    }
}

@Composable
private fun FlowTitle(title: String, subtitle: String? = null, center: Boolean = false) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp), horizontalAlignment = if (center) Alignment.CenterHorizontally else Alignment.Start) {
        Text(title, color = InaColors.TextPrimary, fontSize = if (center) 22.sp else 26.sp, fontWeight = FontWeight.Bold, lineHeight = 28.sp, textAlign = if (center) TextAlign.Center else TextAlign.Start)
        if (subtitle != null) Text(subtitle, color = InaColors.TextSecondary, fontSize = 13.sp, lineHeight = 18.sp, textAlign = if (center) TextAlign.Center else TextAlign.Start, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun DeviceHeader(status: String, live: Boolean, chip: String?, name: String, onBack: () -> Unit) {
    BackLink("Connect", onBack)
    Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(if (live) InaColors.Success else InaColors.Warning))
        Spacer(Modifier.width(8.dp))
        Text(status, color = InaColors.TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(1f).padding(end = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
        devOnly(chip ?: "")?.takeIf { it.isNotEmpty() }?.let { Text(it, color = InaColors.TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, softWrap = false) }
    }
    Text(name, color = InaColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 20.dp))
}

@Composable
private fun WideButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, secondary: Boolean = false, destructive: Boolean = false, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(16.dp),
        colors = if (secondary) ButtonDefaults.buttonColors(containerColor = InaColors.Elevated, contentColor = if (destructive) InaColors.Destructive else InaColors.TextPrimary)
        else ButtonDefaults.buttonColors(containerColor = InaColors.Primary, contentColor = Color.White),
    ) { Text(text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
}

@Composable
private fun LinkButton(text: String, onClick: () -> Unit) {
    Text(text, color = InaColors.Primary, fontSize = 15.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(vertical = 10.dp))
}

@Composable
private fun Note(text: String?) {
    if (text.isNullOrBlank()) return
    Text(text, color = InaColors.TextSecondary, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(horizontal = 28.dp, vertical = 8.dp))
}

@Composable
private fun Panel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(InaColors.Card).padding(16.dp), content = content)
}

@Composable
private fun PanelLabel(text: String, color: Color, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(text, color = color, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
private fun Stepper(value: String, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(28.dp).clip(CircleShape).background(InaColors.Card).clickable(onClick = onMinus), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Remove, contentDescription = "Decrease", tint = InaColors.TextPrimary, modifier = Modifier.size(14.dp))
        }
        Text(value, color = InaColors.TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium, textAlign = TextAlign.Center, maxLines = 1, softWrap = false, modifier = Modifier.width(72.dp))
        Box(Modifier.size(28.dp).clip(CircleShape).background(InaColors.Card).clickable(onClick = onPlus), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Add, contentDescription = "Increase", tint = InaColors.TextPrimary, modifier = Modifier.size(14.dp))
        }
    }
}

@Composable
private fun StepperRow(label: String, dot: Color?, value: String, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(InaColors.Elevated).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        if (dot != null) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(dot))
            Spacer(Modifier.width(10.dp))
        }
        Text(label, color = InaColors.TextPrimary, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(end = 8.dp))
        Stepper(value, onMinus, onPlus)
    }
}

/** Checklist with a check for finished stages and a spinner on the current one. */
@Composable
private fun StageList(stages: List<String>, current: Int) {
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        stages.forEachIndexed { i, text ->
            val done = i < current
            val active = i == current
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(InaColors.Card).padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(20.dp).clip(CircleShape).background(if (done) InaColors.Success else InaColors.Elevated), contentAlignment = Alignment.Center) {
                    when {
                        done -> Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
                        active -> CircularProgressIndicator(Modifier.size(12.dp), strokeWidth = 2.dp, color = InaColors.Primary)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Text(text, color = if (done || active) InaColors.TextPrimary else InaColors.TextSecondary, fontSize = 13.5.sp, lineHeight = 18.sp)
            }
        }
    }
}

/** Glass proximity sheet over the app, like the AirPods case-open pop-up. */
@Composable
private fun ProximitySheet(title: String, subtitle: String?, onClose: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onClose,
        sheetState = sheetState,
        containerColor = Color.Transparent,
        scrimColor = Color.Black.copy(alpha = if (LocalGlass.current.reduceTransparency) 0.62f else 0.3f),
        dragHandle = null,
    ) {
        Column(
            Modifier.padding(8.dp).fillMaxWidth().glassSurface(RoundedCornerShape(42.dp)).padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.fillMaxWidth()) {
                Text(title, color = InaColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center, modifier = Modifier.align(Alignment.Center).padding(horizontal = 40.dp))
                Box(
                    Modifier.align(Alignment.CenterEnd).size(32.dp).clip(CircleShape).background(InaColors.Hairline).clickable(onClick = onClose),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Rounded.Close, contentDescription = "Close", tint = InaColors.TextSecondary, modifier = Modifier.size(16.dp)) }
            }
            if (subtitle != null) Text(subtitle, color = InaColors.TextSecondary, fontSize = 12.sp, textAlign = TextAlign.Center)
            content()
        }
    }
}

@Composable
private fun Searching(title: String, text: String, onClose: () -> Unit, error: String?) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        BackLink("Connect", onClose)
        FlowTitle(title)
        Box(Modifier.padding(16.dp).fillMaxWidth().height(220.dp).clip(RoundedCornerShape(24.dp)).background(InaColors.Card), contentAlignment = Alignment.Center) {
            RadarRings()
            Text(text, color = InaColors.TextSecondary, fontSize = 13.sp)
        }
        Note(error)
    }
}

/** Apple's pairing pattern: a rotating particle cloud that tightens once it is read. */
@Composable
private fun ParticleReticle(locked: Boolean, modifier: Modifier = Modifier) {
    val points = remember {
        val n = 260
        List(n) { i ->
            val phi = acos(1 - 2 * (i + 0.5) / n)
            val theta = PI * (1 + sqrt(5.0)) * i
            floatArrayOf(phi.toFloat(), theta.toFloat(), 0.7f + Random.nextFloat() * 0.35f, Random.nextFloat() * 6.28f, if (i % 3 == 0) 1f else 0f)
        }
    }
    val t = rememberInfiniteTransition(label = "reticle")
    val rot by t.animateFloat(0f, (2 * PI).toFloat(), infiniteRepeatable(tween(16_000, easing = LinearEasing), RepeatMode.Restart), label = "rot")
    val tight by animateFloatAsState(if (locked) 1f else 0f, tween(600), label = "tight")
    val blue = InaColors.Primary
    Canvas(modifier) {
        val r = min(size.width, size.height) * 0.3f * (1 - tight * 0.18f)
        points.forEach { p ->
            val th = p[1] + rot
            val x = sin(p[0]) * cos(th)
            val y = cos(p[0])
            val z = sin(p[0]) * sin(th)
            val scatter = p[2] + (1 - tight) * 0.12f * sin(rot * 3 + p[3])
            val depth = (z + 1) / 2
            drawCircle(
                color = (if (p[4] > 0f) blue else DeviceArtColors.ViewfinderText).copy(alpha = 0.25f + depth * 0.75f),
                radius = (0.6f + depth * 1.6f) * density,
                center = Offset(size.width / 2 + x * r * scatter, size.height / 2 + y * r * scatter),
            )
        }
    }
}

@Composable
private fun FrameGuide(locked: Boolean, modifier: Modifier = Modifier) {
    val color = if (locked) InaColors.Success else DeviceArtColors.ViewfinderText
    Canvas(modifier) {
        val inset = size.minDimension * 0.14f
        val len = 32.dp.toPx()
        val w = 3.dp.toPx()
        val l = inset
        val tp = inset
        val rt = size.width - inset
        val b = size.height - inset
        val corners = listOf(Offset(l, tp) to Offset(1f, 1f), Offset(rt, tp) to Offset(-1f, 1f), Offset(l, b) to Offset(1f, -1f), Offset(rt, b) to Offset(-1f, -1f))
        corners.forEach { (c, d) ->
            drawLine(color, c, Offset(c.x + d.x * len, c.y), w, StrokeCap.Round)
            drawLine(color, c, Offset(c.x, c.y + d.y * len), w, StrokeCap.Round)
        }
    }
}

@Composable
private fun ActivityRingsView(values: Map<DeviceRules.Ring, Int>, goals: DeviceRules.Goals, size: Dp = 132.dp, stroke: Dp = 16.dp) {
    Canvas(Modifier.size(size)) {
        val sw = stroke.toPx()
        DeviceRules.Ring.entries.forEachIndexed { i, ring ->
            val inset = sw / 2 + i * (sw + 2.dp.toPx())
            val arcSize = Size(this.size.width - inset * 2, this.size.height - inset * 2)
            val topLeft = Offset(inset, inset)
            val color = DeviceArtColors.ring(ring)
            val p = DeviceRules.ringProgress(values[ring] ?: 0, goals[ring])
            drawArc(color.copy(alpha = 0.2f), 0f, 360f, false, topLeft, arcSize, style = Stroke(sw))
            if (p > 0f) drawArc(color, -90f, 360f * min(1f, p), false, topLeft, arcSize, style = Stroke(sw, cap = StrokeCap.Round))
            if (p > 1f) drawArc(color.copy(red = min(1f, color.red * 1.1f)), -90f, 360f * (p - 1f), false, topLeft, arcSize, style = Stroke(sw, cap = StrokeCap.Round))
        }
    }
}

@Composable
private fun HeartTraceView(samples: List<Int>, low: Int, high: Int) {
    val line = InaColors.Destructive
    val highC = InaColors.Warning
    val lowC = InaColors.Primary
    Canvas(Modifier.fillMaxWidth().height(90.dp)) {
        val mn = minOf(low - 10, samples.minOrNull() ?: low)
        val mx = maxOf(high + 10, samples.maxOrNull() ?: high)
        fun y(v: Int) = size.height - (v - mn).toFloat() / (mx - mn).coerceAtLeast(1) * size.height
        val dash = PathEffect.dashPathEffect(floatArrayOf(8f, 8f))
        drawLine(highC, Offset(0f, y(high)), Offset(size.width, y(high)), 1.dp.toPx(), pathEffect = dash)
        drawLine(lowC, Offset(0f, y(low)), Offset(size.width, y(low)), 1.dp.toPx(), pathEffect = dash)
        if (samples.size >= 2) {
            val step = size.width / (samples.size - 1)
            val path = Path().apply {
                samples.forEachIndexed { i, v -> if (i == 0) moveTo(0f, y(v)) else lineTo(i * step, y(v)) }
            }
            drawPath(path, line, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
        }
    }
}

@Composable
private fun EcgTraceView(bpm: Int, running: Boolean) {
    var tick by remember { mutableIntStateOf(0) }
    LaunchedEffect(running) { while (running) { delay(40); tick++ } }
    val color = InaColors.Destructive
    Canvas(Modifier.fillMaxWidth().height(64.dp)) {
        val beat = ((60f / bpm.coerceAtLeast(40)) * 25).roundToInt().coerceAtLeast(20)
        val path = Path()
        for (x in 0..150) {
            val p = (x + tick) % beat
            val v = if (!running) 0f else when {
                p == 3 -> 6f
                p == 6 -> -6f
                p == 7 -> 40f
                p == 8 -> -14f
                p in 12..15 -> 8f
                else -> 0f
            }
            val px = x / 150f * size.width
            val py = size.height / 2 - v * 0.6f * density
            if (x == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        drawPath(path, color, style = Stroke(1.6.dp.toPx()))
    }
}

/* ═══════════════════════════ Apple Watch ═══════════════════════════ */

private enum class WatchPhase { CAMERA, MANUAL, PROGRESS, READY, SUITE }

@Composable
fun WatchFlow(onClose: () -> Unit) {
    val context = LocalContext.current
    val link = remember { InaGraph.otherDevices(context).watch }
    val store = remember { PairedDevicesStore.get(context) }
    val paired by store.state.collectAsStateWithLifecycle()
    val s by link.state.collectAsStateWithLifecycle()
    var phase by rememberSaveable { mutableStateOf(if (paired.watch != null) WatchPhase.SUITE else WatchPhase.CAMERA) }
    var preview by rememberSaveable { mutableStateOf(paired.watch?.preview == true) }

    DisposableEffect(Unit) { onDispose { link.stop() } }
    LaunchedEffect(phase, preview) {
        if (preview) return@LaunchedEffect
        when (phase) {
            WatchPhase.CAMERA -> { link.stop(); link.start(autoConnect = true) }
            WatchPhase.MANUAL -> { link.stop(); link.start(autoConnect = false) }
            WatchPhase.SUITE -> if (!link.state.value.connected) link.start(autoConnect = true)
            else -> Unit
        }
    }
    // Camera step: the first Watch heard starts pairing.
    LaunchedEffect(phase, s.name) { if (phase == WatchPhase.CAMERA && !preview && s.name != null) { delay(900); phase = WatchPhase.PROGRESS } }

    val watch = paired.watch
    when {
        phase == WatchPhase.SUITE && watch != null -> WatchSuite(
            watch = watch, s = s, preview = preview, link = link,
            onChange = { w -> store.update { it.copy(watch = w) } },
            onDisconnect = { link.stop(); onClose() },
            onRepair = {
                link.stop()
                store.update { it.copy(watch = null) }
                preview = false
                phase = WatchPhase.CAMERA
            },
        )
        phase == WatchPhase.MANUAL -> WatchManualStep(s, onBack = { phase = WatchPhase.CAMERA }) { address ->
            link.connectTo(address)
            phase = WatchPhase.PROGRESS
        }
        phase == WatchPhase.PROGRESS -> WatchProgressStep(s, preview, onRetry = { phase = WatchPhase.CAMERA }) { phase = WatchPhase.READY }
        phase == WatchPhase.READY -> WatchReadyStep(if (preview) "Apple Watch Series 11" else s.name ?: "Apple Watch") {
            store.update { it.copy(watch = PairedWatch(name = if (preview) "Apple Watch Series 11" else s.name ?: "Apple Watch", preview = preview)) }
            phase = WatchPhase.SUITE
        }
        else -> WatchCameraStep(
            s = s,
            onClose = onClose,
            onManual = { phase = WatchPhase.MANUAL },
            onPreview = { preview = true; link.stop(); phase = WatchPhase.PROGRESS },
            onRetry = { link.stop(); link.start(autoConnect = true) },
        )
    }
}

@Composable
private fun WatchCameraStep(s: WatchState, onClose: () -> Unit, onManual: () -> Unit, onPreview: () -> Unit, onRetry: () -> Unit) {
    val locked = s.name != null
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        BackLink("Connect", onClose)
        Box(Modifier.padding(16.dp).fillMaxWidth().aspectRatio(0.8f).clip(RoundedCornerShape(28.dp)).background(DeviceArtColors.Viewfinder)) {
            ParticleReticle(locked, Modifier.fillMaxSize())
            FrameGuide(locked, Modifier.fillMaxSize())
            Row(
                Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp).clip(CircleShape).background(DeviceArtColors.Viewfinder.copy(alpha = 0.7f)).padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (locked) Icon(Icons.Rounded.Check, contentDescription = null, tint = InaColors.Success, modifier = Modifier.size(14.dp)) else PulseDot()
                Spacer(Modifier.width(8.dp))
                Text(if (locked) "${s.name} found" else if (s.scanning) "Looking for Apple Watch…" else "Not searching", color = DeviceArtColors.ViewfinderText, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1)
            }
        }
        FlowTitle("Hold Apple Watch Near This Phone", "Start a workout with heart-rate sharing on your Watch. iNA finds it over Bluetooth.", center = true)
        Note(s.error)
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (!s.scanning && !locked) WideButton("Try Again", onClick = onRetry)
            if (BuildConfig.DEBUG) WideButton("Preview with a sample Watch · debug", secondary = true, onClick = onPreview)
            LinkButton("Pair Apple Watch Manually", onManual)
        }
    }
}

@Composable
private fun SignalBars(rssi: Int) {
    val bars = if (rssi > -55) 3 else if (rssi > -70) 2 else 1
    Row(Modifier.height(14.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
        for (b in 1..3) Box(Modifier.width(4.dp).fillMaxHeight(b / 3f).clip(RoundedCornerShape(1.dp)).background(if (b <= bars) InaColors.TextPrimary else InaColors.Hairline))
    }
}

@Composable
private fun WatchManualStep(s: WatchState, onBack: () -> Unit, onPick: (String) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        BackLink("Camera", onBack)
        FlowTitle("Pair Apple Watch Manually", "Choose your Watch from the list. It appears while it shares heart rate.")
        SectionTitle("Nearby")
        Card {
            s.nearby.forEach { w ->
                SettingRow(w.name, devOnly("${w.address} · ${w.rssi} dBm") ?: "Bluetooth", icon = Icons.Rounded.Favorite, tint = InaColors.Elevated, onClick = { onPick(w.address) }) { SignalBars(w.rssi) }
            }
            if (s.scanning) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = InaColors.TextSecondary)
                    Spacer(Modifier.width(12.dp))
                    Text("Searching…", color = InaColors.TextSecondary, fontSize = 13.sp)
                }
            }
        }
        Note(s.error ?: "Apple shows the 6-digit pairing code only to iPhone, so on Android you pick your Watch here instead.")
    }
}

@Composable
private fun WatchProgressStep(s: WatchState, preview: Boolean, onRetry: () -> Unit, onDone: () -> Unit) {
    var fakeStage by remember { mutableIntStateOf(0) }
    LaunchedEffect(preview) { if (preview) while (fakeStage < 3) { delay(1_500); fakeStage++ } }
    val stage = if (preview) fakeStage else when {
        !s.connected -> 0
        !s.servicesReady -> 1
        !s.telemetryReady -> 2
        else -> 3
    }
    LaunchedEffect(stage) { if (stage >= 3) { delay(500); onDone() } }
    val progress by animateFloatAsState(stage / 3f, tween(600), label = "pairing")
    val failed = !preview && !s.connected && s.gattIdle && s.error != null
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 24.dp, bottom = TAB_BAR_CLEARANCE), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(200.dp), contentAlignment = Alignment.Center) {
            val track = InaColors.Hairline
            val bar = InaColors.Primary
            Canvas(Modifier.fillMaxSize()) {
                drawArc(track, 0f, 360f, false, style = Stroke(4.dp.toPx()), topLeft = Offset(4.dp.toPx(), 4.dp.toPx()), size = Size(size.width - 8.dp.toPx(), size.height - 8.dp.toPx()))
                drawArc(bar, -90f, 360f * progress, false, style = Stroke(4.dp.toPx(), cap = StrokeCap.Round), topLeft = Offset(4.dp.toPx(), 4.dp.toPx()), size = Size(size.width - 8.dp.toPx(), size.height - 8.dp.toPx()))
            }
            ProductArtImage(ProductArtKey.APPLE_WATCH, "Apple Watch", Modifier.size(150.dp))
        }
        FlowTitle("Pairing ${if (preview) "Apple Watch Series 11" else s.name ?: "Apple Watch"}", "${(progress * 100).roundToInt()}% · keep your Watch close", center = true)
        Spacer(Modifier.height(8.dp))
        StageList(DeviceRules.WATCH_PAIRING_STAGES, stage)
        if (failed) {
            Note(s.error)
            Box(Modifier.padding(horizontal = 16.dp)) { WideButton("Try Again", onClick = onRetry) }
        }
    }
}

private val WatchState.gattIdle: Boolean get() = !scanning

@Composable
private fun WatchReadyStep(name: String, onContinue: () -> Unit) {
    val context = LocalContext.current
    val listenerOn = remember { NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 40.dp, bottom = TAB_BAR_CLEARANCE), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(64.dp).clip(CircleShape).background(InaColors.Success), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
        }
        Spacer(Modifier.height(16.dp))
        FlowTitle("Your Apple Watch Is Ready", "$name is connected. Heart rate and notifications now come through iNA.", center = true)
        Spacer(Modifier.height(24.dp))
        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (!listenerOn) {
                WideButton("Allow Notification Access", secondary = true) {
                    runCatching { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                }
            }
            WideButton("Continue", onClick = onContinue)
        }
    }
}

private enum class WatchTab(val label: String) { ACTIVITY("Activity"), HEALTH("Health"), WATCH("Watch") }

private val SAMPLE_NIGHT = mapOf(DeviceRules.SleepStage.AWAKE to 22, DeviceRules.SleepStage.REM to 98, DeviceRules.SleepStage.CORE to 236, DeviceRules.SleepStage.DEEP to 61)

@Composable
private fun WatchSuite(watch: PairedWatch, s: WatchState, preview: Boolean, link: WatchLink, onChange: (PairedWatch) -> Unit, onDisconnect: () -> Unit, onRepair: () -> Unit) {
    var tab by rememberSaveable { mutableStateOf(WatchTab.ACTIVITY) }
    var workout by remember { mutableStateOf(false) }
    // Sample values exist only for the debug preview Watch; a real Watch fills heart rate and battery.
    val sampleSamples = remember { mutableStateListOf<Int>().apply { addAll(List(40) { 70 + (sin(it / 3.0) * 4).roundToInt() }) } }
    var sampleBpm by remember { mutableIntStateOf(72) }
    var sampleActivity by remember { mutableStateOf(listOf(342, 22, 9, 7842)) }
    LaunchedEffect(preview, workout) {
        while (preview) {
            delay(1_200)
            val target = if (workout) 132 else 72
            sampleBpm = (sampleBpm + (target - sampleBpm) * 0.18 + (Random.nextDouble() * 6 - 3)).roundToInt()
            sampleSamples.add(sampleBpm); if (sampleSamples.size > 40) sampleSamples.removeAt(0)
            val a = sampleActivity
            sampleActivity = listOf(a[0] + if (workout) 4 else 1, a[1] + if (workout) 1 else 0, a[2], a[3] + if (workout) 28 else 6)
        }
    }
    val bpm = if (preview) sampleBpm else s.heartRate
    val samples: List<Int> = if (preview) sampleSamples.toList() else s.samples
    val battery = if (preview) 78 else s.battery
    val activity: List<Int>? = if (preview) sampleActivity else null

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        DeviceHeader(
            status = when {
                preview -> "Preview · sample data"
                s.connected -> "Connected · Bluetooth"
                s.scanning -> "Searching for your Watch…"
                else -> "Not connected"
            },
            live = preview || s.connected,
            chip = "GATT · ANCS",
            name = watch.name,
            onBack = onDisconnect,
        )
        Spacer(Modifier.height(12.dp))
        Panel {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
                ProductArtImage(ProductArtKey.APPLE_WATCH, watch.name, Modifier.size(104.dp).floating())
                BatteryRing(battery, false, "Watch", 76.dp)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    HeartBeatIcon(bpm)
                    Text(if (bpm >= 0) "$bpm" else "--", color = InaColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                    Text("BPM", color = InaColors.TextSecondary, fontSize = 11.sp)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        SegmentedPicker(WatchTab.entries, tab, { it.label }, Modifier.padding(horizontal = 16.dp).fillMaxWidth()) { tab = it }
        Spacer(Modifier.height(16.dp))
        when (tab) {
            WatchTab.ACTIVITY -> WatchActivityTab(watch, activity, onChange)
            WatchTab.HEALTH -> WatchHealthTab(watch, bpm, samples, preview, workout, { workout = it }, onChange)
            WatchTab.WATCH -> WatchSettingsTab(watch, s, preview, link, onChange)
        }
        Spacer(Modifier.height(16.dp))
        Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WideButton("Disconnect", Modifier.weight(1f), secondary = true, onClick = onDisconnect)
            WideButton("Unpair & Re-pair", Modifier.weight(1f), secondary = true, destructive = true, onClick = onRepair)
        }
    }
}

@Composable
private fun HeartBeatIcon(bpm: Int) {
    val period = if (bpm > 0) (60_000 / bpm).coerceIn(300, 1500) else 1200
    val t = rememberInfiniteTransition(label = "beat")
    val scale by t.animateFloat(0.85f, 1.1f, infiniteRepeatable(tween(period / 2), RepeatMode.Reverse), label = "beatScale")
    Icon(
        Icons.Rounded.Favorite, contentDescription = null, tint = InaColors.Destructive,
        modifier = Modifier.size(24.dp).graphicsLayer { if (bpm > 0) { scaleX = scale; scaleY = scale } },
    )
}

@Composable
private fun WatchActivityTab(watch: PairedWatch, activity: List<Int>?, onChange: (PairedWatch) -> Unit) {
    var editing by rememberSaveable { mutableStateOf(false) }
    val values = mapOf(
        DeviceRules.Ring.MOVE to (activity?.get(0) ?: 0),
        DeviceRules.Ring.EXERCISE to (activity?.get(1) ?: 0),
        DeviceRules.Ring.STAND to (activity?.get(2) ?: 0),
    )
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ActivityRingsView(values, watch.goals)
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                DeviceRules.Ring.entries.forEach { r ->
                    Text(r.label, color = DeviceArtColors.ring(r), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "${if (activity != null) values[r] else "--"}/${watch.goals[r]} ${r.unit}",
                        color = InaColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        if (activity != null && DeviceRules.Ring.entries.all { DeviceRules.ringClosed(values[it] ?: 0, watch.goals[it]) }) {
            Text("All three rings closed today", color = InaColors.TextPrimary, fontSize = 12.5.sp, fontWeight = FontWeight.Medium, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(InaColors.Elevated).padding(8.dp))
        }
        LinkButton(if (editing) "Done" else "Change Goals") { editing = !editing }
        if (editing) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DeviceRules.Ring.entries.forEach { r ->
                    StepperRow("${r.label} goal", DeviceArtColors.ring(r), "${watch.goals[r]} ${r.unit}",
                        onMinus = { onChange(watch.copy(goals = watch.goals.with(r, watch.goals[r] - r.step))) },
                        onPlus = { onChange(watch.copy(goals = watch.goals.with(r, watch.goals[r] + r.step))) })
                }
            }
        }
    }
    Spacer(Modifier.height(8.dp))
    Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        StatTile("Steps", activity?.get(3)?.let { String.format(Locale.US, "%,d", it) } ?: "--", Modifier.weight(1f))
        StatTile("Distance", activity?.get(3)?.let { String.format(Locale.US, "%.2f km", DeviceRules.stepsToKm(it)) } ?: "--", Modifier.weight(1f))
    }
    if (activity == null) Note("Your Watch keeps Activity in Apple Health and doesn't share it with Android, so the rings stay empty here. Your goals are saved.")
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(20.dp)).background(InaColors.Card).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Rounded.DirectionsWalk, contentDescription = null, tint = InaColors.TextSecondary, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text(label, color = InaColors.TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
        Text(value, color = InaColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun WatchHealthTab(watch: PairedWatch, bpm: Int, samples: List<Int>, preview: Boolean, workout: Boolean, onWorkout: (Boolean) -> Unit, onChange: (PairedWatch) -> Unit) {
    val zone = DeviceRules.heartZone(bpm, watch.lowBpm, watch.highBpm)
    val resting = DeviceRules.restingHeartRate(samples)
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { PanelLabel("Heart Rate", InaColors.Destructive, Icons.Rounded.Favorite) }
            val (label, bg) = when (zone) {
                DeviceRules.HeartZone.HIGH -> "Above ${watch.highBpm}" to InaColors.Warning
                DeviceRules.HeartZone.LOW -> "Below ${watch.lowBpm}" to InaColors.Primary
                DeviceRules.HeartZone.NORMAL -> "Normal range" to InaColors.Elevated
                null -> "No reading" to InaColors.Elevated
            }
            Text(label, color = if (zone == DeviceRules.HeartZone.HIGH || zone == DeviceRules.HeartZone.LOW) Color.White else InaColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium, modifier = Modifier.clip(CircleShape).background(bg).padding(horizontal = 8.dp, vertical = 2.dp))
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Text(if (bpm >= 0) "$bpm" else "--", color = InaColors.TextPrimary, fontSize = 38.sp, fontWeight = FontWeight.SemiBold)
            Text(" BPM · live", color = InaColors.TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        }
        HeartTraceView(samples, watch.lowBpm, watch.highBpm)
        Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MiniStat("Resting", if (resting > 0) "$resting" else "--", InaColors.TextPrimary, Modifier.weight(1f))
            MiniStat("High alert", "${watch.highBpm}", InaColors.Warning, Modifier.weight(1f))
            MiniStat("Low alert", "${watch.lowBpm}", InaColors.Primary, Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            StepperRow("High heart rate", null, "${watch.highBpm} BPM",
                { onChange(watch.copy(highBpm = DeviceRules.clampHeartThreshold(DeviceRules.Threshold.HIGH, watch.highBpm - 5))) },
                { onChange(watch.copy(highBpm = DeviceRules.clampHeartThreshold(DeviceRules.Threshold.HIGH, watch.highBpm + 5))) })
            StepperRow("Low heart rate", null, "${watch.lowBpm} BPM",
                { onChange(watch.copy(lowBpm = DeviceRules.clampHeartThreshold(DeviceRules.Threshold.LOW, watch.lowBpm - 5))) },
                { onChange(watch.copy(lowBpm = DeviceRules.clampHeartThreshold(DeviceRules.Threshold.LOW, watch.lowBpm + 5))) })
        }
        if (preview) {
            Spacer(Modifier.height(8.dp))
            WideButton(if (workout) "End sample workout" else "Sample a workout", secondary = true) { onWorkout(!workout) }
        }
    }
    if (!preview) Note("Heart rate is live while your Watch shares it, for example during a workout with heart-rate sharing on.")
    Spacer(Modifier.height(8.dp))
    BloodOxygenPanel(preview)
    Spacer(Modifier.height(8.dp))
    EcgPanel(preview, bpm)
    Spacer(Modifier.height(8.dp))
    SleepPanel(if (preview) SAMPLE_NIGHT else null)
    if (!preview) Note("Blood Oxygen, ECG and Sleep are measured on your Watch and kept in Apple Health on iPhone. Apple doesn't share them over Bluetooth, so they show -- on Android.")
}

@Composable
private fun MiniStat(label: String, value: String, tone: Color, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(12.dp)).background(InaColors.Elevated).padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = tone, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
        Text(label, color = InaColors.TextSecondary, fontSize = 10.5.sp, maxLines = 1)
    }
}

@Composable
private fun SmallButton(text: String, enabled: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = enabled, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = InaColors.Primary, contentColor = Color.White)) {
        Text(text, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
private fun BloodOxygenPanel(preview: Boolean) {
    var left by remember { mutableStateOf<Int?>(null) }
    var result by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(left) {
        val l = left ?: return@LaunchedEffect
        delay(1_000)
        if (l <= 1) { result = 96 + Random.nextInt(4); left = null } else left = l - 1
    }
    val status = result?.let { DeviceRules.spo2Status(it) }
    Panel {
        PanelLabel("Blood Oxygen", InaColors.Primary, Icons.Rounded.Air)
        Row(verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Text(left?.let { "${it}s" } ?: result?.let { "$it%" } ?: "--%", color = InaColors.TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    when {
                        left != null -> "Keep your wrist flat and still…"
                        status == DeviceRules.Spo2Status.NORMAL -> "Within the normal range"
                        status != null -> "Lower than usual"
                        else -> "No reading on Android"
                    },
                    color = InaColors.TextSecondary, fontSize = 12.sp,
                )
            }
            if (preview) SmallButton("Measure", left == null) { left = 15 }
        }
    }
}

@Composable
private fun EcgPanel(preview: Boolean, bpm: Int) {
    var left by remember { mutableStateOf<Int?>(null) }
    val readings = remember { mutableStateListOf<Int>() }
    var result by remember { mutableStateOf<Pair<String, Int>?>(null) }
    LaunchedEffect(left) {
        val l = left ?: return@LaunchedEffect
        delay(1_000)
        if (bpm > 0) readings.add(bpm)
        if (l <= 1) {
            val avg = if (readings.isEmpty()) bpm else readings.average().roundToInt()
            result = DeviceRules.classifyEcg(avg).label to avg
            left = null
        } else left = l - 1
    }
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { PanelLabel("ECG", InaColors.Destructive, Icons.Rounded.MonitorHeart) }
            left?.let { Text("${it}s left", color = InaColors.TextSecondary, fontSize = 12.sp) }
        }
        EcgTraceView(if (bpm > 0) bpm else 72, left != null)
        Row(verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Text(if (left != null) "Recording…" else result?.first ?: "No recording", color = InaColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    if (left != null) "Hold your finger on the Digital Crown" else result?.let { "Average ${it.second} BPM · 30 s" } ?: "Takes 30 seconds on your Watch",
                    color = InaColors.TextSecondary, fontSize = 12.sp,
                )
            }
            if (preview) SmallButton("Record", left == null) { readings.clear(); result = null; left = 30 }
        }
    }
}

@Composable
private fun SleepPanel(night: Map<DeviceRules.SleepStage, Int>?) {
    val slices = DeviceRules.sleepBreakdown(night ?: emptyMap())
    Panel {
        PanelLabel("Sleep · last night", DeviceArtColors.Rem, Icons.Rounded.Bedtime)
        Text(night?.let { DeviceRules.formatDuration(DeviceRules.timeAsleep(it)) } ?: "--", color = InaColors.TextPrimary, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
        Text("Time asleep", color = InaColors.TextSecondary, fontSize = 12.sp)
        Row(Modifier.padding(top = 12.dp).fillMaxWidth().height(12.dp).clip(CircleShape).background(InaColors.Hairline)) {
            slices.filter { it.percent > 0 }.forEach { sl -> Box(Modifier.weight(sl.percent.toFloat()).fillMaxHeight().background(DeviceArtColors.sleep(sl.stage))) }
        }
        Spacer(Modifier.height(12.dp))
        slices.chunked(2).forEach { pair ->
            Row(Modifier.padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                pair.forEach { sl ->
                    Row(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(InaColors.Elevated).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(10.dp).clip(CircleShape).background(DeviceArtColors.sleep(sl.stage)))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(sl.stage.label, color = InaColors.TextPrimary, fontSize = 12.5.sp, fontWeight = FontWeight.Medium)
                            Text(if (night == null) "--" else "${DeviceRules.formatDuration(sl.minutes)} · ${sl.percent}%", color = InaColors.TextSecondary, fontSize = 11.sp, maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

private val WATCH_FACES = listOf("modular" to "Modular", "activity" to "Activity Digital", "solar" to "Solar Dial", "photos" to "Photos", "unity" to "Unity")

@Composable
private fun WatchSettingsTab(watch: PairedWatch, s: WatchState, preview: Boolean, link: WatchLink, onChange: (PairedWatch) -> Unit) {
    val context = LocalContext.current
    val settingsStore = remember { InaGraph.settings(context) }
    val settings by settingsStore.settings.collectAsStateWithLifecycle()
    var previewPinging by remember { mutableStateOf(false) }
    LaunchedEffect(previewPinging) { if (previewPinging) { delay(2_500); previewPinging = false } }
    val pinging = if (preview) previewPinging else s.pinging

    SectionTitle("Watch Faces")
    Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        WATCH_FACES.forEach { (id, name) ->
            val active = watch.face == id
            Column(Modifier.clip(RoundedCornerShape(20.dp)).clickable { onChange(watch.copy(face = id)) }, horizontalAlignment = Alignment.CenterHorizontally) {
                FacePreview(id, active)
                Text(name, color = if (active) InaColors.Primary else InaColors.TextSecondary, fontSize = 11.5.sp, fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.padding(top = 6.dp), maxLines = 1)
            }
        }
    }
    if (!preview) Note("Set the same face on your Watch: touch and hold the face, then swipe to it.")
    SectionTitle("Watch")
    Card {
        ToggleRow("Mirror notifications", if (BuildConfig.DEBUG) "Android alerts on your wrist · ANCS" else "Android alerts on your wrist", settings.watchNotifications, Icons.Rounded.Notifications, InaColors.Elevated) { on ->
            settingsStore.update { it.copy(watchNotifications = on) }
        }
        ToggleRow("Wrist haptics", "Tap your wrist for alerts", watch.haptics, Icons.Rounded.Vibration, InaColors.Elevated) { onChange(watch.copy(haptics = it)) }
        ToggleRow("Prominent haptic", "Extra tap before common alerts", watch.prominentHaptics && watch.haptics, Icons.Rounded.Vibration, InaColors.Elevated) {
            if (watch.haptics) onChange(watch.copy(prominentHaptics = it))
        }
        SettingRow("Ping My Watch", if (pinging) "Playing a sound on your Watch…" else "Find a Watch nearby", icon = Icons.Rounded.NotificationsActive, tint = InaColors.Elevated, onClick = {
            if (pinging) return@SettingRow
            if (preview) previewPinging = true else link.ping()
        }) {
            Text(if (pinging) "Pinging…" else "Ping", color = if (pinging) InaColors.TextSecondary else InaColors.Primary, fontSize = 14.sp, maxLines = 1, softWrap = false)
        }
    }
    Note(if (!preview) s.error else null)
}

@Composable
private fun FacePreview(id: String, active: Boolean) {
    val fg = DeviceArtColors.ViewfinderText
    Box(
        Modifier.size(92.dp, 112.dp).clip(RoundedCornerShape(26.dp)).background(DeviceArtColors.Viewfinder)
            .border(2.dp, if (active) InaColors.Primary else Color.Transparent, RoundedCornerShape(26.dp)).padding(8.dp),
    ) {
        when (id) {
            "modular" -> Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Text("TUE 27", color = DeviceArtColors.Stand, fontSize = 9.sp)
                Text("10:09", color = fg, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.weight(1f).height(10.dp).clip(RoundedCornerShape(3.dp)).background(DeviceArtColors.Move.copy(alpha = 0.6f)))
                    Box(Modifier.weight(1f).height(10.dp).clip(RoundedCornerShape(3.dp)).background(DeviceArtColors.Exercise.copy(alpha = 0.6f)))
                }
            }
            "activity" -> Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text("10:09", color = fg, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                ActivityRingsView(mapOf(DeviceRules.Ring.MOVE to 380, DeviceRules.Ring.EXERCISE to 24, DeviceRules.Ring.STAND to 10), DeviceRules.Goals(), 48.dp, 5.dp)
            }
            "solar" -> Canvas(Modifier.fillMaxSize()) {
                val c = Offset(size.width / 2, size.height / 2)
                drawCircle(Brush.radialGradient(listOf(Color(0x66FF9F0A), Color.Transparent), c, size.minDimension / 2), size.minDimension / 2, c)
                drawCircle(fg.copy(alpha = 0.4f), size.minDimension * 0.32f, c, style = Stroke(1.dp.toPx()))
                rotate(-60f, c) { drawLine(fg, c, Offset(c.x, c.y - size.minDimension * 0.2f), 2.dp.toPx(), StrokeCap.Round) }
                rotate(55f, c) { drawLine(Color(0xFFFF9F0A), c, Offset(c.x, c.y - size.minDimension * 0.28f), 2.dp.toPx(), StrokeCap.Round) }
            }
            "photos" -> Box(
                Modifier.fillMaxSize().clip(RoundedCornerShape(20.dp)).background(Brush.linearGradient(listOf(DeviceArtColors.Core, DeviceArtColors.Move.copy(alpha = 0.7f), Color(0xFFFF9F0A)))).padding(6.dp),
                contentAlignment = Alignment.BottomStart,
            ) { Text("10:09", color = fg, fontSize = 17.sp, fontWeight = FontWeight.SemiBold) }
            else -> Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                val style = TextStyle(brush = Brush.verticalGradient(listOf(DeviceArtColors.Exercise, Color(0xFFFF9F0A), DeviceArtColors.Move)), fontSize = 30.sp, fontWeight = FontWeight.Black)
                Text("10", style = style, lineHeight = 30.sp)
                Text("09", style = style, lineHeight = 30.sp)
            }
        }
    }
}

/* ═══════════════════════════ AirTag ═══════════════════════════ */

private enum class TagPhase { DETECT, NAME, REGISTERED, FIND }

@Composable
fun AirTagFlow(onClose: () -> Unit) {
    val context = LocalContext.current
    val finder = remember { InaGraph.otherDevices(context).airTag }
    val store = remember { PairedDevicesStore.get(context) }
    val paired by store.state.collectAsStateWithLifecycle()
    val s by finder.state.collectAsStateWithLifecycle()
    var phase by rememberSaveable { mutableStateOf(if (paired.airTag != null) TagPhase.FIND else TagPhase.DETECT) }
    var draftName by rememberSaveable { mutableStateOf(paired.airTag?.name ?: "Keys") }
    var draftEmoji by rememberSaveable { mutableStateOf(paired.airTag?.emoji ?: "🔑") }
    DisposableEffect(Unit) {
        finder.start()
        onDispose { finder.stop() }
    }
    val tag = paired.airTag
    when {
        phase == TagPhase.FIND && tag != null -> AirTagFindStep(
            tag, s, finder, onClose,
            onRename = { draftName = tag.name; draftEmoji = tag.emoji; phase = TagPhase.NAME },
            onRemove = { store.update { it.copy(airTag = null) }; phase = TagPhase.DETECT },
        )
        phase == TagPhase.NAME -> AirTagNameStep(draftName, draftEmoji, { n, e -> draftName = n; draftEmoji = e }, onBack = { phase = if (tag != null) TagPhase.FIND else TagPhase.DETECT }) { clean ->
            val wasPaired = tag != null
            store.update { it.copy(airTag = PairedAirTag(clean, draftEmoji)) }
            phase = if (wasPaired) TagPhase.FIND else TagPhase.REGISTERED
        }
        phase == TagPhase.REGISTERED -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 40.dp, bottom = TAB_BAR_CLEARANCE), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(draftEmoji, fontSize = 64.sp)
            FlowTitle("${tag?.name ?: draftName} Is Registered", "Saved in iNA. Find it by distance, play a sound when it's away from its owner, or open Lost Mode.", center = true)
            Box(Modifier.padding(16.dp)) { WideButton("Done") { phase = TagPhase.FIND } }
        }
        else -> {
            Searching("AirTag", "Looking for items nearby…", onClose, s.error)
            if (s.found) {
                ProximitySheet("AirTag Detected", if (s.separated) "Away from its owner" else "Nearby", onClose) {
                    Box(Modifier.padding(vertical = 12.dp).fillMaxWidth().height(150.dp).stage(), contentAlignment = Alignment.Center) {
                        ProductArtImage(ProductArtKey.AIRTAG, "AirTag", Modifier.size(140.dp).floating())
                    }
                    WideButton("Connect") { phase = TagPhase.NAME }
                }
            }
        }
    }
}

@Composable
private fun AirTagNameStep(name: String, emoji: String, onDraft: (String, String) -> Unit, onBack: () -> Unit, onSave: (String) -> Unit) {
    val preset = DeviceRules.AIRTAG_ITEMS.firstOrNull { it.name == name }
    var custom by rememberSaveable { mutableStateOf(if (preset == null) name else "") }
    val clean = DeviceRules.cleanItemName(if (preset != null) name else custom)
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        BackLink("Back", onBack)
        FlowTitle("Choose a Name", "Pick what this AirTag is attached to.")
        Spacer(Modifier.height(8.dp))
        DeviceRules.AIRTAG_ITEMS.chunked(4).forEach { row ->
            Row(Modifier.padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { item ->
                    val active = name == item.name && emoji == item.emoji
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(InaColors.Card)
                            .border(2.dp, if (active) InaColors.Primary else Color.Transparent, RoundedCornerShape(16.dp))
                            .clickable { custom = ""; onDraft(item.name, item.emoji) }.padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(item.emoji, fontSize = 26.sp)
                        Text(item.name, color = InaColors.TextPrimary, fontSize = 11.5.sp, maxLines = 1)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Panel {
            Text("Custom name", color = InaColors.TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(8.dp))
            BasicTextField(
                value = custom,
                onValueChange = { v -> custom = v.take(DeviceRules.AIRTAG_NAME_MAX); onDraft(custom, emoji) },
                singleLine = true,
                textStyle = TextStyle(color = InaColors.TextPrimary, fontSize = 15.sp),
                cursorBrush = SolidColor(InaColors.Primary),
                modifier = Modifier.fillMaxWidth().height(44.dp).clip(RoundedCornerShape(12.dp)).background(InaColors.Elevated).padding(horizontal = 12.dp, vertical = 12.dp),
                decorationBox = { inner ->
                    if (custom.isEmpty()) Text("e.g. Car keys", color = InaColors.TextSecondary, fontSize = 15.sp)
                    inner()
                },
            )
            Spacer(Modifier.height(8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DeviceRules.AIRTAG_ITEMS.forEach { item ->
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(if (emoji == item.emoji) InaColors.Primary.copy(alpha = 0.2f) else InaColors.Elevated)
                            .border(2.dp, if (emoji == item.emoji) InaColors.Primary else Color.Transparent, CircleShape)
                            .clickable { onDraft(if (preset != null) name else custom, item.emoji) },
                        contentAlignment = Alignment.Center,
                    ) { Text(item.emoji, fontSize = 18.sp) }
                }
            }
        }
        Box(Modifier.padding(16.dp)) { WideButton("Continue", enabled = clean != null) { clean?.let(onSave) } }
    }
}

@Composable
private fun AirTagFindStep(tag: PairedAirTag, s: AirTagState, finder: AirTagFinder, onClose: () -> Unit, onRename: () -> Unit, onRemove: () -> Unit) {
    val context = LocalContext.current
    var finding by rememberSaveable { mutableStateOf(false) }
    val here = s.found && s.distanceMeters in 0.0..0.5
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        DeviceHeader(
            status = when {
                s.found && s.separated -> "Nearby · away from its owner"
                s.found -> "Nearby"
                s.scanning -> "Searching…"
                else -> "Not found"
            },
            live = s.found, chip = "0x12 · Find My", name = "${tag.emoji} ${tag.name}", onBack = onClose,
        )
        Spacer(Modifier.height(12.dp))
        if (finding) {
            Column(
                Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(if (here) InaColors.Success else InaColors.Card).padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.size(200.dp), contentAlignment = Alignment.Center) {
                    FindingPulse(if (s.found) s.distanceMeters else 6.0, if (here) Color.White else InaColors.Primary)
                    Box(Modifier.size(if (here) 80.dp else 28.dp).clip(CircleShape).background(if (here) Color.White.copy(alpha = 0.9f) else InaColors.Primary))
                }
                val textColor = if (here) Color.White else InaColors.TextPrimary
                Text(if (!s.found) "-- m" else if (here) "Here" else String.format(Locale.US, "%.1f m", s.distanceMeters), color = textColor, fontSize = 44.sp, fontWeight = FontWeight.SemiBold)
                Text(if (here) "Within reach" else DeviceRules.findingLabel(if (s.found) s.distanceMeters else -1.0), color = if (here) Color.White else InaColors.TextSecondary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                if (s.found && !here) {
                    val (bg, fg) = when (s.trend) {
                        DeviceRules.ProximityTrend.WARMER -> InaColors.Warning to Color.White
                        DeviceRules.ProximityTrend.COLDER -> InaColors.Primary to Color.White
                        DeviceRules.ProximityTrend.STEADY -> InaColors.Elevated to InaColors.TextSecondary
                    }
                    Text(s.trend.label, color = fg, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp).clip(CircleShape).background(bg).padding(horizontal = 12.dp, vertical = 4.dp))
                }
            }
        } else {
            Panel {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(if (s.found) String.format(Locale.US, "%.1f m", s.distanceMeters) else "-- m", color = InaColors.TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, softWrap = false)
                        Text(if (s.found) devOnly("Nearby · ${s.rssi} dBm") ?: "Nearby · Bluetooth" else "Searching…", color = InaColors.TextSecondary, fontSize = 12.sp, maxLines = 1)
                    }
                    BatteryRing(s.battery, false, "Battery", 72.dp)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WideButton(if (s.ringing) "Playing…" else "Play Sound", Modifier.weight(1f), enabled = s.found && !s.ringing, onClick = finder::playSound)
            WideButton(if (finding) "Stop Finding" else "Find", Modifier.weight(1f), secondary = true) { finding = !finding }
        }
        Note(s.error)
        SectionTitle("Lost Mode")
        Card {
            SettingRow("Mark As Lost", "Set by the owner in Find My on iCloud.com", icon = Icons.AutoMirrored.Rounded.OpenInNew, tint = InaColors.Elevated, onClick = {
                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.icloud.com/find")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            })
        }
        Spacer(Modifier.height(12.dp))
        Card { SettingRow("Rename Item", "${tag.emoji} ${tag.name}", icon = Icons.Rounded.Edit, tint = InaColors.Elevated, onClick = onRename) }
        Note("Distance is estimated from the Bluetooth signal. Direction needs Ultra Wideband from the owner's iPhone.")
        Box(Modifier.padding(horizontal = 16.dp)) { WideButton("Remove AirTag", secondary = true, destructive = true, onClick = onRemove) }
    }
}

/** Rings that pulse faster as the item gets closer. */
@Composable
private fun FindingPulse(distance: Double, color: Color) {
    val period = (distance / 2 * 1000).toInt().coerceIn(800, 3000)
    val t = rememberInfiniteTransition(label = "find")
    val phase by t.animateFloat(0f, 1f, infiniteRepeatable(tween(period, easing = LinearEasing), RepeatMode.Restart), label = "findPhase")
    Canvas(Modifier.fillMaxSize()) {
        for (i in 0 until 3) {
            val p = (phase + i / 3f) % 1f
            drawCircle(color.copy(alpha = 0.5f * (1f - p)), radius = size.minDimension / 2 * (0.3f + p * 0.7f), style = Stroke(1.5.dp.toPx()))
        }
    }
}

/* ═══════════════════════════ HomePod ═══════════════════════════ */

private enum class PodPhase { DETECT, ROOM, STEREO, CONTROLS }

@Composable
fun HomePodFlow(onClose: () -> Unit) {
    val context = LocalContext.current
    val browser = remember { InaGraph.otherDevices(context).homePod }
    val store = remember { PairedDevicesStore.get(context) }
    val paired by store.state.collectAsStateWithLifecycle()
    val s by browser.state.collectAsStateWithLifecycle()
    var phase by rememberSaveable { mutableStateOf(if (paired.homePod != null) PodPhase.CONTROLS else PodPhase.DETECT) }
    var room by rememberSaveable { mutableStateOf(DeviceRules.HOMEPOD_ROOMS.first()) }
    DisposableEffect(Unit) {
        browser.start()
        onDispose { browser.stop() }
    }
    val pod = paired.homePod
    if (phase == PodPhase.CONTROLS && pod != null) {
        HomePodControls(pod, s, browser, onClose, onChange = { p -> store.update { it.copy(homePod = p) } }) {
            store.update { it.copy(homePod = null) }
            phase = PodPhase.DETECT
        }
        return
    }
    Searching("HomePod", if (s.discovering) "Looking for HomePod on Wi-Fi…" else "Join the same Wi-Fi as your HomePod", onClose, s.error)
    val first = s.speakers.firstOrNull { it.name == s.selected } ?: s.speakers.firstOrNull() ?: return
    val save: (String?) -> Unit = { partner ->
        store.update { it.copy(homePod = PairedHomePod(first.name, room, partner)) }
        phase = PodPhase.CONTROLS
    }
    ProximitySheet(
        title = when (phase) {
            PodPhase.ROOM -> "Choose a Room"
            PodPhase.STEREO -> "Use as Stereo Pair?"
            else -> "Set Up HomePod"
        },
        subtitle = when (phase) {
            PodPhase.ROOM -> "Where is ${first.name}?"
            PodPhase.STEREO -> "For ${first.name} in $room"
            else -> "${first.model} · on your Wi-Fi"
        },
        onClose = onClose,
    ) {
        when (phase) {
            PodPhase.ROOM -> {
                Spacer(Modifier.height(16.dp))
                DeviceRules.HOMEPOD_ROOMS.chunked(2).forEach { pair ->
                    Row(Modifier.padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        pair.forEach { r ->
                            val active = r == room
                            Text(
                                r, color = if (active) Color.White else InaColors.TextPrimary, fontSize = 13.5.sp, fontWeight = FontWeight.Medium, textAlign = TextAlign.Center, maxLines = 1,
                                modifier = Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(if (active) InaColors.Primary else InaColors.Hairline).clickable { room = r }.padding(vertical = 12.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                WideButton("Continue") { phase = PodPhase.STEREO }
            }
            PodPhase.STEREO -> {
                val others = s.speakers.filter { it.name != first.name }
                Row(Modifier.padding(vertical = 12.dp).height(130.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ProductArtImage(ProductArtKey.HOMEPOD, first.name, Modifier.size(120.dp).floating())
                    if (others.isNotEmpty()) ProductArtImage(ProductArtKey.HOMEPOD, others.first().name, Modifier.size(120.dp).floating())
                }
                if (others.isEmpty()) {
                    Text("Only one HomePod is on this Wi-Fi. You can pair a second one later.", color = InaColors.TextSecondary, fontSize = 12.5.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(bottom = 16.dp))
                    WideButton("Continue") { save(null) }
                } else {
                    Text("Two HomePods play left and right channels for wider sound.", color = InaColors.TextSecondary, fontSize = 12.5.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(bottom = 12.dp))
                    others.forEach { o -> WideButton("Pair with ${o.name}", Modifier.padding(bottom = 6.dp)) { save(o.name) } }
                    LinkButton("Not Now") { save(null) }
                }
            }
            else -> {
                Box(Modifier.padding(vertical = 12.dp).fillMaxWidth().height(150.dp).stage(), contentAlignment = Alignment.Center) {
                    ProductArtImage(ProductArtKey.HOMEPOD, first.name, Modifier.size(140.dp).floating())
                }
                WideButton("Set Up") { phase = PodPhase.ROOM }
            }
        }
    }
}

@Composable
private fun HomePodControls(pod: PairedHomePod, s: HomePodState, browser: HomePodBrowser, onClose: () -> Unit, onChange: (PairedHomePod) -> Unit, onRemove: () -> Unit) {
    val online = s.speakers.any { it.name == pod.name }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = TAB_BAR_CLEARANCE)) {
        DeviceHeader(
            status = if (online) "${pod.room} · on this Wi-Fi" else if (s.discovering) "${pod.room} · looking on Wi-Fi…" else "${pod.room} · not found",
            live = online, chip = "mDNS · AirPlay", name = if (pod.stereoWith != null) "${pod.name} Pair" else pod.name, onBack = onClose,
        )
        Row(Modifier.fillMaxWidth().height(200.dp).stage(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            ProductArtImage(ProductArtKey.HOMEPOD, pod.name, Modifier.size(if (pod.stereoWith != null) 150.dp else 180.dp).floating())
            if (pod.stereoWith != null) ProductArtImage(ProductArtKey.HOMEPOD, pod.stereoWith, Modifier.size(150.dp).floating())
        }
        NowPlayingCard("This phone · stream to ${pod.name} with an AirPlay sender app")
        SectionTitle("Speakers on this Wi-Fi")
        Card {
            if (s.speakers.isEmpty()) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (s.discovering) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = InaColors.TextSecondary)
                    Spacer(Modifier.width(12.dp))
                    Text("Looking for HomePods…", color = InaColors.TextSecondary, fontSize = 13.sp)
                }
            }
            s.speakers.forEach { sp ->
                SettingRow(sp.name, listOfNotNull(sp.model, devOnly(sp.host ?: "")).filter { it.isNotEmpty() }.joinToString(" · "), icon = Icons.Rounded.Speaker, tint = InaColors.Elevated, onClick = { browser.select(sp.name) }) {
                    if (s.selected == sp.name) Icon(Icons.Rounded.Check, contentDescription = "Selected", tint = InaColors.Primary)
                }
            }
        }
        SectionTitle("HomePod")
        Card {
            val partner = s.speakers.firstOrNull { it.name != pod.name }?.name
            ToggleRow("Stereo pair", pod.stereoWith?.let { "With $it" } ?: if (partner != null) "Pair with $partner" else "Needs a second HomePod on this Wi-Fi", pod.stereoWith != null, Icons.Rounded.Speaker, InaColors.Elevated) { on ->
                onChange(pod.copy(stereoWith = if (on) partner else null))
            }
            val idx = DeviceRules.HOMEPOD_ROOMS.indexOf(pod.room).coerceAtLeast(0)
            SettingRow("Room", value = pod.room, icon = Icons.Rounded.Home, tint = InaColors.Elevated, onClick = { onChange(pod.copy(room = DeviceRules.HOMEPOD_ROOMS[(idx + 1) % DeviceRules.HOMEPOD_ROOMS.size])) })
        }
        Note("Room and stereo pair are kept in iNA. Android can find HomePods and control this phone's playback; sending audio needs an AirPlay sender app.")
        Box(Modifier.padding(horizontal = 16.dp)) { WideButton("Remove Accessory", secondary = true, destructive = true, onClick = onRemove) }
    }
}
