import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectPlatformTemplates } from "../../src/configurators/index.js";
import { getCodexHookBootstrapSource } from "../../src/templates/codex/index.js";

const TEMPLATES = fileURLToPath(
  new URL("../../src/templates/", import.meta.url),
);
const PYTHON = process.platform === "win32" ? "python" : "python3";
const SHELLS = process.platform === "win32" ? ["cmd", "pwsh"] : ["posix"];
const EVENTS = ["UserPromptSubmit", "SubagentStart"] as const;
type Event = (typeof EVENTS)[number];
let base: string;
let root: string;

function put(project: string, relative: string, content: string): void {
  const target = path.join(project, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function workspace(project: string, label = "portable"): void {
  fs.cpSync(
    path.join(TEMPLATES, "trellis/scripts"),
    path.join(project, ".trellis/scripts"),
    { recursive: true },
  );
  for (const [name, content] of collectPlatformTemplates("codex") ?? []) {
    if (name.startsWith(".codex/hooks/")) put(project, name, content);
  }
  put(project, ".trellis/config.yaml", "# launcher fixture\n");
  put(
    project,
    ".trellis/workflow.md",
    `# Workflow\n## Phase Index\n${label}-workflow\n[workflow-state:in_progress]\n${label}-breadcrumb\n[/workflow-state:in_progress]\n`,
  );
  const task = ".trellis/tasks/portable-task";
  put(
    project,
    `${task}/task.json`,
    JSON.stringify({
      id: "portable-task",
      title: label,
      status: "in_progress",
    }),
  );
  put(project, `${task}/prd.md`, `${label}-PRD-CONTENT\n`);
  put(
    project,
    `${task}/implement.jsonl`,
    JSON.stringify({
      file: ".trellis/config.yaml",
      reason: "launcher fixture",
    }) + "\n",
  );
  put(
    project,
    ".trellis/.runtime/sessions/codex_portable-parent.json",
    JSON.stringify({ current_task: task }),
  );
}

function command(event: Event): string {
  const hooks = collectPlatformTemplates("codex")?.get(".codex/hooks.json");
  if (!hooks) throw new Error("Codex hooks config missing");
  const parsed = JSON.parse(hooks) as {
    hooks: Record<Event, { hooks: { command: string }[] }[]>;
  };
  return parsed.hooks[event][0].hooks[0].command;
}

function shellArgs(shell: string, hookCommand: string): [string, string[]] {
  if (shell === "cmd") {
    // Match Codex 0.167.0 Windows raw_arg: cmd /C "<whole command>".
    // Python forwards the raw Windows command line and leaves stdin untouched.
    return [
      PYTHON,
      [
        "-c",
        'import os,subprocess,sys;sys.exit(subprocess.call(chr(34)+os.environ.get("COMSPEC","cmd.exe")+chr(34)+" /C "+chr(34)+sys.argv[1]+chr(34)))',
        hookCommand,
      ],
    ];
  }
  if (shell === "pwsh")
    return ["pwsh", ["-NoProfile", "-NonInteractive", "-Command", hookCommand]];
  return ["/bin/sh", ["-lc", hookCommand]];
}

function fixtureEnv(): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) =>
          !name.endsWith("_PROJECT_DIR") &&
          name !== "TRELLIS_CONTEXT_ID" &&
          name !== "CLAUDE_ENV_FILE" &&
          !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(
            name,
          ),
      ),
    ),
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONIOENCODING: "utf-8",
  };
}

function payload(event: Event, cwd: string): string {
  return JSON.stringify({
    cwd,
    session_id: "portable-parent",
    hook_event_name: event,
    agent_type: "trellis-implement",
    prompt: "launcher-control",
  });
}

function run(
  shell: string,
  event: Event,
  cwd: string,
): { status: number | null; stdout: string; stderr: string } {
  const [executable, args] = shellArgs(shell, command(event));
  const result = spawnSync(executable, args, {
    cwd,
    env: fixtureEnv(),
    input: payload(event, cwd),
    encoding: "utf-8",
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function runPipe(
  shell: string,
  event: Event,
  input: string | null,
  open = false,
  delay = 0,
  direct = false,
): Promise<{
  status: number | null;
  stdout: string;
  stderr: string;
  killed: boolean;
}> {
  const cwd = path.join(root, "src");
  fs.mkdirSync(cwd, { recursive: true });
  const [executable, args] = direct
    ? [
        PYTHON,
        [
          "-X",
          "utf8",
          path.join(
            root,
            ".codex/hooks",
            event === "UserPromptSubmit"
              ? "inject-workflow-state.py"
              : "inject-subagent-context.py",
          ),
        ],
      ]
    : shellArgs(shell, command(event));
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: { ...fixtureEnv(), TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "1.2" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let killed = false;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.stdin.on("error", () => {
      /* Native fail-open may precede delayed input. */
    });
    child.on("error", reject);
    const safety = setTimeout(() => {
      killed = true;
      child.kill();
    }, 5000);
    const send = setTimeout(() => {
      if (input !== null) child.stdin.write(input);
      if (!open) child.stdin.end();
    }, delay);
    child.on("close", (status) => {
      clearTimeout(safety);
      clearTimeout(send);
      child.stdin.destroy();
      resolve({ status, stdout, stderr, killed });
    });
  });
}

function expectContext(
  shell: string,
  event: Event,
  cwd: string,
  label = "portable",
): void {
  const result = run(shell, event, cwd);
  expect(result.status, result.stderr).toBe(0);
  const output = JSON.parse(result.stdout) as {
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };
  expect(output.hookSpecificOutput.hookEventName).toBe(event);
  expect(output.hookSpecificOutput.additionalContext).toContain(
    event === "UserPromptSubmit"
      ? `${label}-breadcrumb`
      : `${label}-PRD-CONTENT`,
  );
}

describe("actual generated Codex hook launch commands", () => {
  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-launcher-"));
    root = path.join(base, "project");
    workspace(root);
  });
  afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

  for (const shell of SHELLS) {
    for (const event of EVENTS) {
      it(`${shell} ${event} root control injects actual context`, () =>
        expectContext(shell, event, root));
      it(`${shell} ${event} subdirectory injects actual context`, () => {
        const cwd = path.join(root, "packages/cli/src");
        fs.mkdirSync(cwd, { recursive: true });
        expectContext(shell, event, cwd);
      });
      it(`${shell} ${event} crosses a nested Git boundary`, () => {
        const cwd = path.join(root, "nested/src");
        fs.mkdirSync(cwd, { recursive: true });
        execFileSync("git", ["init", "-q", path.dirname(cwd)], {
          env: fixtureEnv(),
        });
        expectContext(shell, event, cwd);
      });
      it(`${shell} ${event} selects the nearest workspace in a real worktree`, () => {
        const gitRoot = path.join(base, "git-owner");
        execFileSync("git", ["init", "-q", gitRoot], { env: fixtureEnv() });
        execFileSync(
          "git",
          [
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "-c",
            "commit.gpgsign=false",
            "-C",
            gitRoot,
            "commit",
            "--allow-empty",
            "-qm",
            "fixture",
          ],
          { env: fixtureEnv() },
        );
        const worktree = path.join(root, "nested-worktree");
        execFileSync(
          "git",
          ["-C", gitRoot, "worktree", "add", "--detach", "-q", worktree],
          { env: fixtureEnv() },
        );
        workspace(worktree, "nearest");
        const cwd = path.join(worktree, "src");
        fs.mkdirSync(cwd);
        expectContext(shell, event, cwd, "nearest");
      });
      it(`${shell} ${event} supports Chinese and space paths without Git`, () => {
        const project = path.join(base, "中文 空间");
        workspace(project);
        const cwd = path.join(project, "子 目录");
        fs.mkdirSync(cwd);
        expectContext(shell, event, cwd);
      });
      it(`${shell} ${event} does not borrow an outer entry from a partial nearest root`, () => {
        const cwd = path.join(root, "partial/src");
        fs.mkdirSync(cwd, { recursive: true });
        put(path.dirname(cwd), ".trellis/workflow.md", "# nearest marker\n");
        expect(run(shell, event, cwd)).toEqual({
          status: 0,
          stdout: "",
          stderr: "",
        });
      });
      it(`${shell} ${event} remains isolated when the nearest helper is missing`, () => {
        const project = path.join(root, "partial");
        workspace(project, "nearest");
        fs.unlinkSync(path.join(project, ".codex/hooks/trellis_hook_paths.py"));
        expect(run(shell, event, project)).toEqual({
          status: 0,
          stdout: "",
          stderr: "",
        });
      });
      for (const [input, name] of [
        ["", "EOF"],
        ["{secret-broken", "malformed JSON"],
        [null, "open empty pipe"],
      ] as const) {
        it(`${shell} ${event} preserves bounded ${name} intake`, async () => {
          const control = await runPipe(
            shell,
            event,
            input,
            input === null,
            0,
            true,
          );
          const result = await runPipe(shell, event, input, input === null);
          expect(control.status, control.stderr).toBe(0);
          expect(control.killed).toBe(false);
          expect(result).toEqual(control);
          if (event === "UserPromptSubmit")
            expect(result.stdout).toContain("Status: no_task");
          else expect(result.stdout).toBe("");
        });
      }
      it(`${shell} ${event} preserves delayed context while the pipe stays open`, async () => {
        const cwd = path.join(root, "src");
        const result = await runPipe(
          shell,
          event,
          payload(event, cwd),
          true,
          200,
        );
        expect(result.status, result.stderr).toBe(0);
        expect(result.killed).toBe(false);
        expect(result.stderr).toBe("");
        const output = JSON.parse(result.stdout) as {
          hookSpecificOutput: { additionalContext: string };
        };
        expect(output.hookSpecificOutput.additionalContext).toContain(
          event === "UserPromptSubmit"
            ? "portable-breadcrumb"
            : "portable-PRD-CONTENT",
        );
      });
    }
  }

  it("embeds exact canonical source and a fixed dispatcher under the cmd limit", () => {
    const canonical = fs.readFileSync(
      path.join(TEMPLATES, "shared-hooks/trellis_hook_paths.py"),
      "utf-8",
    );
    const source = getCodexHookBootstrapSource();
    expect(source.slice(0, canonical.length)).toBe(canonical);
    expect(source).not.toContain("stdin");
    expect(source).not.toContain("chdir(");
    for (const event of EVENTS) {
      const generated = command(event);
      expect(generated.length).toBeLessThan(8191);
      const encoded = generated.match(/b64decode\('([A-Za-z0-9+/=]+)'\)/)?.[1];
      expect(encoded).toBeDefined();
      expect(Buffer.from(encoded ?? "", "base64").toString("utf-8")).toBe(
        source,
      );
      expect(generated).toMatch(
        / \.codex\/hooks\/inject-(workflow-state|subagent-context)\.py$/,
      );
    }
    const compile = spawnSync(
      PYTHON,
      ["-c", "import sys;compile(sys.argv[1], '<bootstrap>', 'exec')", source],
      { encoding: "utf-8" },
    );
    expect(compile.status, compile.stderr).toBe(0);
    const invalid = spawnSync(PYTHON, ["-c", source, "unowned.py"], {
      cwd: root,
      input: "{bad",
      encoding: "utf-8",
    });
    expect(invalid.status, invalid.stderr).toBe(0);
    expect(invalid.stdout).toBe("");
  });
});
