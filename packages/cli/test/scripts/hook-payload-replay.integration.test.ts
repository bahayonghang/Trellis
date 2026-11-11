import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectPlatformTemplates } from "../../src/configurators/index.js";

const TEMPLATES = fileURLToPath(
  new URL("../../src/templates/", import.meta.url),
);
const FIXTURES = fileURLToPath(
  new URL("../fixtures/hook-payloads/", import.meta.url),
);
const PYTHON = process.platform === "win32" ? "python" : "python3";
const SHELLS = process.platform === "win32" ? ["cmd", "pwsh"] : ["posix"];
const TASK = ".trellis/tasks/replay-task";
const CLAUDE = [
  "claude-code/2.1.62/session-start.json",
  "claude-code/2.1.62/user-prompt-submit.json",
  "claude-code/2.1.62/pre-tool-use-task.json",
  "claude-code/2.1.63/pre-tool-use-agent.json",
  "claude-code/2.1.286/pre-tool-use-agent.json",
];
const CODEX = [
  "codex/0.167.1/user-prompt-submit.json",
  "codex/0.167.1/subagent-start.json",
];
type Payload = Record<string, unknown> & {
  cwd: string;
  hook_event_name: string;
  tool_input?: Record<string, unknown>;
};
interface Capture {
  harness: string;
  cliVersion: string;
  event: string;
  payload: Payload;
}
interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision?: string;
    additionalContext?: string;
    updatedInput?: Record<string, unknown> & { prompt: string };
  };
  additional_context?: string;
  updated_input?: Record<string, unknown>;
  updatedInput?: Record<string, unknown>;
}
let base: string;
let root: string;

function capture(name: string): Capture {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES, name), "utf8"),
  ) as Capture;
}

function put(project: string, name: string, content: string): void {
  const dest = path.join(project, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

function fixtureEnv(): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) =>
          !name.endsWith("_PROJECT_DIR") &&
          !name.endsWith("_NON_INTERACTIVE") &&
          ![
            "TRELLIS_CONTEXT_ID",
            "CLAUDE_ENV_FILE",
            "TRELLIS_HOOKS",
            "TRELLIS_DISABLE_HOOKS",
          ].includes(name) &&
          !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(
            name,
          ),
      ),
    ),
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONIOENCODING: "utf-8",
  };
}

function workspace(project: string, crlf = false): void {
  fs.cpSync(
    path.join(TEMPLATES, "trellis/scripts"),
    path.join(project, ".trellis/scripts"),
    { recursive: true },
  );
  for (const platform of ["claude-code", "codex"] as const) {
    for (const [name, content] of collectPlatformTemplates(platform) ?? []) {
      if (
        name.includes("/hooks/") ||
        name === ".codex/hooks.json" ||
        name === ".claude/settings.json"
      )
        put(project, name, content);
    }
  }
  const text = (value: string): string =>
    crlf ? value.replace(/\n/g, "\r\n") : value;
  put(project, ".trellis/config.yaml", "# replay fixture\n");
  put(
    project,
    ".trellis/workflow.md",
    text(
      "# Workflow\n## Phase Index\nREPLAY-WORKFLOW 中文 phase summary\n[workflow-state:in_progress]\nREPLAY-BREADCRUMB 中文 implement step\n[/workflow-state:in_progress]\n[workflow-state:no_task]\nREPLAY-NO-TASK classify first\n[/workflow-state:no_task]\n## Phase 1: Plan\n",
    ),
  );
  put(
    project,
    ".trellis/spec/replay/backend/index.md",
    text("# Replay spec\nREPLAY-SPEC 中文 preserve task ownership\n"),
  );
  put(
    project,
    `${TASK}/task.json`,
    JSON.stringify({
      id: "replay-task",
      title: "replay-title",
      status: "in_progress",
    }),
  );
  put(
    project,
    `${TASK}/prd.md`,
    text("# Replay PRD\nREPLAY-PRD 中文 expected task requirement\n"),
  );
  put(
    project,
    `${TASK}/implement.jsonl`,
    text(
      JSON.stringify({
        file: ".trellis/spec/replay/backend/index.md",
        reason: "captured payload replay",
      }) + "\n",
    ),
  );
  for (const platform of ["claude", "codex"]) {
    put(
      project,
      `.trellis/.runtime/sessions/${platform}_replay-${platform}-parent.json`,
      JSON.stringify({ current_task: TASK }),
    );
  }
}

function command(project: string, item: Capture, payload: Payload): string {
  const config = JSON.parse(
    fs.readFileSync(
      path.join(
        project,
        item.harness === "codex"
          ? ".codex/hooks.json"
          : ".claude/settings.json",
      ),
      "utf8",
    ),
  ) as {
    hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]>;
  };
  const matchValue = String(
    payload.tool_name ?? payload.source ?? payload.agent_type ?? "",
  );
  const entry = config.hooks[item.event].find(
    (row) =>
      !row.matcher ||
      row.matcher === "*" ||
      new RegExp(row.matcher).test(matchValue),
  );
  if (!entry) throw new Error(`Missing configured ${item.event} matcher`);
  return entry.hooks[0].command;
}

function replay(
  item: Capture,
  cwd: string,
  payload: Payload,
  shell = SHELLS[0],
  project = root,
  crlfInput = false,
): { stdout: string; stderr: string; status: number | null } {
  const hookCommand = command(project, item, payload);
  let executable: string;
  let args: string[];
  if (item.harness === "claude-code") {
    // Replay payload cwd independently of the installed script path. This is
    // not an assertion about Claude's native shell working-directory policy.
    expect(hookCommand).toMatch(
      /^(?:python|python3) \.claude\/hooks\/[a-z-]+\.py$/,
    );
    executable = PYTHON;
    args = ["-X", "utf8", path.join(project, hookCommand.split(" ")[1])];
  } else if (shell === "cmd") {
    executable = PYTHON;
    args = [
      "-c",
      'import os,subprocess,sys;sys.exit(subprocess.call(chr(34)+os.environ.get("COMSPEC","cmd.exe")+chr(34)+" /C "+chr(34)+sys.argv[1]+chr(34)))',
      hookCommand,
    ];
  } else if (shell === "pwsh") {
    executable = "pwsh";
    args = ["-NoProfile", "-NonInteractive", "-Command", hookCommand];
  } else {
    executable = "/bin/sh";
    args = ["-lc", hookCommand];
  }
  const input = JSON.stringify(payload, null, 2);
  const result = spawnSync(executable, args, {
    cwd,
    env: fixtureEnv(),
    input: crlfInput ? input.replace(/\n/g, "\r\n") : input,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function withCwd(item: Capture, cwd: string): Payload {
  return { ...item.payload, cwd };
}

function implementation(item: Capture, cwd: string): Payload {
  const payload = withCwd(item, cwd);
  // Explicit derived role variant: captured Claude research / Codex default
  // agent types stay unchanged in the fixture files.
  if (item.harness === "codex") payload.agent_type = "trellis-implement";
  else
    payload.tool_input = {
      ...payload.tool_input,
      subagent_type: "trellis-implement",
    };
  return payload;
}

function assertContext(item: Capture, payload: Payload, stdout: string): void {
  const output = JSON.parse(stdout) as HookOutput;
  const specific = output.hookSpecificOutput;
  expect(specific.hookEventName).toBe(item.event);
  if (item.event === "PreToolUse") {
    expect(specific.permissionDecision).toBe("allow");
    expect(specific.updatedInput).toEqual(output.updated_input);
    expect(specific.updatedInput).toEqual(output.updatedInput);
    expect(specific.updatedInput?.prompt).toContain(
      String(payload.tool_input?.prompt),
    );
    for (const [key, value] of Object.entries(payload.tool_input ?? {}))
      if (key !== "prompt") expect(specific.updatedInput?.[key]).toEqual(value);
    if (payload.tool_input?.subagent_type === "trellis-research") {
      expect(specific.updatedInput?.prompt).toContain("# Research Agent Task");
      expect(specific.updatedInput?.prompt).toContain(".trellis/spec/");
      expect(specific.updatedInput?.prompt).toContain("└── replay/ (backend)");
      return;
    }
  }
  const context =
    item.event === "PreToolUse"
      ? specific.updatedInput?.prompt
      : specific.additionalContext;
  if (item.event === "SessionStart") {
    expect(output.additional_context).toBe(context);
    expect(context).toContain("<session-context>");
    expect(context).toContain("REPLAY-WORKFLOW 中文 phase summary");
    expect(context).toContain(`Current task: ${TASK}; status=in_progress.`);
  } else if (item.event === "UserPromptSubmit") {
    expect(context).toContain("<workflow-state>");
    expect(context).toContain("Task: replay-task (in_progress)");
    expect(context).toContain("REPLAY-BREADCRUMB 中文 implement step");
  } else {
    expect(context).toContain("<!-- trellis-hook-injected -->");
    expect(context).toContain("REPLAY-PRD 中文 expected task requirement");
    expect(context).toContain("REPLAY-SPEC 中文 preserve task ownership");
  }
}

describe("versioned Claude/Codex hook payload replay (not native host acceptance)", () => {
  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-payload-replay-"));
    root = path.join(base, "project");
    workspace(root);
  });
  afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

  for (const name of [...CLAUDE, ...CODEX]) {
    const item = capture(name);
    const shells = item.harness === "codex" ? SHELLS : ["direct"];
    for (const shell of shells) {
      for (const layout of [
        "root",
        "subdirectory",
        "nested-git",
        "中文 space CRLF",
      ]) {
        it(`${name} ${shell}: ${item.event === "SubagentStart" ? "derived implement role in" : "captured shape in derived"} ${layout} layout`, () => {
          let project = root;
          let cwd = root;
          if (layout === "中文 space CRLF") {
            project = path.join(base, "中文 空间");
            workspace(project, true);
            cwd = path.join(project, "子 目录");
          } else if (layout !== "root") cwd = path.join(root, layout, "src");
          fs.mkdirSync(cwd, { recursive: true });
          if (layout === "nested-git")
            execFileSync("git", ["init", "-q", path.dirname(cwd)], {
              env: fixtureEnv(),
            });
          const payload =
            item.event === "SubagentStart"
              ? implementation(item, cwd)
              : withCwd(item, cwd);
          const result = replay(
            item,
            cwd,
            payload,
            shell,
            project,
            layout === "中文 space CRLF",
          );
          expect(result.status, result.stderr).toBe(0);
          expect(result.stderr).toBe("");
          assertContext(item, payload, result.stdout);
        });
      }
      if (["PreToolUse", "SubagentStart"].includes(item.event)) {
        it(`${name} ${shell}: derived implement role injects PRD and curated spec bytes`, () => {
          const payload = implementation(item, root);
          const result = replay(item, root, payload, shell);
          expect(result.status, result.stderr).toBe(0);
          expect(result.stderr).toBe("");
          assertContext(item, payload, result.stdout);
        });
      }
      it(`${name} ${shell}: derived missing identity never borrows another session task`, () => {
        const payload = ["PreToolUse", "SubagentStart"].includes(item.event)
          ? implementation(item, root)
          : withCwd(item, root);
        delete payload.session_id;
        delete payload.turn_id;
        delete payload.agent_id;
        delete payload.transcript_path;
        const result = replay(item, root, payload, shell);
        expect(result.status, result.stderr).toBe(0);
        expect(result.stderr).toBe("");
        if (["PreToolUse", "SubagentStart"].includes(item.event))
          expect(result.stdout).toBe("");
        else {
          const output = JSON.parse(result.stdout) as HookOutput;
          const context = output.hookSpecificOutput.additionalContext;
          expect(context).not.toContain("REPLAY-PRD");
          expect(context).not.toContain("REPLAY-BREADCRUMB");
          expect(context).toContain(
            item.event === "SessionStart"
              ? "Status: NO ACTIVE TASK"
              : "REPLAY-NO-TASK classify first",
          );
        }
      });
    }
  }

  it("captured Codex default role is excluded by the configured matcher and direct hook guard", () => {
    const item = capture(CODEX[1]);
    const payload = withCwd(item, root);
    expect(() => command(root, item, payload)).toThrow(
      "Missing configured SubagentStart matcher",
    );
    const result = spawnSync(
      PYTHON,
      [
        "-X",
        "utf8",
        path.join(root, ".codex/hooks/inject-subagent-context.py"),
      ],
      {
        cwd: root,
        env: fixtureEnv(),
        input: JSON.stringify(payload),
        encoding: "utf8",
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  for (const name of [CLAUDE[0], CLAUDE[1], CLAUDE[2], CODEX[0], CODEX[1]]) {
    it(`${name}: context oracle rejects actual hook output with its context field removed`, () => {
      const item = capture(name);
      const payload = ["PreToolUse", "SubagentStart"].includes(item.event)
        ? implementation(item, root)
        : withCwd(item, root);
      const result = replay(item, root, payload);
      expect(result.status, result.stderr).toBe(0);
      assertContext(item, payload, result.stdout);
      const script =
        item.event === "SessionStart"
          ? "session-start.py"
          : item.event === "UserPromptSubmit"
            ? "inject-workflow-state.py"
            : "inject-subagent-context.py";
      const installed = path.join(
        root,
        item.harness === "codex" ? ".codex/hooks" : ".claude/hooks",
        script,
      );
      const source = fs.readFileSync(installed, "utf8");
      const field =
        item.event === "PreToolUse" ? "updatedInput" : "additionalContext";
      expect(source).toContain(`"${field}":`);
      // Mutate only this disposable installed script, then rerun the real process.
      fs.writeFileSync(
        installed,
        source.replaceAll(`"${field}":`, '"removedContext":'),
      );
      const mutated = replay(item, root, payload);
      expect(mutated.status, mutated.stderr).toBe(0);
      expect(mutated.stderr).toBe("");
      expect(() => assertContext(item, payload, mutated.stdout)).toThrow();
    });
  }
});
