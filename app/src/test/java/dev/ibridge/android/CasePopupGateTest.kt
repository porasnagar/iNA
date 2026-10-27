package dev.ibridge.android

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * The case-open pop-up shows every time the lid opens, never stacks, and once closed it
 * stays closed until the lid is shut and opened again.
 */
class CasePopupGateTest {
    private val pro = 0x0E20
    private fun advert(counter: Int, rssi: Int = -50, model: Int = pro, closed: Boolean? = false) =
        AirPodsState(modelId = model, lidOpenCounter = counter, lidClosed = closed, rssi = rssi)

    @Before fun reset() = CasePopupGate.reset()

    /** Lid opens → pop-up → user closes it with X. */
    private fun openAndClose(counter: Int, at: Long) {
        assertTrue(CasePopupGate.isNewCaseOpen(advert(counter), at))
        assertTrue(CasePopupGate.tryOpen(pro, at))
        CasePopupGate.onDismissed(pro, at + 1_000)
    }

    @Test fun firstCaseOpenShows() {
        assertTrue(CasePopupGate.isNewCaseOpen(advert(1), 0))
        assertTrue(CasePopupGate.tryOpen(pro, 0))
    }

    @Test fun sameOpeningDoesNotRetrigger() {
        CasePopupGate.isNewCaseOpen(advert(1), 0)
        assertFalse(CasePopupGate.isNewCaseOpen(advert(1), 1_000))
    }

    @Test fun farAwayAdvertIgnored() {
        assertFalse(CasePopupGate.isNewCaseOpen(advert(1, rssi = -80), 0))
    }

    @Test fun closedLidNeverShows() {
        assertFalse(CasePopupGate.isNewCaseOpen(advert(1, closed = true), 0))
    }

    @Test fun closingWithXKeepsItClosedWhileTheLidStaysOpen() {
        openAndClose(1, 0)
        // Lid still open: even a counter wobble must not bring it back.
        CasePopupGate.isNewCaseOpen(advert(2, closed = null), 3_000)
        assertFalse(CasePopupGate.tryOpen(pro, 3_000))
        assertFalse(CasePopupGate.tryOpen(pro, 9 * 60_000L))
    }

    @Test fun shuttingAndReopeningTheLidShowsItAgain() {
        openAndClose(1, 0)
        assertFalse(CasePopupGate.isNewCaseOpen(advert(1, closed = true), 5_000))
        assertTrue(CasePopupGate.isNewCaseOpen(advert(2), 8_000))
        assertTrue(CasePopupGate.tryOpen(pro, 8_000))
    }

    @Test fun caseGoingQuietForTenSecondsCountsAsClosed() {
        openAndClose(1, 0)
        assertTrue(CasePopupGate.isNewCaseOpen(advert(1), 1_000 + 10_001))
        assertTrue(CasePopupGate.tryOpen(pro, 1_000 + 10_001))
    }

    @Test fun neverStacksWhileShowing() {
        assertTrue(CasePopupGate.tryOpen(pro, 0))
        assertFalse(CasePopupGate.tryOpen(0x2420, 40_000))
    }

    @Test fun oneLidOpeningNeverShowsTwoPopups() {
        assertTrue(CasePopupGate.tryOpen(pro, 0))
        CasePopupGate.onHidden(pro, 1_000)
        assertFalse(CasePopupGate.tryOpen(0x2420, 3_000))
        assertTrue(CasePopupGate.tryOpen(0x2420, 4_000))
    }
}
