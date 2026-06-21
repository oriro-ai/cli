package ai.oriro.app.ui

import ai.oriro.app.MainViewModel
import ai.oriro.app.ui.design.OriroPanel
import ai.oriro.app.ui.design.OriroPrimaryButton
import ai.oriro.app.ui.design.OriroSecondaryButton
import ai.oriro.app.ui.design.OriroTheme
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ScreenShare
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** Settings detail surface for live canvas status, refresh, and embedded preview. */
@Composable
internal fun CanvasSettingsScreen(
  viewModel: MainViewModel,
  onBack: () -> Unit,
) {
  val isConnected by viewModel.isConnected.collectAsState()
  val currentUrl by viewModel.canvasCurrentUrl.collectAsState()
  val hydrated by viewModel.canvasA2uiHydrated.collectAsState()
  val rehydratePending by viewModel.canvasRehydratePending.collectAsState()
  val rehydrateErrorText by viewModel.canvasRehydrateErrorText.collectAsState()
  val hasLivePage = currentUrl?.isNotBlank() == true
  val showCanvasSurface = isConnected
  val canvasLabel = if (hasLivePage) "Live page" else "Home canvas"

  LaunchedEffect(isConnected) {
    if (isConnected) {
      // Refresh once when the gateway comes online so the settings preview is
      // populated before the user manually asks for a rehydrate.
      viewModel.refreshHomeCanvasOverviewIfConnected()
    }
  }

  SettingsDetailFrame(
    title = "Canvas",
    subtitle = "Current screen output and interactive app surface.",
    icon = Icons.AutoMirrored.Filled.ScreenShare,
    onBack = onBack,
  ) {
    SettingsMetricPanel(
      rows =
        listOf(
          SettingsMetric("Connection", if (isConnected) "Online" else "Offline"),
          SettingsMetric("Surface", canvasLabel),
          SettingsMetric("Bridge", if (hasLivePage && hydrated) "Ready" else "Standby"),
        ),
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OriroPrimaryButton(
        text = if (rehydratePending) "Refreshing" else "Refresh Screen",
        onClick = { viewModel.requestCanvasRehydrate(source = "settings_canvas") },
        enabled = isConnected && !rehydratePending,
        modifier = Modifier.weight(1f),
      )
      OriroSecondaryButton(
        text = "Reconnect",
        onClick = viewModel::refreshGatewayConnection,
        modifier = Modifier.weight(1f),
      )
    }
    rehydrateErrorText?.let {
      OriroPanel {
        Text(text = it, style = OriroTheme.type.body, color = OriroTheme.colors.warning)
      }
    }
    OriroPanel(contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)) {
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(text = canvasLabel, style = OriroTheme.type.section, color = OriroTheme.colors.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Surface(
          modifier = Modifier.fillMaxWidth().height(520.dp).clip(RoundedCornerShape(OriroTheme.radii.panel)),
          shape = RoundedCornerShape(OriroTheme.radii.panel),
          color = OriroTheme.colors.canvas,
          border = BorderStroke(1.dp, OriroTheme.colors.border),
        ) {
          Box {
            if (showCanvasSurface) {
              CanvasScreen(viewModel = viewModel, visible = true, modifier = Modifier.fillMaxWidth().height(520.dp))
            } else {
              CanvasStandbyPanel(isConnected = isConnected)
            }
          }
        }
      }
    }
  }
}

@Composable
private fun CanvasStandbyPanel(isConnected: Boolean) {
  Column(
    modifier = Modifier.fillMaxWidth().height(520.dp).padding(horizontal = 24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center,
  ) {
    Surface(
      modifier = Modifier.size(54.dp),
      shape = RoundedCornerShape(OriroTheme.radii.panel),
      color = OriroTheme.colors.surfacePressed,
      border = BorderStroke(1.dp, OriroTheme.colors.borderStrong),
      contentColor = OriroTheme.colors.text,
    ) {
      Box(contentAlignment = Alignment.Center) {
        Icon(imageVector = Icons.AutoMirrored.Filled.ScreenShare, contentDescription = null, modifier = Modifier.size(26.dp))
      }
    }
    Text(
      text = if (isConnected) "Screen surface ready" else "Connect the gateway",
      style = OriroTheme.type.title,
      color = OriroTheme.colors.text,
      modifier = Modifier.padding(top = 18.dp),
    )
    Text(
      text = if (isConnected) "Canvas output appears here when Oriro opens an app surface." else "Canvas output needs an active gateway connection.",
      style = OriroTheme.type.body,
      color = OriroTheme.colors.textMuted,
      modifier = Modifier.padding(top = 6.dp),
    )
  }
}
