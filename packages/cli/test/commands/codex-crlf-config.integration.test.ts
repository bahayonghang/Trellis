import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("figlet", () => ({ default: { textSync: vi.fn(() => "TRELLIS") } }));
vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));
vi.mock("node:child_process", () => ({
  execSync: vi.fn((command: string) =>
    command ===
    `${process.platform === "win32" ? "python" : "python3"} --version`
      ? "Python 3.9.25"
      : "",
  ),
}));

import { init } from "../../src/commands/init.js";
import { update } from "../../src/commands/update.js";
import { extractCodexAgentModelKeys } from "../../src/configurators/codex.js";
import { VERSION } from "../../src/constants/version.js";

describe("update with on-disk LF/CRLF Codex and OMP configuration", () => {
  let repo: string;

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-crlf-config-"));
    vi.spyOn(process, "cwd").mockReturnValue(repo);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: VERSION }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(repo, { recursive: true, force: true });
  });

  for (const newline of ["\n", "\r\n"]) {
    it(`preserves model/effort with ${JSON.stringify(newline)} disk input and emits canonical OMP bytes`, async () => {
      await init({ yes: true, user: "crlf-test", codex: true, omp: true });
      const agentPath = path.join(repo, ".codex/agents/trellis-implement.toml");
      const ompPath = path.join(repo, ".omp/commands/trellis-continue.md");
      const expectedOmp = fs.readFileSync(ompPath);
      const agent = fs
        .readFileSync(agentPath, "utf-8")
        .replace(
          /^(sandbox_mode = "[^"]+")$/m,
          '$1\nmodel = "crlf-model-sentinel"\nmodel_reasoning_effort = "high"',
        )
        .replace(/\r?\n/g, newline);
      fs.writeFileSync(agentPath, agent);
      fs.writeFileSync(
        ompPath,
        expectedOmp.toString("utf-8").replace(/\r?\n/g, newline),
      );

      await update({ force: true });

      expect(
        extractCodexAgentModelKeys(fs.readFileSync(agentPath, "utf-8")),
      ).toEqual({
        model: "crlf-model-sentinel",
        model_reasoning_effort: "high",
      });
      // Update uses bundled canonical bytes. This assertion deliberately does
      // not claim that a CRLF-only disk edit retains its original line endings.
      expect(fs.readFileSync(ompPath)).toEqual(expectedOmp);
      const body = expectedOmp
        .toString("utf-8")
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, "");
      expect(body).not.toMatch(/^# /);
    });
  }
});
