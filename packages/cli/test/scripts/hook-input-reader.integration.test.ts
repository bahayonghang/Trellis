import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectPlatformTemplates } from "../../src/configurators/index.js";

const PYTHON = process.platform === "win32" ? "python" : "python3";
let root: string;
interface Probe {
  code: number | null;
  stdout: string;
  stderr: string;
  killed: boolean;
  elapsed: number;
}

async function probe(
  body: string,
  input: string | Buffer | null,
  env: NodeJS.ProcessEnv = {},
  open = false,
): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(
      PYTHON,
      ["-c", `from trellis_hook_input import read_hook_json; ${body}`],
      {
        cwd: root,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: undefined,
          ...env,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let killed = false;
    child.stdout.setEncoding("utf8").on("data", (data: string) => {
      stdout += data;
    });
    child.stderr.setEncoding("utf8").on("data", (data: string) => {
      stderr += data;
    });
    child.stdin.on("error", () => {
      /* Failures can close stdin before the host writes. */
    });
    child.on("error", reject);
    if (input !== null) child.stdin.write(input);
    if (!open) child.stdin.end();
    const safety = setTimeout(() => {
      killed = true;
      child.kill();
    }, 5000);
    child.on("close", (code) => {
      clearTimeout(safety);
      child.stdin.destroy();
      resolve({
        code,
        stdout: stdout.replace(/\r\n/g, "\n"),
        stderr: stderr.replace(/\r\n/g, "\n"),
        killed,
        elapsed: performance.now() - start,
      });
    });
  });
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-input-reader-"));
  const asset = collectPlatformTemplates("claude-code")?.get(
    ".claude/hooks/trellis_hook_input.py",
  );
  if (!asset) throw new Error("Missing installed hook reader");
  fs.writeFileSync(path.join(root, "trellis_hook_input.py"), asset);
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("standalone hook intake process contract", () => {
  it("uses the two-second default and terminates while empty stdin stays open", async () => {
    const result = await probe(
      "print(read_hook_json())",
      null,
      { TRELLIS_HOOK_INPUT_DEBUG: "1" },
      true,
    );
    expect(result.code, result.stderr).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.stderr).toContain("[trellis-hook-input:timeout]");
    expect(result.elapsed).toBeGreaterThanOrEqual(1900);
    expect(result.elapsed).toBeLessThan(5000);
  });

  it.each(["0", "-1", "nan", "inf", "1e20", "garbage"])(
    "invalid timeout %s falls back to a bounded deadline",
    async (setting) => {
      const result = await probe(
        "print(read_hook_json())",
        null,
        {
          TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: setting,
          TRELLIS_HOOK_INPUT_DEBUG: "1",
        },
        true,
      );
      expect(result.code, result.stderr).toBe(0);
      expect(result.killed).toBe(false);
      expect(result.stderr).toContain("[trellis-hook-input:invalid-timeout]");
      expect(result.stderr).toContain("[trellis-hook-input:timeout]");
      expect(result.elapsed).toBeGreaterThanOrEqual(1900);
    },
  );

  it("closed empty input returns immediately rather than waiting out the maximum deadline", async () => {
    const result = await probe("print(read_hook_json())", "", {
      TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "10",
      TRELLIS_HOOK_INPUT_DEBUG: "1",
    });
    expect(result.code, result.stderr).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.elapsed).toBeLessThan(5000);
    expect(result.stderr).toBe("[trellis-hook-input:empty]\n");
  });

  it("validates every byte of multi-megabyte Unicode input before returning early", async () => {
    const value = "中🧪é".repeat(400_000);
    const input = JSON.stringify({ value });
    const result = await probe(
      "import hashlib; data=read_hook_json(); print(hashlib.sha256(data['value'].encode('utf-8')).hexdigest())",
      input,
      { TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "2" },
      true,
    );
    expect(result.code, result.stderr).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.stdout.trim()).toBe(
      createHash("sha256").update(value).digest("hex"),
    );
  });

  it("does not leave a Windows pipe read blocking later inherited-stdin subprocesses", async () => {
    const result = await probe(
      "import subprocess,sys; read_hook_json(); print(subprocess.run([sys.executable,'-c',\"print('child-ok')\"],capture_output=True,text=True,timeout=1).stdout.strip())",
      "{}",
      {},
      true,
    );
    expect(result.code, result.stderr).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.stdout).toBe("child-ok\n");
  });

  it("reports read errors without tracebacks or payloads", async () => {
    const result = await probe(
      "import sys,io; sys.stdin=io.StringIO('secret'); print(read_hook_json())",
      "",
      {
        TRELLIS_HOOK_INPUT_DEBUG: "1",
        TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "1",
      },
    );
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toBe("{}\n");
    expect(result.stderr).toBe("[trellis-hook-input:read-error]\n");
  });

  it.each([Buffer.from([0x7b, 0x22, 0xff]), Buffer.from([0x7b, 0x22, 0xe4])])(
    "fails soft on invalid or truncated UTF-8",
    async (input) => {
      const result = await probe("print(read_hook_json())", input, {
        TRELLIS_HOOK_INPUT_DEBUG: "1",
        TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "1",
      });
      expect(result.code, result.stderr).toBe(0);
      expect(result.stdout).toBe("{}\n");
      expect(result.stderr).toBe("[trellis-hook-input:read-error]\n");
    },
  );
});
