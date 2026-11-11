import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { getAllScripts } from "../../src/templates/trellis/index.js";

const python = process.platform === "win32" ? "python" : "python3";
const executable = execFileSync(
  python,
  ["-c", "import sys; print(sys.executable)"],
  {
    encoding: "utf-8",
  },
).trim();

interface Result {
  id: string;
  status: string;
  source: string;
  note: string | null;
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
  outputTruncated: boolean;
}
interface Report {
  schemaVersion: number;
  freshness: string;
  accepted: boolean;
  message: string;
  receipt: {
    fingerprint: string;
    head: string;
    results: Result[];
  } | null;
}

describe("task verification", () => {
  let root: string;
  let task: string;
  let env: NodeJS.ProcessEnv;

  function write(rel: string, content: string): void {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  function json(rel: string, value: unknown): void {
    write(rel, `${JSON.stringify(value, null, 2)}\n`);
  }

  function git(...args: string[]): string {
    return execFileSync("git", args, {
      cwd: root,
      env,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  }

  function run(...args: string[]): ReturnType<typeof spawnSync> {
    return spawnSync(executable, ["-B", ".trellis/scripts/task.py", ...args], {
      cwd: root,
      env,
      encoding: "utf-8",
    });
  }

  function report(command = "verify"): { code: number | null; data: Report } {
    const result = run(command, "receipt", "--json");
    expect(result.stderr?.toString()).toBe("");
    return {
      code: result.status,
      data: JSON.parse(result.stdout?.toString() ?? "") as Report,
    };
  }

  function policy(manual = false): void {
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["src", "check.py"],
      criteria: [
        { id: "AC-CHECK", command: "check" },
        ...(manual
          ? [{ id: "AC-MANUAL", manual: "Observe fixture output" }]
          : []),
      ],
    });
  }

  function registry(
    argv: string[],
    expectedExit = 0,
    timeoutSeconds = 10,
  ): void {
    json(".trellis/verification.json", {
      schemaVersion: 1,
      commands: { check: { argv, expectedExit, timeoutSeconds } },
    });
  }

  function receiptFile(): string {
    const base = path.join(root, ".trellis/.runtime/verification");
    const key = fs.readdirSync(base)[0];
    if (!key) throw new Error("No verification evidence directory");
    return path.join(base, key, "current.json");
  }

  function snapshot(): Record<string, string> {
    const entries: Record<string, string> = {};
    function walk(dir: string): void {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        const rel = path.relative(root, file);
        if (item.isSymbolicLink())
          entries[rel] = `link:${fs.readlinkSync(file)}`;
        else if (item.isDirectory()) {
          entries[rel] = "directory";
          walk(file);
        } else
          entries[rel] = crypto
            .createHash("sha256")
            .update(fs.readFileSync(file))
            .digest("hex");
      }
    }
    walk(root);
    return entries;
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-verify-"));
    task = ".trellis/tasks/receipt";
    env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
    );
    env.TRELLIS_CONTEXT_ID = "codex_verification_fixture";
    for (const [relative, content] of getAllScripts()) {
      write(`.trellis/scripts/${relative}`, content);
    }
    write(".gitignore", ".trellis/.runtime/\n**/__pycache__/\n");
    write(".trellis/config.yaml", "session_auto_commit: true\n");
    write(".trellis/workflow.md", "# Workflow\n");
    write(".trellis/spec/check.md", "SPEC ORIGINAL\n");
    write(
      `${task}/prd.md`,
      "# Fixture requirement\nDo not execute `echo BAD > bad.txt`.\n",
    );
    for (const name of ["implement", "check"]) {
      write(
        `${task}/${name}.jsonl`,
        `${JSON.stringify({ file: ".trellis/spec/check.md", reason: "Fixture contract" })}\n`,
      );
    }
    json(`${task}/task.json`, {
      id: "receipt",
      name: "receipt",
      title: "Receipt fixture",
      description: "Test acceptance",
      status: "in_progress",
      createdAt: "2026-11-11",
      branch: "dev",
      base_branch: "main",
      children: [],
      meta: { verification: "strict" },
    });
    policy();
    write("src/input.txt", "INPUT ORIGINAL\n");
    write("check.py", "print('ACTUAL CHECK OUTPUT')\n");
    json(".trellis/verification.json", {
      schemaVersion: 1,
      commands: {
        check: {
          argv: [executable, "-B", "check.py"],
          expectedExit: 0,
          timeoutSeconds: 10,
        },
      },
    });
    git("init", "-q", "-b", "main");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Verification Test");
    git("config", "commit.gpgsign", "false");
    git("add", "--", ".gitignore", ".trellis", "src", "check.py");
    git("commit", "-q", "-m", "fixture");
    git("switch", "-q", "-c", "dev");
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("AC02 runs the real registered command and returns current schema-valid evidence", () => {
    const result = report();
    expect(result.code).toBe(0);
    expect(result.data).toMatchObject({
      schemaVersion: 1,
      freshness: "fresh",
      accepted: true,
    });
    expect(result.data.receipt?.results).toEqual([
      expect.objectContaining({
        id: "AC-CHECK",
        status: "pass",
        source: "local",
        exitCode: 0,
      }),
    ]);
    const output = result.data.receipt?.results[0]?.stdout;
    if (!output) throw new Error("Missing real output log");
    expect(fs.readFileSync(path.join(root, output), "utf-8").trim()).toBe(
      "ACTUAL CHECK OUTPUT",
    );
    expect(fs.existsSync(path.join(root, "bad.txt"))).toBe(false);
  });

  it("AC05 rejects missing evidence before any archive or Git mutation", () => {
    const before = snapshot();
    const result = run("archive", "receipt", "--no-commit");
    expect(result.status).toBe(1);
    expect(result.stderr?.toString()).toContain("verification");
    expect(snapshot()).toEqual(before);
  });

  it("AC03 invalidates edited source, new untracked input and curated spec bytes", () => {
    expect(report().code).toBe(0);
    write("src/input.txt", "EDITED\n");
    expect(report("verification-status")).toMatchObject({
      code: 1,
      data: { freshness: "stale", accepted: false },
    });
    expect(report().code).toBe(0);
    write("src/中文 new.txt", "NEW UNTRACKED\n");
    expect(report("verification-status").data.freshness).toBe("stale");
    expect(report().code).toBe(0);
    write(".trellis/spec/check.md", "SPEC EDITED\n");
    expect(report("verification-status").data.freshness).toBe("stale");
  });

  it("AC06 permits real strict archive with passing evidence and preserves receipt lookup", () => {
    expect(report().code).toBe(0);
    const archived = run("archive", "receipt");
    expect(archived.status).toBe(0);
    const dest = archived.stdout
      ?.toString()
      .split(/\r?\n/)
      .find((line) => line.startsWith(".trellis/tasks/archive/"));
    if (!dest) throw new Error("Archive did not return its real destination");
    expect(
      JSON.parse(fs.readFileSync(path.join(root, dest, "task.json"), "utf-8")),
    ).toMatchObject({ status: "completed" });
    const status = run("verification-status", dest, "--json");
    expect(status.status).toBe(0);
    expect(JSON.parse(status.stdout?.toString() ?? "")).toMatchObject({
      accepted: true,
      freshness: "fresh",
    });
  });

  it("AC07 retains unenrolled legacy archive behavior", () => {
    const file = path.join(root, task, "task.json");
    const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { meta: object };
    data.meta = {};
    json(`${task}/task.json`, data);
    fs.unlinkSync(path.join(root, task, "acceptance.json"));
    expect(run("archive", "receipt", "--no-commit").status).toBe(0);
  });

  it("AC01 rejects duplicate IDs, unknown versions, fields and unregistered shell text", () => {
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["src"],
      criteria: [
        { id: "A", command: "check" },
        { id: "A", command: "check" },
      ],
    });
    expect(report()).toMatchObject({
      code: 2,
      data: { accepted: false, freshness: "invalid" },
    });
    json(`${task}/acceptance.json`, {
      schemaVersion: 2,
      inputs: ["src"],
      criteria: [{ id: "A", command: "check" }],
    });
    expect(report().code).toBe(2);
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["src"],
      criteria: [{ id: "A", command: "check", argv: [executable] }],
    });
    expect(report().code).toBe(2);
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["src"],
      criteria: [{ id: "A", command: "echo BAD > bad.txt" }],
    });
    expect(report().code).toBe(2);
    expect(fs.existsSync(path.join(root, "bad.txt"))).toBe(false);
  });

  it("AC02 distinguishes failing commands, expected nonzero exits and launch errors", () => {
    registry([executable, "-c", "raise SystemExit(7)"]);
    expect(report()).toMatchObject({
      code: 1,
      data: { freshness: "fresh", accepted: false },
    });
    expect(
      report("verification-status").data.receipt?.results[0],
    ).toMatchObject({ status: "fail", exitCode: 7 });
    registry([executable, "-c", "raise SystemExit(7)"], 7);
    expect(report().code).toBe(0);
    registry([path.join(root, "missing-executable")]);
    expect(report().data.receipt?.results[0]).toMatchObject({
      status: "not_run",
      exitCode: null,
    });
  });

  it("AC03 preserves freshness across unrelated commits and current receipt/log writes", () => {
    const first = report();
    expect(first.code).toBe(0);
    write("journal.txt", "UNRELATED COMMIT\n");
    git("add", "--", "journal.txt");
    git("commit", "-q", "-m", "unrelated metadata");
    expect(git("rev-parse", "HEAD")).not.toBe(first.data.receipt?.head);
    const before = snapshot();
    expect(report("verification-status")).toMatchObject({
      code: 0,
      data: { accepted: true, freshness: "fresh" },
    });
    expect(snapshot()).toEqual(before);
    expect(report().code).toBe(0);
  });

  it("AC03 fingerprints full long spec bytes and command definitions", () => {
    write(".trellis/spec/check.md", `${"a".repeat(40000)}\nORIGINAL\n`);
    expect(report().code).toBe(0);
    write(".trellis/spec/check.md", `${"a".repeat(40000)}\nEDITED\n`);
    expect(report("verification-status").data.freshness).toBe("stale");
    expect(report().code).toBe(0);
    registry([executable, "-B", "check.py"], 0, 15);
    expect(report("verification-status").data.freshness).toBe("stale");
  });

  it("AC03 normalizes dot segments and trailing slashes before enumerating input directories", () => {
    for (const scope of ["./src/", "src/."]) {
      json(`${task}/acceptance.json`, {
        schemaVersion: 1,
        inputs: [scope],
        criteria: [{ id: "A", command: "check" }],
      });
      write("src/input.txt", `BEFORE ${scope}\n`);
      expect(report().code).toBe(0);
      write("src/input.txt", `AFTER ${scope}\n`);
      expect(report("verification-status").data.freshness).toBe("stale");
    }
  });

  it("AC03 detects removal of tracked/untracked directory inputs and hashes explicit ignored files", () => {
    write("src/new.txt", "NEW\n");
    expect(report().code).toBe(0);
    fs.unlinkSync(path.join(root, "src/new.txt"));
    expect(report("verification-status").data.freshness).toBe("stale");
    expect(report().code).toBe(0);
    fs.unlinkSync(path.join(root, "src/input.txt"));
    expect(report("verification-status").data.freshness).toBe("stale");
    write("ignored/input.txt", "IGNORED INPUT\n");
    write(".gitignore", ".trellis/.runtime/\nignored/\n");
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["ignored/input.txt"],
      criteria: [{ id: "A", command: "check" }],
    });
    expect(report().code).toBe(0);
    write("ignored/input.txt", "EDITED IGNORED INPUT\n");
    expect(report("verification-status").data.freshness).toBe("stale");
  });

  it("AC04 detects input changes during execution instead of accepting its zero exit", () => {
    write(
      "check.py",
      "from pathlib import Path\nPath('src/input.txt').write_text('CHANGED DURING CHECK')\n",
    );
    const result = report();
    expect(result).toMatchObject({
      code: 1,
      data: { freshness: "stale", accepted: false },
    });
    expect(result.data.receipt?.results[0]).toMatchObject({
      status: "pass",
      exitCode: 0,
    });
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
  });

  it("AC04 replaces a previous pass when the same inputs fail on a later attempt", () => {
    write(
      "check.py",
      "from pathlib import Path\nraise SystemExit(9 if Path('.trellis/.runtime/fail').exists() else 0)\n",
    );
    const first = report();
    expect(first.code).toBe(0);
    write(".trellis/.runtime/fail", "fail now\n");
    const next = report();
    expect(next.data.receipt?.fingerprint).toBe(
      first.data.receipt?.fingerprint,
    );
    expect(next).toMatchObject({
      code: 1,
      data: { accepted: false, freshness: "fresh" },
    });
    expect(next.data.receipt?.results[0]?.status).toBe("fail");
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
  });

  it("AC05 rejects stale, malformed and missing policy evidence without mutations", () => {
    expect(report().code).toBe(0);
    write("src/input.txt", "STALE\n");
    let before = snapshot();
    expect(
      run("archive", "receipt", "--no-commit", "--skip-branch-validation")
        .status,
    ).toBe(1);
    expect(snapshot()).toEqual(before);
    const receipt = JSON.parse(
      fs.readFileSync(receiptFile(), "utf-8"),
    ) as Record<string, unknown>;
    receipt.unknown = true;
    fs.writeFileSync(receiptFile(), JSON.stringify(receipt));
    expect(report("verification-status")).toMatchObject({
      code: 2,
      data: { freshness: "invalid" },
    });
    fs.unlinkSync(path.join(root, task, "acceptance.json"));
    before = snapshot();
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
    expect(snapshot()).toEqual(before);
  });

  it("AC06 requires explicit manual acknowledgement and records it separately", () => {
    policy(true);
    expect(report()).toMatchObject({
      code: 1,
      data: { freshness: "fresh", accepted: false },
    });
    expect(
      report("verification-status").data.receipt?.results[1],
    ).toMatchObject({ status: "manual_required", source: "manual" });
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
    const confirmation = run(
      "verify-confirm",
      "receipt",
      "AC-MANUAL",
      "--note",
      "Observed fixture output",
      "--json",
    );
    expect(confirmation.status).toBe(0);
    expect(JSON.parse(confirmation.stdout?.toString() ?? "")).toMatchObject({
      accepted: true,
    });
    expect(
      report("verification-status").data.receipt?.results[1],
    ).toMatchObject({
      status: "pass",
      source: "manual",
      note: "Observed fixture output",
    });
  });

  it("AC06 cannot use confirmation to repair a failed automated check or stale evidence", () => {
    policy(true);
    write("check.py", "raise SystemExit(9)\n");
    expect(report().code).toBe(1);
    expect(
      run(
        "verify-confirm",
        "receipt",
        "AC-MANUAL",
        "--note",
        "Wrong override",
        "--json",
      ).status,
    ).toBe(2);
    expect(
      run(
        "verify-confirm",
        "receipt",
        "AC-CHECK",
        "--note",
        "Wrong kind",
        "--json",
      ).status,
    ).toBe(2);
    write("check.py", "print('PASS')\n");
    expect(report().code).toBe(1);
    write("src/input.txt", "STALE\n");
    expect(
      run(
        "verify-confirm",
        "receipt",
        "AC-MANUAL",
        "--note",
        "Stale override",
        "--json",
      ).status,
    ).toBe(2);
  });

  it("AC07 permits session finish with failed verification", () => {
    expect(run("start", "receipt").status).toBe(0);
    write("check.py", "raise SystemExit(9)\n");
    expect(report().code).toBe(1);
    expect(run("finish").status).toBe(0);
    expect(
      JSON.parse(run("current", "--json").stdout?.toString() ?? ""),
    ).toMatchObject({ current_task: null, source: "none" });
  });

  it("AC08 rejects escaping and linked inputs", () => {
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["../outside"],
      criteria: [{ id: "A", command: "check" }],
    });
    expect(report()).toMatchObject({ code: 2, data: { freshness: "invalid" } });
    policy();
    fs.mkdirSync(path.join(root, "target"));
    write("target/file.txt", "PROTECTED\n");
    fs.symlinkSync(
      path.join(root, "target"),
      path.join(root, "src/link"),
      process.platform === "win32" ? "junction" : "dir",
    );
    expect(report()).toMatchObject({ code: 2, data: { accepted: false } });
    expect(fs.readFileSync(path.join(root, "target/file.txt"), "utf-8")).toBe(
      "PROTECTED\n",
    );
  });

  it("AC08 status executes no check and preserves all fixture/Git bytes", () => {
    write(
      "check.py",
      "from pathlib import Path\np=Path('.trellis/.runtime/count')\np.write_text(str(int(p.read_text())+1) if p.exists() else '1')\n",
    );
    expect(report().code).toBe(0);
    const before = snapshot();
    expect(report("verification-status").code).toBe(0);
    expect(snapshot()).toEqual(before);
    expect(
      fs.readFileSync(path.join(root, ".trellis/.runtime/count"), "utf-8"),
    ).toBe("1");
  });

  it("AC08 rejects nested Git inputs instead of treating a gitlink as empty source", () => {
    write("nested/input.txt", "NESTED SOURCE\n");
    git("-C", "nested", "init", "-q");
    git("-C", "nested", "add", "--", "input.txt");
    git(
      "-C",
      "nested",
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "commit",
      "-q",
      "-m",
      "nested input",
    );
    git("add", "--", "nested");
    json(`${task}/acceptance.json`, {
      schemaVersion: 1,
      inputs: ["nested"],
      criteria: [{ id: "A", command: "check" }],
    });
    const before = snapshot();
    expect(report()).toMatchObject({
      code: 2,
      data: { freshness: "invalid", accepted: false },
    });
    expect(snapshot()).toEqual(before);
  });

  it("AC02 caps actual captured output without filling JSON stdout with the log", () => {
    write(
      "check.py",
      "import sys\nsys.stdout.buffer.write(b'x' * (1024*1024+100))\n",
    );
    const result = report();
    expect(result.code).toBe(0);
    const evidence = result.data.receipt?.results[0];
    expect(evidence?.outputTruncated).toBe(true);
    if (!evidence?.stdout) throw new Error("Missing output log");
    expect(fs.statSync(path.join(root, evidence.stdout)).size).toBe(
      1024 * 1024,
    );
  });

  it("AC02 never consumes parent stdin for registered checks", () => {
    registry([executable, "-c", "import sys; assert sys.stdin.read() == ''"]);
    const result = spawnSync(
      executable,
      ["-B", ".trellis/scripts/task.py", "verify", "receipt", "--json"],
      {
        cwd: root,
        env,
        encoding: "utf-8",
        input: "PARENT INPUT MUST SURVIVE",
      },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ accepted: true });
  });

  it("AC02 bounds a real timeout and terminates its owned descendant", () => {
    write(
      "check.py",
      [
        "import subprocess, sys",
        "from pathlib import Path",
        "child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])",
        "Path('.trellis/.runtime/child.pid').write_text(str(child.pid))",
        "child.wait()",
      ].join("\n"),
    );
    registry([executable, "-B", "check.py"], 0, 3);
    const result = report();
    expect(result.code).toBe(1);
    expect(result.data.receipt?.results[0]?.status).toBe("timeout");
    const beforeArchive = snapshot();
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
    expect(snapshot()).toEqual(beforeArchive);
    const pid = fs
      .readFileSync(path.join(root, ".trellis/.runtime/child.pid"), "utf-8")
      .trim();
    const query =
      process.platform === "win32"
        ? [
            "import ctypes, sys",
            "from ctypes import wintypes as w",
            "k=ctypes.WinDLL('kernel32', use_last_error=True)",
            "k.OpenProcess.argtypes=[w.DWORD,w.BOOL,w.DWORD]; k.OpenProcess.restype=w.HANDLE",
            "k.GetExitCodeProcess.argtypes=[w.HANDLE,ctypes.POINTER(w.DWORD)]; k.GetExitCodeProcess.restype=w.BOOL",
            "k.CloseHandle.argtypes=[w.HANDLE]",
            "h=k.OpenProcess(0x1000,False,int(sys.argv[1]))",
            "if not h: sys.exit(0)",
            "code=w.DWORD(); ok=k.GetExitCodeProcess(h,ctypes.byref(code)); k.CloseHandle(h)",
            "sys.exit(1 if ok and code.value==259 else 0)",
          ].join("\n")
        : [
            "import os,sys",
            "try: os.kill(int(sys.argv[1]),0)",
            "except ProcessLookupError: sys.exit(0)",
            "sys.exit(1)",
          ].join("\n");
    let alive: number | null = 1;
    for (let attempt = 0; attempt < 10; attempt++) {
      const probe = spawnSync(executable, ["-B", "-c", query, pid], {
        env,
        encoding: "utf-8",
      });
      expect(probe.stderr).toBe("");
      alive = probe.status;
      if (alive === 0) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    expect(alive).toBe(0);
  });

  it("AC04 interruption persists an incomplete current attempt and releases its lock", () => {
    expect(report().code).toBe(0);
    const code = [
      "from argparse import Namespace",
      "from unittest.mock import patch",
      "from common.task_verification import cmd_verify",
      "with patch('common.task_verification.execute', side_effect=KeyboardInterrupt):",
      "    result=cmd_verify(Namespace(dir='receipt', json=True))",
      "raise SystemExit(result)",
    ].join("\n");
    const interrupted = spawnSync(executable, ["-B", "-c", code], {
      cwd: root,
      env: { ...env, PYTHONPATH: path.join(root, ".trellis/scripts") },
      encoding: "utf-8",
    });
    expect(interrupted.status).toBe(130);
    expect(JSON.parse(interrupted.stdout)).toMatchObject({ accepted: false });
    expect(report("verification-status").data.receipt?.results[0]?.status).toBe(
      "not_run",
    );
    const beforeArchive = snapshot();
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
    expect(snapshot()).toEqual(beforeArchive);
    expect(report().code).toBe(0);
  });

  it("AC04 active verification lock blocks reuse and concurrent writers without removing their lock", () => {
    expect(report().code).toBe(0);
    const lock = path.join(path.dirname(receiptFile()), "run.lock");
    fs.mkdirSync(lock);
    const before = snapshot();
    expect(report("verification-status")).toMatchObject({
      code: 1,
      data: { freshness: "running", accepted: false },
    });
    expect(report().code).toBe(2);
    expect(snapshot()).toEqual(before);
    fs.rmdirSync(lock);
    expect(report("verification-status").code).toBe(0);
  });

  it("AC09 rejects malformed receipts and changed log evidence instead of trusting a pass flag", () => {
    expect(report().code).toBe(0);
    const file = receiptFile();
    const original = fs.readFileSync(file, "utf-8");
    for (const change of [
      { schemaVersion: 2 },
      { schemaVersion: true },
      { source: "CI" },
      { unknown: true },
      { results: [] },
      { inputs: {} },
    ]) {
      const data = JSON.parse(original) as Record<string, unknown>;
      fs.writeFileSync(file, JSON.stringify({ ...data, ...change }));
      expect(report("verification-status")).toMatchObject({
        code: 2,
        data: { freshness: "invalid", accepted: false },
      });
    }
    fs.writeFileSync(file, original);
    const good = report("verification-status");
    expect(good.code).toBe(0);
    const output = good.data.receipt?.results[0]?.stdout;
    if (!output) throw new Error("No output evidence");
    fs.appendFileSync(path.join(root, output), "TAMPERED");
    expect(report("verification-status").code).toBe(2);
    expect(run("archive", "receipt", "--no-commit").status).toBe(1);
  });

  it("AC08 refuses linked evidence storage before any writes reach its target", () => {
    const target = path.join(root, "protected-evidence");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "sentinel"), "UNCHANGED");
    fs.symlinkSync(
      target,
      path.join(root, ".trellis/.runtime"),
      process.platform === "win32" ? "junction" : "dir",
    );
    expect(report()).toMatchObject({ code: 2, data: { accepted: false } });
    expect(fs.readdirSync(target)).toEqual(["sentinel"]);
    expect(fs.readFileSync(path.join(target, "sentinel"), "utf-8")).toBe(
      "UNCHANGED",
    );
  });

  it("AC01 rejects numeric overflow as a structured configuration error", () => {
    const argv = JSON.stringify([executable, "-c", "pass"]);
    write(
      ".trellis/verification.json",
      `{"schemaVersion":1,"commands":{"check":{"argv":${argv},"expectedExit":0,"timeoutSeconds":${"9".repeat(400)}}}}`,
    );
    expect(report()).toMatchObject({
      code: 2,
      data: { freshness: "invalid", accepted: false },
    });
    registry([executable, "-B", "check.py"]);
    expect(report().code).toBe(0);
    const file = receiptFile();
    const original = fs.readFileSync(file, "utf-8");
    fs.writeFileSync(
      file,
      original.replace(
        /"durationSeconds":\s*[0-9.eE+-]+/,
        `"durationSeconds":${"9".repeat(400)}`,
      ),
    );
    expect(report("verification-status")).toMatchObject({
      code: 2,
      data: { freshness: "invalid", accepted: false },
    });
  });

  it("AC10 verifies real UTF-8/CRLF files from a Chinese/space subdirectory cwd", () => {
    const next = `${root} 中文 空间`;
    expect(path.dirname(path.resolve(next))).toBe(path.resolve(os.tmpdir()));
    expect(path.basename(root)).toMatch(/^trellis-verify-/);
    fs.renameSync(root, next);
    root = next;
    write(".trellis/spec/check.md", "中文 SPEC\r\n");
    write(`${task}/prd.md`, "中文 PRD\r\n");
    const result = spawnSync(
      executable,
      [
        "-B",
        path.join(root, ".trellis/scripts/task.py"),
        "verify",
        "receipt",
        "--json",
      ],
      {
        cwd: path.join(root, "src"),
        env,
        encoding: "utf-8",
      },
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      accepted: true,
      freshness: "fresh",
    });
  });
});
