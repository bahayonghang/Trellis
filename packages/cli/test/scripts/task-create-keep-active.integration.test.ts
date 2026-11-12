/**
 * Real-CLI create-only regressions selectively adapted from
 * mindfold-ai/Trellis#654. Explicit start remains an ordinary switch.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";
const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../src/templates/trellis/scripts",
);

// No skipIf: a missing platform-native interpreter must fail, not hide coverage.
describe("task.py create preserves unfinished session work (#654)", () => {
  let tmp: string;
  let env: NodeJS.ProcessEnv;

  function run(session: string | null, ...args: string[]) {
    return spawnSync(PYTHON_CMD, ["-B", ".trellis/scripts/task.py", ...args], {
      cwd: tmp,
      encoding: "utf-8",
      env: { ...env, TRELLIS_CONTEXT_ID: session ?? "" },
    });
  }

  function seed(name: string, status: unknown = "planning"): string {
    const ref = `.trellis/tasks/${name}`;
    fs.mkdirSync(path.join(tmp, ref), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, ref, "task.json"),
      JSON.stringify({ name, title: name, status, branch: "feature/task" }),
    );
    return ref;
  }

  function pointer(session = "session-a"): string {
    return path.join(tmp, ".trellis/.runtime/sessions", `${session}.json`);
  }

  function activate(ref: string, session = "session-a"): void {
    fs.mkdirSync(path.dirname(pointer(session)), { recursive: true });
    fs.writeFileSync(pointer(session), JSON.stringify({ current_task: ref }));
  }

  function status(ref: string): string {
    return (
      JSON.parse(
        fs.readFileSync(path.join(tmp, ref, "task.json"), "utf-8"),
      ) as { status: string }
    ).status;
  }

  function create(...args: string[]) {
    return run(
      "session-a",
      "create",
      "New task",
      "--description",
      "Create preservation regression",
      "--slug",
      "new-task",
      ...args,
    );
  }

  function expectCurrent(ref: string, session = "session-a"): void {
    const result = run(session, "current", "--json");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      current_task: { dir: ref },
      source: `session:${session}`,
      stale: false,
    });
  }

  /** Assert byte preservation even for absent metadata or a directory at task.json. */
  function metadata(ref: string): Buffer | string {
    const file = path.join(tmp, ref, "task.json");
    if (!fs.existsSync(file)) return "missing";
    if (fs.statSync(file).isDirectory()) return "directory";
    return fs.readFileSync(file);
  }

  function expectPreserved(old: string): string {
    const beforePointer = fs.readFileSync(pointer());
    const beforeMetadata = metadata(old);
    const sibling = fs.readFileSync(pointer("session-b"));
    const result = create();
    expect(result.status, result.stderr).toBe(0);
    const next = result.stdout.trim();
    expect(status(next)).toBe("planning");
    expect(fs.existsSync(path.join(tmp, next, "prd.md"))).toBe(true);
    expect(fs.readFileSync(pointer())).toEqual(beforePointer);
    expect(metadata(old)).toEqual(beforeMetadata);
    expect(fs.readFileSync(pointer("session-b"))).toEqual(sibling);
    expectCurrent(old);
    expect(result.stderr).toContain(
      `Kept active task for this session: ${old}`,
    );
    expect(result.stderr).toContain(
      `${PYTHON_CMD} .trellis/scripts/task.py start "${next}"`,
    );
    expect(result.stderr).not.toContain("--switch");
    expect(result.stderr).not.toContain("Activated task for this session");
    expect(fs.existsSync(path.join(tmp, "started.log"))).toBe(false);
    return next;
  }

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-create-keep-active-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: tmp });
    fs.cpSync(TEMPLATE_SCRIPTS, path.join(tmp, ".trellis/scripts"), {
      recursive: true,
      filter: (file) => path.basename(file) !== "__pycache__",
    });
    // Isolate only child-fixture identity, never the real host environment.
    env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) =>
          !/(SESSION_?ID|CONVERSATION_?ID|TRANSCRIPT_?PATH|THREAD_ID|TRELLIS_CONTEXT_ID)$/i.test(
            key,
          ),
      ),
    );
    env.TRELLIS_DEVELOPER = "tester";
    env.PYTHONIOENCODING = "utf-8";
    fs.writeFileSync(
      path.join(tmp, ".trellis/config.yaml"),
      `hooks:\n  after_start:\n    - ${PYTHON_CMD} record-start.py\n`,
    );
    fs.writeFileSync(
      path.join(tmp, "record-start.py"),
      'from pathlib import Path\nwith Path("started.log").open("a") as f:\n    f.write("start\\n")\n',
    );
    activate(seed("sibling-task", "in_progress"), "session-b");
  });

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it.each(["in_progress", "planning", "review"])(
    "%s remains active during create; explicit start switches without flags",
    (activeStatus) => {
      const old = seed("old-task", activeStatus);
      activate(old);
      const oldBytes = metadata(old);
      const next = expectPreserved(old);
      const sibling = fs.readFileSync(pointer("session-b"));
      const started = run("session-a", "start", next);
      expect(started.status, started.stderr).toBe(0);
      expectCurrent(next);
      expect(status(next)).toBe("in_progress");
      expect(metadata(old)).toEqual(oldBytes);
      expect(fs.readFileSync(pointer("session-b"))).toEqual(sibling);
      expect(
        fs.readFileSync(path.join(tmp, "started.log"), "utf-8").trim(),
      ).toBe("start");
    },
  );

  it.each(["missing", "malformed", "unreadable", "invalid-status"])(
    "%s task metadata is conservatively preserved",
    (kind) => {
      const old = seed("old-task");
      const file = path.join(tmp, old, "task.json");
      if (kind === "missing" || kind === "unreadable") fs.unlinkSync(file);
      if (kind === "unreadable") fs.mkdirSync(file); // Portable read failure, no chmod.
      if (kind === "malformed") fs.writeFileSync(file, "{broken");
      if (kind === "invalid-status")
        fs.writeFileSync(file, '{"status": [], "title": "old"}');
      activate(old);
      expectPreserved(old);
    },
  );

  it.each(["completed", "done", "absent", "deleted", "archived"])(
    "%s current state permits normal activation without adopting a sibling",
    (kind) => {
      const old = seed("old-task", kind === "archived" ? "planning" : kind);
      if (kind !== "absent") activate(old);
      if (kind === "deleted")
        fs.rmSync(path.join(tmp, old), { recursive: true });
      if (kind === "archived") {
        const archived = ".trellis/tasks/archive/2000-01/old-task";
        fs.mkdirSync(path.dirname(path.join(tmp, archived)), {
          recursive: true,
        });
        fs.renameSync(path.join(tmp, old), path.join(tmp, archived));
        activate(archived); // Archive location is terminal even with old metadata.
      }
      const sibling = fs.readFileSync(pointer("session-b"));
      const result = create();
      expect(result.status, result.stderr).toBe(0);
      expectCurrent(result.stdout.trim());
      expect(status(result.stdout.trim())).toBe("planning");
      expect(result.stderr).toContain("Activated task for this session");
      expect(result.stderr).toContain("Source: session:session-a");
      expect(fs.readFileSync(pointer("session-b"))).toEqual(sibling);
      expect(fs.existsSync(path.join(tmp, ".trellis/.current-task"))).toBe(
        false,
      );
    },
  );

  it("a malformed exact pointer never adopts the sole sibling session", () => {
    activate("unused");
    fs.writeFileSync(pointer(), '{"current_task": []}');
    const sibling = fs.readFileSync(pointer("session-b"));
    const result = create();
    expect(result.status, result.stderr).toBe(0);
    expectCurrent(result.stdout.trim());
    expect(fs.readFileSync(pointer("session-b"))).toEqual(sibling);
  });

  it("a task referenced by a canonical path alias is still protected", () => {
    const old = seed("old-task", "in_progress");
    activate(`./${old}`);
    expectPreserved(`./${old}`);
  });

  it("--no-start preserves even an otherwise replaceable terminal pointer", () => {
    activate(seed("old-task", "completed"));
    const before = fs.readFileSync(pointer());
    const result = create("--no-start");
    expect(result.status, result.stderr).toBe(0);
    expect(status(result.stdout.trim())).toBe("planning");
    expect(fs.readFileSync(pointer())).toEqual(before);
    expect(result.stderr).toContain("Skipped session activation (--no-start)");
  });

  it("without session identity create leaves all session files untouched", () => {
    const sibling = fs.readFileSync(pointer("session-b"));
    const result = run(
      null,
      "create",
      "Detached task",
      "--description",
      "No session",
      "--slug",
      "detached",
    );
    expect(result.status, result.stderr).toBe(0);
    expect(status(result.stdout.trim())).toBe("planning");
    expect(fs.readdirSync(path.dirname(pointer()))).toEqual(["session-b.json"]);
    expect(fs.readFileSync(pointer("session-b"))).toEqual(sibling);
    expect(result.stderr).not.toContain("Activated task for this session");
    expect(fs.existsSync(path.join(tmp, ".trellis/.current-task"))).toBe(false);
  });
});
