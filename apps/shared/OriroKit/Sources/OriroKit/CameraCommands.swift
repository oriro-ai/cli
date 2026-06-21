import Foundation

public enum OriroCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum OriroCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum OriroCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum OriroCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct OriroCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: OriroCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: OriroCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: OriroCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: OriroCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct OriroCameraClipParams: Codable, Sendable, Equatable {
    public var facing: OriroCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: OriroCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: OriroCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: OriroCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
