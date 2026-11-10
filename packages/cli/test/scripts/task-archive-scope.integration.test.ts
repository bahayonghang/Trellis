/**
 * Archive scope regressions using real temporary Git repositories.
 * Selectively adapted from mindfold-ai/Trellis#649 by Huanyi Xie (xiehuanyi),
 * with index/worktree preservation, child unlinking and opt-out coverage.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";
const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../src/templates/trellis/scripts",
);
const SOURCE = ".trellis/tasks/task-a";
const OTHER = ".trellis/tasks/archive/2000-01/task-b/prd.md";
const CODE = "src/index.ts";

function git(repo: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf-8" }).trimEnd();
}

function writeFile(repo: string, file: string, content: string): void {
  const fullPath = path.join(repo, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function makeTask(
  repo: string,
  relativeDir: string,
  relationships: { parent?: string; children?: string[] } = {},
): void {
  writeFile(repo, `${relativeDir}/prd.md`, "original task PRD\n");
  writeFile(
    repo,
    `${relativeDir}/task.json`,
    JSON.stringify({
      id: path.basename(relativeDir),
      title: path.basename(relativeDir),
      status: "in_progress",
      parent: null,
      children: [],
      ...relationships,
    }) + "\n",
  );
}

function initialCommit(repo: string, ...taskDirs: string[]): void {
  git(
    repo,
    "add",
    "--",
    ".gitignore",
    ".trellis/config.yaml",
    CODE,
    ...taskDirs,
  );
  git(repo, "commit", "-q", "-m", "initial fixture");
}

function archive(repo: string): string {
  return execFileSync(
    PYTHON_CMD,
    ["-B", ".trellis/scripts/task.py", "archive", "task-a"],
    { cwd: repo, encoding: "utf-8" },
  ).trim();
}

function snapshot(repo: string, file: string): object {
  return {
    headBlob: git(repo, "rev-parse", `HEAD:${file}`),
    indexEntry: git(repo, "ls-files", "--stage", "--", file),
    workingBytes: fs.readFileSync(path.join(repo, file)).toString("base64"),
    status: git(repo, "status", "--porcelain=v1", "--", file),
  };
}

function changedFiles(repo: string): string[] {
  return git(
    repo,
    "diff-tree",
    "--no-commit-id",
    "--no-renames",
    "--name-only",
    "-r",
    "HEAD",
  )
    .split("\n")
    .sort();
}

function dirtyUnrelated(repo: string, state: string): void {
  writeFile(repo, OTHER, "staged archived edit\n");
  if (state !== "unstaged") git(repo, "add", "--", OTHER);
  if (state === "partially staged") {
    writeFile(repo, OTHER, "staged archived edit\nunstaged archived edit\n");
  }
  writeFile(repo, CODE, "export const staged = true;\n");
  git(repo, "add", "--", CODE);
  writeFile(
    repo,
    CODE,
    "export const staged = true;\n// unstaged source edit\n",
  );
}

// No skipIf: a missing platform-native interpreter must fail, not hide coverage.
describe("task.py archive exact destination scope (#649)", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-archive-scope-"));
    git(tmp, "init", "-q", "-b", "main");
    git(tmp, "config", "user.email", "test@example.com");
    git(tmp, "config", "user.name", "Test");
    git(tmp, "config", "core.autocrlf", "false");
    fs.cpSync(TEMPLATE_SCRIPTS, path.join(tmp, ".trellis/scripts"), {
      recursive: true,
    });
    writeFile(
      tmp,
      ".gitignore",
      ".trellis/scripts/\n__pycache__/\n.trellis/.runtime/\n",
    );
    writeFile(tmp, ".trellis/config.yaml", "session_auto_commit: true\n");
    writeFile(tmp, CODE, "export const original = true;\n");
    makeTask(tmp, path.posix.dirname(OTHER));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it.each(["staged", "unstaged", "partially staged"])(
    "#1 preserves %s archived edits together with staged source work",
    (state) => {
      makeTask(tmp, SOURCE);
      makeTask(tmp, ".trellis/tasks/active-other");
      initialCommit(
        tmp,
        SOURCE,
        ".trellis/tasks/archive/2000-01/task-b",
        ".trellis/tasks/active-other",
      );
      dirtyUnrelated(tmp, state);
      const activePrd = ".trellis/tasks/active-other/prd.md";
      writeFile(tmp, activePrd, "unrelated active task edit\n");
      const unrelated = [OTHER, CODE, activePrd];
      const before = unrelated.map((file) => snapshot(tmp, file));
      expect(git(tmp, "status", "--porcelain=v1", "--", OTHER)).toBe(
        `${state === "staged" ? "M " : state === "unstaged" ? " M" : "MM"} ${OTHER}`,
      );
      expect(git(tmp, "status", "--porcelain=v1", "--", CODE)).toBe(
        `MM ${CODE}`,
      );

      const dest = archive(tmp);

      expect(dest).toMatch(/^\.trellis\/tasks\/archive\/\d{4}-\d{2}\/task-a$/);
      expect(changedFiles(tmp)).toEqual(
        [
          `${SOURCE}/prd.md`,
          `${SOURCE}/task.json`,
          `${dest}/prd.md`,
          `${dest}/task.json`,
        ].sort(),
      );
      expect(unrelated.map((file) => snapshot(tmp, file))).toEqual(before);
      expect(
        git(tmp, "ls-tree", "-r", "--name-only", "HEAD", "--", SOURCE),
      ).toBe("");
      const archived = JSON.parse(
        git(tmp, "show", `HEAD:${dest}/task.json`),
      ) as { status: string };
      expect(archived.status).toBe("completed");
    },
  );

  it("#2 commits a never-tracked task without a source pathspec (#629)", () => {
    initialCommit(tmp, ".trellis/tasks/archive/2000-01/task-b");
    makeTask(tmp, SOURCE);
    dirtyUnrelated(tmp, "partially staged");
    const before = [OTHER, CODE].map((file) => snapshot(tmp, file));
    expect(git(tmp, "ls-files", "--", SOURCE)).toBe("");

    const dest = archive(tmp);

    expect(git(tmp, "log", "-1", "--pretty=%s")).toBe(
      "chore(task): archive task-a",
    );
    expect(changedFiles(tmp)).toEqual(
      [`${dest}/prd.md`, `${dest}/task.json`].sort(),
    );
    expect([OTHER, CODE].map((file) => snapshot(tmp, file))).toEqual(before);
    expect(fs.existsSync(path.join(tmp, SOURCE))).toBe(false);
    expect(git(tmp, "status", "--porcelain=v1", "--", dest)).toBe("");
  });

  it("#3 leaves HEAD and the entire index unchanged when auto-commit is disabled", () => {
    const child = ".trellis/tasks/child";
    makeTask(tmp, SOURCE, { children: ["child"] });
    makeTask(tmp, child, { parent: "task-a" });
    writeFile(
      tmp,
      ".trellis/config.yaml",
      "session_auto_commit: false  # manual bookkeeping\n",
    );
    initialCommit(tmp, SOURCE, child, ".trellis/tasks/archive/2000-01/task-b");
    dirtyUnrelated(tmp, "partially staged");
    const before = [OTHER, CODE].map((file) => snapshot(tmp, file));
    const head = git(tmp, "rev-parse", "HEAD");
    const index = git(tmp, "ls-files", "--stage");

    const dest = archive(tmp);

    expect(git(tmp, "rev-parse", "HEAD")).toBe(head);
    expect(git(tmp, "ls-files", "--stage")).toBe(index);
    expect([OTHER, CODE].map((file) => snapshot(tmp, file))).toEqual(before);
    expect(fs.existsSync(path.join(tmp, SOURCE))).toBe(false);
    const archived = JSON.parse(
      fs.readFileSync(path.join(tmp, dest, "task.json"), "utf-8"),
    ) as { status: string };
    const childData = JSON.parse(
      fs.readFileSync(path.join(tmp, child, "task.json"), "utf-8"),
    ) as { parent: string | null };
    expect(archived.status).toBe("completed");
    expect(childData.parent).toBeNull();
  });

  it("#4 includes explicitly unlinked children but no other archived task", () => {
    const child = ".trellis/tasks/child";
    makeTask(tmp, SOURCE, { children: ["child"] });
    makeTask(tmp, child, { parent: "task-a" });
    initialCommit(tmp, SOURCE, child, ".trellis/tasks/archive/2000-01/task-b");
    dirtyUnrelated(tmp, "partially staged");
    const before = [OTHER, CODE].map((file) => snapshot(tmp, file));

    const dest = archive(tmp);

    expect(changedFiles(tmp)).toEqual(
      [
        `${SOURCE}/prd.md`,
        `${SOURCE}/task.json`,
        `${dest}/prd.md`,
        `${dest}/task.json`,
        `${child}/task.json`,
      ].sort(),
    );
    const childData = JSON.parse(
      git(tmp, "show", `HEAD:${child}/task.json`),
    ) as { parent: string | null };
    expect(childData.parent).toBeNull();
    expect([OTHER, CODE].map((file) => snapshot(tmp, file))).toEqual(before);
    expect(
      git(tmp, "status", "--porcelain=v1", "--", child, SOURCE, dest),
    ).toBe("");
  });

  it("#5 fails closed without a destination, uses the supplied month, and preserves legacy mode", () => {
    makeTask(tmp, ".trellis/tasks/child");
    const runHelper = (code: string): string[] =>
      JSON.parse(
        execFileSync(
          PYTHON_CMD,
          [
            "-B",
            "-c",
            `from pathlib import Path\nimport json, sys\nfrom common.safe_commit import safe_archive_paths_to_add\nroot = Path(sys.argv[1])\n${code}`,
            tmp,
          ],
          { cwd: path.join(tmp, ".trellis/scripts"), encoding: "utf-8" },
        ),
      ) as string[];

    expect(
      runHelper(
        "print(json.dumps(safe_archive_paths_to_add(root, task_name='task-a', modified_children=['child'])))",
      ),
    ).toEqual([".trellis/tasks/child"]);
    expect(
      runHelper(
        "print(json.dumps(safe_archive_paths_to_add(root, task_name='task-a', archived_task_dir=root / '.trellis/tasks/archive/1999-12/missing')))",
      ),
    ).toEqual([]);
    expect(
      runHelper(
        "print(json.dumps(safe_archive_paths_to_add(root, task_name='task-b', archived_task_dir=root / '.trellis/tasks/archive/2000-01/task-b')))",
      ),
    ).toEqual([".trellis/tasks/archive/2000-01/task-b"]);
    expect(
      runHelper("print(json.dumps(safe_archive_paths_to_add(root)))"),
    ).toEqual([".trellis/tasks/archive", ".trellis/tasks/child"]);
  });
});
