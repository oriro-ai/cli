// Control UI tests cover skills behavior.
import { describe, expect, it, vi } from "vitest";
import {
  installFromOriroHub,
  installSkill,
  loadSkills,
  loadSkillCard,
  loadOriroHubDetail,
  reconcileSkillsAgentId,
  saveSkillApiKey,
  searchOriroHub,
  setOriroHubSearchQuery,
  setSkillsAgentId,
  updateSkillEnabled,
  type SkillsState,
} from "./skills.ts";

type TestRequest = (method: string, payload?: unknown) => Promise<unknown>;

function createState(): { state: SkillsState; request: ReturnType<typeof vi.fn<TestRequest>> } {
  const request = vi.fn<TestRequest>();
  const state: SkillsState = {
    client: {
      request,
    } as unknown as SkillsState["client"],
    connected: true,
    skillsAgentId: null,
    skillsAgentRevision: 0,
    skillsLoading: false,
    skillsReport: null,
    skillsError: null,
    skillsBusyKey: null,
    skillEdits: {},
    skillMessages: {},
    skillsDetailKey: null,
    skillsDetailTab: "overview",
    orirohubSearchQuery: "github",
    orirohubSearchResults: [
      {
        score: 0.9,
        slug: "github",
        displayName: "GitHub",
        summary: "Previous result",
        version: "1.0.0",
      },
    ],
    orirohubSearchLoading: false,
    orirohubSearchError: "old error",
    orirohubDetail: null,
    orirohubDetailSlug: null,
    orirohubDetailLoading: false,
    orirohubDetailError: null,
    orirohubInstallSlug: null,
    orirohubInstallMessage: null,
    orirohubVerdicts: {},
    orirohubVerdictsLoading: false,
    orirohubVerdictsError: null,
    skillCardContents: {},
    skillCardContentKeys: {},
    skillCardLoadingKey: null,
    skillCardErrors: {},
  };
  return { state, request };
}

function createDeferredRequestQueue(request: ReturnType<typeof vi.fn<TestRequest>>) {
  const resolvers: Array<(value: unknown) => void> = [];
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvers.push(resolve);
      }),
  );
  return {
    resolveNext(value: unknown) {
      resolvers.shift()?.(value);
    },
  };
}

function mockSkillMutationRequests(
  request: ReturnType<typeof vi.fn<TestRequest>>,
  installMessage?: string,
) {
  request.mockImplementation(async (method: string) => {
    if (method === "skills.install" && installMessage) {
      return { message: installMessage };
    }
    return {};
  });
}

describe("loadSkills", () => {
  it("does not request OriroHub verdicts when no installed skills are linked", async () => {
    const { state, request } = createState();
    request.mockResolvedValueOnce({
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: "/tmp/skills",
      skills: [{ name: "Local", skillKey: "local", source: "workspace" }],
    });

    await loadSkills(state);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("skills.status", {});
    expect(state.orirohubVerdicts).toEqual({});
    expect(state.orirohubVerdictsError).toBeNull();
  });

  it("requests one bulk OriroHub verdict batch for linked installed skills", async () => {
    const { state, request } = createState();
    request.mockImplementation(async (method: string) => {
      if (method === "skills.status") {
        return {
          workspaceDir: "/tmp/workspace",
          managedSkillsDir: "/tmp/skills",
          skills: [
            {
              name: "AgentReceipt",
              skillKey: "agentreceipt",
              source: "workspace",
              orirohub: {
                status: "linked",
                valid: true,
                registry: "https://orirohub.ai",
                slug: "agentreceipt",
                installedVersion: "1.2.3",
                installedAt: 123,
              },
            },
            { name: "Local", skillKey: "local", source: "workspace" },
          ],
        };
      }
      if (method === "skills.securityVerdicts") {
        return {
          schema: "oriro.skills.security-verdicts.v1",
          items: [
            {
              registry: "https://orirohub.ai",
              ok: true,
              decision: "pass",
              reasons: [],
              requestedSlug: "agentreceipt",
              requestedVersion: "1.2.3",
              slug: "agentreceipt",
              version: "1.2.3",
              securityStatus: "clean",
              securityPassed: true,
            },
          ],
        };
      }
      return {};
    });

    await loadSkills(state);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, "skills.status", {});
    expect(request).toHaveBeenNthCalledWith(2, "skills.securityVerdicts", {});
    expect(state.orirohubVerdicts).toEqual({
      "https://orirohub.ai\u0000agentreceipt\u00001.2.3": expect.objectContaining({
        ok: true,
        decision: "pass",
        securityStatus: "clean",
        securityPassed: true,
      }),
    });
    expect(state.orirohubVerdictsLoading).toBe(false);
    expect(state.orirohubVerdictsError).toBeNull();
  });

  it("loads selected agent skills and verdicts with the agent id", async () => {
    const { state, request } = createState();
    state.skillsAgentId = "research";
    request.mockImplementation(async (method: string) => {
      if (method === "skills.status") {
        return {
          workspaceDir: "/tmp/research",
          managedSkillsDir: "/tmp/skills",
          skills: [
            {
              name: "AgentReceipt",
              skillKey: "agentreceipt",
              source: "workspace",
              orirohub: {
                status: "linked",
                valid: true,
                registry: "https://orirohub.ai",
                slug: "agentreceipt",
                installedVersion: "1.2.3",
                installedAt: 123,
              },
            },
          ],
        };
      }
      if (method === "skills.securityVerdicts") {
        return {
          schema: "oriro.skills.security-verdicts.v1",
          items: [],
        };
      }
      return {};
    });

    await loadSkills(state);

    expect(request).toHaveBeenNthCalledWith(1, "skills.status", { agentId: "research" });
    expect(request).toHaveBeenNthCalledWith(2, "skills.securityVerdicts", {
      agentId: "research",
    });
    expect(state.skillsReport?.workspaceDir).toBe("/tmp/research");
  });

  it("ignores stale skill reports after switching agents mid-request", async () => {
    const { state, request } = createState();
    const pendingRequests: Array<{
      method: string;
      payload: unknown;
      resolve: (value: unknown) => void;
    }> = [];
    request.mockImplementation(
      (method, payload) =>
        new Promise((resolve) => {
          pendingRequests.push({ method, payload, resolve });
        }),
    );

    state.skillsAgentId = "alpha";
    state.skillEdits = { shared: "stale-secret" };
    const firstLoad = loadSkills(state);
    await Promise.resolve();

    setSkillsAgentId(state, "beta");
    expect(state.skillEdits).toEqual({});
    const secondLoad = loadSkills(state);
    await Promise.resolve();

    expect(pendingRequests.map(({ method, payload }) => [method, payload])).toEqual([
      ["skills.status", { agentId: "alpha" }],
      ["skills.status", { agentId: "beta" }],
    ]);

    pendingRequests[1].resolve({
      workspaceDir: "/tmp/beta",
      managedSkillsDir: "/tmp/skills",
      skills: [{ name: "Beta", skillKey: "beta", source: "workspace" }],
    });
    await secondLoad;

    pendingRequests[0].resolve({
      workspaceDir: "/tmp/alpha",
      managedSkillsDir: "/tmp/skills",
      skills: [{ name: "Alpha", skillKey: "alpha", source: "workspace" }],
    });
    await firstLoad;

    expect(state.skillsAgentId).toBe("beta");
    expect(state.skillsReport?.workspaceDir).toBe("/tmp/beta");
    expect(state.skillsReport?.skills.map((skill) => skill.name)).toEqual(["Beta"]);
    expect(state.skillsLoading).toBe(false);
  });

  it("ignores stale skill reports after switching away and back to the same agent", async () => {
    const { state, request } = createState();
    const queue = createDeferredRequestQueue(request);
    state.skillsAgentId = "alpha";

    const firstLoad = loadSkills(state);
    await Promise.resolve();
    setSkillsAgentId(state, "beta");
    setSkillsAgentId(state, "alpha");
    const secondLoad = loadSkills(state);
    await Promise.resolve();

    queue.resolveNext({
      workspaceDir: "/tmp/stale-alpha",
      managedSkillsDir: "/tmp/skills",
      skills: [{ name: "Stale Alpha", skillKey: "stale-alpha", source: "workspace" }],
    });
    await firstLoad;

    expect(state.skillsReport).toBeNull();
    expect(state.skillsLoading).toBe(true);

    queue.resolveNext({
      workspaceDir: "/tmp/current-alpha",
      managedSkillsDir: "/tmp/skills",
      skills: [{ name: "Current Alpha", skillKey: "current-alpha", source: "workspace" }],
    });
    await secondLoad;

    expect(state.skillsReport?.workspaceDir).toBe("/tmp/current-alpha");
    expect(state.skillsReport?.skills.map((skill) => skill.name)).toEqual(["Current Alpha"]);
    expect(state.skillsLoading).toBe(false);
  });

  it("does not keep skills loading while the optional verdict refresh is pending", async () => {
    const { state, request } = createState();
    let resolveVerdicts: (value: unknown) => void = () => {
      throw new Error("expected verdict request to be pending");
    };
    request.mockImplementation((method: string) => {
      if (method === "skills.status") {
        return Promise.resolve({
          workspaceDir: "/tmp/workspace",
          managedSkillsDir: "/tmp/skills",
          skills: [
            {
              name: "AgentReceipt",
              skillKey: "agentreceipt",
              source: "workspace",
              orirohub: {
                status: "linked",
                valid: true,
                registry: "https://orirohub.ai",
                slug: "agentreceipt",
                installedVersion: "1.2.3",
                installedAt: 123,
              },
            },
          ],
        });
      }
      if (method === "skills.securityVerdicts") {
        return new Promise((resolve) => {
          resolveVerdicts = resolve;
        });
      }
      return Promise.resolve({});
    });

    await loadSkills(state);

    expect(state.skillsLoading).toBe(false);
    expect(state.orirohubVerdictsLoading).toBe(true);

    resolveVerdicts({ schema: "oriro.skills.security-verdicts.v1", items: [] });
    await Promise.resolve();
    await Promise.resolve();

    expect(state.orirohubVerdictsLoading).toBe(false);
  });

  it("drops cached Skill Card content when refreshed card metadata changes", async () => {
    const { state, request } = createState();
    state.skillCardContents = { agentreceipt: "old card" };
    state.skillCardContentKeys = {
      agentreceipt: "/tmp/workspace/skills/agentreceipt/skill-card.md\u000034\u00001.2.3",
    };
    request.mockResolvedValueOnce({
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: "/tmp/skills",
      skills: [
        {
          name: "AgentReceipt",
          description: "Trust card fixture",
          skillKey: "agentreceipt",
          source: "workspace",
          orirohub: {
            status: "linked",
            valid: true,
            registry: "https://orirohub.ai",
            slug: "agentreceipt",
            installedVersion: "1.2.4",
            installedAt: 456,
          },
          skillCard: {
            present: true,
            path: "/tmp/workspace/skills/agentreceipt/skill-card.md",
            sizeBytes: 34,
          },
        },
      ],
    });

    await loadSkills(state);

    expect(state.skillCardContents.agentreceipt).toBeUndefined();
    expect(state.skillCardContentKeys.agentreceipt).toBeUndefined();
  });
});

describe("loadSkillCard", () => {
  it("loads local Skill Card content on demand", async () => {
    const { state, request } = createState();
    state.skillsAgentId = "research";
    request.mockResolvedValueOnce({
      schema: "oriro.skills.skill-card.v1",
      skillKey: "agentreceipt",
      path: "/tmp/workspace/skills/agentreceipt/skill-card.md",
      sizeBytes: 34,
      content: "# AgentReceipt\n\nLocal trust card.\n",
    });
    state.skillsReport = {
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: "/tmp/skills",
      skills: [
        {
          name: "AgentReceipt",
          description: "Trust card fixture",
          skillKey: "agentreceipt",
          source: "workspace",
          filePath: "/tmp/workspace/skills/agentreceipt/SKILL.md",
          baseDir: "/tmp/workspace/skills/agentreceipt",
          always: false,
          disabled: false,
          blockedByAllowlist: false,
          eligible: true,
          requirements: { bins: [], env: [], config: [], os: [] },
          missing: { bins: [], env: [], config: [], os: [] },
          configChecks: [],
          install: [],
          skillCard: {
            present: true,
            path: "/tmp/workspace/skills/agentreceipt/skill-card.md",
            sizeBytes: 34,
          },
        },
      ],
    };

    await loadSkillCard(state, "agentreceipt");

    expect(request).toHaveBeenCalledWith("skills.skillCard", {
      agentId: "research",
      skillKey: "agentreceipt",
    });
    expect(state.skillCardContents.agentreceipt).toBe("# AgentReceipt\n\nLocal trust card.\n");
    expect(state.skillCardContentKeys.agentreceipt).toBe(
      "/tmp/workspace/skills/agentreceipt/skill-card.md\u000034\u0000",
    );
    expect(state.skillCardLoadingKey).toBeNull();
    expect(state.skillCardErrors).toEqual({});
  });

  it("does not cache stale Skill Card content after local metadata changes mid-request", async () => {
    const { state, request } = createState();
    let resolveCard: (value: unknown) => void = () => {
      throw new Error("expected card request to be pending");
    };
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCard = resolve;
        }),
    );
    state.skillsReport = {
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: "/tmp/skills",
      skills: [
        {
          name: "AgentReceipt",
          description: "Trust card fixture",
          skillKey: "agentreceipt",
          source: "workspace",
          filePath: "/tmp/workspace/skills/agentreceipt/SKILL.md",
          baseDir: "/tmp/workspace/skills/agentreceipt",
          always: false,
          disabled: false,
          blockedByAllowlist: false,
          eligible: true,
          requirements: { bins: [], env: [], config: [], os: [] },
          missing: { bins: [], env: [], config: [], os: [] },
          configChecks: [],
          install: [],
          orirohub: {
            status: "linked",
            valid: true,
            registry: "https://orirohub.ai",
            slug: "agentreceipt",
            installedVersion: "1.2.3",
            installedAt: 123,
          },
          skillCard: {
            present: true,
            path: "/tmp/workspace/skills/agentreceipt/skill-card.md",
            sizeBytes: 34,
          },
        },
      ],
    };

    const pending = loadSkillCard(state, "agentreceipt");
    state.skillsReport = {
      ...state.skillsReport,
      skills: [
        {
          ...state.skillsReport.skills[0],
          orirohub: {
            status: "linked",
            valid: true,
            registry: "https://orirohub.ai",
            slug: "agentreceipt",
            installedVersion: "1.2.4",
            installedAt: 456,
          },
        },
      ],
    };
    resolveCard({
      schema: "oriro.skills.skill-card.v1",
      skillKey: "agentreceipt",
      path: "/tmp/workspace/skills/agentreceipt/skill-card.md",
      sizeBytes: 34,
      content: "old card",
    });
    await pending;

    expect(state.skillCardContents.agentreceipt).toBeUndefined();
    expect(state.skillCardContentKeys.agentreceipt).toBeUndefined();
  });
});

describe("searchOriroHub", () => {
  it("clears stale query state immediately when the input changes", () => {
    const { state } = createState();

    state.orirohubSearchLoading = true;
    state.orirohubInstallMessage = { kind: "success", text: "Installed github" };

    setOriroHubSearchQuery(state, "github app");

    expect(state.orirohubSearchQuery).toBe("github app");
    expect(state.orirohubSearchResults).toBeNull();
    expect(state.orirohubSearchError).toBeNull();
    expect(state.orirohubSearchLoading).toBe(false);
    expect(state.orirohubInstallMessage).toBeNull();
  });

  it("clears stale results as soon as a new search starts", async () => {
    const { state, request } = createState();
    type SearchResponse = { results: SkillsState["orirohubSearchResults"] };
    let resolveRequest: (value: SearchResponse) => void = () => {
      throw new Error("expected search request promise to be pending");
    };
    request.mockImplementation(
      () =>
        new Promise<SearchResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const pending = searchOriroHub(state, "github");

    expect(state.orirohubSearchResults).toBeNull();
    expect(state.orirohubSearchLoading).toBe(true);
    expect(state.orirohubSearchError).toBeNull();

    resolveRequest({
      results: [
        {
          score: 0.95,
          slug: "github-new",
          displayName: "GitHub New",
          summary: "Fresh result",
          version: "2.0.0",
        },
      ],
    });
    await pending;

    expect(state.orirohubSearchResults).toEqual([
      {
        score: 0.95,
        slug: "github-new",
        displayName: "GitHub New",
        summary: "Fresh result",
        version: "2.0.0",
      },
    ]);
    expect(state.orirohubSearchLoading).toBe(false);
  });

  it("clears stale results when the query is emptied", async () => {
    const { state, request } = createState();

    await searchOriroHub(state, "   ");

    expect(request).not.toHaveBeenCalled();
    expect(state.orirohubSearchResults).toBeNull();
    expect(state.orirohubSearchError).toBeNull();
    expect(state.orirohubSearchLoading).toBe(false);
  });

  it("ignores stale search responses after query changes", async () => {
    const { state, request } = createState();
    const queue = createDeferredRequestQueue(request);

    const pending = searchOriroHub(state, "github");
    setOriroHubSearchQuery(state, "gitlab");
    queue.resolveNext({
      results: [{ score: 1, slug: "github", displayName: "GitHub" }],
    });
    await pending;

    expect(state.orirohubSearchQuery).toBe("gitlab");
    expect(state.orirohubSearchResults).toBeNull();
    expect(state.orirohubSearchError).toBeNull();
    expect(state.orirohubSearchLoading).toBe(false);
  });
});

describe("loadOriroHubDetail", () => {
  it("ignores stale detail responses after slug changes", async () => {
    const { state, request } = createState();
    const queue = createDeferredRequestQueue(request);

    const firstPending = loadOriroHubDetail(state, "github");
    const secondPending = loadOriroHubDetail(state, "gitlab");

    queue.resolveNext({
      skill: { slug: "github", displayName: "GitHub", createdAt: 1, updatedAt: 2 },
    });
    await firstPending;

    queue.resolveNext({
      skill: { slug: "gitlab", displayName: "GitLab", createdAt: 3, updatedAt: 4 },
    });
    await secondPending;

    expect(state.orirohubDetailLoading).toBe(false);
    expect(state.orirohubDetail?.skill?.slug).toBe("gitlab");
  });
});

describe("skill mutations", () => {
  it.each([
    {
      name: "updates skill enablement and records a success message",
      run: (state: SkillsState) => updateSkillEnabled(state, "github", true),
      expectedRequest: ["skills.update", { skillKey: "github", enabled: true }],
      expectedMessage: "Skill enabled",
    },
    {
      name: "saves API keys and reports success",
      run: async (state: SkillsState) => {
        state.skillEdits.github = "sk-test";
        await saveSkillApiKey(state, "github");
      },
      expectedRequest: ["skills.update", { skillKey: "github", apiKey: "sk-test" }],
      expectedMessage: "API key saved — stored in oriro.json (skills.entries.github)",
    },
    {
      name: "installs skills and uses server success messages",
      run: (state: SkillsState) => installSkill(state, "github", "GitHub", "install-123", true),
      expectedRequest: [
        "skills.install",
        {
          name: "GitHub",
          installId: "install-123",
          dangerouslyForceUnsafeInstall: true,
          timeoutMs: 120000,
        },
      ],
      expectedMessage: "Installed from registry",
      installMessage: "Installed from registry",
    },
  ])("$name", async ({ run, expectedRequest, expectedMessage, installMessage }) => {
    const { state, request } = createState();
    mockSkillMutationRequests(request, installMessage);

    await run(state);

    const [method, params] = expectedRequest;
    expect(request).toHaveBeenCalledWith(method, params);
    expect(state.skillMessages.github).toEqual({ kind: "success", message: expectedMessage });
    expect(state.skillsBusyKey).toBeNull();
    expect(state.skillsError).toBeNull();
  });

  it("records errors from failed mutations", async () => {
    const { state, request } = createState();
    request.mockRejectedValue(new Error("skills update failed"));

    await updateSkillEnabled(state, "github", false);

    expect(state.skillsError).toBe("skills update failed");
    expect(state.skillMessages.github).toEqual({
      kind: "error",
      message: "skills update failed",
    });
    expect(state.skillsBusyKey).toBeNull();
  });

  it("refreshes the current agent after a stale global config mutation succeeds", async () => {
    const { state, request } = createState();
    const pendingRequests: Array<{
      method: string;
      payload: unknown;
      resolve: (value: unknown) => void;
    }> = [];
    request.mockImplementation(
      (method, payload) =>
        new Promise((resolve) => {
          pendingRequests.push({ method, payload, resolve });
        }),
    );
    state.skillsAgentId = "alpha";

    const mutation = updateSkillEnabled(state, "github", true);
    await Promise.resolve();
    setSkillsAgentId(state, "beta");
    const betaLoad = loadSkills(state);
    await Promise.resolve();
    pendingRequests[1].resolve({
      workspaceDir: "/tmp/beta-before-update",
      managedSkillsDir: "/tmp/skills",
      skills: [],
    });
    await betaLoad;

    pendingRequests[0].resolve({});
    await vi.waitFor(() => {
      expect(pendingRequests).toHaveLength(3);
    });
    pendingRequests[2].resolve({
      workspaceDir: "/tmp/beta-after-update",
      managedSkillsDir: "/tmp/skills",
      skills: [],
    });
    await mutation;

    expect(pendingRequests.map(({ method, payload }) => [method, payload])).toEqual([
      ["skills.update", { skillKey: "github", enabled: true }],
      ["skills.status", { agentId: "beta" }],
      ["skills.status", { agentId: "beta" }],
    ]);
    expect(state.skillsReport?.workspaceDir).toBe("/tmp/beta-after-update");
    expect(state.skillMessages).toEqual({});
  });

  it("routes selected agent installs through the selected workspace", async () => {
    const { state, request } = createState();
    state.skillsAgentId = "research";
    mockSkillMutationRequests(request, "Installed from registry");

    await installSkill(state, "github", "GitHub", "install-123", true);

    expect(request).toHaveBeenCalledWith("skills.install", {
      agentId: "research",
      name: "GitHub",
      installId: "install-123",
      dangerouslyForceUnsafeInstall: true,
      timeoutMs: 120000,
    });
  });

  it("routes selected agent OriroHub installs through the selected workspace", async () => {
    const { state, request } = createState();
    state.skillsAgentId = "research";
    request.mockResolvedValue({});

    await installFromOriroHub(state, "github");

    expect(request).toHaveBeenCalledWith("skills.install", {
      agentId: "research",
      source: "orirohub",
      slug: "github",
    });
    expect(state.orirohubInstallMessage).toEqual({
      kind: "success",
      text: "Installed github",
    });
  });

  it.each([
    {
      name: "legacy install",
      run: (state: SkillsState) => installSkill(state, "github", "GitHub", "install-123"),
      expectedRequest: {
        agentId: "alpha",
        name: "GitHub",
        installId: "install-123",
        dangerouslyForceUnsafeInstall: false,
        timeoutMs: 120000,
      },
    },
    {
      name: "OriroHub install",
      run: (state: SkillsState) => installFromOriroHub(state, "github"),
      expectedRequest: {
        agentId: "alpha",
        source: "orirohub",
        slug: "github",
      },
    },
  ])("ignores $name completion after switching agents", async ({ run, expectedRequest }) => {
    const { state, request } = createState();
    const queue = createDeferredRequestQueue(request);
    state.skillsAgentId = "alpha";

    const pending = run(state);
    await Promise.resolve();
    setSkillsAgentId(state, "beta");
    queue.resolveNext({ message: "Installed" });
    await pending;

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("skills.install", expectedRequest);
    expect(state.skillsAgentId).toBe("beta");
    expect(state.skillsReport).toBeNull();
    expect(state.skillMessages).toEqual({});
    expect(state.orirohubInstallMessage).toBeNull();
    expect(state.skillsBusyKey).toBeNull();
    expect(state.orirohubInstallSlug).toBeNull();
  });
});

describe("reconcileSkillsAgentId", () => {
  it("resets a deleted selected agent to the current default scope", () => {
    const { state } = createState();
    state.skillsAgentId = "deleted";
    state.skillsReport = {
      workspaceDir: "/tmp/deleted",
      managedSkillsDir: "/tmp/skills",
      skills: [],
    };
    state.orirohubInstallSlug = "calendar";

    reconcileSkillsAgentId(state, {
      defaultId: "main",
      mainKey: "main",
      scope: "project",
      agents: [{ id: "main" }],
    });

    expect(state.skillsAgentId).toBeNull();
    expect(state.skillsAgentRevision).toBe(1);
    expect(state.skillsReport).toBeNull();
    expect(state.orirohubInstallSlug).toBeNull();
  });
});
