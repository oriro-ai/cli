// Skill search/detail tests cover OriroHub search and detail gateway responses,
// including validation and external error mapping.
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchSkillsFromOriroHubMock = vi.fn();
const fetchOriroHubSkillDetailMock = vi.fn();

vi.mock("../../config/config.js", () => ({
  getRuntimeConfig: vi.fn(() => ({})),
  writeConfigFile: vi.fn(),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: vi.fn(() => ["main"]),
  resolveDefaultAgentId: vi.fn(() => "main"),
  resolveAgentWorkspaceDir: vi.fn(() => "/tmp/workspace"),
}));

vi.mock("../../skills/lifecycle/orirohub.js", () => ({
  installSkillFromOriroHub: vi.fn(),
  updateSkillsFromOriroHub: vi.fn(),
  searchSkillsFromOriroHub: (...args: unknown[]) => searchSkillsFromOriroHubMock(...args),
}));

vi.mock("../../infra/orirohub.js", () => ({
  fetchOriroHubSkillDetail: (...args: unknown[]) => fetchOriroHubSkillDetailMock(...args),
  resolveOriroHubBaseUrl: vi.fn(() => "https://orirohub.ai"),
  searchOriroHubSkills: vi.fn(),
  downloadOriroHubSkillArchive: vi.fn(),
}));

vi.mock("../../skills/lifecycle/install.js", () => ({
  installSkill: vi.fn(),
}));

const { skillsHandlers } = await import("./skills.js");

function callHandler(method: string, params: Record<string, unknown>) {
  let ok: boolean | null = null;
  let response: unknown;
  let error: unknown;
  const result = skillsHandlers[method]({
    params,
    req: {} as never,
    client: null as never,
    isWebchatConnect: () => false,
    context: {} as never,
    respond: (success: boolean, res: unknown, err: unknown) => {
      ok = success;
      response = res;
      error = err;
    },
  });
  return Promise.resolve(result).then(() => ({ ok, response, error }));
}

function expectErrorField(error: unknown, field: "code" | "message", expected: string) {
  expect((error as Record<string, unknown> | undefined)?.[field]).toBe(expected);
}

describe("skills.search handler", () => {
  beforeEach(() => {
    searchSkillsFromOriroHubMock.mockReset();
    fetchOriroHubSkillDetailMock.mockReset();
  });

  it("searches OriroHub with query and limit", async () => {
    searchSkillsFromOriroHubMock.mockResolvedValue([
      {
        score: 0.95,
        slug: "github",
        displayName: "GitHub",
        summary: "GitHub integration",
        version: "1.0.0",
        updatedAt: 1700000000,
      },
    ]);

    const { ok, response, error } = await callHandler("skills.search", {
      query: "github",
      limit: 10,
    });

    expect(searchSkillsFromOriroHubMock).toHaveBeenCalledWith({
      query: "github",
      limit: 10,
    });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toEqual({
      results: [
        {
          score: 0.95,
          slug: "github",
          displayName: "GitHub",
          summary: "GitHub integration",
          version: "1.0.0",
          updatedAt: 1700000000,
        },
      ],
    });
  });

  it("searches without query (browse all)", async () => {
    searchSkillsFromOriroHubMock.mockResolvedValue([]);

    const { ok, response } = await callHandler("skills.search", {});

    expect(searchSkillsFromOriroHubMock).toHaveBeenCalledWith({
      query: undefined,
      limit: undefined,
    });
    expect(ok).toBe(true);
    expect(response).toEqual({ results: [] });
  });

  it("returns error when OriroHub is unreachable", async () => {
    searchSkillsFromOriroHubMock.mockRejectedValue(new Error("connection refused"));

    const { ok, error } = await callHandler("skills.search", { query: "test" });

    expect(ok).toBe(false);
    expectErrorField(error, "message", "connection refused");
  });

  it("rejects limit below minimum", async () => {
    const { ok, error } = await callHandler("skills.search", {
      query: "test",
      limit: 0,
    });

    expect(ok).toBe(false);
    expectErrorField(error, "code", "INVALID_REQUEST");
    expect(searchSkillsFromOriroHubMock).not.toHaveBeenCalled();
  });

  it("rejects limit above maximum", async () => {
    const { ok, error } = await callHandler("skills.search", {
      query: "test",
      limit: 101,
    });

    expect(ok).toBe(false);
    expectErrorField(error, "code", "INVALID_REQUEST");
    expect(searchSkillsFromOriroHubMock).not.toHaveBeenCalled();
  });
});

describe("skills.detail handler", () => {
  beforeEach(() => {
    searchSkillsFromOriroHubMock.mockReset();
    fetchOriroHubSkillDetailMock.mockReset();
  });

  it("fetches detail for a valid slug", async () => {
    const detail = {
      skill: {
        slug: "github",
        displayName: "GitHub",
        summary: "GitHub integration",
        createdAt: 1700000000,
        updatedAt: 1700000000,
      },
      latestVersion: {
        version: "1.0.0",
        createdAt: 1700000000,
      },
      owner: {
        handle: "oriro",
        displayName: "Oriro",
      },
    };
    fetchOriroHubSkillDetailMock.mockResolvedValue(detail);

    const { ok, response, error } = await callHandler("skills.detail", {
      slug: "github",
    });

    expect(fetchOriroHubSkillDetailMock).toHaveBeenCalledWith({ slug: "github" });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toEqual(detail);
  });

  it("returns error when slug is not found", async () => {
    fetchOriroHubSkillDetailMock.mockRejectedValue(new Error("not found"));

    const { ok, error } = await callHandler("skills.detail", { slug: "nonexistent" });

    expect(ok).toBe(false);
    expectErrorField(error, "message", "not found");
  });

  it("rejects missing slug", async () => {
    const { ok, error } = await callHandler("skills.detail", {});

    expect(ok).toBe(false);
    expectErrorField(error, "code", "INVALID_REQUEST");
    expect(fetchOriroHubSkillDetailMock).not.toHaveBeenCalled();
  });

  it("rejects empty slug", async () => {
    const { ok, error } = await callHandler("skills.detail", { slug: "" });

    expect(ok).toBe(false);
    expectErrorField(error, "code", "INVALID_REQUEST");
    expect(fetchOriroHubSkillDetailMock).not.toHaveBeenCalled();
  });
});
