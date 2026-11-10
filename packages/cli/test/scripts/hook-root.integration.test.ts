import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectPlatformTemplates } from "../../src/configurators/index.js";
import { renderTemplateMap } from "../../src/configurators/shared.js";
import { getStatuslineHook } from "../../src/templates/claude/index.js";
import {
  getSharedHookScripts,
  getSharedHookSupportFiles,
} from "../../src/templates/shared-hooks/index.js";

const PYTHON = process.platform === "win32" ? "python" : "python3";
const TEMPLATES = fileURLToPath(
  new URL("../../src/templates/", import.meta.url),
);
const HOOKS = [
  ".claude/hooks/session-start.py",
  ".claude/hooks/inject-workflow-state.py",
  ".claude/hooks/inject-subagent-context.py",
  ".cursor/hooks/inject-shell-session-context.py",
  ".codex/hooks/session-start.py",
  ".github/copilot/hooks/session-start.py",
  ".claude/hooks/statusline.py",
  ".snow/hooks/write-trellis-context.py",
];
const NATIVE = ".codex/hooks/inject-subagent-context.py";
let sandbox: string;
let project: string;
let installed: string;

function put(base: string, relative: string, content: string): void {
  const dest = path.join(base, relative);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

function install(base: string): void {
  for (const platform of [
    "claude-code",
    "cursor",
    "codex",
    "copilot",
    "snow",
  ] as const) {
    for (const [name, content] of collectPlatformTemplates(platform) ?? []) {
      if (name.includes("/hooks/")) put(base, name, content);
    }
  }
  put(base, ".claude/hooks/statusline.py", getStatuslineHook());
}

// A complete shipped runtime and real session pointers, not a mock common package.
function workspace(base: string, label: string): void {
  fs.cpSync(
    path.join(TEMPLATES, "trellis/scripts"),
    path.join(base, ".trellis/scripts"),
    { recursive: true },
  );
  put(
    base,
    ".trellis/workflow.md",
    `# Workflow\n## Phase Index\n${label}-workflow\n## Phase 1: Plan\n[workflow-state:in_progress]\n${label}-breadcrumb\n[/workflow-state:in_progress]\n`,
  );
  put(base, ".trellis/config.yaml", "# root fixture\n");
  const task = ".trellis/tasks/root-case";
  put(
    base,
    `${task}/task.json`,
    JSON.stringify({
      id: `${label}-task`,
      title: `${label}-title`,
      status: "in_progress",
      priority: "P1",
    }),
  );
  put(base, `${task}/prd.md`, `${label}-PRD-CONTENT\n`);
  put(
    base,
    `${task}/implement.jsonl`,
    JSON.stringify({ file: ".trellis/config.yaml", reason: "root fixture" }) +
      "\n",
  );
  for (const platform of [
    "claude",
    "codex",
    "copilot",
    "cursor",
    "snow",
    "qoder",
  ]) {
    put(
      base,
      `.trellis/.runtime/sessions/${platform}_root-parent.json`,
      JSON.stringify({ current_task: task }),
    );
  }
}

function run(
  hook: string,
  cwd: string,
  extra: Record<string, unknown> = {},
  env: NodeJS.ProcessEnv = {},
  script?: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    PYTHON,
    [
      script ?? path.join(installed, hook),
      ...(hook.includes("write-trellis") ? ["user"] : []),
    ],
    {
      cwd,
      input: JSON.stringify({
        cwd,
        session_id: "root-parent",
        sessionId: "root-parent",
        hook_event_name: hook === NATIVE ? "SubagentStart" : "PreToolUse",
        agent_type: "trellis-implement",
        tool_name: "Agent",
        tool_input: {
          subagent_type: "trellis-implement",
          prompt: "root-control",
        },
        command: "python .trellis/scripts/task.py current --source",
        model: { display_name: "root-model" },
        ...extra,
      }),
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONDONTWRITEBYTECODE: "1",
        ...(hook.includes("write-trellis")
          ? { TRELLIS_CONTEXT_ID: "snow_root-parent" }
          : {}),
        ...env,
      },
    },
  );
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout.replace(/\r\n/g, "\n"),
    stderr: result.stderr.replace(/\r\n/g, "\n"),
  };
}

function assertSelected(
  hook: string,
  cwd: string,
  label: string,
  extra: Record<string, unknown> = {},
  env: NodeJS.ProcessEnv = {},
): void {
  const result = run(hook, cwd, extra, env);
  expect(result.status, `${hook}: ${result.stderr}`).toBe(0);
  expect(result.stderr, hook).toBe("");
  if (hook.includes("shell-session")) {
    expect(JSON.parse(result.stdout)).toEqual({ permission: "allow" });
    const ticketDir = path.join(
      label === "child" ? cwd : project,
      ".trellis/.runtime/shell-tickets",
    );
    const tickets = fs.readdirSync(ticketDir).map(
      (name) =>
        JSON.parse(fs.readFileSync(path.join(ticketDir, name), "utf8")) as {
          cwd: string;
        },
    );
    expect(tickets.map((ticket) => fs.realpathSync(ticket.cwd))).toContain(
      fs.realpathSync(label === "child" ? cwd : project),
    );
  } else if (hook.includes("write-trellis")) {
    const expectedRoot = label === "child" ? cwd : project;
    const payload = JSON.parse(result.stdout) as { additionalContext: string };
    expect(payload.additionalContext).toContain(`Repo: ${expectedRoot}`);
    expect(
      fs.readFileSync(
        path.join(expectedRoot, ".snow/log/trellis-context.txt"),
        "utf8",
      ),
    ).toContain(`${label}-workflow`);
  } else {
    const token = hook.includes("subagent")
      ? `${label}-PRD-CONTENT`
      : hook.includes("workflow-state")
        ? `${label}-breadcrumb`
        : hook.includes("statusline")
          ? `${label}-title`
          : `${label}-title`;
    expect(result.stdout, hook).toContain(token);
    expect(result.stdout, hook).not.toContain(
      `${label === "child" ? "parent" : "child"}-PRD-CONTENT`,
    );
  }
}

function snapshot(base: string): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else
        result[path.relative(base, full)] = fs
          .readFileSync(full)
          .toString("base64");
    }
  }
  walk(base);
  return result;
}

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-hook-root-"));
  project = path.join(sandbox, "project");
  installed = path.join(sandbox, "installed");
  fs.mkdirSync(project);
  install(installed);
});
afterEach(() => fs.rmSync(sandbox, { recursive: true, force: true }));

describe("#650 generated Python hook workspace selection", () => {
  it.each([HOOKS[2], NATIVE])(
    "%s injects the actual PRD across nested Git boundaries and without Git",
    (hook) => {
      workspace(project, "parent");
      const nested = path.join(project, "vendor");
      fs.mkdirSync(nested);
      assertSelected(hook, nested, "parent");
      fs.mkdirSync(path.join(nested, ".git"));
      assertSelected(hook, nested, "parent");
      fs.rmdirSync(path.join(nested, ".git"));
      put(nested, ".git", "gitdir: ../nested-worktree\n");
      assertSelected(hook, nested, "parent");
    },
  );
  it.each([
    "ordinary",
    "subdirectory",
    "nested-git-dir",
    "nested-worktree-file",
    "non-git",
    "nearer-invalid",
    "nearer-valid",
    "linked-workflow",
  ])("selects real task context: %s", (layout) => {
    workspace(project, "parent");
    if (layout !== "non-git") fs.mkdirSync(path.join(project, ".git"));
    let cwd = project;
    let label = "parent";
    if (!["ordinary", "non-git"].includes(layout)) {
      cwd = path.join(project, "nested");
      fs.mkdirSync(cwd);
    }
    if (layout === "nested-git-dir") fs.mkdirSync(path.join(cwd, ".git"));
    if (layout === "nested-worktree-file")
      put(cwd, ".git", "gitdir: ../not-a-real-worktree\n");
    if (layout === "nearer-invalid")
      put(cwd, ".trellis/spec-inject/cache", "not a workspace\n");
    if (layout === "nearer-valid") {
      workspace(cwd, "child");
      label = "child";
    }
    if (layout === "linked-workflow") {
      const store = path.join(sandbox, "workflow-store");
      fs.renameSync(path.join(project, ".trellis"), store);
      fs.symlinkSync(
        store,
        path.join(project, ".trellis"),
        process.platform === "win32" ? "junction" : "dir",
      );
    }
    for (const hook of [...HOOKS, NATIVE]) assertSelected(hook, cwd, label);
  });

  it.each([
    "absent",
    "empty",
    "home-cache",
    "file",
    "wrong-types",
    "broken-link",
  ])("no valid root is silent and writes nothing: %s", (marker) => {
    if (marker === "empty") fs.mkdirSync(path.join(project, ".trellis"));
    if (marker === "home-cache")
      put(project, ".trellis/spec-inject/cache", "cache");
    if (marker === "file") put(project, ".trellis", "not a directory");
    if (marker === "wrong-types") {
      fs.mkdirSync(path.join(project, ".trellis/workflow.md"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(project, ".trellis/config.yaml"));
      put(project, ".trellis/scripts", "not a directory");
    }
    if (marker === "broken-link") {
      const target = path.join(sandbox, "deleted-marker");
      fs.mkdirSync(target);
      fs.symlinkSync(
        target,
        path.join(project, ".trellis"),
        process.platform === "win32" ? "junction" : "dir",
      );
      fs.rmdirSync(target);
      // Snapshot walker deliberately does not dereference a broken marker.
      fs.unlinkSync(path.join(project, ".trellis"));
      // Recreate it after taking the initial snapshot below.
    }
    const envFile = path.join(sandbox, "claude-env");
    fs.writeFileSync(envFile, "# user-owned\n");
    const before = snapshot(project);
    if (marker === "broken-link")
      fs.symlinkSync(
        path.join(sandbox, "deleted-marker"),
        path.join(project, ".trellis"),
        process.platform === "win32" ? "junction" : "dir",
      );
    for (const hook of [...HOOKS, NATIVE]) {
      expect(
        run(hook, project, {}, { CLAUDE_ENV_FILE: envFile }),
        hook,
      ).toEqual({ status: 0, stdout: "", stderr: "" });
    }
    if (marker === "broken-link") fs.unlinkSync(path.join(project, ".trellis"));
    expect(snapshot(project)).toEqual(before);
    expect(fs.readFileSync(envFile, "utf8")).toBe("# user-owned\n");
  });

  it.each(["workflow.md", "config.yaml", "scripts", "runtime-without-package"])(
    "marker-only %s chooses the partial child without global imports or parent fallthrough",
    (marker) => {
      workspace(project, "parent");
      const child = path.join(project, "partial");
      fs.mkdirSync(path.join(child, ".trellis"), { recursive: true });
      if (marker === "scripts")
        fs.mkdirSync(path.join(child, ".trellis/scripts"));
      else if (marker === "runtime-without-package")
        put(
          child,
          ".trellis/scripts/common/active_task.py",
          "# incomplete local runtime\n",
        );
      else put(child, `.trellis/${marker}`, "# partial\n");
      const poison = path.join(sandbox, "poison");
      const globalImport = path.join(sandbox, "global-imported");
      put(
        poison,
        "common/__init__.py",
        `from pathlib import Path\nPath(${JSON.stringify(globalImport)}).touch()\nraise RuntimeError('GLOBAL_COMMON_IMPORTED')\n`,
      );
      for (const hook of [...HOOKS, NATIVE]) {
        const result = run(hook, child, {}, { PYTHONPATH: poison });
        expect(result.status, `${hook}: ${result.stderr}`).toBe(0);
        expect(result.stderr, hook).toBe("");
        expect(result.stdout).not.toContain("parent-");
        expect(result.stdout).not.toContain("GLOBAL_COMMON_IMPORTED");
      }
      expect(fs.existsSync(path.join(child, ".trellis/.runtime"))).toBe(false);
      expect(fs.existsSync(globalImport)).toBe(false);
    },
  );

  it("does not read context or task pointers escaping the chosen workspace", () => {
    workspace(project, "parent");
    const outside = path.join(sandbox, "outside");
    put(outside, "secret.md", "ESCAPED-CONTEXT-CANARY");
    put(outside, "prd.md", "ESCAPED-TASK-CANARY");
    put(
      project,
      ".trellis/tasks/root-case/implement.jsonl",
      JSON.stringify({ file: path.join(outside, "secret.md") }) + "\n",
    );
    for (const hook of [HOOKS[2], NATIVE]) {
      const result = run(hook, project);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("parent-PRD-CONTENT");
      expect(result.stdout).not.toContain("ESCAPED-CONTEXT-CANARY");
    }
    for (const platform of ["claude", "codex"])
      put(
        project,
        `.trellis/.runtime/sessions/${platform}_root-parent.json`,
        JSON.stringify({ current_task: outside }),
      );
    for (const hook of [HOOKS[2], NATIVE])
      expect(run(hook, project).stdout).toBe("");
  });

  it("no-root entrypoints never configure streams or launch subprocesses", () => {
    for (const hook of HOOKS) {
      const script = path.join(installed, hook);
      const result = spawnSync(
        PYTHON,
        [
          "-c",
          `
import io, json, runpy, sys
from unittest.mock import patch
calls = []
class Stream:
    def __init__(self, inner): self.inner = inner
    def __getattr__(self, name): return getattr(self.inner, name)
    def reconfigure(self, **kwargs): calls.append('encoding')
    def detach(self): calls.append('detach'); return self.inner.buffer
sys.stdin, sys.stdout, sys.stderr = [Stream(s) for s in (sys.stdin, sys.stdout, sys.stderr)]
sys.argv = [${JSON.stringify(script)}, 'user']
with patch('subprocess.run', side_effect=lambda *a, **kw: calls.append('subprocess')):
    try: runpy.run_path(sys.argv[0], run_name='__main__')
    except SystemExit as exc: assert exc.code in (0, None)
assert calls == [], calls
`,
        ],
        {
          cwd: project,
          input: JSON.stringify({
            cwd: project,
            session_id: "root-parent",
            tool_name: "Agent",
            tool_input: { subagent_type: "trellis-implement" },
            command: "python .trellis/scripts/task.py current",
          }),
          encoding: "utf8",
          env: {
            ...process.env,
            PYTHONPATH: path.dirname(script),
            PYTHONDONTWRITEBYTECODE: "1",
          },
        },
      );
      expect(result.status, `${hook}: ${result.stderr}`).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    }
  });

  // A worktree-vs-HEAD compatibility smoke, not a frozen historical oracle.
  // After commit HEAD advances; the independent layout/context assertions above
  // remain the durable regressions (no pinned hash or shallow-clone dependency).
  it("matches current HEAD ordinary-root output bytes for all eight protocols", () => {
    workspace(project, "parent");
    fs.mkdirSync(path.join(project, ".git"));
    for (const hook of HOOKS) {
      const source = hook.includes("write-trellis")
        ? "snow/hooks/write-trellis-context.py"
        : hook.includes("statusline")
          ? "claude/hooks/statusline.py"
          : hook === ".codex/hooks/session-start.py"
            ? "codex/hooks/session-start.py"
            : hook.includes("copilot")
              ? "copilot/hooks/session-start.py"
              : `shared-hooks/${path.basename(hook)}`;
      const old = execFileSync(
        "git",
        ["show", `HEAD:packages/cli/src/templates/${source}`],
        { cwd: TEMPLATES, encoding: "utf8" },
      );
      const oldPath = path.join(
        installed,
        path.dirname(hook),
        "head-control.py",
      );
      fs.writeFileSync(
        oldPath,
        renderTemplateMap(new Map([[hook, old]])).get(hook) ?? old,
      );
      const control = run(hook, project, {}, {}, oldPath);
      const current = run(hook, project);
      expect(control.status, control.stderr).toBe(0);
      expect(control.stdout, hook).not.toBe("");
      expect(current, hook).toEqual(control);
    }
  });

  it.each([HOOKS[4], HOOKS[5]])(
    "%s configures Unicode output from a non-UTF-8 process stream",
    (hook) => {
      workspace(project, "子任务🚀");
      const result = run(hook, project, {}, { PYTHONIOENCODING: "cp1252" });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe("");
      const payload = JSON.parse(result.stdout) as {
        hookSpecificOutput: {
          hookEventName: string;
          additionalContext: string;
        };
      };
      expect(payload.hookSpecificOutput.hookEventName).toBe("SessionStart");
      expect(payload.hookSpecificOutput.additionalContext).toContain(
        "子任务🚀-title",
      );
    },
  );

  it("preserves hook-specific hint precedence and native versus legacy cwd fallback", () => {
    workspace(project, "parent");
    const child = path.join(project, "child");
    workspace(child, "child");
    assertSelected(
      HOOKS[0],
      project,
      "parent",
      { cwd: child },
      { CLAUDE_PROJECT_DIR: project, QODER_PROJECT_DIR: child },
    );
    for (const hook of [HOOKS[4], HOOKS[5], HOOKS[1], NATIVE])
      assertSelected(hook, child, "child", {}, { CLAUDE_PROJECT_DIR: project });
    const outside = path.join(sandbox, "outside");
    fs.mkdirSync(outside);
    assertSelected(NATIVE, project, "parent", { cwd: outside });
    expect(run(HOOKS[2], project, { cwd: outside }).stdout).toBe("");
    assertSelected(HOOKS[3], project, "parent", { cwd: outside });
    assertSelected(HOOKS[6], project, "parent", { cwd: child });
    assertSelected(HOOKS[7], project, "parent", {}, { SNOW_CWD: child });
  });
});

describe("#650 canonical support asset", () => {
  it("is not an event and is shipped beside every importing entrypoint", () => {
    const support = getSharedHookSupportFiles();
    expect(support.map((item) => item.name)).toContain("trellis_hook_paths.py");
    expect(getSharedHookScripts().map((item) => item.name)).not.toContain(
      "trellis_hook_paths.py",
    );
    for (const hook of HOOKS)
      expect(
        fs.existsSync(
          path.join(installed, path.dirname(hook), "trellis_hook_paths.py"),
        ),
      ).toBe(true);
  });

  it("all three typed marker alternatives select the closest root while invalid closer markers are skipped", () => {
    workspace(project, "parent");
    const helperDir = path.join(installed, ".claude/hooks");
    const result = spawnSync(
      PYTHON,
      [
        "-c",
        `
from pathlib import Path
import shutil, sys
sys.path.insert(0, ${JSON.stringify(helperDir)})
from trellis_hook_paths import find_trellis_root
parent = Path(${JSON.stringify(project)}).resolve()
child = parent / 'child'
child.mkdir()
marker = child / '.trellis'
for name in ('workflow.md', 'config.yaml', 'scripts'):
    marker.mkdir()
    if name == 'scripts': (marker / name).mkdir()
    else: (marker / name).write_text('marker', encoding='utf-8')
    assert find_trellis_root(child) == child, name
    shutil.rmtree(marker)
for name in ('empty', 'cache', 'workflow-dir', 'config-dir', 'scripts-file', 'marker-file'):
    if name == 'marker-file': marker.write_text('not a dir', encoding='utf-8')
    else:
        marker.mkdir()
        if name == 'cache': (marker / 'spec-inject').mkdir()
        if name == 'workflow-dir': (marker / 'workflow.md').mkdir()
        if name == 'config-dir': (marker / 'config.yaml').mkdir()
        if name == 'scripts-file': (marker / 'scripts').write_text('not a dir', encoding='utf-8')
    assert find_trellis_root(child) == parent, name
    if marker.is_dir(): shutil.rmtree(marker)
    else: marker.unlink()
`,
      ],
      { cwd: project, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
  });

  it.each(["config.yaml", "scripts", "none"])(
    "marker stat errors preserve sibling alternatives: %s",
    (marker) => {
      fs.mkdirSync(path.join(project, ".trellis/scripts"), { recursive: true });
      const helper = path.join(
        installed,
        ".claude/hooks/trellis_hook_paths.py",
      );
      const result = spawnSync(
        PYTHON,
        [
          "-c",
          `
import importlib.util
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('paths', ${JSON.stringify(helper)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parent = Path(${JSON.stringify(project)}).resolve()
child = parent / 'child'
marker = child / '.trellis'
marker.mkdir(parents=True)
valid = ${JSON.stringify(marker)}
if valid == 'config.yaml': (marker / valid).write_text('marker', encoding='utf-8')
if valid == 'scripts': (marker / valid).mkdir()
denied = {marker / 'workflow.md'}
if valid != 'config.yaml': denied.add(marker / 'config.yaml')
original = Path.is_file
def probe(candidate):
    if candidate in denied: raise PermissionError('isolated internal marker stat failure')
    return original(candidate)
with patch.object(Path, 'is_file', probe):
    expected = parent if valid == 'none' else child
    assert module.find_trellis_root(child) == expected, valid
`,
        ],
        { cwd: project, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    },
  );

  it.each(["marker-directory", "marker-file"])(
    "continues past an unreadable invalid nearer %s to an accessible valid parent",
    (failure) => {
      workspace(project, "parent");
      const helper = path.join(
        installed,
        ".claude/hooks/trellis_hook_paths.py",
      );
      const result = spawnSync(
        PYTHON,
        [
          "-c",
          `
import importlib.util
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('paths', ${JSON.stringify(helper)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parent = Path(${JSON.stringify(project)}).resolve()
child = parent / 'child'
(child / '.trellis').mkdir(parents=True)
method = 'is_dir' if ${JSON.stringify(failure)} == 'marker-directory' else 'is_file'
denied = child / '.trellis'
if method == 'is_file': denied /= 'workflow.md'
original = getattr(Path, method)
def probe(candidate):
    if candidate == denied: raise PermissionError('isolated unreadable invalid marker')
    return original(candidate)
with patch.object(Path, method, probe):
    assert module.find_trellis_root(child) == parent
`,
        ],
        { cwd: project, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    },
  );

  it("walks inclusively through the filesystem root and fails soft on path errors without drive writes", () => {
    const helper = path.join(installed, ".claude/hooks/trellis_hook_paths.py");
    const result = spawnSync(
      PYTHON,
      [
        "-c",
        `
import importlib.util
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('paths', ${JSON.stringify(helper)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
anchor = Path.cwd().anchor
root = Path(anchor)
with patch.object(Path, 'is_dir', lambda p: p == root / '.trellis'), patch.object(Path, 'is_file', lambda p: p == root / '.trellis' / 'workflow.md'):
    assert module.find_trellis_root(root / 'nested' / 'deep') == root
with patch.object(Path, 'resolve', side_effect=OSError('unavailable')):
    assert module.find_trellis_root(root) is None
with patch.object(Path, 'resolve', side_effect=RuntimeError('symlink loop')):
    assert module.find_trellis_root(root) is None
`,
      ],
      { cwd: sandbox, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
  });
});
