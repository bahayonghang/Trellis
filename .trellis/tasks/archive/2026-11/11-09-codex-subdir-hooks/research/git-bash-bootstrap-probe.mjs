// Run from repository root after build; pass the installed Git Bash executable.
// This probes shell launching only and never starts a Codex host session.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import console from "node:console";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const bash = process.argv[2];
assert.ok(bash, "Pass the installed Git Bash executable path");
const cli = path.resolve("packages/cli/bin/trellis.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis Git Bash 中文 "));
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) =>
      !name.endsWith("_PROJECT_DIR") &&
      name !== "TRELLIS_CONTEXT_ID" &&
      name !== "CLAUDE_ENV_FILE" &&
      !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(
        name,
      ),
  ),
);
env.PYTHONDONTWRITEBYTECODE = "1";
env.PYTHONUTF8 = "1";

function run(executable, args, cwd, input = "") {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    input,
    encoding: "utf-8",
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stderr, "", "Unexpected shell/hook stderr");
  return result.stdout;
}

function put(relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

try {
  // Trust/setup notices are expected during init; only hooks must stay quiet.
  const initialized = spawnSync(
    process.execPath,
    [cli, "init", "--yes", "--codex", "--user", "git-bash-probe"],
    { cwd: root, env, encoding: "utf-8", input: "" },
  );
  assert.ifError(initialized.error);
  assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr);
  const config = JSON.parse(
    fs.readFileSync(path.join(root, ".codex/hooks.json"), "utf-8"),
  );
  put(
    ".trellis/workflow.md",
    "# Workflow\n## Phase Index\n[workflow-state:in_progress]\nGit-Bash-breadcrumb\n[/workflow-state:in_progress]\n",
  );
  const task = ".trellis/tasks/git-bash-probe";
  put(
    `${task}/task.json`,
    JSON.stringify({ id: "git-bash-probe", status: "in_progress" }),
  );
  put(`${task}/prd.md`, "Git-Bash-PRD-CONTENT\n");
  put(
    `${task}/implement.jsonl`,
    JSON.stringify({ file: ".trellis/config.yaml", reason: "shell probe" }) +
      "\n",
  );
  put(
    ".trellis/.runtime/sessions/codex_git-bash-parent.json",
    JSON.stringify({ current_task: task }),
  );
  const child = path.join(root, "packages/cli/src");
  fs.mkdirSync(child, { recursive: true });
  const results = [];
  for (const [layout, cwd] of [
    ["root", root],
    ["subdirectory", child],
  ]) {
    const runtime = JSON.parse(
      run(
        bash,
        [
          "-lc",
          "python -c 'import json,os,sys;print(json.dumps(dict(cwd=os.getcwd(),python=sys.version.split()[0])))'",
        ],
        cwd,
      ),
    );
    assert.equal(path.resolve(runtime.cwd), cwd, "Login shell changed cwd");
    assert.match(runtime.python, /^3\.9\./);
    for (const event of ["UserPromptSubmit", "SubagentStart"]) {
      const command = config.hooks[event][0].hooks[0].command;
      const output = JSON.parse(
        run(
          bash,
          ["-lc", command],
          cwd,
          JSON.stringify({
            cwd,
            session_id: "git-bash-parent",
            hook_event_name: event,
            agent_type: "trellis-implement",
            prompt: "Git Bash bootstrap probe",
          }),
        ),
      );
      assert.equal(output.hookSpecificOutput.hookEventName, event);
      assert.ok(
        output.hookSpecificOutput.additionalContext.includes(
          event === "UserPromptSubmit"
            ? "Git-Bash-breadcrumb"
            : "Git-Bash-PRD-CONTENT",
        ),
      );
      results.push({
        layout,
        event,
        python: runtime.python,
        actualContext: true,
      });
    }
  }
  assert.equal(results.length, 4);
  console.log(JSON.stringify({ shell: bash, mode: "-lc", results }, null, 2));
} finally {
  assert.equal(path.dirname(root), os.tmpdir());
  fs.rmSync(root, { recursive: true, force: true });
}
