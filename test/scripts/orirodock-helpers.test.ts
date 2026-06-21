// Orirodock Helpers tests cover orirodock helpers script behavior.
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function writeExecutable(file: string, content: string) {
  await writeFile(file, content, { mode: 0o755 });
}

describe("scripts/orirodock/orirodock-helpers.sh", () => {
  it("loads the standard docker-compose.override.yml before OriroDock extra overrides", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "oriro-orirodock-"));
    try {
      const projectDir = path.join(tempDir, "project");
      const binDir = path.join(tempDir, "bin");
      const argsFile = path.join(tempDir, "docker-args.txt");
      await mkdir(projectDir);
      await mkdir(binDir);
      await writeFile(path.join(projectDir, "docker-compose.yml"), "services: {}\n");
      await writeFile(path.join(projectDir, "docker-compose.override.yml"), "services: {}\n");
      await writeFile(path.join(projectDir, "docker-compose.extra.yml"), "services: {}\n");
      await writeExecutable(
        path.join(binDir, "docker"),
        `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$ORIRODOCK_DOCKER_ARGS_FILE"
`,
      );

      await execFileAsync(
        "bash",
        ["-c", "source scripts/orirodock/orirodock-helpers.sh; _orirodock_compose config"],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            ORIRODOCK_DIR: projectDir,
            ORIRODOCK_DOCKER_ARGS_FILE: argsFile,
            HOME: path.join(tempDir, "home"),
            PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
          },
        },
      );

      await expect(readFile(argsFile, "utf8")).resolves.toBe(
        [
          "compose",
          "-f",
          path.join(projectDir, "docker-compose.yml"),
          "-f",
          path.join(projectDir, "docker-compose.override.yml"),
          "-f",
          path.join(projectDir, "docker-compose.extra.yml"),
          "config",
          "",
        ].join("\n"),
      );
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("opens dashboard URLs through the published gateway port without starting dependencies", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "oriro-orirodock-"));
    try {
      const projectDir = path.join(tempDir, "project");
      const binDir = path.join(tempDir, "bin");
      const argsFile = path.join(tempDir, "docker-args.txt");
      const openedUrlFile = path.join(tempDir, "opened-url.txt");
      await mkdir(projectDir);
      await mkdir(binDir);
      await writeFile(path.join(projectDir, "docker-compose.yml"), "services: {}\n");
      await writeExecutable(
        path.join(binDir, "docker"),
        `#!/usr/bin/env bash
printf '%s\\n' "$@" >> "$ORIRODOCK_DOCKER_ARGS_FILE"
printf '%s\\n' '---' >> "$ORIRODOCK_DOCKER_ARGS_FILE"
if [[ "$*" == *" port oriro-gateway 18789" ]]; then
  printf '%s\\n' '0.0.0.0:19001'
else
  printf '%s\\n' 'Dashboard: http://127.0.0.1:18789/?token=test-token'
fi
`,
      );
      await writeExecutable(
        path.join(binDir, "open"),
        `#!/usr/bin/env bash
printf '%s\\n' "$1" > "$ORIRODOCK_OPENED_URL_FILE"
`,
      );

      await execFileAsync(
        "bash",
        ["-c", "source scripts/orirodock/orirodock-helpers.sh; orirodock-dashboard"],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            ORIRODOCK_DIR: projectDir,
            ORIRODOCK_DOCKER_ARGS_FILE: argsFile,
            ORIRODOCK_OPENED_URL_FILE: openedUrlFile,
            HOME: path.join(tempDir, "home"),
            PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
          },
        },
      );

      await expect(readFile(openedUrlFile, "utf8")).resolves.toBe(
        "http://127.0.0.1:19001/?token=test-token\n",
      );
      await expect(readFile(argsFile, "utf8")).resolves.toBe(
        [
          "compose",
          "-f",
          path.join(projectDir, "docker-compose.yml"),
          "run",
          "--rm",
          "--no-deps",
          "oriro-cli",
          "dashboard",
          "--no-open",
          "---",
          "compose",
          "-f",
          path.join(projectDir, "docker-compose.yml"),
          "port",
          "oriro-gateway",
          "18789",
          "---",
          "",
        ].join("\n"),
      );
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});
