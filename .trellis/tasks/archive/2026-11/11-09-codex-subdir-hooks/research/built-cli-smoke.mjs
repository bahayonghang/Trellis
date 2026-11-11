// Run from repository root after build. No Codex host or real repo update.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const cli = path.resolve("packages/cli/bin/trellis.js");
const repo = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-codex-built-"));
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(name) &&
  !name.endsWith("_PROJECT_DIR") && name !== "CLAUDE_ENV_FILE" && name !== "TRELLIS_ALLOW_DIRTY_UNINSTALL"));
env.TRELLIS_CONTEXT_ID = "codex_built_fixture";
env.PYTHONDONTWRITEBYTECODE = "1";
env.PYTHONUTF8 = "1";

function run(command, args, status = 0) {
  const result = spawnSync(command, args, { cwd: repo, env, encoding: "utf-8", input: "" });
  assert.ifError(result.error);
  assert.equal(result.status, status, result.stdout + result.stderr);
  return result.stdout + result.stderr;
}
function snapshot() {
  const files = new Map();
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.set(path.relative(repo, full), fs.readFileSync(full));
    }
  }
  walk(repo);
  return files;
}

try {
  run("git", ["init", "-q"]);
  run(process.execPath, [cli, "init", "--yes", "--codex", "--user", "built-smoke"]);
  const hooks = path.join(repo, ".codex/hooks.json");
  const fresh = JSON.parse(fs.readFileSync(hooks, "utf-8"));
  assert.equal(Object.keys(fresh.hooks).length, 2);
  assert.ok(fresh.hooks.UserPromptSubmit[0].hooks[0].command.includes(" -c "));
  const legacy = JSON.stringify({
    user: true,
    hooks: { UserPromptSubmit: [{ hooks: [
      { type: "command", command: "python3 -X utf8 .codex/hooks/inject-workflow-state.py", timeout: 23 },
      { type: "command", command: "echo user", timeout: 7 },
    ] }] },
  }, null, 2) + "\n";
  fs.writeFileSync(hooks, legacy);
  const before = snapshot();
  run(process.execPath, [cli, "update", "--dry-run"]);
  assert.deepEqual(snapshot(), before);
  run(process.execPath, [cli, "update", "--force"]);
  const migrated = JSON.parse(fs.readFileSync(hooks, "utf-8"));
  assert.equal(migrated.user, true);
  assert.equal(migrated.hooks.UserPromptSubmit[0].hooks[0].timeout, 23);
  assert.ok(migrated.hooks.UserPromptSubmit[0].hooks[0].command.includes(" -c "));
  assert.equal(migrated.hooks.UserPromptSubmit[0].hooks[1].command, "echo user");
  const after = snapshot();
  run(process.execPath, [cli, "update", "--force"]);
  assert.deepEqual(snapshot(), after);
  const uninstall = run(process.execPath, [cli, "uninstall", "--dry-run"]);
  assert.match(uninstall, /hooks\.json/);
  assert.deepEqual(snapshot(), after);
  const refusal = run(process.execPath, [cli, "uninstall"], 1);
  assert.match(refusal, /Refusing to prompt/);
  assert.deepEqual(snapshot(), after);
  console.log("Built CLI init/migration/dry-run/no-op/uninstall-preview/refusal passed; no real host acceptance.");
} finally {
  assert.equal(path.dirname(repo), os.tmpdir());
  fs.rmSync(repo, { recursive: true, force: true });
}
