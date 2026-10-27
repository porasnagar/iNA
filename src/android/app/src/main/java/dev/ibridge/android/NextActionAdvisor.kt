package dev.ibridge.android

import android.media.AudioManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class SuggestionId { LOW_BATTERY, RESUME, FIT_TEST, TURN_ON_ANC, TRY_ADAPTIVE, CONVERSATION_AWARENESS, START_LISTENING }

@Immutable
data class Suggestion(val id: SuggestionId, val title: String, val detail: String, val cta: String?)

/**
 * Suggested next action for the connected AirPods screen.
 * Mirrors `suggestNextAction` in src/lib/ina/suggest.ts (covered by suggest.test.ts) — change both together.
 */
object NextActionAdvisor {
    /** A bud at or below this level (and not charging) counts as low. */
    const val LOW_BATTERY_THRESHOLD = 20

    fun suggest(state: AirPodsState, fitTested: Boolean, playing: Boolean, dismissed: Set<SuggestionId>): Suggestion? {
        val caps = state.model?.caps ?: return null
        val overEar = !caps.hasCase
        val wornBoth = if (overEar) state.leftInEar else state.leftInEar && state.rightInEar
        val wornAny = state.leftInEar || state.rightInEar
        val mode = state.listeningMode
        val out = mutableListOf<Suggestion>()

        // 1. Low battery
        val buds = if (overEar) {
            listOf(Triple("Battery", state.leftBattery, state.leftCharging))
        } else {
            listOf(Triple("Left AirPod", state.leftBattery, state.leftCharging), Triple("Right AirPod", state.rightBattery, state.rightCharging))
        }
        buds.filter { (_, level, charging) -> level in 0..LOW_BATTERY_THRESHOLD && !charging }
            .minByOrNull { it.second }
            ?.let { (label, level, _) ->
                val canSave = caps.anc && mode != ListeningMode.OFF
                out += Suggestion(
                    SuggestionId.LOW_BATTERY,
                    "$label at $level%",
                    if (canSave) "Turning off noise control makes the battery last longer." else "Put it back in the case to charge.",
                    if (canSave) "Turn Off" else null,
                )
            }

        // 2. Music paused by ear detection
        if (state.pausedByEar && !wornBoth) out += Suggestion(SuggestionId.RESUME, "Music paused", "Paused when an AirPod came out.", "Resume")

        // 3. Fit test never run
        if (caps.fitTest && !fitTested && wornBoth) {
            out += Suggestion(SuggestionId.FIT_TEST, "Check your ear tip fit", "A 10-second test for the best seal and sound.", "Open Fit Test")
        }

        // 4. Noise cancellation off
        if (caps.anc && mode == ListeningMode.OFF) out += Suggestion(SuggestionId.TURN_ON_ANC, "Noise Cancellation is off", "Block out the world around you.", "Turn On")

        // 5. Adaptive Audio
        if (caps.adaptive && wornBoth && (mode == ListeningMode.ANC || mode == ListeningMode.TRANSPARENCY)) {
            out += Suggestion(SuggestionId.TRY_ADAPTIVE, "Try Adaptive Audio", "Blends noise cancellation and transparency as you move.", "Try It")
        }

        // 6. Conversation Awareness off
        if (caps.conversationAwareness && !state.conversationAwareness) {
            out += Suggestion(SuggestionId.CONVERSATION_AWARENESS, "Turn on Conversation Awareness", "Lowers your media when you start speaking.", "Turn On")
        }

        // 7. Not worn yet
        if (!wornAny && !playing && !state.pausedByEar) {
            out += Suggestion(
                SuggestionId.START_LISTENING,
                if (overEar) "Put on your headphones" else "Put in your AirPods",
                "Your music starts here as soon as they're in.",
                "Play",
            )
        }

        return out.firstOrNull { it.id !in dismissed }
    }
}

/** Contextual "what to do next" card shown at the top of [DeviceScreen]. */
@Composable
fun SuggestedActionCard(state: AirPodsState, actions: InaActions, onOpenControls: () -> Unit) {
    val context = LocalContext.current
    val audio = remember { context.getSystemService(AudioManager::class.java) }
    var dismissed by rememberSaveable { mutableStateOf(listOf<String>()) }
    val suggestion = NextActionAdvisor.suggest(
        state = state,
        fitTested = state.fitTestResult != null,
        playing = audio?.isMusicActive == true,
        dismissed = dismissed.mapNotNull { name -> SuggestionId.entries.firstOrNull { it.name == name } }.toSet(),
    ) ?: return

    val run: () -> Unit = {
        when (suggestion.id) {
            SuggestionId.LOW_BATTERY -> actions.setMode(ListeningMode.OFF)
            SuggestionId.RESUME, SuggestionId.START_LISTENING -> {
                dismissed = dismissed + suggestion.id.name
                actions.resumeMedia()
            }
            SuggestionId.FIT_TEST -> onOpenControls()
            SuggestionId.TURN_ON_ANC -> actions.setMode(ListeningMode.ANC)
            SuggestionId.TRY_ADAPTIVE -> actions.setMode(ListeningMode.ADAPTIVE)
            SuggestionId.CONVERSATION_AWARENESS -> actions.setConversationAwareness(true)
        }
    }

    Row(
        Modifier
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(InaColors.Card)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(InaColors.Primary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = InaColors.Primary, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f).padding(end = 8.dp)) {
            Text(suggestion.title, color = InaColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(suggestion.detail, color = InaColors.TextSecondary, fontSize = 12.sp, lineHeight = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        suggestion.cta?.let { label ->
            Button(
                onClick = run,
                modifier = Modifier.height(34.dp),
                shape = CircleShape,
                contentPadding = PaddingValues(horizontal = 14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = InaColors.Primary),
            ) { Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, softWrap = false) }
        }
        Box(
            Modifier.size(28.dp).clip(CircleShape).clickable { dismissed = dismissed + suggestion.id.name },
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Rounded.Close, contentDescription = "Dismiss suggestion", tint = InaColors.TextSecondary, modifier = Modifier.size(14.dp)) }
    }
}
