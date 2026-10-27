package dev.ibridge.android

import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Rules for the Apple Watch, AirTag and HomePod flows. Plain Kotlin, no Android types.
 * Mirrors src/lib/ina/devices.ts one-to-one; change both together and keep
 * DeviceRulesTest.kt and devices.test.ts passing.
 */
object DeviceRules {

    /* ---------- Apple Watch pairing ---------- */

    const val PAIRING_CODE_LENGTH = 6

    fun normalizePairingCode(input: String): String = input.filter(Char::isDigit).take(PAIRING_CODE_LENGTH)

    enum class CodeCheck { INCOMPLETE, MATCH, MISMATCH }

    fun checkPairingCode(entered: String, shown: String): CodeCheck {
        val code = normalizePairingCode(entered)
        if (code.length < PAIRING_CODE_LENGTH) return CodeCheck.INCOMPLETE
        return if (code == normalizePairingCode(shown)) CodeCheck.MATCH else CodeCheck.MISMATCH
    }

    val WATCH_PAIRING_STAGES = listOf(
        "Pairing",
        "Syncing settings",
        "Registering ANCS notification listener & HealthKit GATT telemetry",
    )

    /* ---------- Activity rings ---------- */

    enum class Ring(val label: String, val min: Int, val max: Int, val step: Int, val unit: String) {
        MOVE("Move", 100, 1500, 10, "kcal"),
        EXERCISE("Exercise", 10, 60, 5, "min"),
        STAND("Stand", 6, 12, 1, "hrs"),
    }

    data class Goals(val move: Int = 500, val exercise: Int = 30, val stand: Int = 12) {
        operator fun get(ring: Ring): Int = when (ring) {
            Ring.MOVE -> move
            Ring.EXERCISE -> exercise
            Ring.STAND -> stand
        }

        fun with(ring: Ring, value: Int): Goals = when (ring) {
            Ring.MOVE -> copy(move = clampGoal(ring, value))
            Ring.EXERCISE -> copy(exercise = clampGoal(ring, value))
            Ring.STAND -> copy(stand = clampGoal(ring, value))
        }
    }

    fun clampGoal(ring: Ring, value: Int): Int {
        val snapped = (value.toDouble() / ring.step).roundToInt() * ring.step
        return snapped.coerceIn(ring.min, ring.max)
    }

    /** Fraction of the goal; above 1 once closed (an overlap lap), capped at 2. */
    fun ringProgress(value: Int, goal: Int): Float {
        if (goal <= 0 || value <= 0) return 0f
        return min(2f, value.toFloat() / goal)
    }

    fun ringClosed(value: Int, goal: Int): Boolean = goal > 0 && value >= goal

    /* ---------- Heart ---------- */

    const val DEFAULT_LOW_BPM = 40
    const val DEFAULT_HIGH_BPM = 120

    enum class Threshold(val min: Int, val max: Int, val step: Int) { LOW(30, 50, 5), HIGH(100, 150, 5) }

    fun clampHeartThreshold(which: Threshold, value: Int): Int =
        ((value.toDouble() / which.step).roundToInt() * which.step).coerceIn(which.min, which.max)

    enum class HeartZone { LOW, NORMAL, HIGH }

    /** null while there is no reading (-1). */
    fun heartZone(bpm: Int, low: Int = DEFAULT_LOW_BPM, high: Int = DEFAULT_HIGH_BPM): HeartZone? = when {
        bpm < 0 -> null
        bpm < low -> HeartZone.LOW
        bpm > high -> HeartZone.HIGH
        else -> HeartZone.NORMAL
    }

    /** Average of the lowest fifth of readings (at least one); -1 with no readings. */
    fun restingHeartRate(samples: List<Int>): Int {
        val valid = samples.filter { it > 0 }.sorted()
        if (valid.isEmpty()) return -1
        val n = max(1, valid.size / 5)
        return (valid.take(n).sum().toDouble() / n).roundToInt()
    }

    enum class Spo2Status { NORMAL, LOW, VERY_LOW }

    fun spo2Status(percent: Int): Spo2Status? = when {
        percent < 0 -> null
        percent >= 95 -> Spo2Status.NORMAL
        percent >= 90 -> Spo2Status.LOW
        else -> Spo2Status.VERY_LOW
    }

    enum class EcgResult(val label: String) {
        SINUS_RHYTHM("Sinus Rhythm"),
        LOW_HEART_RATE("Heart Rate Under 50"),
        HIGH_HEART_RATE("Heart Rate Over 150"),
    }

    fun classifyEcg(averageBpm: Int): EcgResult = when {
        averageBpm < 50 -> EcgResult.LOW_HEART_RATE
        averageBpm > 150 -> EcgResult.HIGH_HEART_RATE
        else -> EcgResult.SINUS_RHYTHM
    }

    /* ---------- Sleep ---------- */

    enum class SleepStage(val label: String) { AWAKE("Awake"), REM("REM"), CORE("Core"), DEEP("Deep") }

    data class SleepSlice(val stage: SleepStage, val minutes: Int, val percent: Int)

    /** Whole-number percentages that always add up to 100 (largest remainder). */
    fun sleepBreakdown(minutes: Map<SleepStage, Int>): List<SleepSlice> {
        val stages = SleepStage.entries
        val mins = stages.map { max(0, minutes[it] ?: 0) }
        val total = mins.sum()
        if (total == 0) return stages.map { SleepSlice(it, 0, 0) }
        val raw = mins.map { it * 100.0 / total }
        val floors = raw.map { floor(it).toInt() }.toMutableList()
        var left = 100 - floors.sum()
        val order = raw.indices.sortedWith(compareByDescending<Int> { raw[it] - floor(raw[it]) }.thenBy { it })
        for (i in order) {
            if (left <= 0) break
            floors[i] += 1
            left--
        }
        return stages.mapIndexed { i, s -> SleepSlice(s, mins[i], floors[i]) }
    }

    fun timeAsleep(minutes: Map<SleepStage, Int>): Int =
        listOf(SleepStage.REM, SleepStage.CORE, SleepStage.DEEP).sumOf { max(0, minutes[it] ?: 0) }

    fun formatDuration(totalMinutes: Int): String {
        val m = max(0, totalMinutes)
        val h = m / 60
        val r = m % 60
        return when {
            h == 0 -> "$r min"
            r == 0 -> "$h hr"
            else -> "$h hr $r min"
        }
    }

    /* ---------- Steps ---------- */

    const val DEFAULT_STRIDE_M = 0.762

    fun stepsToKm(steps: Int, strideM: Double = DEFAULT_STRIDE_M): Double =
        if (steps <= 0) 0.0 else (steps * strideM).roundToInt() / 1000.0

    /* ---------- AirTag ---------- */

    data class Item(val name: String, val emoji: String)

    val AIRTAG_ITEMS = listOf(
        Item("Keys", "🔑"), Item("Backpack", "🎒"), Item("Wallet", "👛"), Item("Bag", "👜"),
        Item("Luggage", "🧳"), Item("Bike", "🚲"), Item("Car", "🚗"), Item("Pet", "🐶"),
    )

    const val AIRTAG_NAME_MAX = 24

    /** Trimmed item name, or null when empty. Long names are cut to 24 characters. */
    fun cleanItemName(name: String): String? {
        val t = name.trim().replace(Regex("\\s+"), " ")
        if (t.isEmpty()) return null
        val cps = t.codePoints().toArray()
        return if (cps.size <= AIRTAG_NAME_MAX) t else String(cps, 0, AIRTAG_NAME_MAX)
    }

    enum class ProximityTrend(val label: String) { WARMER("Warmer"), COLDER("Colder"), STEADY("Hold steady") }

    /** Warmer when the distance shrinks by more than 5% (at least 10 cm), colder when it grows as much. */
    fun proximityTrend(previousM: Double, currentM: Double): ProximityTrend {
        if (previousM < 0 || currentM < 0) return ProximityTrend.STEADY
        val threshold = max(0.1, previousM * 0.05)
        return when {
            currentM < previousM - threshold -> ProximityTrend.WARMER
            currentM > previousM + threshold -> ProximityTrend.COLDER
            else -> ProximityTrend.STEADY
        }
    }

    fun findingLabel(distanceM: Double): String = when {
        distanceM < 0 -> "Searching"
        distanceM < 0.5 -> "Here"
        distanceM < 3 -> "Nearby"
        else -> "Far"
    }

    /* ---------- HomePod ---------- */

    val HOMEPOD_ROOMS = listOf("Living Room", "Bedroom", "Kitchen", "Office", "Dining Room", "Den")

    fun clampVolume(v: Int): Int = v.coerceIn(0, 100)
}
