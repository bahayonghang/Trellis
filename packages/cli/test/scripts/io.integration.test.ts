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
# The controlled boundary below deliberately does not publish. The target and
# temp-file assertions after the call are the native-success canary: delegating
# success to real os.replace would change the target and remove the temp.
attempts = 0
expected = json.dumps({"value": "new"}, indent=2) if case["writer"] == "json" else "new"
fault = (KeyboardInterrupt("interrupted") if case["error"] == "interrupt"
         else PermissionError(errno.EACCES, "locked") if case["error"] == "permission"
         else OSError(errno.EIO, "disk error"))

def replace(source, destination):
    global attempts
    attempts += 1
    assert target.read_text(encoding="utf-8") == "original"
    assert Path(source).parent == target.parent
    assert Path(destination) == target
    assert Path(source).read_text(encoding="utf-8") == expected
    if attempts <= case["failures"]:
        raise fault
    # Controlled syscall success does NOT publish. Real publication is a
    # separate probe below; never emulate atomicity with copy/unlink.
    return None

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
    "tempCount": len(list(Path.cwd().glob(".state.txt.*.tmp"))),
    "fileCount": len(list(Path.cwd().iterdir())),
}))
`;

// Real temp files, os.replace and time.sleep stay together. A controlled
// failure prefix exercises caller recovery without asserting native timing.
const publicationProbe = `
import errno
import importlib.util
import json
import os
import sys
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
injected = 0

def replace(source, destination):
    global injected
    if injected < case["failures"]:
        injected += 1
        assert target.read_text(encoding="utf-8") == "original"
        raise PermissionError(errno.EACCES, "controlled lock")
    return real_replace(source, destination)

with mock.patch.object(io, "sys", SimpleNamespace(platform="win32")), \\
     mock.patch("os.replace", side_effect=replace):
    result = (io.write_json(target, {"value": "new"}) if case["writer"] == "json"
              else io.write_text_atomic(target, "new"))
print(json.dumps({
    "result": result,
    "injected": injected,
    "bytes": list(target.read_bytes()),
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
    ["text", "json"].flatMap((writer) =>
      [0, 2].map((failures) => ({ writer, failures })),
    ),
  )(
    "real $writer publication after $failures injected failures",
    (testCase) => {
      const result = spawnSync(
        pythonCmd,
        ["-c", publicationProbe, ioPath, JSON.stringify(testCase)],
        { cwd: dir, encoding: "utf-8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const text =
        testCase.writer === "json" ? '{\n  "value": "new"\n}' : "new";
      // Python text mode uses native newlines; verify the actual byte sequence.
      expect(JSON.parse(result.stdout)).toEqual({
        result: true,
        injected: testCase.failures,
        bytes: Array.from(Buffer.from(text.replace(/\n/g, os.EOL), "utf-8")),
        files: ["state.txt"],
      });
    },
  );

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
      // Native-success canary: controlled success leaves the original target
      // and prepared temp file; native publication would violate both.
      content: "original",
      tempCount: testCase.success ? 1 : 0,
      // Together with target content and tempCount, pin the entire file set:
      // no unexpected files on failure/interrupt, exactly one temp on success.
      fileCount: testCase.success ? 2 : 1,
    });
  });
});
