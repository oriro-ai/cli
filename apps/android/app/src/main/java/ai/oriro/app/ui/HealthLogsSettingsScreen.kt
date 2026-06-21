package ai.oriro.app.ui

import ai.oriro.app.GatewayHealthLogsSummary
import ai.oriro.app.GatewayLogEntry
import ai.oriro.app.MainViewModel
import ai.oriro.app.ui.design.OriroPanel
import ai.oriro.app.ui.design.OriroSecondaryButton
import ai.oriro.app.ui.design.OriroStatus
import ai.oriro.app.ui.design.OriroStatusPill
import ai.oriro.app.ui.design.OriroTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** Settings health screen for gateway/node status and recent gateway logs. */
@Composable
internal fun HealthLogsSettingsScreen(
  viewModel: MainViewModel,
  onBack: () -> Unit,
) {
  val isConnected by viewModel.isConnected.collectAsState()
  val isNodeConnected by viewModel.isNodeConnected.collectAsState()
  val chatHealthOk by viewModel.chatHealthOk.collectAsState()
  val statusText by viewModel.statusText.collectAsState()
  val modelCount by viewModel.modelCatalog.collectAsState()
  val pendingRunCount by viewModel.pendingRunCount.collectAsState()
  val talkStatus by viewModel.talkModeStatusText.collectAsState()
  val logsSummary by viewModel.healthLogsSummary.collectAsState()
  val logsRefreshing by viewModel.healthLogsRefreshing.collectAsState()
  val logsErrorText by viewModel.healthLogsErrorText.collectAsState()

  LaunchedEffect(isConnected) {
    if (isConnected) {
      // Load logs when the gateway becomes available; manual refresh covers
      // later updates so this screen does not poll.
      viewModel.refreshHealthLogs()
    }
  }

  SettingsDetailFrame(
    title = "Health",
    subtitle = "Gateway status, phone node readiness, and recent log stream.",
    icon = Icons.Default.Settings,
    onBack = onBack,
  ) {
    SettingsMetricPanel(
      rows =
        listOf(
          SettingsMetric("Gateway", if (isConnected) "Online" else "Offline"),
          SettingsMetric("Node", if (isNodeConnected) "Online" else "Waiting"),
          SettingsMetric("Models", modelCount.size.toString()),
          SettingsMetric("Logs", logsSummary.entries.size.toString()),
        ),
    )
    HealthStatusPanel(
      gateway = statusText,
      node = if (isNodeConnected) "Online" else "Waiting",
      chat = if (chatHealthOk) "Ready" else "Needs connection",
      models = "${modelCount.size} available",
      voice = talkStatus,
      runs = if (pendingRunCount > 0) "$pendingRunCount active" else "Idle",
      isConnected = isConnected,
      isNodeConnected = isNodeConnected,
      chatHealthOk = chatHealthOk,
      modelsReady = modelCount.isNotEmpty(),
      voiceReady = talkStatus.lowercase() != "off",
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OriroSecondaryButton(
        text = if (logsRefreshing) "Refreshing" else "Refresh Logs",
        onClick = viewModel::refreshHealthLogs,
        enabled = isConnected && !logsRefreshing,
        modifier = Modifier.weight(1f),
      )
    }
    logsErrorText?.let { error ->
      OriroPanel {
        Text(text = error, style = OriroTheme.type.body, color = OriroTheme.colors.warning)
      }
    }
    GatewayLogsPanel(isConnected = isConnected, summary = logsSummary)
  }
}

@Composable
private fun HealthStatusPanel(
  gateway: String,
  node: String,
  chat: String,
  models: String,
  voice: String,
  runs: String,
  isConnected: Boolean,
  isNodeConnected: Boolean,
  chatHealthOk: Boolean,
  modelsReady: Boolean,
  voiceReady: Boolean,
) {
  OriroPanel(contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
    Column {
      HealthStatusRow(title = "Gateway", value = gateway, healthy = isConnected)
      HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
      HealthStatusRow(title = "Phone Node", value = node, healthy = isNodeConnected)
      HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
      HealthStatusRow(title = "Chat", value = chat, healthy = chatHealthOk)
      HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
      HealthStatusRow(title = "Models", value = models, healthy = modelsReady)
      HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
      HealthStatusRow(title = "Voice", value = voice, healthy = voiceReady)
      HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
      HealthStatusRow(title = "Runs", value = runs, healthy = true)
    }
  }
}

@Composable
private fun HealthStatusRow(
  title: String,
  value: String,
  healthy: Boolean,
) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 7.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(9.dp),
  ) {
    Text(text = title, style = OriroTheme.type.body, color = OriroTheme.colors.text, modifier = Modifier.weight(1f), maxLines = 1)
    OriroStatusPill(text = value, status = if (healthy) OriroStatus.Success else OriroStatus.Warning)
  }
}

@Composable
private fun GatewayLogsPanel(
  isConnected: Boolean,
  summary: GatewayHealthLogsSummary,
) {
  Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
      Text(text = "RECENT LOGS", style = OriroTheme.type.caption, color = OriroTheme.colors.textMuted)
      summary.fileName?.let { fileName ->
        Text(text = fileName, style = OriroTheme.type.caption, color = OriroTheme.colors.textSubtle, maxLines = 1, overflow = TextOverflow.Ellipsis)
      }
    }
    when {
      !isConnected ->
        OriroPanel {
          Text(text = "Connect the gateway to load recent logs.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
      summary.entries.isEmpty() ->
        OriroPanel {
          Text(text = "No recent log entries.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
      else ->
        OriroPanel(contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
          val entries = summary.entries.takeLast(12)
          Column {
            entries.forEachIndexed { index, entry ->
              GatewayLogRow(entry = entry)
              if (index != entries.lastIndex) {
                HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
              }
            }
          }
        }
    }
    if (summary.truncated) {
      Text(text = "Showing the latest log chunk.", style = OriroTheme.type.caption, color = OriroTheme.colors.textSubtle)
    }
  }
}

@Composable
private fun GatewayLogRow(entry: GatewayLogEntry) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 7.dp),
    verticalAlignment = Alignment.Top,
    horizontalArrangement = Arrangement.spacedBy(9.dp),
  ) {
    Text(text = compactLogTime(entry.time), style = OriroTheme.type.caption, color = OriroTheme.colors.textSubtle, modifier = Modifier.weight(0.72f), maxLines = 1)
    Column(modifier = Modifier.weight(2.7f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
      Text(text = entry.message, style = OriroTheme.type.caption, color = OriroTheme.colors.text, maxLines = 2, overflow = TextOverflow.Ellipsis)
      entry.subsystem?.let { subsystem ->
        Text(text = subsystem, style = OriroTheme.type.caption, color = OriroTheme.colors.textSubtle, maxLines = 1, overflow = TextOverflow.Ellipsis)
      }
    }
    OriroStatusPill(text = entry.level?.uppercase() ?: "LOG", status = logLevelStatus(entry.level))
  }
}

private fun compactLogTime(value: String?): String {
  val raw = value?.trim().orEmpty()
  if (raw.isEmpty()) return "--:--"
  // Gateway log timestamps may be ISO strings or already-compact fragments;
  // keep only the HH:mm portion when present.
  val time =
    raw
      .substringAfter('T', raw)
      .substringBefore('.')
      .substringBefore('+')
      .substringBefore('Z')
  return time.takeIf { it.length >= 5 }?.take(5) ?: raw.take(5)
}

private fun logLevelStatus(level: String?): OriroStatus =
  when (level?.lowercase()) {
    "error", "fatal" -> OriroStatus.Danger
    "warn" -> OriroStatus.Warning
    "info" -> OriroStatus.Success
    else -> OriroStatus.Neutral
  }
