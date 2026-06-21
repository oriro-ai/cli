package ai.oriro.app.protocol

/** Capability ids advertised by the Android node to the Oriro gateway. */
enum class OriroCapability(
  val rawValue: String,
) {
  Canvas("canvas"),
  Camera("camera"),
  Sms("sms"),
  VoiceWake("voiceWake"),
  Talk("talk"),
  Location("location"),
  Device("device"),
  Notifications("notifications"),
  System("system"),
  Photos("photos"),
  Contacts("contacts"),
  Calendar("calendar"),
  Motion("motion"),
  CallLog("callLog"),
}

/** Canvas command ids mirrored from the gateway tool namespace. */
enum class OriroCanvasCommand(
  val rawValue: String,
) {
  Present("canvas.present"),
  Hide("canvas.hide"),
  Navigate("canvas.navigate"),
  Eval("canvas.eval"),
  Snapshot("canvas.snapshot"),
  ;

  companion object {
    const val NamespacePrefix: String = "canvas."
  }
}

/** Streaming canvas commands sent from agents back into the Android UI. */
enum class OriroCanvasA2UICommand(
  val rawValue: String,
) {
  Push("canvas.a2ui.push"),
  PushJSONL("canvas.a2ui.pushJSONL"),
  Reset("canvas.a2ui.reset"),
  ;

  companion object {
    const val NamespacePrefix: String = "canvas.a2ui."
  }
}

/** Camera command ids accepted by the Android node. */
enum class OriroCameraCommand(
  val rawValue: String,
) {
  List("camera.list"),
  Snap("camera.snap"),
  Clip("camera.clip"),
  ;

  companion object {
    const val NamespacePrefix: String = "camera."
  }
}

/** SMS command ids accepted by the Android node. */
enum class OriroSmsCommand(
  val rawValue: String,
) {
  Send("sms.send"),
  Search("sms.search"),
  ;

  companion object {
    const val NamespacePrefix: String = "sms."
  }
}

/** Push-to-talk command ids accepted by the Android node. */
enum class OriroTalkCommand(
  val rawValue: String,
) {
  PttStart("talk.ptt.start"),
  PttStop("talk.ptt.stop"),
  PttCancel("talk.ptt.cancel"),
  PttOnce("talk.ptt.once"),
  ;

  companion object {
    const val NamespacePrefix: String = "talk."
  }
}

/** Location command ids accepted by the Android node. */
enum class OriroLocationCommand(
  val rawValue: String,
) {
  Get("location.get"),
  ;

  companion object {
    const val NamespacePrefix: String = "location."
  }
}

/** Device status and metadata command ids accepted by the Android node. */
enum class OriroDeviceCommand(
  val rawValue: String,
) {
  Status("device.status"),
  Info("device.info"),
  Permissions("device.permissions"),
  Health("device.health"),
  Apps("device.apps"),
  ;

  companion object {
    const val NamespacePrefix: String = "device."
  }
}

/** Notification command ids accepted by the Android node. */
enum class OriroNotificationsCommand(
  val rawValue: String,
) {
  List("notifications.list"),
  Actions("notifications.actions"),
  ;

  companion object {
    const val NamespacePrefix: String = "notifications."
  }
}

/** System command ids accepted by the Android node. */
enum class OriroSystemCommand(
  val rawValue: String,
) {
  Notify("system.notify"),
  ;

  companion object {
    const val NamespacePrefix: String = "system."
  }
}

/** Photos command ids accepted by the Android node. */
enum class OriroPhotosCommand(
  val rawValue: String,
) {
  Latest("photos.latest"),
  ;

  companion object {
    const val NamespacePrefix: String = "photos."
  }
}

/** Contacts command ids accepted by the Android node. */
enum class OriroContactsCommand(
  val rawValue: String,
) {
  Search("contacts.search"),
  Add("contacts.add"),
  ;

  companion object {
    const val NamespacePrefix: String = "contacts."
  }
}

/** Calendar command ids accepted by the Android node. */
enum class OriroCalendarCommand(
  val rawValue: String,
) {
  Events("calendar.events"),
  Add("calendar.add"),
  ;

  companion object {
    const val NamespacePrefix: String = "calendar."
  }
}

/** Motion sensor command ids accepted by the Android node. */
enum class OriroMotionCommand(
  val rawValue: String,
) {
  Activity("motion.activity"),
  Pedometer("motion.pedometer"),
  ;

  companion object {
    const val NamespacePrefix: String = "motion."
  }
}

/** Call-log command ids accepted by the Android node. */
enum class OriroCallLogCommand(
  val rawValue: String,
) {
  Search("callLog.search"),
  ;

  companion object {
    const val NamespacePrefix: String = "callLog."
  }
}
