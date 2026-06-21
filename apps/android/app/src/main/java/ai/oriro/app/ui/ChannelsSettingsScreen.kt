package ai.oriro.app.ui

import ai.oriro.app.GatewayChannelSummary
import ai.oriro.app.GatewayChannelsSummary
import ai.oriro.app.MainViewModel
import ai.oriro.app.ui.design.OriroDetailRow
import ai.oriro.app.ui.design.OriroListPanel
import ai.oriro.app.ui.design.OriroPanel
import ai.oriro.app.ui.design.OriroSecondaryButton
import ai.oriro.app.ui.design.OriroStatus
import ai.oriro.app.ui.design.OriroStatusPill
import ai.oriro.app.ui.design.OriroTextBadge
import ai.oriro.app.ui.design.OriroTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** Settings screen for gateway channel readiness and account status. */
@Composable
internal fun ChannelsSettingsScreen(
  viewModel: MainViewModel,
  onBack: () -> Unit,
) {
  val summary by viewModel.channelsSummary.collectAsState()
  val refreshing by viewModel.channelsRefreshing.collectAsState()
  val errorText by viewModel.channelsErrorText.collectAsState()
  val isConnected by viewModel.isConnected.collectAsState()
  val channels = summary.channels

  LaunchedEffect(isConnected) {
    if (isConnected) {
      viewModel.refreshChannels()
    }
  }

  SettingsDetailFrame(
    title = "Channels",
    subtitle = "Messaging surfaces connected to this gateway.",
    icon = Icons.Default.Notifications,
    onBack = onBack,
  ) {
    SettingsMetricPanel(
      rows =
        listOf(
          SettingsMetric("Channels", channels.size.toString()),
          SettingsMetric("Connected", channels.count { it.connected }.toString()),
          SettingsMetric("Configured", channels.count { it.configured }.toString()),
          SettingsMetric("Issues", channels.count { it.error != null }.toString()),
        ),
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OriroSecondaryButton(
        text = if (refreshing) "Refreshing" else "Refresh",
        onClick = viewModel::refreshChannels,
        enabled = isConnected && !refreshing,
        modifier = Modifier.weight(1f),
      )
    }
    errorText?.let { error ->
      OriroPanel {
        Text(text = error, style = OriroTheme.type.body, color = OriroTheme.colors.warning)
      }
    }
    if (summary.partial || summary.warnings.isNotEmpty()) {
      // Partial channel scans still include useful rows; surface the warning
      // without hiding successful channel status.
      OriroPanel {
        Text(text = channelsWarningText(summary), style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
      }
    }
    when {
      !isConnected ->
        OriroPanel {
          Text(text = "Connect the gateway to load channels.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
      channels.isEmpty() ->
        OriroPanel {
          Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(text = "No channels found.", style = OriroTheme.type.section, color = OriroTheme.colors.text)
            Text(text = "Telegram, WhatsApp, email, and other channels appear here after setup.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
          }
        }
      else -> ChannelsPanel(channels = channels)
    }
  }
}

@Composable
private fun ChannelsPanel(channels: List<GatewayChannelSummary>) {
  OriroListPanel(items = channels) { channel ->
    ChannelRow(channel = channel)
  }
}

@Composable
private fun ChannelRow(channel: GatewayChannelSummary) {
  OriroDetailRow(
    title = channel.label,
    subtitle = channelSubtitle(channel),
    leading = { OriroTextBadge(text = channelBadge(channel.label)) },
    trailing = { OriroStatusPill(text = channelStatusText(channel), status = channelStatus(channel)) },
  )
}

private fun channelSubtitle(channel: GatewayChannelSummary): String {
  val accounts =
    when (channel.accountCount) {
      0 -> null
      1 -> "1 account"
      else -> "${channel.accountCount} accounts"
    }
  val lifecycle =
    when {
      channel.connected -> "Connected"
      channel.running -> "Running"
      channel.linked -> "Linked"
      channel.configured -> "Configured"
      channel.enabled -> "Enabled"
      else -> "Off"
    }
  return listOfNotNull(accounts, lifecycle, channel.error).joinToString(" · ")
}

private fun channelStatusText(channel: GatewayChannelSummary): String =
  when {
    channel.error != null -> "Issue"
    channel.connected -> "Connected"
    channel.running -> "Running"
    channel.linked || channel.configured -> "Ready"
    channel.enabled -> "Setup"
    else -> "Off"
  }

private fun channelStatus(channel: GatewayChannelSummary): OriroStatus =
  when {
    channel.error != null -> OriroStatus.Danger
    channel.connected || channel.running -> OriroStatus.Success
    channel.linked || channel.configured -> OriroStatus.Neutral
    channel.enabled -> OriroStatus.Warning
    else -> OriroStatus.Neutral
  }

private fun channelBadge(label: String): String =
  label
    .split(' ', '-', '_')
    .filter { it.isNotBlank() }
    .take(2)
    .mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
    .joinToString("")
    .ifBlank { "C" }

/** Chooses the first gateway warning or a generic partial-scan message. */
private fun channelsWarningText(summary: GatewayChannelsSummary): String = summary.warnings.firstOrNull()?.takeIf { it.isNotBlank() } ?: "Some channel status checks did not complete."
