package ai.oriro.app.node

import ai.oriro.app.protocol.OriroCalendarCommand
import ai.oriro.app.protocol.OriroCallLogCommand
import ai.oriro.app.protocol.OriroCameraCommand
import ai.oriro.app.protocol.OriroCapability
import ai.oriro.app.protocol.OriroContactsCommand
import ai.oriro.app.protocol.OriroDeviceCommand
import ai.oriro.app.protocol.OriroLocationCommand
import ai.oriro.app.protocol.OriroMotionCommand
import ai.oriro.app.protocol.OriroNotificationsCommand
import ai.oriro.app.protocol.OriroPhotosCommand
import ai.oriro.app.protocol.OriroSmsCommand
import ai.oriro.app.protocol.OriroSystemCommand
import ai.oriro.app.protocol.OriroTalkCommand
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      OriroCapability.Canvas.rawValue,
      OriroCapability.Device.rawValue,
      OriroCapability.Notifications.rawValue,
      OriroCapability.System.rawValue,
      OriroCapability.Talk.rawValue,
      OriroCapability.Contacts.rawValue,
      OriroCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      OriroCapability.Camera.rawValue,
      OriroCapability.Location.rawValue,
      OriroCapability.Sms.rawValue,
      OriroCapability.CallLog.rawValue,
      OriroCapability.VoiceWake.rawValue,
      OriroCapability.Motion.rawValue,
      OriroCapability.Photos.rawValue,
    )

  private val coreCommands =
    setOf(
      OriroDeviceCommand.Status.rawValue,
      OriroDeviceCommand.Info.rawValue,
      OriroDeviceCommand.Permissions.rawValue,
      OriroDeviceCommand.Health.rawValue,
      OriroNotificationsCommand.List.rawValue,
      OriroNotificationsCommand.Actions.rawValue,
      OriroSystemCommand.Notify.rawValue,
      OriroTalkCommand.PttStart.rawValue,
      OriroTalkCommand.PttStop.rawValue,
      OriroTalkCommand.PttCancel.rawValue,
      OriroTalkCommand.PttOnce.rawValue,
      OriroContactsCommand.Search.rawValue,
      OriroContactsCommand.Add.rawValue,
      OriroCalendarCommand.Events.rawValue,
      OriroCalendarCommand.Add.rawValue,
    )

  private val optionalCommands =
    setOf(
      OriroCameraCommand.Snap.rawValue,
      OriroCameraCommand.Clip.rawValue,
      OriroCameraCommand.List.rawValue,
      OriroLocationCommand.Get.rawValue,
      OriroMotionCommand.Activity.rawValue,
      OriroMotionCommand.Pedometer.rawValue,
      OriroSmsCommand.Send.rawValue,
      OriroSmsCommand.Search.rawValue,
      OriroCallLogCommand.Search.rawValue,
      OriroPhotosCommand.Latest.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          photosAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesDeviceAppsOnlyWhenUserOptedIn() {
    val disabled = InvokeCommandRegistry.advertisedCommands(defaultFlags(installedAppsSharingEnabled = false))
    val enabled = InvokeCommandRegistry.advertisedCommands(defaultFlags(installedAppsSharingEnabled = true))

    assertFalse(disabled.contains(OriroDeviceCommand.Apps.rawValue))
    assertTrue(enabled.contains(OriroDeviceCommand.Apps.rawValue))
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          photosAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          sendSmsAvailable = false,
          readSmsAvailable = false,
          smsSearchPossible = false,
          callLogAvailable = false,
          photosAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          installedAppsSharingEnabled = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(OriroMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(OriroMotionCommand.Pedometer.rawValue))
  }

  @Test
  fun advertisedCommands_splitsSmsSendAndSearchAvailability() {
    val readOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(readSmsAvailable = true, smsSearchPossible = true),
      )
    val sendOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCommands.contains(OriroSmsCommand.Search.rawValue))
    assertFalse(readOnlyCommands.contains(OriroSmsCommand.Send.rawValue))
    assertTrue(sendOnlyCommands.contains(OriroSmsCommand.Send.rawValue))
    assertFalse(sendOnlyCommands.contains(OriroSmsCommand.Search.rawValue))
    assertTrue(requestableSearchCommands.contains(OriroSmsCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_includeSmsWhenEitherSmsPathIsAvailable() {
    val readOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCapabilities.contains(OriroCapability.Sms.rawValue))
    assertTrue(sendOnlyCapabilities.contains(OriroCapability.Sms.rawValue))
    assertFalse(requestableSearchCapabilities.contains(OriroCapability.Sms.rawValue))
  }

  @Test
  fun advertisedCommands_excludesCallLogWhenUnavailable() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(callLogAvailable = false))

    assertFalse(commands.contains(OriroCallLogCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_excludesCallLogWhenUnavailable() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(callLogAvailable = false))

    assertFalse(capabilities.contains(OriroCapability.CallLog.rawValue))
  }

  @Test
  fun advertisedPhotosSurface_respectsFeatureAvailability() {
    val disabledFlags = defaultFlags(photosAvailable = false)
    val enabledFlags = defaultFlags(photosAvailable = true)

    assertFalse(InvokeCommandRegistry.advertisedCapabilities(disabledFlags).contains(OriroCapability.Photos.rawValue))
    assertFalse(InvokeCommandRegistry.advertisedCommands(disabledFlags).contains(OriroPhotosCommand.Latest.rawValue))
    assertTrue(InvokeCommandRegistry.advertisedCapabilities(enabledFlags).contains(OriroCapability.Photos.rawValue))
    assertTrue(InvokeCommandRegistry.advertisedCommands(enabledFlags).contains(OriroPhotosCommand.Latest.rawValue))
  }

  @Test
  fun advertisedCapabilities_includesVoiceWakeWithoutAdvertisingCommands() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(voiceWakeEnabled = true))
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(voiceWakeEnabled = true))

    assertTrue(capabilities.contains(OriroCapability.VoiceWake.rawValue))
    assertFalse(commands.any { it.contains("voice", ignoreCase = true) })
  }

  @Test
  fun find_returnsForegroundMetadataForCameraCommands() {
    val list = InvokeCommandRegistry.find(OriroCameraCommand.List.rawValue)
    val location = InvokeCommandRegistry.find(OriroLocationCommand.Get.rawValue)

    assertNotNull(list)
    assertEquals(true, list?.requiresForeground)
    assertNotNull(location)
    assertEquals(false, location?.requiresForeground)
  }

  @Test
  fun find_returnsNullForUnknownCommand() {
    assertNull(InvokeCommandRegistry.find("not.real"))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    smsSearchPossible: Boolean = false,
    callLogAvailable: Boolean = false,
    photosAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    installedAppsSharingEnabled: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      sendSmsAvailable = sendSmsAvailable,
      readSmsAvailable = readSmsAvailable,
      smsSearchPossible = smsSearchPossible,
      callLogAvailable = callLogAvailable,
      photosAvailable = photosAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      installedAppsSharingEnabled = installedAppsSharingEnabled,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(
    actual: List<String>,
    expected: Set<String>,
  ) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(
    actual: List<String>,
    forbidden: Set<String>,
  ) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
