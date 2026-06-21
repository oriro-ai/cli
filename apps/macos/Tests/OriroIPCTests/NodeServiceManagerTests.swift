import Foundation
import Testing
@testable import Oriro

@Suite(.serialized) struct NodeServiceManagerTests {
    @Test func `builds node service commands with current CLI shape`() async throws {
        try await TestIsolation.withUserDefaultsValues(["oriro.gatewayProjectRootPath": nil]) {
            let tmp = try makeTempDirForTests()
            CommandResolver.setProjectRoot(tmp.path)

            let oriroPath = tmp.appendingPathComponent("node_modules/.bin/oriro")
            try makeExecutableForTests(at: oriroPath)

            let start = NodeServiceManager._testServiceCommand(["start"])
            #expect(start == [oriroPath.path, "node", "start", "--json"])

            let stop = NodeServiceManager._testServiceCommand(["stop"])
            #expect(stop == [oriroPath.path, "node", "stop", "--json"])
        }
    }
}
