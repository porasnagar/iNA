package dev.ibridge.android

import dev.ibridge.android.DeviceRules.CodeCheck
import dev.ibridge.android.DeviceRules.HeartZone
import dev.ibridge.android.DeviceRules.ProximityTrend
import dev.ibridge.android.DeviceRules.Ring
import dev.ibridge.android.DeviceRules.SleepStage
import dev.ibridge.android.DeviceRules.Threshold
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Same cases as src/lib/ina/devices.test.ts. */
class DeviceRulesTest {
    @Test fun pairingCodeKeepsSixDigits() {
        assertEquals("482913", DeviceRules.normalizePairingCode("48a2-91 37 5"))
    }

    @Test fun pairingCodeMustMatchTheWatch() {
        assertEquals(CodeCheck.INCOMPLETE, DeviceRules.checkPairingCode("48291", "482913"))
        assertEquals(CodeCheck.MATCH, DeviceRules.checkPairingCode("482913", "482 913"))
        assertEquals(CodeCheck.MISMATCH, DeviceRules.checkPairingCode("482914", "482913"))
    }

    @Test fun goalsSnapIntoWatchOsRanges() {
        assertEquals(1500, DeviceRules.clampGoal(Ring.MOVE, 2000))
        assertEquals(500, DeviceRules.clampGoal(Ring.MOVE, 503))
        assertEquals(10, DeviceRules.clampGoal(Ring.EXERCISE, 3))
        assertEquals(12, DeviceRules.clampGoal(Ring.STAND, 14))
    }

    @Test fun ringClosesAtGoalAndOverlaps() {
        assertFalse(DeviceRules.ringClosed(499, 500))
        assertTrue(DeviceRules.ringClosed(500, 500))
        assertEquals(0.5f, DeviceRules.ringProgress(250, 500))
        assertEquals(1.5f, DeviceRules.ringProgress(750, 500))
        assertEquals(2f, DeviceRules.ringProgress(5000, 500))
    }

    @Test fun heartZonesUse40And120ByDefault() {
        assertNull(DeviceRules.heartZone(-1))
        assertEquals(HeartZone.LOW, DeviceRules.heartZone(39))
        assertEquals(HeartZone.NORMAL, DeviceRules.heartZone(72))
        assertEquals(HeartZone.HIGH, DeviceRules.heartZone(121))
    }

    @Test fun thresholdsStayInRange() {
        assertEquals(30, DeviceRules.clampHeartThreshold(Threshold.LOW, 20))
        assertEquals(150, DeviceRules.clampHeartThreshold(Threshold.HIGH, 200))
        assertEquals(125, DeviceRules.clampHeartThreshold(Threshold.HIGH, 123))
    }

    @Test fun restingAveragesLowestFifth() {
        assertEquals(-1, DeviceRules.restingHeartRate(emptyList()))
        assertEquals(61, DeviceRules.restingHeartRate(listOf(80, 60, 62, 90, 100, 70, 75, 85, 95, 110)))
    }

    @Test fun spo2AndEcg() {
        assertEquals(DeviceRules.Spo2Status.NORMAL, DeviceRules.spo2Status(98))
        assertEquals(DeviceRules.Spo2Status.LOW, DeviceRules.spo2Status(92))
        assertEquals(DeviceRules.Spo2Status.VERY_LOW, DeviceRules.spo2Status(88))
        assertEquals(DeviceRules.EcgResult.LOW_HEART_RATE, DeviceRules.classifyEcg(49))
        assertEquals(DeviceRules.EcgResult.SINUS_RHYTHM, DeviceRules.classifyEcg(72))
        assertEquals(DeviceRules.EcgResult.HIGH_HEART_RATE, DeviceRules.classifyEcg(151))
    }

    private val night = mapOf(SleepStage.AWAKE to 20, SleepStage.REM to 95, SleepStage.CORE to 240, SleepStage.DEEP to 65)

    @Test fun sleepPercentagesAddUpTo100() {
        val slices = DeviceRules.sleepBreakdown(night)
        assertEquals(100, slices.sumOf { it.percent })
        assertEquals(listOf(5, 23, 57, 15), slices.map { it.percent })
    }

    @Test fun timeAsleepLeavesOutAwake() {
        assertEquals(400, DeviceRules.timeAsleep(night))
        assertEquals("6 hr 40 min", DeviceRules.formatDuration(400))
    }

    @Test fun stepsToKm() {
        assertEquals(7.62, DeviceRules.stepsToKm(10_000), 1e-9)
        assertEquals(0.0, DeviceRules.stepsToKm(0), 1e-9)
    }

    @Test fun itemNames() {
        assertNull(DeviceRules.cleanItemName("   "))
        assertEquals("My Keys", DeviceRules.cleanItemName("  My   Keys "))
        assertEquals(24, DeviceRules.cleanItemName("x".repeat(40))!!.length)
    }

    @Test fun warmerWhenCloserByMoreThanFivePercent() {
        assertEquals(ProximityTrend.WARMER, DeviceRules.proximityTrend(4.0, 3.7))
        assertEquals(ProximityTrend.STEADY, DeviceRules.proximityTrend(4.0, 3.9))
        assertEquals(ProximityTrend.COLDER, DeviceRules.proximityTrend(4.0, 4.4))
        assertEquals(ProximityTrend.WARMER, DeviceRules.proximityTrend(1.0, 0.85))
    }

    @Test fun hereUnderHalfAMetre() {
        assertEquals("Here", DeviceRules.findingLabel(0.4))
        assertEquals("Nearby", DeviceRules.findingLabel(2.0))
        assertEquals("Far", DeviceRules.findingLabel(5.0))
    }
}
