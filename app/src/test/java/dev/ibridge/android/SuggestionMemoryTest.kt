package dev.ibridge.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Closing the suggestion card keeps it closed. Mirrors "closing a suggestion" in suggest.test.ts. */
class SuggestionMemoryTest {
    private val day = SuggestionMemory.QUIET_MS
    private val ancOff = AirPodsState(connected = true, modelId = 0x2420, leftBattery = 80, rightBattery = 70, listeningMode = ListeningMode.OFF, conversationAwareness = true)

    @Test fun closingNoiseCancellationIsOffShowsNoOtherTipForADay() {
        assertEquals(SuggestionId.TURN_ON_ANC, NextActionAdvisor.suggest(ancOff, fitTested = true, playing = false)?.id)
        val m = SuggestionMemory().dismiss(SuggestionId.TURN_ON_ANC, 1_000)
        // "Put in your AirPods" must not take its place.
        assertNull(NextActionAdvisor.suggest(ancOff, true, false, m, 1_000 + day - 1))
        assertEquals(SuggestionId.START_LISTENING, NextActionAdvisor.suggest(ancOff, true, false, m, 1_000 + day)?.id)
    }

    @Test fun closedTipsNeverComeBack() {
        val m = SuggestionMemory().dismiss(SuggestionId.TURN_ON_ANC, 0).dismiss(SuggestionId.START_LISTENING, day)
        assertNull(NextActionAdvisor.suggest(ancOff, true, false, m, 10 * day))
    }

    @Test fun lowBatteryStillShowsDuringTheQuietPeriod() {
        val m = SuggestionMemory().dismiss(SuggestionId.TURN_ON_ANC, 0)
        assertEquals(SuggestionId.LOW_BATTERY, NextActionAdvisor.suggest(ancOff.copy(leftBattery = 10), true, false, m, 1)?.id)
    }

    @Test fun closedLowBatteryIsForgottenOnceTheBatteryRecovers() {
        val m = SuggestionMemory().dismiss(SuggestionId.LOW_BATTERY, 0)
        assertEquals(setOf(SuggestionId.LOW_BATTERY), m.forgetCleared(listOf(SuggestionId.LOW_BATTERY)).closed)
        assertEquals(emptySet<SuggestionId>(), m.forgetCleared(emptyList()).closed)
    }
}
