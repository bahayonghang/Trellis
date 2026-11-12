"""Replay native-failure controls against the pinned pre-repair fixture or worktree.

Run under uv run --locked; never rewrites tracked files or the git index.
"""
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = next(p for p in Path(__file__).resolve().parents if (p / ".git").exists())
# Never use moving HEAD: RED must still replay after repair/archival commits.
BASELINE_REF = "069d1400ea88d46f1480a6e8987fd582d19b9446"
BASELINE = "--baseline" in sys.argv
MODE = "canary" if "--canary" in sys.argv else "extra"
paths = [
    "packages/cli/test/utils/atomic-write.test.ts",
    "packages/cli/test/scripts/io.integration.test.ts",
]
fixtures = []
try:
    for relative in paths:
        original = ROOT / relative
        source = (subprocess.check_output(["git", "show", BASELINE_REF + ":" + relative], cwd=ROOT)
                  .decode("utf-8") if BASELINE else original.read_text(encoding="utf-8"))
        if "atomic-write" in relative:
            # Intercept the native delegate BEFORE the existing fixture captures it.
            # Two fixture failures + two boundary failures reproduce 5 vs 3 calls.
            needle = '    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-atomic-retry-"));'
            assert source.count(needle) == 1
            source = 'const replayNative = fs.renameSync;\n' + source
            source = source.replace(needle, needle + '''
    let nativeCalls = 0;
    fs.renameSync = (from, to) => {
      if (nativeCalls++ < 2)
        throw Object.assign(new Error("controlled extra native fault"), { code: "EBUSY" });
      return replayNative(from, to);
    };''')
            source = source.replace('    vi.restoreAllMocks();', '    vi.restoreAllMocks();\n    fs.renameSync = replayNative;', 1)
        else:
            needle = 'case = json.loads(sys.argv[2])'
            assert source.count(needle) >= 1
            boundary = '''
native_replace = os.replace
native_calls = 0
def native_boundary(source, destination):
    global native_calls
    native_calls += 1
    if native_calls <= 2:
        raise PermissionError(errno.EACCES, "controlled extra native fault")
    return native_replace(source, destination)
os.replace = native_boundary
'''
            if MODE == "canary":
                boundary = '''
native_canary = mock.Mock(side_effect=AssertionError("native success delegate forbidden"))
os.replace = native_canary
'''
            source = source.replace(needle, needle + boundary, 1)
            if MODE == "canary":
                source = source.replace('print(json.dumps({', 'assert native_canary.call_count == 0\nprint(json.dumps({', 1)
        fixture = original.with_name("r13-replay-" + original.name)
        assert not fixture.exists(), fixture
        fixture.write_text(source, encoding="utf-8")
        fixtures.append(fixture)
    selection = "retries EBUSY on Windows|transient permission failure" if MODE == "extra" else "transient permission failure"
    command = ["pnpm", "--filter", "@mindfoldhq/trellis", "exec", "vitest", "run",
               *[p.relative_to(ROOT / "packages/cli").as_posix() for p in fixtures], "-t", selection]
    result = subprocess.run(command, cwd=ROOT, shell=sys.platform == "win32", capture_output=True,
                            text=True, encoding="utf-8", errors="replace")
    print(result.stdout)
    print(result.stderr)
    print("CONTROL", MODE, BASELINE_REF if BASELINE else "WORKTREE", "exit", result.returncode)
    assert (result.returncode != 0) if BASELINE else (result.returncode == 0)
    if BASELINE and MODE == "extra":
        assert "got 5 times" in result.stderr
    if BASELINE and MODE == "canary":
        assert "native success delegate forbidden" in result.stderr
finally:
    for fixture in fixtures:
        fixture.unlink()
