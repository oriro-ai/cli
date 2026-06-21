import Foundation
import Testing
@testable import Oriro

@Suite(.serialized) struct OriroAppDelegateTests {
    @Test @MainActor func `resolves registry model before view task assigns delegate model`() {
        let registryModel = NodeAppModel()
        OriroAppModelRegistry.appModel = registryModel
        defer { OriroAppModelRegistry.appModel = nil }

        let delegate = OriroAppDelegate()

        #expect(delegate._test_resolvedAppModel() === registryModel)
    }

    @Test @MainActor func `prefers explicit delegate model over registry fallback`() {
        let registryModel = NodeAppModel()
        let explicitModel = NodeAppModel()
        OriroAppModelRegistry.appModel = registryModel
        defer { OriroAppModelRegistry.appModel = nil }

        let delegate = OriroAppDelegate()
        delegate.appModel = explicitModel

        #expect(delegate._test_resolvedAppModel() === explicitModel)
    }

    @Test @MainActor func `derives background refresh task identifier from app bundle identifier`() {
        let delegate = OriroAppDelegate()
        let bundleIdentifier = Bundle.main.bundleIdentifier ?? "ai.orirofoundation.app.tests"

        #expect(delegate._test_wakeRefreshTaskIdentifier() == "\(bundleIdentifier).bgrefresh")
    }
}
