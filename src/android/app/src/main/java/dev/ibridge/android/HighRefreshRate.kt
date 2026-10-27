package dev.ibridge.android

import android.content.Context
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.view.Display
import android.view.Window
import android.view.WindowManager

/**
 * Requests the display's fastest refresh rate (90 / 120 / 144 Hz) at the current resolution so
 * Compose animations and the case-open overlay run at native high refresh rate on Samsung One UI
 * Adaptive, OnePlus, Pixel Smooth Display and similar panels.
 *
 * This is a preference, not a lock: Android still drops to 60 Hz when Battery Saver is on, the
 * user picked "Standard" refresh rate, or the panel goes idle (LTPO). Works on API 29+ (minSdk).
 */
object HighRefreshRate {

    /** Fastest mode with the same physical resolution as the current one, or null. */
    fun bestMode(context: Context): Display.Mode? {
        val display = context.getSystemService(DisplayManager::class.java)
            ?.getDisplay(Display.DEFAULT_DISPLAY) ?: return null
        val current = display.mode
        return display.supportedModes
            .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
            .maxByOrNull { it.refreshRate }
    }

    /** For activity windows: translucent surface + preferred high-refresh display mode. */
    fun apply(window: Window) {
        window.setFormat(PixelFormat.TRANSLUCENT)
        val mode = bestMode(window.context) ?: return
        window.attributes = window.attributes.apply {
            preferredDisplayModeId = mode.modeId
            preferredRefreshRate = mode.refreshRate
        }
    }

    /** For WindowManager overlays added with addView (the case-open sheet). */
    fun apply(context: Context, params: WindowManager.LayoutParams): WindowManager.LayoutParams {
        params.format = PixelFormat.TRANSLUCENT
        bestMode(context)?.let { mode ->
            params.preferredDisplayModeId = mode.modeId
            params.preferredRefreshRate = mode.refreshRate
        }
        return params
    }
}
