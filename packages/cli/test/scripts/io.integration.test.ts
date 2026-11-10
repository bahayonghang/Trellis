import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const pythonCmd = process.platform === "win32" ? "python" : "python3";
const ioPath = fileURLToPath(
  new URL("../../src/templates/trellis/scripts/common/io.py", import.meta.url),
);

// Replace only the module's sys reference, not the interpreter's platform or
// os.name: pathlib must continue using the native filesystem on Windows.
const probe = `
import errno
import importlib.util
import json
import os
import sys
import time
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

spec = importlib.util.spec_from_file_location("trellis_io", sys.argv[1])
io = importlib.util.module_from_spec(spec)
spec.loader.exec_module(io)
case = json.loads(sys.argv[2])
target = Path.cwd() / "state.txt"
target.write_text("original", encoding="utf-8")
real_replace = os.replace
attempts = 0
fault = (KeyboardInterrupt("interrupted") if case["error"] == "interrupt"
         else PermissionError(errno.EACCES, "locked") if case["error"] == "permission"
         else OSError(errno.EIO, "disk error"))

def replace(source, destination):
    global attempts
    attempts += 1
    assert target.read_text(encoding="utf-8") == "original"
    assert Path(source).parent == target.parent
    if attempts <= case["failures"]:
        raise fault
    return real_replace(source, destination)

result = None
same_interrupt = False
interrupt = fault
with mock.patch.object(io, "sys", SimpleNamespace(platform=case["platform"]), create=True), \\
     mock.patch("os.replace", side_effect=replace), \\
     mock.patch("time.sleep") as sleep:
    if case.get("interruptSleep"):
        sleep.side_effect = interrupt = KeyboardInterrupt("interrupted during backoff")
    try:
        result = (io.write_json(target, {"value": "new"}) if case["writer"] == "json"
                  else io.write_text_atomic(target, "new"))
    except KeyboardInterrupt as error:
        same_interrupt = error is interrupt
    waits = [call.args[0] for call in sleep.call_args_list]

print(json.dumps({
    "result": result,
    "attempts": attempts,
    "waits": waits,
    "sameInterrupt": same_interrupt,
    "content": target.read_text(encoding="utf-8"),
    "files": sorted(p.name for p in Path.cwd().iterdir()),
}))
`;

describe("common/io.py atomic replace recovery (R13)", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-python-io-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const cases = [
    {
      name: "success without sleeping",
      platform: "win32",
      error: "permission",
      failures: 0,
      attempts: 1,
      success: true,
    },
    {
      name: "transient permission failure",
      platform: "win32",
      error: "permission",
      failures: 2,
      attempts: 3,
      success: true,
    },
    {
      name: "success on the final retry",
      platform: "win32",
      error: "permission",
      failures: 10,
      attempts: 11,
      success: true,
    },
    {
      name: "bounded permission retries",
      platform: "win32",
      error: "permission",
      failures: 100,
      attempts: 11,
      success: false,
    },
    {
      name: "Linux permission fail-fast",
      platform: "linux",
      error: "permission",
      failures: 100,
      attempts: 1,
      success: false,
    },
    {
      name: "macOS permission fail-fast",
      platform: "darwin",
      error: "permission",
      failures: 100,
      attempts: 1,
      success: false,
    },
    {
      name: "Windows non-permission fail-fast",
      platform: "win32",
      error: "io",
      failures: 100,
      attempts: 1,
      success: false,
    },
    {
      name: "interrupt cleanup and rethrow",
      platform: "win32",
      error: "interrupt",
      failures: 100,
      attempts: 1,
      success: false,
    },
    {
      name: "interrupt during backoff cleanup and rethrow",
      platform: "win32",
      error: "permission",
      failures: 100,
      attempts: 1,
      success: false,
      interruptSleep: true,
    },
  ];

  it.each(
    cases.flatMap((testCase) =>
      ["text", "json"].map((writer) => ({ ...testCase, writer })),
    ),
  )("$writer: $name", (testCase) => {
    const result = spawnSync(
      pythonCmd,
      ["-c", probe, ioPath, JSON.stringify(testCase)],
      { cwd: dir, encoding: "utf-8" },
    );
    expect(result.status, result.stderr).toBe(0);
    const interrupted =
      testCase.error === "interrupt" || testCase.interruptSleep === true;
    const waits = testCase.interruptSleep
      ? [0.01]
      : Array.from({ length: testCase.attempts - 1 }, (_, i) => (i + 1) / 100);
    expect(JSON.parse(result.stdout)).toEqual({
      result: interrupted ? null : testCase.success,
      attempts: testCase.attempts,
      waits,
      sameInterrupt: interrupted,
      content: testCase.success
        ? testCase.writer === "json"
          ? '{\n  "value": "new"\n}'
          : "new"
        : "original",
      files: ["state.txt"],
    });
  });
});
