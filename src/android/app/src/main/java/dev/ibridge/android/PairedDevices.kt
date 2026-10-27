package dev.ibridge.android

import android.content.Context
import androidx.compose.runtime.Immutable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Apple Watch paired in iNA, with the goals and settings chosen for it. */
@Immutable
data class PairedWatch(
    val name: String,
    val face: String = "modular",
    val goals: DeviceRules.Goals = DeviceRules.Goals(),
    val lowBpm: Int = DeviceRules.DEFAULT_LOW_BPM,
    val highBpm: Int = DeviceRules.DEFAULT_HIGH_BPM,
    val haptics: Boolean = true,
    val prominentHaptics: Boolean = false,
    /** Debug builds only: paired with sample data instead of a real Watch. */
    val preview: Boolean = false,
)

@Immutable
data class PairedAirTag(val name: String, val emoji: String)

@Immutable
data class PairedHomePod(val name: String, val room: String, val stereoWith: String? = null)

@Immutable
data class PairedDevices(val watch: PairedWatch? = null, val airTag: PairedAirTag? = null, val homePod: PairedHomePod? = null)

/** Saved in SharedPreferences, like usePairedDevices() in the simulator. */
class PairedDevicesStore private constructor(context: Context) {
    private val prefs = context.getSharedPreferences("ina_paired_devices", Context.MODE_PRIVATE)
    private val _state = MutableStateFlow(read())
    val state: StateFlow<PairedDevices> = _state.asStateFlow()

    @Synchronized
    fun update(transform: (PairedDevices) -> PairedDevices) {
        val next = transform(_state.value)
        write(next)
        _state.value = next
    }

    private fun read(): PairedDevices {
        val watch = prefs.getString("watch_name", null)?.let { name ->
            PairedWatch(
                name = name,
                face = prefs.getString("watch_face", "modular") ?: "modular",
                goals = DeviceRules.Goals(prefs.getInt("goal_move", 500), prefs.getInt("goal_exercise", 30), prefs.getInt("goal_stand", 12)),
                lowBpm = prefs.getInt("low_bpm", DeviceRules.DEFAULT_LOW_BPM),
                highBpm = prefs.getInt("high_bpm", DeviceRules.DEFAULT_HIGH_BPM),
                haptics = prefs.getBoolean("haptics", true),
                prominentHaptics = prefs.getBoolean("prominent_haptics", false),
                preview = BuildConfig.DEBUG && prefs.getBoolean("watch_preview", false),
            )
        }
        val tag = prefs.getString("airtag_name", null)?.let { PairedAirTag(it, prefs.getString("airtag_emoji", "🔑") ?: "🔑") }
        val pod = prefs.getString("homepod_name", null)?.let {
            PairedHomePod(it, prefs.getString("homepod_room", DeviceRules.HOMEPOD_ROOMS.first()) ?: DeviceRules.HOMEPOD_ROOMS.first(), prefs.getString("homepod_stereo", null))
        }
        return PairedDevices(watch, tag, pod)
    }

    private fun write(p: PairedDevices) {
        val e = prefs.edit().clear()
        p.watch?.let { w ->
            e.putString("watch_name", w.name).putString("watch_face", w.face)
                .putInt("goal_move", w.goals.move).putInt("goal_exercise", w.goals.exercise).putInt("goal_stand", w.goals.stand)
                .putInt("low_bpm", w.lowBpm).putInt("high_bpm", w.highBpm)
                .putBoolean("haptics", w.haptics).putBoolean("prominent_haptics", w.prominentHaptics)
                .putBoolean("watch_preview", w.preview)
        }
        p.airTag?.let { e.putString("airtag_name", it.name).putString("airtag_emoji", it.emoji) }
        p.homePod?.let { e.putString("homepod_name", it.name).putString("homepod_room", it.room).putString("homepod_stereo", it.stereoWith) }
        e.apply()
    }

    companion object {
        @Volatile private var instance: PairedDevicesStore? = null
        fun get(context: Context): PairedDevicesStore =
            instance ?: synchronized(this) { instance ?: PairedDevicesStore(context.applicationContext).also { instance = it } }
    }
}
