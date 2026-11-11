import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
vi.mock("figlet", () => ({ default: { textSync: vi.fn(() => "TRELLIS") } }));
vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));
vi.mock("node:child_process", () => ({
  execSync: vi.fn((cmd: string) =>
    cmd === `${process.platform === "win32" ? "python" : "python3"} --version`
      ? "Python 3.9.25"
      : "",
  ),
}));
import { init } from "../../src/commands/init.js";
import { update } from "../../src/commands/update.js";
import { VERSION } from "../../src/constants/version.js";
import { computeHash } from "../../src/utils/template-hash.js";
import { collectPlatformTemplates } from "../../src/configurators/index.js";

const LEGACY =
  JSON.stringify(
    {
      userSetting: "preserved",
      hooks: {
        UserPromptSubmit: [
          {
            matcher: "keep",
            hooks: [
              {
                type: "command",
                command:
                  "python3 -X utf8 .codex/hooks/inject-workflow-state.py",
                timeout: 23,
              },
              { type: "command", command: "echo user", timeout: 7 },
            ],
          },
        ],
        SubagentStart: [],
        UserEvent: [{ leave: true }],
      },
    },
    null,
    4,
  ) + "\r\n";
let repo: string;
const hookPath = () => path.join(repo, ".codex/hooks.json");
const receiptPath = () => path.join(repo, ".trellis/.template-hashes.json");

function snapshot(): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else files.set(path.relative(repo, target), fs.readFileSync(target));
    }
  };
  walk(repo);
  return files;
}

describe("Codex hook upgrade init/update safety", () => {
  beforeEach(async () => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-codex-upgrade-"));
    vi.spyOn(process, "cwd").mockReturnValue(repo);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: VERSION }),
      }),
    );
    await init({ yes: true, user: "test", codex: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("previews without bytes, safely merges under skip-all, backs up and then no-ops", async () => {
    fs.writeFileSync(hookPath(), LEGACY);
    const before = snapshot();
    await update({ dryRun: true });
    expect(snapshot()).toEqual(before);
    await update({ skipAll: true });
    const migrated = fs.readFileSync(hookPath(), "utf-8");
    const parsed = JSON.parse(migrated);
    expect(parsed.userSetting).toBe("preserved");
    expect(parsed.hooks.UserPromptSubmit[0].matcher).toBe("keep");
    expect(parsed.hooks.UserPromptSubmit[0].hooks[0].timeout).toBe(23);
    expect(parsed.hooks.UserPromptSubmit[0].hooks[0].command).toContain(" -c ");
    expect(parsed.hooks.UserPromptSubmit[0].hooks[1]).toEqual({
      type: "command",
      command: "echo user",
      timeout: 7,
    });
    expect(parsed.hooks.SubagentStart).toEqual([]);
    expect(parsed.hooks.UserEvent).toEqual([{ leave: true }]);
    const hashes = JSON.parse(fs.readFileSync(receiptPath(), "utf-8"));
    expect(hashes.hashes[".codex/hooks.json"]).toBe(computeHash(migrated));
    const backups = fs
      .readdirSync(path.join(repo, ".trellis"))
      .filter((name) => name.startsWith(".backup-"));
    expect(backups).toHaveLength(1);
    expect(
      fs.readFileSync(
        path.join(repo, ".trellis", backups[0], ".codex/hooks.json"),
        "utf-8",
      ),
    ).toBe(LEGACY);
    const after = snapshot();
    await update({ force: true });
    expect(snapshot()).toEqual(after);
  });

  it("keeps deleted files and custom commands out of hash repairs", async () => {
    const hashes = fs.readFileSync(receiptPath());
    const custom = LEGACY.replace(
      "python3 -X utf8 .codex/hooks/inject-workflow-state.py",
      "custom-wrapper .codex/hooks/inject-workflow-state.py",
    );
    fs.writeFileSync(hookPath(), custom);
    await update({ force: true });
    expect(fs.readFileSync(hookPath(), "utf-8")).toBe(custom);
    expect(fs.readFileSync(receiptPath())).toEqual(hashes);
    fs.unlinkSync(hookPath());
    await update({ force: true });
    expect(fs.existsSync(hookPath())).toBe(false);
    expect(fs.readFileSync(receiptPath())).toEqual(hashes);
  });

  it("keeps a custom configuration on force reinit", async () => {
    const custom = '{"user":"custom","hooks":{"UserPromptSubmit":[]}}\n';
    fs.writeFileSync(hookPath(), custom);
    const before = JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
      ".codex/hooks.json"
    ];
    await init({ yes: true, force: true, user: "test", codex: true });
    expect(fs.readFileSync(hookPath(), "utf-8")).toBe(custom);
    expect(
      JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
        ".codex/hooks.json"
      ],
    ).toBe(before);
  });

  it("does not create ownership for an untracked custom config or preserve unselected Codex", async () => {
    const untracked = '{"hooks":{"UserPromptSubmit":[]},"user":"untracked"}\n';
    const receipt = JSON.parse(fs.readFileSync(receiptPath(), "utf-8"));
    delete receipt.hashes[".codex/hooks.json"];
    fs.writeFileSync(receiptPath(), JSON.stringify(receipt));
    fs.writeFileSync(hookPath(), untracked);
    await init({ yes: true, force: true, user: "test", codex: true });
    expect(fs.readFileSync(hookPath(), "utf-8")).toBe(untracked);
    expect(
      JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
        ".codex/hooks.json"
      ],
    ).toBeUndefined();
    const next = JSON.parse(fs.readFileSync(receiptPath(), "utf-8"));
    next.hashes[".codex/hooks.json"] = "old-unselected-claim";
    fs.writeFileSync(receiptPath(), JSON.stringify(next));
    await init({ yes: true, force: true, user: "test", claude: true });
    expect(
      JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
        ".codex/hooks.json"
      ],
    ).toBeUndefined();
  });

  for (const skipExisting of [false, true]) {
    it(`keeps user python3 literals and CRLF bytes on ${skipExisting ? "skip" : "force"} reinit`, async () => {
      // Resolve the Windows-style command on every OS to exercise the second
      // render boundary without depending on the machine running this test.
      vi.mocked(execSync).mockImplementation((cmd) =>
        cmd === "python --version" ? "Python 3.9.25" : "",
      );
      const raw = LEGACY.replace(
        '"userSetting": "preserved"',
        '"userSetting": "python3 must stay"',
      )
        .replace(
          '"command": "echo user"',
          '"command": "python3 custom-user-hook.py"',
        )
        .replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(hookPath(), raw);
      const previous = JSON.parse(fs.readFileSync(receiptPath(), "utf-8"))
        .hashes[".codex/hooks.json"];

      await init({
        yes: true,
        user: "test",
        codex: true,
        force: !skipExisting,
        skipExisting,
      });

      const desired = JSON.parse(
        collectPlatformTemplates("codex")?.get(".codex/hooks.json") ?? "",
      );
      const expected = skipExisting
        ? raw
        : raw.replace(
            JSON.stringify(
              "python3 -X utf8 .codex/hooks/inject-workflow-state.py",
            ),
            JSON.stringify(desired.hooks.UserPromptSubmit[0].hooks[0].command),
          );
      expect(fs.readFileSync(hookPath(), "utf-8")).toBe(expected);
      expect(
        JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
          ".codex/hooks.json"
        ],
      ).toBe(skipExisting ? previous : computeHash(expected));
    });
  }

  it("records newly migrated commands on force reinit instead of restoring the old hash", async () => {
    const previous = JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
      ".codex/hooks.json"
    ];
    fs.writeFileSync(hookPath(), LEGACY);
    await init({ yes: true, force: true, user: "test", codex: true });
    const content = fs.readFileSync(hookPath(), "utf-8");
    expect(content).toContain(" -c ");
    expect(
      JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
        ".codex/hooks.json"
      ],
    ).toBe(computeHash(content));
    expect(computeHash(content)).not.toBe(previous);
  });

  it("honors update.skip before reading the hook configuration", async () => {
    fs.writeFileSync(hookPath(), LEGACY);
    fs.appendFileSync(
      path.join(repo, ".trellis/config.yaml"),
      "\nupdate:\n  skip:\n    - .codex/hooks.json\n",
    );
    const originalRead = fs.readFileSync.bind(fs);
    const read = vi.spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...args: unknown[]
    ) => {
      if (String(file) === hookPath())
        throw new Error("hook skip must precede read");
      return originalRead(file, ...(args as [BufferEncoding]));
    }) as typeof fs.readFileSync);
    await update({ dryRun: true });
    read.mockRestore();
    await update({ force: true });
    expect(fs.readFileSync(hookPath(), "utf-8")).toBe(LEGACY);
  });

  for (const [name, raw] of [
    ["malformed", "{broken JSON"],
    [
      "commandWindows",
      LEGACY.replace(
        '"timeout": 23',
        '"timeout": 23, "commandWindows": "custom windows"',
      ),
    ],
    [
      "command_windows",
      LEGACY.replace(
        '"timeout": 23',
        '"timeout": 23, "command_windows": "custom windows"',
      ),
    ],
  ]) {
    it(`protects ${name} configuration and receipt in dry-run/force/create-new`, async () => {
      fs.writeFileSync(hookPath(), raw);
      const receipt = fs.readFileSync(receiptPath());
      const before = snapshot();
      await update({ dryRun: true, force: true });
      expect(snapshot()).toEqual(before);
      await update({ force: true });
      expect(fs.readFileSync(hookPath(), "utf-8")).toBe(raw);
      expect(fs.readFileSync(receiptPath())).toEqual(receipt);
      expect(vi.mocked(console.warn).mock.calls.flat().join("\n")).toContain(
        "manual review required",
      );
      await update({ createNew: true });
      expect(fs.readFileSync(hookPath(), "utf-8")).toBe(raw);
      expect(fs.readFileSync(receiptPath())).toEqual(receipt);
      expect(fs.readFileSync(hookPath() + ".new", "utf-8")).toContain(" -c ");
      const previousHash = JSON.parse(receipt.toString("utf-8")).hashes[
        ".codex/hooks.json"
      ];
      await init({ yes: true, force: true, user: "test", codex: true });
      expect(fs.readFileSync(hookPath(), "utf-8")).toBe(raw);
      expect(
        JSON.parse(fs.readFileSync(receiptPath(), "utf-8")).hashes[
          ".codex/hooks.json"
        ],
      ).toBe(previousHash);
    });
  }
});
