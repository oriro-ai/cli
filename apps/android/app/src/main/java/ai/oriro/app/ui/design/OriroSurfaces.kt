package ai.oriro.app.ui.design

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Standard inset panel for grouped Android app content.
 */
@Composable
internal fun OriroPanel(
  modifier: Modifier = Modifier,
  contentPadding: PaddingValues = PaddingValues(12.dp),
  content: @Composable () -> Unit,
) {
  Surface(
    modifier = modifier.fillMaxWidth(),
    shape = RoundedCornerShape(OriroTheme.radii.panel),
    color = OriroTheme.colors.surfaceRaised,
    contentColor = OriroTheme.colors.text,
    border = BorderStroke(1.dp, OriroTheme.colors.border),
  ) {
    Column(modifier = Modifier.padding(contentPadding)) {
      content()
    }
  }
}

/**
 * Bottom-sheet container with the app surface treatment and top-only rounding.
 */
@Composable
internal fun OriroSheetSurface(
  modifier: Modifier = Modifier,
  contentPadding: PaddingValues = PaddingValues(18.dp),
  content: @Composable () -> Unit,
) {
  Surface(
    modifier = modifier.fillMaxWidth(),
    shape = RoundedCornerShape(topStart = OriroTheme.radii.sheet, topEnd = OriroTheme.radii.sheet),
    color = OriroTheme.colors.surface,
    contentColor = OriroTheme.colors.text,
    border = BorderStroke(1.dp, OriroTheme.colors.border),
  ) {
    Column(modifier = Modifier.padding(contentPadding)) {
      content()
    }
  }
}

/**
 * Shared empty state used when a screen has no records but can still offer an action.
 */
@Composable
internal fun OriroEmptyState(
  title: String,
  body: String,
  modifier: Modifier = Modifier,
  action: (@Composable () -> Unit)? = null,
) {
  OriroPanel(modifier = modifier) {
    Column(
      modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Text(text = title, style = OriroTheme.type.section, color = OriroTheme.colors.text)
      Text(text = body, style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
      action?.invoke()
    }
  }
}

/**
 * Shared loading placeholder that keeps async screen states visually consistent.
 */
@Composable
internal fun OriroLoadingState(
  title: String,
  modifier: Modifier = Modifier,
) {
  OriroPanel(modifier = modifier) {
    Column(
      modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      CircularProgressIndicator(color = OriroTheme.colors.primary, strokeWidth = 2.dp)
      Text(text = title, style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
    }
  }
}

/**
 * Shared recoverable error block with the app's attention styling.
 */
@Composable
internal fun OriroErrorState(
  title: String,
  body: String,
  modifier: Modifier = Modifier,
  action: (@Composable () -> Unit)? = null,
) {
  OriroPanel(modifier = modifier) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      OriroStatusPill(text = "Needs attention", status = OriroStatus.Danger)
      Text(text = title, style = OriroTheme.type.section, color = OriroTheme.colors.text)
      Text(text = body, style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
      action?.invoke()
    }
  }
}
