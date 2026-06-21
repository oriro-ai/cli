import CoreLocation
import Foundation
import OriroKit
import UIKit

typealias OriroCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias OriroCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: OriroCameraSnapParams) async throws -> OriroCameraSnapResult
    func clip(params: OriroCameraClipParams) async throws -> OriroCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: OriroLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: OriroLocationGetParams,
        desiredAccuracy: OriroLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> OriroDeviceStatusPayload
    func info() -> OriroDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: OriroPhotosLatestParams) async throws -> OriroPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: OriroContactsSearchParams) async throws -> OriroContactsSearchPayload
    func add(params: OriroContactsAddParams) async throws -> OriroContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: OriroCalendarEventsParams) async throws -> OriroCalendarEventsPayload
    func add(params: OriroCalendarAddParams) async throws -> OriroCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: OriroRemindersListParams) async throws -> OriroRemindersListPayload
    func add(params: OriroRemindersAddParams) async throws -> OriroRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: OriroMotionActivityParams) async throws -> OriroMotionActivityPayload
    func pedometer(params: OriroPedometerParams) async throws -> OriroPedometerPayload
}

struct WatchMessagingStatus: Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalResolveEvent: Equatable {
    var replyId: String
    var approvalId: String
    var decision: OriroWatchExecApprovalDecision
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalSnapshotRequestEvent: Equatable {
    var requestId: String
    var sentAtMs: Int?
    var transport: String
}

struct WatchAppSnapshotRequestEvent: Equatable {
    var requestId: String
    var sentAtMs: Int?
    var transport: String
}

struct WatchAppCommandEvent: Codable, Equatable {
    var commandId: String
    var command: OriroWatchAppCommand
    var sessionKey: String?
    var gatewayStableID: String?
    var text: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setStatusHandler(_ handler: (@Sendable (WatchMessagingStatus) -> Void)?)
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func setExecApprovalResolveHandler(_ handler: (@Sendable (WatchExecApprovalResolveEvent) -> Void)?)
    func setExecApprovalSnapshotRequestHandler(
        _ handler: (@Sendable (WatchExecApprovalSnapshotRequestEvent) -> Void)?)
    func setAppSnapshotRequestHandler(_ handler: (@Sendable (WatchAppSnapshotRequestEvent) -> Void)?)
    func setAppCommandHandler(_ handler: (@Sendable (WatchAppCommandEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: OriroWatchNotifyParams) async throws -> WatchNotificationSendResult
    func sendExecApprovalPrompt(
        _ message: OriroWatchExecApprovalPromptMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalResolved(
        _ message: OriroWatchExecApprovalResolvedMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalExpired(
        _ message: OriroWatchExecApprovalExpiredMessage) async throws -> WatchNotificationSendResult
    func syncExecApprovalSnapshot(
        _ message: OriroWatchExecApprovalSnapshotMessage) async throws -> WatchNotificationSendResult
    func syncAppSnapshot(
        _ message: OriroWatchAppSnapshotMessage) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
