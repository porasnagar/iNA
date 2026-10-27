package dev.ibridge.android

import android.os.Build
import android.view.Window
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

/**
 * Liquid Glass surfaces for transient UI (case-open pop-up, sheets).
 *
 * - [reduceTransparency] comes from Settings › Display › Reduce Transparency and makes every
 *   glass surface an opaque, high-contrast card with no blur.
 * - [backdropBlurred] is true only when something real is blurring what sits behind the
 *   surface (window blur-behind on Android 12+, or Modifier.blur in-app). Without a blurred
 *   backdrop the fill stays mostly opaque so text keeps its contrast over busy apps.
 */
@Immutable
data class GlassStyle(
    val reduceTransparency: Boolean = false,
    val backdropBlurred: Boolean = false,
)

val LocalGlass = staticCompositionLocalOf { GlassStyle() }

object LiquidGlass {
    const val BLUR_BEHIND_RADIUS = 56
    const val FILL_ALPHA_BLURRED = 0.6f
    const val FILL_ALPHA_UNBLURRED = 0.88f

    /** True when this device can blur other windows (Android 12+, not disabled by battery saver). */
    fun crossWindowBlurAvailable(windowManager: WindowManager?): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && windowManager?.isCrossWindowBlurEnabled == true

    /** Blurs the Home Screen / app behind [window]. Returns true when the blur is active. */
    fun applyBlurBehind(window: Window, reduceTransparency: Boolean): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        val enabled = !reduceTransparency && window.windowManager.isCrossWindowBlurEnabled
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
            window.attributes = window.attributes.apply { blurBehindRadius = BLUR_BEHIND_RADIUS }
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
        }
        return enabled
    }
}

fun Modifier.liquidGlass(
    shape: Shape,
    reduceTransparency: Boolean,
    backdropBlurred: Boolean,
    base: Color = InaColors.Card,
): Modifier =
    if (reduceTransparency) {
        this.clip(shape)
            .background(base, shape)
            .border(1.dp, InaColors.Hairline, shape)
    } else {
        val alpha = if (backdropBlurred) LiquidGlass.FILL_ALPHA_BLURRED else LiquidGlass.FILL_ALPHA_UNBLURRED
        val light = InaColors.palette.isLight
        // Light glass: a brighter top sheen and a soft dark rim so the edge reads on white.
        val rim = if (light) {
            listOf(Color.White.copy(alpha = 0.9f), Color.Black.copy(alpha = 0.06f), Color.Black.copy(alpha = 0.1f))
        } else {
            listOf(Color.White.copy(alpha = 0.34f), Color.White.copy(alpha = 0.06f), Color.White.copy(alpha = 0.12f))
        }
        this.clip(shape)
            .background(base.copy(alpha = alpha), shape)
            // Specular sheen: bright at the top edge, fading through the body.
            .background(
                Brush.verticalGradient(
                    0f to Color.White.copy(alpha = if (light) 0.5f else 0.12f),
                    0.38f to Color.White.copy(alpha = 0.03f),
                    0.7f to Color.Transparent,
                    1f to Color.White.copy(alpha = 0.04f),
                ),
                shape,
            )
            // Rim light.
            .border(
                1.dp,
                Brush.verticalGradient(rim),
                shape,
            )
    }

/** Glass surface using the current [LocalGlass] style. */
@Composable
fun Modifier.glassSurface(shape: Shape): Modifier {
    val glass = LocalGlass.current
    return liquidGlass(shape, glass.reduceTransparency, glass.backdropBlurred)
}
