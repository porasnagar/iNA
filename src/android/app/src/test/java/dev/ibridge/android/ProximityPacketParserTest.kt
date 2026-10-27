package dev.ibridge.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Mirrors the 0x07 parsing cases in src/lib/ina/protocol.test.ts. */
class ProximityPacketParserTest {
    private fun bytes(vararg v: Int) = ByteArray(v.size) { v[it].toByte() }

    @Test fun rightAirPodBroadcasting_leftIsHighNibble() {
        // status 0x0B: bit 5 clear → right AirPod is broadcasting.
        val p = ProximityPacketParser.parse(bytes(0x07, 0x19, 0x01, 0x24, 0x20, 0x0B, 0x87, 0x35, 0x03), -50)!!
        assertEquals(0x2420, p.modelId)
        assertEquals(80, p.leftBattery)
        assertEquals(70, p.rightBattery)
        assertEquals(50, p.caseBattery)
        assertTrue(p.leftInEar && p.rightInEar)
        assertEquals(3, p.lidOpenCounter)
    }

    @Test fun leftAirPodBroadcasting_swapsBatteryAndCharging() {
        // status 0x21: bit 5 set → left is broadcasting; left = low nibble, left charging = 0x10.
        val p = ProximityPacketParser.parse(bytes(0x07, 0x19, 0x01, 0x24, 0x20, 0x21, 0x87, 0x15, 0x00), -50)!!
        assertEquals(70, p.leftBattery)
        assertEquals(80, p.rightBattery)
        assertTrue(p.leftCharging)
        assertEquals(false, p.rightCharging)
    }

    @Test fun lidClosedBitOnlyCountsWhileTheAirPodIsInTheCase() {
        val inCaseClosed = ProximityPacketParser.parse(bytes(0x07, 0x19, 0x01, 0x24, 0x20, 0x75, 0x88, 0x05, 0x0A), -50)!!
        assertEquals(true, inCaseClosed.lidClosed)
        assertEquals(2, inCaseClosed.lidOpenCounter)
        val inCaseOpen = ProximityPacketParser.parse(bytes(0x07, 0x19, 0x01, 0x24, 0x20, 0x75, 0x88, 0x05, 0x02), -50)!!
        assertEquals(false, inCaseOpen.lidClosed)
        val outOfCase = ProximityPacketParser.parse(bytes(0x07, 0x19, 0x01, 0x24, 0x20, 0x2B, 0x88, 0x05, 0x0A), -50)!!
        assertNull(outOfCase.lidClosed)
    }

    @Test fun unknownBatteryNibbleIsMinusOne() {
        val p = ProximityPacketParser.parse(bytes(0x07, 0x19, 0x01, 0x24, 0x20, 0x00, 0xFF, 0x0F, 0x00), -50)!!
        assertEquals(-1, p.leftBattery)
        assertEquals("--%", formatBattery(p.leftBattery))
    }

    @Test fun otherContinuityTypesIgnored() {
        assertNull(ProximityPacketParser.parse(bytes(0x10, 0x05, 0x01, 0x24, 0x20, 0, 0, 0, 0), -50))
    }
}
