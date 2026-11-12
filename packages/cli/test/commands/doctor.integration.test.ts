import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectDoctorReport,
  doctorReportSchema,
  doctorReportJsonSchema,
  type DoctorReport,
} from "../../src/commands/doctor.js";
import { collectPlatformTemplates } from "../../src/configurators/index.js";
import { computeHash } from "../../src/utils/template-hash.js";

const CLI = fileURLToPath(new URL("../../bin/trellis.js", import.meta.url));
const TEMPLATES = fileURLToPath(
  new URL("../../src/templates/", import.meta.url),
);
let base: string;
let root: string;

function put(name: string, content: string): void {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function fixtureEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) =>
          !name.endsWith("_PROJECT_DIR") &&
          !/(?:SESSION_ID|SESSIONID|THREAD_ID|CONVERSATION_ID|CONVERSATIONID|TRANSCRIPT_PATH)$/.test(
            name,
          ) &&
          name !== "TRELLIS_CONTEXT_ID" &&
          name !== "CLAUDE_ENV_FILE" &&
          !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(
            name,
          ),
      ),
    ),
    ...extra,
  };
}

function git(args: string[]): void {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: fixtureEnv(),
  });
  expect(result.status, result.stderr).toBe(0);
}

function workspace(): void {
  fs.cpSync(
    path.join(TEMPLATES, "trellis/scripts"),
    path.join(root, ".trellis/scripts"),
    {
      recursive: true,
      filter: (source) =>
        !source.split(path.sep).includes("__pycache__") &&
        !source.endsWith(".pyc"),
    },
  );
  const hashes: Record<string, string> = {};
  for (const platform of ["claude-code", "codex"] as const) {
    for (const [name, content] of collectPlatformTemplates(platform) ?? []) {
      if (
        name.includes("/hooks/") ||
        name === ".codex/hooks.json" ||
        name === ".claude/settings.json"
      ) {
        put(name, content);
        hashes[name] = computeHash(content);
      }
    }
  }
  put(
    ".trellis/workflow.md",
    "# Doctor workflow\r\n## Phase Index\r\n中文 read-only fixture\r\n",
  );
  hashes[".trellis/workflow.md"] = computeHash(
    fs.readFileSync(path.join(root, ".trellis/workflow.md"), "utf8"),
  );
  put(
    ".trellis/.template-hashes.json",
    JSON.stringify({ __version: 2, hashes }),
  );
  put(
    ".trellis/.gitignore",
    "# preserved\r\nhooks.local.json\r\n.runtime/\r\n",
  );
  put(".trellis/hooks.local.json", '{"private":"fixture-only"}\n');
  put(
    ".trellis/tasks/doctor-task/task.json",
    '{"id":"doctor-task","status":"in_progress"}',
  );
  put(
    ".trellis/.runtime/sessions/codex_doctor.json",
    '{"current_task":".trellis/tasks/doctor-task"}',
  );
  git(["init", "-q"]);
  git(["add", "--", ".trellis/workflow.md"]);
}

function snapshot(dir = base): Map<string, string> {
  const result = new Map<string, string>();
  const visit = (current: string): void => {
    for (const name of fs.readdirSync(current).sort()) {
      const target = path.join(current, name);
      const stat = fs.lstatSync(target);
      const key = path.relative(dir, target);
      if (stat.isSymbolicLink())
        result.set(key, `link:${fs.readlinkSync(target)}`);
      else if (stat.isDirectory()) {
        result.set(key, "directory");
        visit(target);
      } else
        result.set(
          key,
          createHash("sha256").update(fs.readFileSync(target)).digest("hex"),
        );
    }
  };
  visit(dir);
  return result;
}

function run(
  extra: NodeJS.ProcessEnv = {},
  cwd = root,
  json = true,
): { report: DoctorReport; stdout: string; status: number | null } {
  const before = snapshot();
  const result = spawnSync(
    process.execPath,
    [CLI, "doctor", ...(json ? ["--json"] : [])],
    {
      cwd,
      encoding: "utf8",
      env: fixtureEnv(extra),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.stderr).toBe("");
  expect(snapshot()).toEqual(before);
  expect(
    [...before.keys()].some(
      (name) => name.endsWith(".pyc") || name.includes("__pycache__"),
    ),
  ).toBe(false);
  let report: DoctorReport;
  if (json) report = doctorReportSchema.parse(JSON.parse(result.stdout));
  else {
    const previous = process.env;
    try {
      process.env = fixtureEnv(extra);
      report = collectDoctorReport(cwd);
    } finally {
      process.env = previous;
    }
  }
  expect(
    report.checks.every((check) => check.confidence !== "host-verified"),
  ).toBe(true);
  return { report, stdout: result.stdout, status: result.status };
}

function editClaude(command: string): void {
  const config = JSON.parse(
    fs.readFileSync(path.join(root, ".claude/settings.json"), "utf8"),
  ) as {
    hooks: { SessionStart: { hooks: { command: string }[] }[] };
  };
  config.hooks.SessionStart[0].hooks[0].command = command;
  put(".claude/settings.json", JSON.stringify(config));
}

describe("read-only trellis doctor", () => {
  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-doctor-"));
    root = path.join(base, "中文 project");
    put(".trellis/config.yaml", "# doctor fixture\n");
  });
  afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

  it("public built CLI reports missing workflow with actionable schema-versioned JSON", () => {
    const { report, status } = run();
    expect(report.schemaVersion).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "project.workflow",
        status: "error",
        suggestion: expect.stringContaining("trellis"),
      }),
    );
    expect(status).toBe(1);
  });

  it("healthy registry-owned configuration remains byte-identical including Git and ignored runtime", () => {
    workspace();
    const { report, status } = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(status).toBe(0);
    expect(report.root).toBe(fs.realpathSync.native(root));
    expect(report.checks.filter((check) => check.status === "error")).toEqual(
      [],
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "task.current",
        status: "ok",
        message: expect.stringContaining("doctor-task"),
      }),
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.local.ignore",
        status: "ok",
        confidence: "probed",
      }),
    );
    expect(
      report.checks.some(
        (check) =>
          check.id.startsWith("hooks.codex") &&
          check.message.includes("Portable") &&
          check.status === "ok",
      ),
    ).toBe(true);
    expect(
      report.checks.some(
        (check) =>
          check.id.startsWith("hooks.claude-code") &&
          check.status === "warn" &&
          check.message.includes("relative command"),
      ),
    ).toBe(true);
  });

  it.each(["python", "python3", "py -3"])(
    "recognizes the unchanged portable Codex body with the known %s alias",
    (alias) => {
      workspace();
      const config = JSON.parse(
        fs.readFileSync(path.join(root, ".codex/hooks.json"), "utf8"),
      ) as { hooks: Record<string, { hooks: { command: string }[] }[]> };
      for (const groups of Object.values(config.hooks))
        for (const group of groups)
          for (const hook of group.hooks)
            hook.command = hook.command.replace(
              /^(?:python3?|py -3) /,
              `${alias} `,
            );
      put(".codex/hooks.json", JSON.stringify(config));
      const { report } = run();
      const checks = report.checks.filter((check) =>
        check.id.startsWith("hooks.codex..codex/hooks.json:"),
      );
      expect(checks).toHaveLength(2);
      for (const check of checks) {
        expect(check.confidence).toBe("probed");
        expect(["ok", "error"]).toContain(check.status);
        expect(check.message).toMatch(
          /Portable hook command|Hook Python alias cannot resolve Python >=3\.9/,
        );
      }
    },
  );

  it("keeps altered portable Codex command bodies custom and unexecuted", () => {
    workspace();
    const config = JSON.parse(
      fs.readFileSync(path.join(root, ".codex/hooks.json"), "utf8"),
    ) as { hooks: Record<string, { hooks: { command: string }[] }[]> };
    for (const groups of Object.values(config.hooks))
      for (const group of groups)
        for (const hook of group.hooks)
          hook.command += " && echo unexpected > DOCTOR_CUSTOM_EXECUTED";
    put(".codex/hooks.json", JSON.stringify(config));
    const { report, status } = run();
    expect(status).toBe(0);
    const checks = report.checks.filter((check) =>
      check.id.startsWith("hooks.codex..codex/hooks.json:"),
    );
    expect(checks).toHaveLength(2);
    for (const check of checks)
      expect(check).toMatchObject({
        status: "warn",
        confidence: "configured",
        message: expect.stringContaining("Custom hook command"),
      });
    expect(fs.existsSync(path.join(root, "DOCTOR_CUSTOM_EXECUTED"))).toBe(
      false,
    );
  });

  it("reports a broken recognized hook path with a repair suggestion without executing it", () => {
    workspace();
    editClaude("python .claude/hooks/missing.py");
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: expect.stringContaining("hooks.claude-code"),
        status: "error",
        message: expect.stringContaining("missing.py"),
        suggestion: expect.stringContaining("trellis update"),
      }),
    );
  });

  it("finds missing workflow even when other canonical root markers remain", () => {
    workspace();
    fs.unlinkSync(path.join(root, ".trellis/workflow.md"));
    const { report, status } = run();
    expect(report.root).toBe(fs.realpathSync.native(root));
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "project.workflow",
        status: "error",
        suggestion: expect.stringContaining("trellis workflow"),
      }),
    );
  });

  it("locates a stale current-session pointer with task.py recovery advice", () => {
    workspace();
    put(
      ".trellis/.runtime/sessions/codex_doctor.json",
      '{"current_task":".trellis/tasks/missing"}',
    );
    const { report, status } = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "task.current",
        status: "error",
        suggestion: expect.stringContaining("task.py finish"),
      }),
    );
  });

  it("uses the canonical environment identity mapper for an exported Codex thread", () => {
    workspace();
    const { report, status } = run({ CODEX_THREAD_ID: "doctor" });
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "task.current",
        status: "ok",
        message: expect.stringContaining("doctor-task"),
      }),
    );
  });

  it("diagnoses a malformed selected session pointer without treating an absent optional pointer as corrupt", () => {
    workspace();
    put(".trellis/.runtime/sessions/codex_doctor.json", "{broken");
    const broken = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(broken.status).toBe(1);
    expect(broken.report.checks).toContainEqual(
      expect.objectContaining({ id: "task.current", status: "error" }),
    );
    fs.unlinkSync(
      path.join(root, ".trellis/.runtime/sessions/codex_doctor.json"),
    );
    const absent = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(absent.status).toBe(0);
    expect(absent.report.checks).toContainEqual(
      expect.objectContaining({
        id: "task.current",
        status: "ok",
        message: expect.stringContaining("none"),
      }),
    );
  });

  it("does not infer task ownership or delete expired tickets without identity", () => {
    workspace();
    put(
      ".trellis/.runtime/sessions/claude_other.json",
      '{"current_task":".trellis/tasks/doctor-task"}',
    );
    put(
      ".trellis/.runtime/shell-tickets/expired.json",
      JSON.stringify({
        context_key: "codex_doctor",
        cwd: root,
        created_at: "2000-01-01T00:00:00Z",
      }),
    );
    fs.utimesSync(
      path.join(root, ".trellis/.runtime/shell-tickets/expired.json"),
      1,
      1,
    );
    const { report, status } = run();
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "task.current",
        status: "warn",
        message: expect.stringContaining("No session identity"),
      }),
    );
    expect(
      fs.existsSync(
        path.join(root, ".trellis/.runtime/shell-tickets/expired.json"),
      ),
    ).toBe(true);
  });

  it("rejects a selected session directory redirected outside the workflow", () => {
    workspace();
    const sessions = path.join(root, ".trellis/.runtime/sessions");
    const outside = path.join(base, "outside-sessions");
    fs.renameSync(sessions, outside);
    fs.symlinkSync(
      outside,
      sessions,
      process.platform === "win32" ? "junction" : "dir",
    );
    const { report, status } = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "task.current",
        status: "error",
        suggestion: expect.stringContaining("task.py"),
      }),
    );
  });

  it("diagnoses outside task refs and malformed selected task metadata", () => {
    workspace();
    const outside = path.join(base, "outside-task");
    fs.mkdirSync(outside);
    fs.writeFileSync(
      path.join(outside, "task.json"),
      '{"status":"in_progress"}',
    );
    put(
      ".trellis/.runtime/sessions/codex_doctor.json",
      JSON.stringify({ current_task: outside }),
    );
    expect(
      run({ TRELLIS_CONTEXT_ID: "codex_doctor" }).report.checks,
    ).toContainEqual(
      expect.objectContaining({ id: "task.current", status: "error" }),
    );
    put(
      ".trellis/.runtime/sessions/codex_doctor.json",
      '{"current_task":".trellis/tasks/doctor-task"}',
    );
    put(".trellis/tasks/doctor-task/task.json", '{"status":7}');
    const { report, status } = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ id: "task.current", status: "error" }),
    );
  });

  it("treats unknown user commands as configured warnings and never executes them", () => {
    workspace();
    editClaude(
      "node -e \"require('node:fs').writeFileSync('EXECUTED','bad')\"",
    );
    const { report, status } = run();
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: expect.stringContaining("hooks.claude-code"),
        status: "warn",
        confidence: "configured",
        message: expect.stringContaining("Custom hook command"),
      }),
    );
    expect(fs.existsSync(path.join(root, "EXECUTED"))).toBe(false);
  });

  it("reports unresolved Python placeholders without evaluating the hook", () => {
    workspace();
    editClaude("{{PYTHON_CMD}} .claude/hooks/session-start.py");
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        status: "error",
        message: expect.stringContaining("Unresolved {{PYTHON_CMD}}"),
      }),
    );
  });

  it("reports a missing owned registration config", () => {
    workspace();
    fs.unlinkSync(path.join(root, ".codex/hooks.json"));
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.codex..codex/hooks.json",
        status: "error",
        suggestion: expect.stringContaining("trellis update"),
      }),
    );
  });

  it("diagnoses a missing owned hook support file", () => {
    workspace();
    fs.unlinkSync(path.join(root, ".codex/hooks/trellis_hook_input.py"));
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.codex.assets",
        status: "error",
        message: expect.stringContaining("trellis_hook_input.py"),
      }),
    );
  });

  it("reports malformed registration JSON as an actionable error", () => {
    workspace();
    put(".codex/hooks.json", "{broken");
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.codex..codex/hooks.json",
        status: "error",
        message: expect.stringContaining("Invalid hook registration JSON"),
      }),
    );
  });

  it("keeps plugin assets configured without inventing hook event probes", () => {
    workspace();
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(root, ".trellis/.template-hashes.json"),
        "utf8",
      ),
    ) as { hashes: Record<string, string> };
    for (const [name, content] of collectPlatformTemplates("pi") ?? []) {
      if (name.startsWith(".pi/")) {
        put(name, content);
        manifest.hashes[name] = computeHash(content);
      }
    }
    put(".trellis/.template-hashes.json", JSON.stringify(manifest));
    const { report, status } = run();
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.pi.assets",
        status: "ok",
        confidence: "configured",
        message: expect.stringContaining("host activation was not probed"),
      }),
    );
  });

  it("identifies missing owned plugin assets in the repair diagnostic", () => {
    workspace();
    const missing = ".opencode/package.json";
    const content = collectPlatformTemplates("opencode")?.get(missing);
    if (content === undefined)
      throw new Error("Expected OpenCode package asset");
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(root, ".trellis/.template-hashes.json"),
        "utf8",
      ),
    ) as { hashes: Record<string, string> };
    manifest.hashes[missing] = computeHash(content);
    put(".trellis/.template-hashes.json", JSON.stringify(manifest));
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.opencode.assets",
        status: "error",
        confidence: "configured",
        message: expect.stringContaining(missing),
        suggestion: expect.stringContaining("trellis update"),
      }),
    );
  });

  it("accepts a linked workflow root while leaving its ignore state unprobed", () => {
    workspace();
    const workflowStore = path.join(base, "workflow-store");
    fs.renameSync(path.join(root, ".trellis"), workflowStore);
    fs.symlinkSync(
      workflowStore,
      path.join(root, ".trellis"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const { report, status } = run({ TRELLIS_CONTEXT_ID: "codex_doctor" });
    expect(status).toBe(0);
    expect(report.root).toBe(fs.realpathSync.native(root));
    expect(report.checks).toContainEqual(
      expect.objectContaining({ id: "task.current", status: "ok" }),
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.local.ignore",
        status: "warn",
        confidence: "configured",
        message: expect.stringContaining("linked"),
      }),
    );
  });

  it("reports local stored-hash drift without claiming upstream freshness", () => {
    workspace();
    put(".trellis/workflow.md", "# intentionally modified\n");
    const { report, status } = run();
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "templates.drift",
        status: "warn",
        message: expect.stringContaining("not an upstream freshness check"),
        details: expect.arrayContaining(["modified: .trellis/workflow.md"]),
      }),
    );
  });

  it("keeps malformed ownership metadata separate from native platform directories", () => {
    workspace();
    put(".trellis/.template-hashes.json", "{broken");
    const { report, status } = run();
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ id: "templates.hashes", status: "warn" }),
    );
    expect(
      report.checks.some((check) => check.id.startsWith("hooks.codex")),
    ).toBe(false);
  });

  it("refuses out-of-workspace hash references", () => {
    workspace();
    fs.writeFileSync(path.join(base, "outside.txt"), "outside contents\n");
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(root, ".trellis/.template-hashes.json"),
        "utf8",
      ),
    ) as { hashes: Record<string, string> };
    manifest.hashes["../outside.txt"] = "a".repeat(64);
    put(".trellis/.template-hashes.json", JSON.stringify(manifest));
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "templates.drift",
        status: "error",
        details: expect.arrayContaining(["unsafe: ../outside.txt"]),
      }),
    );
  });

  it("refuses stored-hash references through an outside directory link", () => {
    workspace();
    const outside = path.join(base, "outside-hashes");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "file.txt"), "outside contents\n");
    fs.symlinkSync(
      outside,
      path.join(root, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const manifestPath = path.join(root, ".trellis/.template-hashes.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      hashes: Record<string, string>;
    };
    manifest.hashes["linked/file.txt"] = "a".repeat(64);
    put(".trellis/.template-hashes.json", JSON.stringify(manifest));
    const { report, status } = run();
    expect(status).toBe(1);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "templates.drift",
        status: "error",
        details: expect.arrayContaining(["unsafe: linked/file.txt"]),
      }),
    );
  });

  it("offers only git rm --cached advice when the local hooks file is tracked", () => {
    workspace();
    git(["add", "-f", "--", ".trellis/hooks.local.json"]);
    const { report, status } = run();
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.local.ignore",
        status: "warn",
        suggestion: expect.stringContaining(
          "git rm --cached -- .trellis/hooks.local.json",
        ),
      }),
    );
  });

  it("respects ignore negations and reports nonregular ignore leaves conservatively", () => {
    workspace();
    put(".trellis/.gitignore", "hooks.local.json\n!hooks.local.json\n");
    expect(run().report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.local.ignore",
        status: "warn",
        message: expect.stringContaining("does not ignore"),
      }),
    );
    fs.unlinkSync(path.join(root, ".trellis/.gitignore"));
    fs.mkdirSync(path.join(root, ".trellis/.gitignore"));
    expect(run().report.checks).toContainEqual(
      expect.objectContaining({
        id: "hooks.local.ignore",
        status: "warn",
        confidence: "configured",
        message: expect.stringContaining("nonregular"),
      }),
    );
  });

  it("uses bundled Python readers rather than project-owned code and emits no bytecode", () => {
    workspace();
    put(
      ".trellis/scripts/common/active_task.py",
      "raise RuntimeError('PROJECT PYTHON EXECUTED')\n",
    );
    const { report, status } = run({
      TRELLIS_CONTEXT_ID: "codex_doctor",
      PYTHONPATH: path.join(root, ".trellis/scripts"),
    });
    expect(status).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ id: "task.current", status: "ok" }),
    );
  });

  it("crosses a nested Git boundary using the canonical nearest root", () => {
    workspace();
    const cwd = path.join(root, "nested/src");
    fs.mkdirSync(cwd, { recursive: true });
    const initialized = spawnSync("git", ["init", "-q", path.dirname(cwd)], {
      env: fixtureEnv(),
    });
    expect(initialized.status).toBe(0);
    expect(run({}, cwd).report.root).toBe(fs.realpathSync.native(root));
  });

  it("keeps version-mismatch JSON as exactly one schema-valid object", () => {
    workspace();
    put(".trellis/.version", "0.0.1\n");
    const { stdout, status } = run();
    expect(status).toBe(0);
    expect(stdout).not.toContain("update available");
    expect(stdout.trim().startsWith("{")).toBe(true);
    expect(stdout.trim().endsWith("}")).toBe(true);
  });

  it("reports missing Python honestly and leaves dependent probes unverified", () => {
    workspace();
    const { report, status } = run({ PATH: "" });
    expect(status).toBe(1);
    expect(report.root).toBeNull();
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "runtime.python",
        status: "error",
        suggestion: expect.stringContaining("Python >=3.9"),
      }),
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "project.root",
        status: "warn",
        confidence: "configured",
      }),
    );
  });

  it("exports strict runtime and JSON schemas that reject malformed reports", () => {
    workspace();
    const { report } = run();
    expect(doctorReportJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: { schemaVersion: { const: 1 }, checks: { type: "array" } },
    });
    expect(
      doctorReportSchema.safeParse({ ...report, schemaVersion: 2 }).success,
    ).toBe(false);
    expect(
      doctorReportSchema.safeParse({ ...report, extra: true }).success,
    ).toBe(false);
    expect(
      doctorReportSchema.safeParse({
        ...report,
        checks: [
          {
            id: "bad",
            status: "success",
            confidence: "probed",
            message: "bad",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      doctorReportSchema.safeParse({
        ...report,
        checks: [
          { id: "bad", status: "ok", confidence: "inferred", message: "bad" },
        ],
      }).success,
    ).toBe(false);
  });

  it("human output exposes the same check IDs/status/confidence as the collector", () => {
    workspace();
    const { stdout, report, status } = run({}, root, false);
    expect(status).toBe(0);
    for (const check of report.checks)
      expect(stdout).toContain(
        `${check.status} [${check.confidence}] ${check.id}:`,
      );
  });
});
