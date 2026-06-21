package ai.oriro.app.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class OriroProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", OriroCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", OriroCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", OriroCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", OriroCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", OriroCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", OriroCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", OriroCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", OriroCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", OriroCapability.Canvas.rawValue)
    assertEquals("camera", OriroCapability.Camera.rawValue)
    assertEquals("voiceWake", OriroCapability.VoiceWake.rawValue)
    assertEquals("talk", OriroCapability.Talk.rawValue)
    assertEquals("location", OriroCapability.Location.rawValue)
    assertEquals("sms", OriroCapability.Sms.rawValue)
    assertEquals("device", OriroCapability.Device.rawValue)
    assertEquals("notifications", OriroCapability.Notifications.rawValue)
    assertEquals("system", OriroCapability.System.rawValue)
    assertEquals("photos", OriroCapability.Photos.rawValue)
    assertEquals("contacts", OriroCapability.Contacts.rawValue)
    assertEquals("calendar", OriroCapability.Calendar.rawValue)
    assertEquals("motion", OriroCapability.Motion.rawValue)
    assertEquals("callLog", OriroCapability.CallLog.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", OriroCameraCommand.List.rawValue)
    assertEquals("camera.snap", OriroCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", OriroCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", OriroNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", OriroNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", OriroDeviceCommand.Status.rawValue)
    assertEquals("device.info", OriroDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", OriroDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", OriroDeviceCommand.Health.rawValue)
    assertEquals("device.apps", OriroDeviceCommand.Apps.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", OriroSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", OriroPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", OriroContactsCommand.Search.rawValue)
    assertEquals("contacts.add", OriroContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", OriroCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", OriroCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", OriroMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", OriroMotionCommand.Pedometer.rawValue)
  }

  @Test
  fun smsCommandsUseStableStrings() {
    assertEquals("sms.send", OriroSmsCommand.Send.rawValue)
    assertEquals("sms.search", OriroSmsCommand.Search.rawValue)
  }

  @Test
  fun talkCommandsUseStableStrings() {
    assertEquals("talk.ptt.start", OriroTalkCommand.PttStart.rawValue)
    assertEquals("talk.ptt.stop", OriroTalkCommand.PttStop.rawValue)
    assertEquals("talk.ptt.cancel", OriroTalkCommand.PttCancel.rawValue)
    assertEquals("talk.ptt.once", OriroTalkCommand.PttOnce.rawValue)
  }

  @Test
  fun callLogCommandsUseStableStrings() {
    assertEquals("callLog.search", OriroCallLogCommand.Search.rawValue)
  }
}
