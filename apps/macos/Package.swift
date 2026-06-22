// swift-tools-version: 6.2
// Package manifest for the Oriro macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Oriro",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "OriroIPC", targets: ["OriroIPC"]),
        .library(name: "OriroDiscovery", targets: ["OriroDiscovery"]),
        .executable(name: "Oriro", targets: ["Oriro"]),
        .executable(name: "oriro-mac", targets: ["OriroMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.3.0"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.4.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.10.1"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.9.0"),
        .package(url: "https://github.com/steipete/Peekaboo.git", exact: "3.5.3"),
        .package(path: "../shared/OriroKit"),
        .package(path: "../swabble"),
    ],
    targets: [
        .target(
            name: "OriroIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "OriroDiscovery",
            dependencies: [
                .product(name: "OriroKit", package: "OriroKit"),
            ],
            path: "Sources/OriroDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Oriro",
            dependencies: [
                "OriroIPC",
                "OriroDiscovery",
                .product(name: "OriroKit", package: "OriroKit"),
                .product(name: "OriroChatUI", package: "OriroKit"),
                .product(name: "OriroProtocol", package: "OriroKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Oriro.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "OriroMacCLI",
            dependencies: [
                "OriroDiscovery",
                .product(name: "OriroKit", package: "OriroKit"),
                .product(name: "OriroProtocol", package: "OriroKit"),
            ],
            path: "Sources/OriroMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "OriroIPCTests",
            dependencies: [
                "OriroIPC",
                "Oriro",
                "OriroMacCLI",
                "OriroDiscovery",
                .product(name: "OriroProtocol", package: "OriroKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
