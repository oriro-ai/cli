import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-oriro writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.oriro.mac"
let gatewayLaunchdLabel = "ai.oriro.gateway"
let onboardingVersionKey = "oriro.onboardingVersion"
let onboardingSeenKey = "oriro.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "oriro.pauseEnabled"
let iconAnimationsEnabledKey = "oriro.iconAnimationsEnabled"
let swabbleEnabledKey = "oriro.swabbleEnabled"
let swabbleTriggersKey = "oriro.swabbleTriggers"
let voiceWakeTriggerChimeKey = "oriro.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "oriro.voiceWakeSendChime"
let showDockIconKey = "oriro.showDockIcon"
let defaultVoiceWakeTriggers = ["oriro"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "oriro.voiceWakeMicID"
let voiceWakeMicNameKey = "oriro.voiceWakeMicName"
let voiceWakeLocaleKey = "oriro.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "oriro.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "oriro.voicePushToTalkEnabled"
let voiceWakeTriggersTalkModeKey = "oriro.voiceWakeTriggersTalkMode"
let talkEnabledKey = "oriro.talkEnabled"
let talkPhaseSoundsEnabledKey = "oriro.talkPhaseSoundsEnabled"
let talkShiftToStopEnabledKey = "oriro.talkShiftToStopEnabled"
let iconOverrideKey = "oriro.iconOverride"
let connectionModeKey = "oriro.connectionMode"
let remoteTargetKey = "oriro.remoteTarget"
let remoteIdentityKey = "oriro.remoteIdentity"
let remoteProjectRootKey = "oriro.remoteProjectRoot"
let remoteCliPathKey = "oriro.remoteCliPath"
let canvasEnabledKey = "oriro.canvasEnabled"
let cameraEnabledKey = "oriro.cameraEnabled"
let systemRunPolicyKey = "oriro.systemRunPolicy"
let systemRunAllowlistKey = "oriro.systemRunAllowlist"
let systemRunEnabledKey = "oriro.systemRunEnabled"
let locationModeKey = "oriro.locationMode"
let locationPreciseKey = "oriro.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "oriro.peekabooBridgeEnabled"
let deepLinkKeyKey = "oriro.deepLinkKey"
let cliInstallPromptedVersionKey = "oriro.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "oriro.heartbeatsEnabled"
let debugPaneEnabledKey = "oriro.debugPaneEnabled"
let debugFileLogEnabledKey = "oriro.debug.fileLogEnabled"
let appLogLevelKey = "oriro.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
