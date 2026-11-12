// Standalone so the built CLI's Node 18.17 floor can run without Vitest 4.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import console from "node:console";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const cli = fileURLToPath(new URL("../bin/trellis.js", import.meta.url));
const python = process.platform === "win32" ? "python" : "python3";
const repo = fs.mkdtempSync(path.join(os.tmpdir(), "trellis 中文 smoke "));
const env = { ...process.env };
for (const name of [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "CLAUDE_ENV_FILE",
  "CLAUDE_PROJECT_DIR",
  "QODER_PROJECT_DIR",
  "CODEBUDDY_PROJECT_DIR",
  "FACTORY_PROJECT_DIR",
  "CURSOR_PROJECT_DIR",
  "GEMINI_PROJECT_DIR",
  "KIRO_PROJECT_DIR",
  "COPILOT_PROJECT_DIR",
  "PI_SESSION_ID",
  "PI_SESSIONID",
  "PI_SUBAGENT_PARENT_SESSION",
])
  Reflect.deleteProperty(env, name);
env.TRELLIS_CONTEXT_ID = "ci_smoke";
env.PYTHONDONTWRITEBYTECODE = "1";
env.PYTHONUTF8 = "1";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repo,
    env,
    encoding: "utf-8",
  });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}

function task(...args) {
  return run(python, ["-B", ".trellis/scripts/task.py", ...args]);
}

function snapshot(directory = repo) {
  const files = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(files, snapshot(full));
    else
      files[path.relative(repo, full)] = fs
        .readFileSync(full)
        .toString("base64");
  }
  return files;
}

try {
  run("git", ["init", "-q", "-b", "main"]);
  run("git", ["config", "user.name", "CI Smoke"]);
  run("git", ["config", "user.email", "ci-smoke@example.invalid"]);
  run("git", [
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--allow-empty",
    "-qm",
    "fixture",
  ]);
  run("git", ["checkout", "-qb", "ci-smoke"]);
  run(process.execPath, [
    cli,
    "init",
    "--yes",
    "--codex",
    "--user",
    "ci-smoke",
  ]);
  assert.ok(fs.existsSync(path.join(repo, ".codex/hooks.json")));

  const workflow = path.join(repo, ".trellis/workflow.md");
  fs.writeFileSync(
    workflow,
    fs.readFileSync(workflow, "utf-8").replace(/\r?\n/g, "\r\n") +
      "\r\nCI smoke user modification\r\n",
  );
  assert.ok(fs.readFileSync(workflow, "utf-8").includes("\r\n"));

  task(
    "create",
    "CI smoke",
    "--slug",
    "ci-smoke",
    "--description",
    "Exercise native Python task lifecycle",
    "--base-branch",
    "main",
    "--no-start",
  );
  const tasks = path.join(repo, ".trellis/tasks");
  const names = fs
    .readdirSync(tasks)
    .filter((name) => name.endsWith("-ci-smoke"));
  assert.equal(names.length, 1);
  const taskDir = `.trellis/tasks/${names[0]}`;
  fs.writeFileSync(
    path.join(repo, taskDir, "prd.md"),
    "# CI smoke\nVerify task lifecycle.\n",
  );
  for (const manifest of ["implement", "check"]) {
    task(
      "add-context",
      taskDir,
      manifest,
      ".trellis/workflow.md",
      "CI smoke context",
    );
  }
  task("start", taskDir);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(repo, taskDir, "task.json"), "utf-8"))
      .status,
    "in_progress",
  );
  assert.equal(task("current"), taskDir);
  assert.match(task("validate", taskDir), /All validations passed/);
  task("archive", taskDir, "--no-commit");
  assert.equal(fs.existsSync(path.join(repo, taskDir)), false);
  const archive = path.join(tasks, "archive");
  const archived = fs
    .readdirSync(archive)
    .map((month) => path.join(archive, month, names[0]))
    .filter((directory) => fs.existsSync(directory));
  assert.equal(archived.length, 1);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(archived[0], "task.json"), "utf-8"))
      .status,
    "completed",
  );
  const current = spawnSync(
    python,
    ["-B", ".trellis/scripts/task.py", "current", "--json"],
    { cwd: repo, env, encoding: "utf-8" },
  );
  assert.ifError(current.error);
  // An absent current task intentionally returns exit status 1, including JSON.
  assert.equal(current.status, 1);
  assert.equal(JSON.parse(current.stdout).current_task, null);

  const before = snapshot();
  const output = run(process.execPath, [cli, "update", "--dry-run"]);
  assert.match(output, /workflow\.md/);
  assert.deepEqual(
    snapshot(),
    before,
    "update --dry-run changed project bytes",
  );
  console.log(
    `CLI smoke passed: ${process.platform}, Node ${process.versions.node}, ${repo}`,
  );
} finally {
  // repo is created by mkdtemp under the OS temp directory, never user input.
  assert.equal(path.dirname(repo), os.tmpdir());
  fs.rmSync(repo, { recursive: true, force: true });
}
