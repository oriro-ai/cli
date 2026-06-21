package ai.oriro.app.ui.design

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

internal enum class OriroStatus {
  Neutral,
  Success,
  Warning,
  Danger,
}

/** Full-screen mobile scaffold that applies Oriro safe-area and canvas tokens. */
@Composable
internal fun OriroScaffold(
  modifier: Modifier = Modifier,
  contentPadding: PaddingValues = PaddingValues(horizontal = OriroTheme.spacing.lg, vertical = OriroTheme.spacing.lg),
  contentWindowInsets: WindowInsets = WindowInsets.safeDrawing,
  content: @Composable () -> Unit,
) {
  Box(
    modifier =
      modifier
        .fillMaxSize()
        .background(OriroTheme.colors.canvas)
        .windowInsetsPadding(contentWindowInsets)
        .padding(contentPadding),
  ) {
    content()
  }
}

/** Section title row with an optional trailing action slot. */
@Composable
internal fun OriroSectionHeader(
  title: String,
  modifier: Modifier = Modifier,
  action: (@Composable () -> Unit)? = null,
) {
  Row(
    modifier = modifier.fillMaxWidth(),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    Text(
      text = title,
      style = OriroTheme.type.section,
      color = OriroTheme.colors.text,
    )
    action?.invoke()
  }
}

/** Primary call-to-action button using the mobile design token set. */
@Composable
internal fun OriroPrimaryButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  icon: ImageVector? = null,
) {
  Button(
    onClick = onClick,
    enabled = enabled,
    modifier = modifier.heightIn(min = OriroTheme.spacing.touchTarget),
    shape = RoundedCornerShape(OriroTheme.radii.button),
    colors =
      ButtonDefaults.buttonColors(
        containerColor = OriroTheme.colors.primary,
        contentColor = OriroTheme.colors.primaryText,
        disabledContainerColor = OriroTheme.colors.surfacePressed,
        disabledContentColor = OriroTheme.colors.textSubtle,
      ),
    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp, pressedElevation = 0.dp),
  ) {
    if (icon != null) {
      Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(16.dp))
      Spacer(modifier = Modifier.width(8.dp))
    }
    Text(text = text, style = OriroTheme.type.label, maxLines = 1, overflow = TextOverflow.Ellipsis)
  }
}

/** Secondary action button for non-default commands. */
@Composable
internal fun OriroSecondaryButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  icon: ImageVector? = null,
) {
  Surface(
    onClick = onClick,
    enabled = enabled,
    modifier = modifier.heightIn(min = OriroTheme.spacing.touchTarget),
    shape = RoundedCornerShape(OriroTheme.radii.button),
    color = if (enabled) OriroTheme.colors.surfaceRaised else OriroTheme.colors.surface,
    contentColor = if (enabled) OriroTheme.colors.text else OriroTheme.colors.textSubtle,
    border = BorderStroke(1.dp, if (enabled) OriroTheme.colors.borderStrong else OriroTheme.colors.border),
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.Center,
    ) {
      if (icon != null) {
        Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(7.dp))
      }
      Text(text = text, style = OriroTheme.type.label, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
  }
}

/** Fixed-size circular icon button for toolbar actions. */
@Composable
internal fun OriroIconButton(
  icon: ImageVector,
  contentDescription: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
) {
  Surface(
    onClick = onClick,
    enabled = enabled,
    modifier = modifier.size(OriroTheme.spacing.touchTarget),
    shape = CircleShape,
    color = if (enabled) OriroTheme.colors.surfaceRaised else OriroTheme.colors.surface,
    contentColor = if (enabled) OriroTheme.colors.text else OriroTheme.colors.textSubtle,
    border = BorderStroke(1.dp, OriroTheme.colors.border),
  ) {
    Box(contentAlignment = Alignment.Center) {
      Icon(imageVector = icon, contentDescription = contentDescription, modifier = Modifier.size(18.dp))
    }
  }
}

/** Compact status chip with a semantic color dot. */
@Composable
internal fun OriroStatusPill(
  text: String,
  status: OriroStatus,
  modifier: Modifier = Modifier,
) {
  val colors = OriroTheme.colors
  val (dotColor, backgroundColor) =
    when (status) {
      OriroStatus.Neutral -> colors.textSubtle to colors.surfaceRaised
      OriroStatus.Success -> colors.success to colors.successSoft
      OriroStatus.Warning -> colors.warning to colors.warningSoft
      OriroStatus.Danger -> colors.danger to colors.dangerSoft
    }

  Surface(
    modifier = modifier,
    shape = RoundedCornerShape(OriroTheme.radii.control),
    color = backgroundColor,
    border = BorderStroke(1.dp, OriroTheme.colors.border),
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(7.dp),
    ) {
      Box(
        modifier =
          Modifier
            .size(5.dp)
            .clip(CircleShape)
            .background(dotColor),
      )
      Text(text = text, style = OriroTheme.type.caption.copy(fontSize = 13.sp, lineHeight = 17.sp), color = OriroTheme.colors.textMuted, maxLines = 1)
    }
  }
}

/** Small optional-selectable pill used for filters and metadata chips. */
@Composable
internal fun OriroPill(
  text: String,
  modifier: Modifier = Modifier,
  selected: Boolean = false,
  onClick: (() -> Unit)? = null,
) {
  val surfaceModifier =
    if (onClick == null) {
      modifier
    } else {
      modifier.clickable(onClick = onClick)
    }

  Surface(
    modifier = surfaceModifier,
    shape = RoundedCornerShape(OriroTheme.radii.pill),
    color = if (selected) OriroTheme.colors.primary else OriroTheme.colors.surfaceRaised,
    contentColor = if (selected) OriroTheme.colors.primaryText else OriroTheme.colors.textMuted,
    border = BorderStroke(1.dp, if (selected) OriroTheme.colors.primary else OriroTheme.colors.border),
  ) {
    Text(
      text = text,
      modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
      style = OriroTheme.type.caption,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
    )
  }
}

/** Panel wrapper for homogeneous lists with standard row separators. */
@Composable
internal fun <T> OriroListPanel(
  items: List<T>,
  modifier: Modifier = Modifier,
  row: @Composable (T) -> Unit,
) {
  OriroPanel(modifier = modifier, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp)) {
    OriroSeparatedColumn(items = items, row = row)
  }
}

/** Column helper that inserts standard dividers between rendered rows. */
@Composable
internal fun <T> OriroSeparatedColumn(
  items: List<T>,
  modifier: Modifier = Modifier,
  row: @Composable (T) -> Unit,
) {
  Column(modifier = modifier) {
    items.forEachIndexed { index, item ->
      row(item)
      if (index != items.lastIndex) {
        HorizontalDivider(color = OriroTheme.colors.border.copy(alpha = 0.82f), thickness = 1.dp)
      }
    }
  }
}

/** Two-line settings/detail row with caller-provided leading and trailing slots. */
@Composable
internal fun OriroDetailRow(
  title: String,
  subtitle: String,
  modifier: Modifier = Modifier,
  leading: @Composable () -> Unit,
  trailing: @Composable () -> Unit,
) {
  Row(
    modifier =
      modifier
        .fillMaxWidth()
        .heightIn(min = 54.dp)
        .padding(horizontal = 0.dp, vertical = 7.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(9.dp),
  ) {
    leading()
    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
      Text(text = title, style = OriroTheme.type.body, color = OriroTheme.colors.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
      Text(text = subtitle, style = OriroTheme.type.caption, color = OriroTheme.colors.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
    trailing()
  }
}

/** Circular text badge used for compact numeric or initials-style row marks. */
@Composable
internal fun OriroTextBadge(
  text: String,
  modifier: Modifier = Modifier,
) {
  Surface(
    modifier = modifier.size(30.dp),
    shape = CircleShape,
    color = OriroTheme.colors.surfacePressed,
    border = BorderStroke(1.dp, OriroTheme.colors.border),
    contentColor = OriroTheme.colors.text,
  ) {
    Box(contentAlignment = Alignment.Center) {
      Text(text = text, style = OriroTheme.type.label, color = OriroTheme.colors.text, maxLines = 1)
    }
  }
}

/** Circular icon badge used as a neutral leading marker in list rows. */
@Composable
internal fun OriroIconBadge(
  icon: ImageVector,
  modifier: Modifier = Modifier,
) {
  Surface(
    modifier = modifier.size(30.dp),
    shape = CircleShape,
    color = OriroTheme.colors.surfacePressed,
    border = BorderStroke(1.dp, OriroTheme.colors.border),
    contentColor = OriroTheme.colors.text,
  ) {
    Box(contentAlignment = Alignment.Center) {
      Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(14.dp), tint = OriroTheme.colors.text)
    }
  }
}

/** Reusable one-line list row with optional subtitle, metadata, slots, and click handling. */
@Composable
internal fun OriroListItem(
  title: String,
  modifier: Modifier = Modifier,
  subtitle: String? = null,
  metadata: String? = null,
  leading: (@Composable () -> Unit)? = null,
  trailing: (@Composable () -> Unit)? = null,
  onClick: (() -> Unit)? = null,
) {
  val rowModifier =
    if (onClick == null) {
      modifier
    } else {
      modifier.clickable(onClick = onClick)
    }

  Row(
    modifier =
      rowModifier
        .fillMaxWidth()
        .heightIn(min = OriroTheme.spacing.touchTarget)
        .clip(RoundedCornerShape(OriroTheme.radii.row))
        .padding(horizontal = 2.dp, vertical = 5.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(9.dp),
  ) {
    leading?.invoke()
    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
      Text(
        text = title,
        style = OriroTheme.type.body,
        color = OriroTheme.colors.text,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
      if (subtitle != null) {
        Text(
          text = subtitle,
          style = OriroTheme.type.caption,
          color = OriroTheme.colors.textSubtle,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
      }
    }
    if (metadata != null) {
      Text(text = metadata, style = OriroTheme.type.caption, color = OriroTheme.colors.textSubtle, maxLines = 1)
    }
    trailing?.invoke()
  }
}

/** Equal-width segmented control for small mode/filter sets. */
@Composable
internal fun OriroSegmentedControl(
  options: List<String>,
  selected: String,
  onSelect: (String) -> Unit,
  modifier: Modifier = Modifier,
) {
  Row(
    modifier =
      modifier
        .clip(RoundedCornerShape(OriroTheme.radii.control))
        .border(1.dp, OriroTheme.colors.border, RoundedCornerShape(OriroTheme.radii.control))
        .padding(2.dp),
    horizontalArrangement = Arrangement.spacedBy(2.dp),
  ) {
    options.forEach { option ->
      val active = option == selected
      Box(
        modifier =
          Modifier
            .weight(1f)
            .clip(RoundedCornerShape(OriroTheme.radii.control))
            .background(if (active) OriroTheme.colors.primary else Color.Transparent)
            .clickable { onSelect(option) }
            .padding(horizontal = 9.dp, vertical = 7.dp),
        contentAlignment = Alignment.Center,
      ) {
        Text(
          text = option,
          style = OriroTheme.type.caption,
          color = if (active) OriroTheme.colors.primaryText else OriroTheme.colors.textMuted,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
      }
    }
  }
}

/** Token-styled text field used by settings and prototype screens. */
@Composable
internal fun OriroTextField(
  value: String,
  onValueChange: (String) -> Unit,
  placeholder: String,
  modifier: Modifier = Modifier,
  minLines: Int = 1,
) {
  BasicTextField(
    value = value,
    onValueChange = onValueChange,
    modifier =
      modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(OriroTheme.radii.control))
        .background(OriroTheme.colors.surfaceRaised)
        .border(1.dp, OriroTheme.colors.border, RoundedCornerShape(OriroTheme.radii.control))
        .padding(horizontal = 11.dp, vertical = 8.dp),
    textStyle = OriroTheme.type.body.copy(color = OriroTheme.colors.text),
    cursorBrush = SolidColor(OriroTheme.colors.primary),
    minLines = minLines,
    decorationBox = { innerTextField ->
      Box(modifier = Modifier.fillMaxWidth()) {
        if (value.isEmpty()) {
          Text(text = placeholder, style = OriroTheme.type.body, color = OriroTheme.colors.textSubtle)
        }
        innerTextField()
      }
    },
  )
}

/** Local design-system preview surface for visual smoke checks. */
@Composable
internal fun OriroComponentShowcase(modifier: Modifier = Modifier) {
  var selected by rememberSaveable { mutableStateOf("Chat") }
  var prompt by rememberSaveable { mutableStateOf("") }

  OriroScaffold(modifier = modifier) {
    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
      OriroTopBar(
        title = "Oriro",
        subtitle = "Local command center",
        navigation = { OriroAvatarMark(text = "OC") },
        actions = {
          OriroIconButton(icon = Icons.Default.Search, contentDescription = "Search", onClick = {})
        },
      )

      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
          Text(text = "Oriro", style = OriroTheme.type.display, color = OriroTheme.colors.text)
          Text(text = "Design system prototype", style = OriroTheme.type.body, color = OriroTheme.colors.textMuted)
        }
        OriroStatusPill(text = "Connected", status = OriroStatus.Success)
      }

      OriroSegmentedControl(
        options = listOf("Chat", "Voice", "Sessions"),
        selected = selected,
        onSelect = { selected = it },
        modifier = Modifier.fillMaxWidth(),
      )

      Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        OriroSectionHeader(title = "Sessions")
        OriroListItem(
          title = "Testing testing 1 2 3",
          subtitle = "14 messages · Android",
          metadata = "now",
        )
        OriroListItem(
          title = "Provider setup",
          subtitle = "Oriro gateway",
          metadata = "8m",
        )
      }

      OriroTextField(value = prompt, onValueChange = { prompt = it }, placeholder = "Ask Oriro anything", minLines = 3)

      Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        OriroPrimaryButton(text = "Start Chat", onClick = {}, modifier = Modifier.weight(1f))
        OriroSecondaryButton(text = "Voice", onClick = {}, modifier = Modifier.weight(1f))
      }

      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OriroPill(text = "Realtime", selected = true)
        OriroPill(text = "Dictation")
        OriroPill(text = "Screen")
      }

      OriroEmptyState(
        title = "Nothing needs your attention",
        body = "Oriro will surface approvals, failed jobs, and channel issues here.",
      )

      OriroBottomNav(
        items =
          listOf(
            OriroNavItem(key = "overview", label = "Home", icon = Icons.Default.Home),
            OriroNavItem(key = "chat", label = "Chat", icon = Icons.Default.ChatBubble),
            OriroNavItem(key = "voice", label = "Voice", icon = Icons.Default.Mic),
            OriroNavItem(key = "settings", label = "Settings", icon = Icons.Default.Settings),
          ),
        selectedKey = "chat",
        onSelect = {},
      )
    }
  }
}
