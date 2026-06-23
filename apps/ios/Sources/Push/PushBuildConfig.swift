import Foundation

enum PushTransportMode: String {
    case direct
    case relay
}

enum PushDistributionMode: String {
    case local
    case official
}

enum PushAPNsEnvironment: String {
    case sandbox
    case production
}

struct PushBuildConfig {
    let transport: PushTransportMode
    let distribution: PushDistributionMode
    let relayBaseURL: URL?
    let apnsEnvironment: PushAPNsEnvironment

    static let current = PushBuildConfig()
    static let openOriroHostedRelayHost = "ios-push-relay.oriro.ai"

    var usesOriroHostedRelay: Bool {
        guard self.transport == .relay, self.distribution == .official else { return false }
        guard let relayBaseURL = self.relayBaseURL,
              let components = URLComponents(url: relayBaseURL, resolvingAgainstBaseURL: false)
        else {
            return false
        }
        return components.scheme?.lowercased() == "https"
            && components.host?.lowercased() == Self.openOriroHostedRelayHost
            && components.user == nil
            && components.password == nil
    }

    init(bundle: Bundle = .main) {
        self.transport = Self.readEnum(
            bundle: bundle,
            key: "OriroPushTransport",
            fallback: .direct)
        self.distribution = Self.readEnum(
            bundle: bundle,
            key: "OriroPushDistribution",
            fallback: .local)
        self.apnsEnvironment = Self.readEnum(
            bundle: bundle,
            key: "OriroPushAPNsEnvironment",
            fallback: Self.defaultAPNsEnvironment)
        self.relayBaseURL = Self.readURL(bundle: bundle, key: "OriroPushRelayBaseURL")
    }

    private static func readURL(bundle: Bundle, key: String) -> URL? {
        guard let raw = bundle.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        guard let components = URLComponents(string: trimmed),
              components.scheme?.lowercased() == "https",
              let host = components.host,
              !host.isEmpty,
              components.user == nil,
              components.password == nil,
              components.query == nil,
              components.fragment == nil
        else {
            return nil
        }
        return components.url
    }

    private static func readEnum<T: RawRepresentable>(
        bundle: Bundle,
        key: String,
        fallback: T)
    -> T where T.RawValue == String {
        guard let raw = bundle.object(forInfoDictionaryKey: key) as? String else { return fallback }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return T(rawValue: trimmed) ?? fallback
    }

    private static let defaultAPNsEnvironment: PushAPNsEnvironment = .sandbox
}
