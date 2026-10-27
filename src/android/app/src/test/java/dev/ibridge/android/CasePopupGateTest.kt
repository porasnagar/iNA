package dev.ibridge.android

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** The case-open pop-up shows once per lid open, never stacks, and stays closed once closed. */
class CasePopupGateTest {
    private val pro = 0x0E20
    private fun advert(counter: Int, rssi: Int = -50, model: Int = pro) = AirPodsState(modelId = model, lidOpenCounter = counter, rssi = rssi)
    private val minute = 60_000L

    @Before fun reset() = CasePopupGate.reset()

    @Test fun firstCaseOpenShows() {
        assertTrue(CasePopupGate.isNewCaseOpen(advert(1), 0))
        assertTrue(CasePopupGate.tryOpen(pro, 0))
    }

    @Test fun sameLidCounterDoesNotRetrigger() {
        CasePopupGate.isNewCaseOpen(advert(1), 0)
        assertFalse(CasePopupGate.isNewCaseOpen(advert(1), 1_000))
    }

    @Test fun farAwayAdvertIgnored() {
        assertFalse(CasePopupGate.isNewCaseOpen(advert(1, rssi = -80), 0))
    }

    @Test fun closingKeepsItClosedForTenMinutes() {
        assertTrue(CasePopupGate.tryOpen(pro, 0))
        CasePopupGate.onDismissed(pro, 1_000)
        assertFalse(CasePopupGate.tryOpen(pro, 1_000 + 9 * minute))
        assertTrue(CasePopupGate.tryOpen(pro, 1_000 + 10 * minute + 1))
    }

    @Test fun neverStacksWhileShowing() {
        assertTrue(CasePopupGate.tryOpen(pro, 0))
        assertFalse(CasePopupGate.tryOpen(0x2420, 40_000))
    }

    @Test fun atLeastThirtySecondsBetweenPopups() {
        assertTrue(CasePopupGate.tryOpen(pro, 0))
        CasePopupGate.onHidden(pro, 5_000)
        assertFalse(CasePopupGate.tryOpen(0x2420, 20_000))
        assertTrue(CasePopupGate.tryOpen(0x2420, 30_000))
    }
}
