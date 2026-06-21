package ai.oriro.app.ui

import ai.oriro.app.GatewayDeviceTokenSummary
import ai.oriro.app.GatewayNodeApprovalState
import ai.oriro.app.GatewayNodeSummary
import ai.oriro.app.GatewayNodesDevicesSummary
import ai.oriro.app.GatewayPairedDeviceSummary
import ai.oriro.app.GatewayPendingDeviceSummary
import ai.oriro.app.MainViewModel
import ai.oriro.app.ui.design.OriroDetailRow
import ai.oriro.app.ui.design.OriroPanel
import ai.oriro.app.ui.design.OriroSecondaryButton
import ai.oriro.app.ui.design.OriroStatus
import ai.oriro.app.ui.design.OriroStatusPill
import ai.oriro.app.ui.design.OriroTextBadge
import ai.oriro.app.ui.design.OriroTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** Settings screen for gateway nodes, paired devices, and pending pairing requests. */
@Composable
internal fun NodesDevicesSettingsScreen(
  viewModel: MainViewModel,
  onBack: () -> Unit,
) {
  val summary by viewModel.nodesDevicesSummary.collectAsState()
  val refreshing by viewModel.nodesDevicesRefreshing.collectAsState()
  val errorText by viewModel.nodesDevicesErrorText.collectAsState()
  val isConnected by viewModel.isConnected.collectAsState()

  LaunchedEffect(isConnected) {
    if (isConnected) {
      // Refresh once on connection; user-triggered refresh handles later changes
      // so device admin state is not polled from Compose.
      viewModel.refreshNodesDevices()
    }
  }

  SettingsDetailFrame(
    title = "Nodes & Devices",
    subtitle = "Live nodes, paired phones, and pending device requests.",
    icon = Icons.Default.Cloud,
    onBack = onBack,
  ) {
    SettingsMetricPanel(
      rows =
        listOf(
          SettingsMetric("Nodes", summary.nodes.size.toString()),
          SettingsMetric("Online", summary.nodes.count { it.connected }.toString()),
          SettingsMetric("Devices", if (summary.devicePairingAvailable) summary.pairedDevices.size.toString() else "Admin"),
          SettingsMetric("Pending", summary.pendingDevices.size.toString()),
        ),
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OriroSecondaryButton(
        text = if (refreshing) "Refreshing" else "Refresh",
        onClick = viewModel::refreshNodesDevices,
        enabled = isConnected && !refreshing,
        modifier = Modifier.weight(1f),
      )
    }
    errorText?.let {
      OriroPanel {
        Text(text = it, style = OriroTheme.type.body, color = OriroTheme.colors.warning)
      }
    }
    when {
      !isConnected ->
        OriroPanel {
          Text(text = "Connect the gateway to load nodes and paired devices.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
      summary.isEmpty() ->
        OriroPanel {
          Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(text = "No nodes or paired devices.", style = OriroTheme.type.section, color = OriroTheme.colors.text)
            Text(text = "Linked phones and node hosts will appear here after pairing.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
          }
        }
      else -> NodesDevicesPanel(summary = summary)
    }
  }
}

@Composable
private fun NodesDevicesPanel(summary: GatewayNodesDevicesSummary) {
  Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
    if (!summary.devicePairingAvailable) {
      OriroPanel {
        Text(text = "Device pairing admin needs elevated access. Connected nodes still work.", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
      }
    }
    if (summary.pendingDevices.isNotEmpty()) {
      NodesSection(title = "Pending Requests") {
        summary.pendingDevices.forEachIndexed { index, device ->
          PendingDeviceRow(device = device)
          if (index != summary.pendingDevices.lastIndex) {
            HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
          }
        }
      }
    }
    if (summary.nodes.isNotEmpty()) {
      NodesSection(title = "Nodes") {
        summary.nodes.forEachIndexed { index, node ->
          NodeRow(node = node)
          if (index != summary.nodes.lastIndex) {
            HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
          }
        }
      }
    }
    if (summary.pairedDevices.isNotEmpty()) {
      NodesSection(title = "Paired Devices") {
        summary.pairedDevices.forEachIndexed { index, device ->
          PairedDeviceRow(device = device)
          if (index != summary.pairedDevices.lastIndex) {
            HorizontalDivider(color = OriroTheme.colors.border, thickness = 1.dp)
          }
        }
      }
    }
  }
}

@Composable
private fun NodesSection(
  title: String,
  content: @Composable () -> Unit,
) {
  Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
    Text(text = title.uppercase(), style = OriroTheme.type.caption, color = OriroTheme.colors.textMuted)
    OriroPanel(contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
      Column {
        content()
      }
    }
  }
}

@Composable
private fun NodeRow(node: GatewayNodeSummary) {
  DeviceListRow(
    badge = nodeBadge(node.displayName ?: node.id),
    title = node.displayName ?: node.id,
    subtitle = nodeSubtitle(node),
    statusText = nodeStatusText(node),
    status = nodeStatus(node),
  )
}

@Composable
private fun PendingDeviceRow(device: GatewayPendingDeviceSummary) {
  DeviceListRow(
    badge = nodeBadge(device.displayName ?: device.deviceId),
    title = device.displayName ?: "New device",
    subtitle = pendingDeviceSubtitle(device),
    statusText = if (device.repair) "Repair" else "Review",
    status = OriroStatus.Warning,
  )
}

@Composable
private fun PairedDeviceRow(device: GatewayPairedDeviceSummary) {
  DeviceListRow(
    badge = nodeBadge(device.displayName ?: device.deviceId),
    title = device.displayName ?: "Paired device",
    subtitle = pairedDeviceSubtitle(device),
    statusText = pairedDeviceStatusText(device.tokens),
    status = pairedDeviceStatus(device.tokens),
  )
}

@Composable
private fun DeviceListRow(
  badge: String,
  title: String,
  subtitle: String,
  statusText: String,
  status: OriroStatus,
) {
  OriroDetailRow(
    title = title,
    subtitle = subtitle,
    leading = { OriroTextBadge(text = badge) },
    trailing = { OriroStatusPill(text = statusText, status = status) },
  )
}

/** True when the gateway returned no node or device rows to render. */
private fun GatewayNodesDevicesSummary.isEmpty(): Boolean = nodes.isEmpty() && pendingDevices.isEmpty() && pairedDevices.isEmpty()

private fun nodeSubtitle(node: GatewayNodeSummary): String {
  val kind = node.deviceFamily ?: "Node host"
  val version = node.version?.let { "Oriro $it" }
  val status = if (node.paired) "Paired" else "Unpaired"
  val approval = nodeApprovalSubtitle(node.approvalState)
  val commands =
    node.commands
      .take(2)
      .joinToString(", ")
      .takeIf { it.isNotBlank() }
  return listOfNotNull(kind, version, status, approval, commands).joinToString(" · ")
}

private fun nodeStatusText(node: GatewayNodeSummary): String =
  when (node.approvalState) {
    GatewayNodeApprovalState.PendingApproval -> "Needs approval"
    GatewayNodeApprovalState.PendingReapproval -> "Needs reapproval"
    GatewayNodeApprovalState.Unapproved -> "Unapproved"
    else -> if (node.connected) "Online" else "Offline"
  }

private fun nodeStatus(node: GatewayNodeSummary): OriroStatus =
  when (node.approvalState) {
    GatewayNodeApprovalState.Approved -> if (node.connected) OriroStatus.Success else OriroStatus.Warning
    GatewayNodeApprovalState.PendingApproval,
    GatewayNodeApprovalState.PendingReapproval,
    GatewayNodeApprovalState.Unapproved,
    -> OriroStatus.Warning
    GatewayNodeApprovalState.Loading,
    GatewayNodeApprovalState.Unsupported,
    -> if (node.connected) OriroStatus.Neutral else OriroStatus.Warning
  }

private fun nodeApprovalSubtitle(approvalState: GatewayNodeApprovalState): String? =
  when (approvalState) {
    GatewayNodeApprovalState.Approved -> "Approved"
    GatewayNodeApprovalState.PendingApproval -> "Capability approval pending"
    GatewayNodeApprovalState.PendingReapproval -> "Capability reapproval pending"
    GatewayNodeApprovalState.Unapproved -> "Capability unapproved"
    GatewayNodeApprovalState.Loading,
    GatewayNodeApprovalState.Unsupported,
    -> null
  }

private fun pendingDeviceSubtitle(device: GatewayPendingDeviceSummary): String {
  val roles = formatDeviceList(device.roles, "role")
  val scopes = formatDeviceList(device.scopes, "scope")
  val requested = device.requestedAtMs?.let { "requested ${relativeDeviceTime(it)}" }
  return listOfNotNull(roles, scopes, requested, device.remoteIp).joinToString(" · ")
}

private fun pairedDeviceSubtitle(device: GatewayPairedDeviceSummary): String {
  val roles = formatDeviceList(device.roles, "role")
  val scopes = formatDeviceList(device.scopes, "scope")
  val tokens = "${device.tokens.count { !it.revoked }}/${device.tokens.size} active tokens"
  return listOfNotNull(roles, scopes, tokens, device.remoteIp).joinToString(" · ")
}

private fun pairedDeviceStatusText(tokens: List<GatewayDeviceTokenSummary>): String =
  when {
    tokens.isEmpty() -> "Paired"
    tokens.any { !it.revoked } -> "Active"
    else -> "Needs Token"
  }

private fun pairedDeviceStatus(tokens: List<GatewayDeviceTokenSummary>): OriroStatus =
  when {
    tokens.isEmpty() -> OriroStatus.Neutral
    tokens.any { !it.revoked } -> OriroStatus.Success
    else -> OriroStatus.Warning
  }

private fun formatDeviceList(
  values: List<String>,
  fallback: String,
): String? =
  when (values.size) {
    0 -> null
    1 -> values.first()
    else -> "${values.size} ${fallback}s"
  }

private fun nodeBadge(value: String): String =
  value
    .split(' ', '-', '_')
    .filter { it.isNotBlank() }
    .take(2)
    .mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
    .joinToString("")
    .ifBlank { "N" }

private fun relativeDeviceTime(timeMs: Long): String {
  val minutes = ((System.currentTimeMillis() - timeMs).coerceAtLeast(0L)) / 60_000L
  if (minutes < 1) return "now"
  if (minutes < 60) return "${minutes}m ago"
  val hours = minutes / 60L
  if (hours < 24) return "${hours}h ago"
  return "${hours / 24L}d ago"
}
