// Actual built CLI reproduction. This does not start Codex or OMP hosts.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Run from the repository root; this path remains valid after task archival.
const cli = path.resolve("packages/cli/bin/trellis.js");
const repo = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-crlf-update-"));
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(name) &&
  !/^(CLAUDE_ENV_FILE|.*_PROJECT_DIR|PI_SESSION_ID|PI_SESSIONID|PI_SUBAGENT_PARENT_SESSION)$/.test(name)));
env.TRELLIS_CONTEXT_ID = "crlf_update_reproduction";
env.PYTHONDONTWRITEBYTECODE = "1";
env.PYTHONUTF8 = "1";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repo, env, encoding: "utf-8" });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

function body(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, "");
}

try {
  run("git", ["init", "-q"]);
  run(process.execPath, [cli, "init", "--yes", "--codex", "--omp", "--user", "crlf-smoke"]);
  const agent = path.join(repo, ".codex/agents/trellis-implement.toml");
  const omp = path.join(repo, ".omp/commands/trellis-continue.md");
  const agentBefore = fs.readFileSync(agent, "utf-8")
    .replace(/^(sandbox_mode = "[^"]+")$/m,
      '$1\nmodel = "crlf-model-sentinel"\nmodel_reasoning_effort = "high"')
    .replace(/\r?\n/g, "\r\n");
  const ompBefore = fs.readFileSync(omp, "utf-8").replace(/\r?\n/g, "\r\n");
  fs.writeFileSync(agent, agentBefore);
  fs.writeFileSync(omp, ompBefore);
  run(process.execPath, [cli, "update", "--force"]);
  const agentAfter = fs.readFileSync(agent, "utf-8");
  const ompAfter = fs.readFileSync(omp, "utf-8");
  console.log(JSON.stringify({
    runtime: { platform: process.platform, node: process.versions.node },
    agent: {
      inputCRLF: agentBefore.includes("\r\n"),
      modelPreserved: /^model = "crlf-model-sentinel"$/m.test(agentAfter),
      effortPreserved: /^model_reasoning_effort = "high"$/m.test(agentAfter),
      outputCRLF: agentAfter.includes("\r\n"),
    },
    omp: {
      inputCRLF: ompBefore.includes("\r\n"),
      bodyByteIdentical: body(ompBefore) === body(ompAfter),
      bodyBytesBefore: Buffer.byteLength(body(ompBefore)),
      bodyBytesAfter: Buffer.byteLength(body(ompAfter)),
      bodySha256Before: createHash("sha256").update(body(ompBefore)).digest("hex"),
      bodySha256After: createHash("sha256").update(body(ompAfter)).digest("hex"),
      bodyEqualAfterEolNormalization: body(ompBefore).replace(/\r\n/g, "\n") === body(ompAfter).replace(/\r\n/g, "\n"),
      leadingTitleBefore: /^# /.test(body(ompBefore)),
      leadingTitleAfter: /^# /.test(body(ompAfter)),
      outputCRLF: ompAfter.includes("\r\n"),
    },
  }, null, 2));
} finally {
  assert.equal(path.dirname(repo), os.tmpdir());
  fs.rmSync(repo, { recursive: true, force: true });
}
