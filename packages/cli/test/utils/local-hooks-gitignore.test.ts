import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  addLocalHooksIgnoreRule,
  planLocalHooksGitignore,
} from "../../src/utils/local-hooks-gitignore.js";

describe("local hooks gitignore planning", () => {
  let base: string;
  let repo: string;
  let workflow: string;

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ignore-plan-"));
    repo = path.join(base, "repo");
    workflow = path.join(repo, ".trellis");
    fs.mkdirSync(workflow, { recursive: true });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it.each([
    ["", "hooks.local.json\n"],
    ["# no terminal newline", "hooks.local.json\n# no terminal newline"],
    ["\uFEFF# CRLF\r\n", "\uFEFFhooks.local.json\r\n# CRLF\r\n"],
    [
      "/hooks.local.json\n!hooks.local.json\n",
      "/hooks.local.json\n!hooks.local.json\n",
    ],
  ])("preserves rule bytes for %j", (existing, expected) => {
    expect(addLocalHooksIgnoreRule(existing)).toBe(expected);
  });

  for (const dangling of [false, true]) {
    it(`does not follow a ${dangling ? "dangling" : "live"} workflow directory link`, () => {
      const external = path.join(base, "external");
      if (!dangling) {
        fs.mkdirSync(external);
        fs.writeFileSync(
          path.join(external, ".gitignore"),
          "# external ignore\n",
        );
      }
      fs.rmSync(workflow, { recursive: true });
      fs.symlinkSync(
        external,
        workflow,
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(planLocalHooksGitignore(repo)).toBeNull();
      expect(vi.mocked(console.warn)).toHaveBeenCalledWith(
        expect.stringContaining(".trellis is a symlink"),
      );
      if (!dangling)
        expect(
          fs.readFileSync(path.join(external, ".gitignore"), "utf-8"),
        ).toBe("# external ignore\n");
      else expect(fs.existsSync(external)).toBe(false);
    });
  }

  it("does not follow a directory junction at the ignore leaf", () => {
    const external = path.join(base, "external");
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(external, "sentinel"), "outside repo\n");
    fs.symlinkSync(
      external,
      path.join(workflow, ".gitignore"),
      process.platform === "win32" ? "junction" : "dir",
    );
    expect(planLocalHooksGitignore(repo)).toBeNull();
    expect(fs.readdirSync(external)).toEqual(["sentinel"]);
    expect(fs.readFileSync(path.join(external, "sentinel"), "utf-8")).toBe(
      "outside repo\n",
    );
  });

  it("guards a file symlink at lstat before any target read", () => {
    // Controlled lstat boundary also runs where Windows file-link privileges
    // are unavailable. Directory-link cases above use real junctions.
    const target = path.join(workflow, ".gitignore");
    const lstat = fs.lstatSync.bind(fs);
    vi.spyOn(fs, "lstatSync").mockImplementation(((
      file: fs.PathLike,
      ...args: unknown[]
    ) =>
      String(file) === target
        ? { isSymbolicLink: () => true }
        : lstat(file, ...(args as []))) as typeof fs.lstatSync);
    const read = vi.spyOn(fs, "readFileSync");
    expect(planLocalHooksGitignore(repo)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it("preserves a nonregular ignore path", () => {
    const target = path.join(workflow, ".gitignore");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "sentinel"), "keep\n");
    expect(planLocalHooksGitignore(repo)).toBeNull();
    expect(fs.readFileSync(path.join(target, "sentinel"), "utf-8")).toBe(
      "keep\n",
    );
  });
});
