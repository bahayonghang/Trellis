import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("figlet", () => ({ default: { textSync: vi.fn(() => "TRELLIS") } }));
vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execSync: vi.fn(
      (command: string, options?: Parameters<typeof actual.execSync>[1]) =>
        command.startsWith("git ls-files")
          ? actual.execSync(command, options)
          : command ===
              `${process.platform === "win32" ? "python" : "python3"} --version`
            ? "Python 3.9.25"
            : "",
    ),
  };
});

import { init } from "../../src/commands/init.js";
import { update } from "../../src/commands/update.js";
import { VERSION } from "../../src/constants/version.js";

describe("hooks.local.json ignore integration (#648)", () => {
  let repo: string;
  const ignorePath = () => path.join(repo, ".trellis/.gitignore");

  function git(...args: string[]): string {
    return execFileSync("git", args, { cwd: repo, encoding: "utf-8" }).trim();
  }

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-hooks-ignore-"));
    git("init", "-q");
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("ignores local hooks on init and keeps a second force init byte-identical", async () => {
    await init({ yes: true, force: true, user: "test", codex: true });
    expect(git("check-ignore", ".trellis/hooks.local.json")).toBe(
      ".trellis/hooks.local.json",
    );
    const before = fs.readFileSync(ignorePath());
    await init({ yes: true, force: true, user: "test", codex: true });
    expect(fs.readFileSync(ignorePath())).toEqual(before);
  });

  for (const operation of ["init", "update"] as const) {
    it(`preserves BOM, CRLF and custom bytes during ${operation}, then is idempotent`, async () => {
      await init({ yes: true, force: true, user: "test", codex: true });
      const custom =
        "\uFEFF# python3 user comment\r\nprivate/\r\n!private/keep.txt\r\n";
      fs.writeFileSync(ignorePath(), custom);
      const run = () =>
        operation === "init"
          ? init({ yes: true, force: true, user: "test", codex: true })
          : update({ skipAll: true });

      await run();
      const expected = "\uFEFFhooks.local.json\r\n" + custom.slice(1);
      expect(fs.readFileSync(ignorePath(), "utf-8")).toBe(expected);
      expect(git("check-ignore", ".trellis/hooks.local.json")).toBe(
        ".trellis/hooks.local.json",
      );
      await run();
      expect(fs.readFileSync(ignorePath(), "utf-8")).toBe(expected);
      const hashes = JSON.parse(
        fs.readFileSync(
          path.join(repo, ".trellis/.template-hashes.json"),
          "utf-8",
        ),
      );
      expect(hashes.hashes[".trellis/.gitignore"]).toBeUndefined();
    });
  }

  it("preserves later user negation precedence and anchored equivalents", async () => {
    await init({ yes: true, force: true, user: "test", codex: true });
    fs.writeFileSync(ignorePath(), "# explicit opt-out\n!hooks.local.json\n");
    await update({ force: true });
    expect(fs.readFileSync(ignorePath(), "utf-8")).toBe(
      "hooks.local.json\n# explicit opt-out\n!hooks.local.json\n",
    );
    expect(
      git("check-ignore", "--non-matching", "-v", ".trellis/hooks.local.json"),
    ).toContain("!hooks.local.json");
    const anchored = "\uFEFF# owned rule\r\n/hooks.local.json\r\n";
    fs.writeFileSync(ignorePath(), anchored);
    await update({ force: true });
    expect(fs.readFileSync(ignorePath(), "utf-8")).toBe(anchored);
  });

  it("warns about tracked local hooks even on no-op and leaves index bytes unchanged", async () => {
    await init({ yes: true, force: true, user: "test", codex: true });
    fs.writeFileSync(path.join(repo, ".trellis/hooks.local.json"), "{}\n");
    git("add", "-f", "--", ".trellis/hooks.local.json");
    const indexPath = path.join(repo, ".git/index");
    const before = fs.readFileSync(indexPath);
    await update({ skipAll: true });
    expect(vi.mocked(console.warn).mock.calls.flat().join("\n")).toContain(
      "git rm --cached -- .trellis/hooks.local.json",
    );
    expect(fs.readFileSync(indexPath)).toEqual(before);
  });

  it("honors update.skip before reading ignore bytes and dry-run before writing", async () => {
    await init({ yes: true, force: true, user: "test", codex: true });
    const custom = "# python3 preserved\r\nprivate/\r\n";
    fs.writeFileSync(ignorePath(), custom);
    const config = path.join(repo, ".trellis/config.yaml");
    fs.appendFileSync(
      config,
      "\nupdate:\n  skip:\n    - .trellis/.gitignore\n",
    );
    const originalRead = fs.readFileSync.bind(fs);
    const read = vi.spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...args: unknown[]
    ) => {
      if (String(file) === ignorePath())
        throw new Error("skip must precede read");
      return originalRead(file, ...(args as [BufferEncoding]));
    }) as typeof fs.readFileSync);
    await update({ dryRun: true });
    read.mockRestore();
    expect(fs.readFileSync(ignorePath(), "utf-8")).toBe(custom);
    fs.writeFileSync(
      config,
      fs.readFileSync(config, "utf-8").replace(/\nupdate:\n[\s\S]*$/, "\n"),
    );
    const snapshot = (): Map<string, Buffer> => {
      const files = new Map<string, Buffer>();
      const walk = (directory: string): void => {
        for (const entry of fs.readdirSync(directory, {
          withFileTypes: true,
        })) {
          const full = path.join(directory, entry.name);
          if (entry.isDirectory()) walk(full);
          else files.set(path.relative(repo, full), fs.readFileSync(full));
        }
      };
      walk(repo);
      return files;
    };
    const before = snapshot();
    await update({ dryRun: true });
    expect(snapshot()).toEqual(before);
  });

  for (const operation of ["init", "update"] as const) {
    it(`keeps an external ignore junction opaque during ${operation}`, async () => {
      await init({ yes: true, force: true, user: "test", codex: true });
      const external = fs.mkdtempSync(
        path.join(os.tmpdir(), "trellis-ignore-external-"),
      );
      try {
        fs.writeFileSync(path.join(external, "sentinel"), "external bytes\n");
        fs.unlinkSync(ignorePath());
        fs.symlinkSync(
          external,
          ignorePath(),
          process.platform === "win32" ? "junction" : "dir",
        );
        if (operation === "init") {
          await init({ yes: true, force: true, user: "test", codex: true });
        } else {
          await update({ force: true });
        }
        expect(fs.lstatSync(ignorePath()).isSymbolicLink()).toBe(true);
        expect(fs.readdirSync(external)).toEqual(["sentinel"]);
        expect(fs.readFileSync(path.join(external, "sentinel"), "utf-8")).toBe(
          "external bytes\n",
        );
        expect(vi.mocked(console.warn).mock.calls.flat().join("\n")).toContain(
          "symlink or nonregular file",
        );
      } finally {
        fs.rmSync(external, { recursive: true, force: true });
      }
    });
  }
});
