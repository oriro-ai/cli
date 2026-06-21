package ai.oriro.app.ui

import ai.oriro.app.GatewayDreamDiaryEntry
import ai.oriro.app.GatewayDreamingSummary
import ai.oriro.app.MainViewModel
import ai.oriro.app.ui.design.OriroPanel
import ai.oriro.app.ui.design.OriroSecondaryButton
import ai.oriro.app.ui.design.OriroStatus
import ai.oriro.app.ui.design.OriroStatusPill
import ai.oriro.app.ui.design.OriroTheme
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** Settings screen for gateway dreaming state and recent dream diary entries. */
@Composable
internal fun DreamingSettingsScreen(
  viewModel: MainViewModel,
  onBack: () -> Unit,
) {
  val summary by viewModel.dreamingSummary.collectAsState()
  val refreshing by viewModel.dreamingRefreshing.collectAsState()
  val errorText by viewModel.dreamingErrorText.collectAsState()
  val isConnected by viewModel.isConnected.collectAsState()

  LaunchedEffect(isConnected) {
    if (isConnected) {
      viewModel.refreshDreaming()
    }
  }

  SettingsDetailFrame(
    title = "Dreaming",
    subtitle = "Memory consolidation and dream diary.",
    icon = Icons.Default.Storage,
    onBack = onBack,
  ) {
    SettingsMetricPanel(
      rows =
        listOf(
          SettingsMetric("Status", if (summary.enabled) "On" else "Off"),
          SettingsMetric("Waiting", summary.shortTermCount.toString()),
          SettingsMetric("Signals", summary.totalSignalCount.toString()),
          SettingsMetric("Next Cycle", formatDreamingNextRun(summary.nextRunAtMs)),
        ),
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OriroSecondaryButton(
        text = if (refreshing) "Refreshing" else "Refresh",
        onClick = viewModel::refreshDreaming,
        enabled = isConnected && !refreshing,
        modifier = Modifier.weight(1f),
      )
    }
    errorText?.let { error ->
      OriroPanel {
        Text(text = error, style = OriroTheme.type.body, color = OriroTheme.colors.warning)
      }
    }
    when {
      !isConnected ->
        OriroPanel {
          Text(text = "Connect the gateway to load dreaming.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
      else -> DreamingPanel(summary = summary)
    }
  }
}

@Composable
private fun DreamingPanel(summary: GatewayDreamingSummary) {
  Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
    OriroPanel(contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
      Column {
        DreamingHealthRow(
          title = "Memory Store",
          value = if (summary.storeHealthy) "Healthy" else "Needs attention",
          healthy = summary.storeHealthy,
        )
        HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
        DreamingHealthRow(
          title = "Signal Index",
          value = if (summary.phaseSignalHealthy) "Healthy" else "Needs attention",
          healthy = summary.phaseSignalHealthy,
        )
        HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
        DreamingHealthRow(
          title = "Promoted",
          value = "${summary.promotedToday} today · ${summary.promotedTotal} total",
          healthy = true,
        )
      }
    }
    DreamDiaryPanel(summary = summary)
  }
}

@Composable
private fun DreamingHealthRow(
  title: String,
  value: String,
  healthy: Boolean,
) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 7.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(9.dp),
  ) {
    Box(modifier = Modifier.size(7.dp))
    Text(text = title, style = OriroTheme.type.body, color = OriroTheme.colors.text, modifier = Modifier.weight(1f), maxLines = 1)
    OriroStatusPill(text = value, status = if (healthy) OriroStatus.Success else OriroStatus.Warning)
  }
}

@Composable
private fun DreamDiaryPanel(summary: GatewayDreamingSummary) {
  Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
    Text(text = "DIARY", style = OriroTheme.type.caption, color = OriroTheme.colors.textMuted)
    if (!summary.diaryFound) {
      OriroPanel {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
          Text(text = "No dream diary yet.", style = OriroTheme.type.section, color = OriroTheme.colors.text)
          Text(text = "Entries appear after a dreaming cycle writes a narrative summary.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
      }
      return
    }
    if (summary.diaryEntries.isEmpty()) {
      OriroPanel {
        Text(text = "The diary is waiting for its first entry.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
      }
      return
    }
    OriroPanel(contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
      Column {
        summary.diaryEntries.forEachIndexed { index, entry ->
          DreamDiaryRow(entry = entry)
          if (index != summary.diaryEntries.lastIndex) {
            HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
          }
        }
      }
    }
  }
}

@Composable
private fun DreamDiaryRow(entry: GatewayDreamDiaryEntry) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 7.dp),
    verticalAlignment = Alignment.Top,
    horizontalArrangement = Arrangement.spacedBy(9.dp),
  ) {
    Surface(
      modifier = Modifier.size(30.dp),
      shape = CircleShape,
      color = OriroTheme.colors.surfacePressed,
      border = BorderStroke(1.dp, OriroTheme.colors.border),
    ) {
      Box(contentAlignment = Alignment.Center) {
        Text(text = "D", style = OriroTheme.type.label, color = OriroTheme.colors.text)
      }
    }
    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
      Text(text = entry.date, style = OriroTheme.type.body, color = OriroTheme.colors.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
      Text(text = entry.text, style = OriroTheme.type.caption, color = OriroTheme.colors.textMuted, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
  }
}

/** Formats the next dreaming cycle as a compact relative label. */
private fun formatDreamingNextRun(nextRunAtMs: Long?): String {
  val next = nextRunAtMs ?: return "Not scheduled"
  val deltaMinutes = ((next - System.currentTimeMillis()) / 60_000L).coerceAtLeast(0L)
  val hours = deltaMinutes / 60L
  return when {
    hours >= 24L -> "In ${hours / 24L}d"
    hours >= 1L -> "In ${hours}h"
    deltaMinutes >= 1L -> "In ${deltaMinutes}m"
    else -> "Soon"
  }
}
