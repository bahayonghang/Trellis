"""Task-local parity, preservation and real-minimum-interpreter verification."""
from __future__ import annotations

import hashlib
import json
import py_compile
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

root = next(
    ancestor for ancestor in Path(__file__).resolve().parents
    if (ancestor / "packages/cli/src/templates").is_dir()
)
before = json.loads(Path(__file__).with_name("before-hashes.json").read_text(encoding="utf-8"))
templates = root / "packages/cli/src/templates"
twins = {
    ".claude/hooks/session-start.py": "shared-hooks/session-start.py",
    ".claude/hooks/inject-workflow-state.py": "shared-hooks/inject-workflow-state.py",
    ".codex/hooks/session-start.py": "codex/hooks/session-start.py",
    ".codex/hooks/inject-workflow-state.py": "shared-hooks/inject-workflow-state.py",
    ".cursor/hooks/session-start.py": "shared-hooks/session-start.py",
    ".cursor/hooks/inject-shell-session-context.py": "shared-hooks/inject-shell-session-context.py",
}
if "--sync" in sys.argv:
    for dest, source in twins.items():
        target = root / dest
        assert hashlib.sha256(target.read_bytes()).hexdigest() == before[dest], dest
        original = subprocess.check_output(["git", "show", f"HEAD:packages/cli/src/templates/{source}"], cwd=root)
        assert target.read_bytes().replace(b"\r\n", b"\n") == original.replace(b"\r\n", b"\n"), dest
        shutil.copyfile(templates / source, target)
    for platform in (".claude", ".codex", ".cursor"):
        shutil.copyfile(templates / "shared-hooks/trellis_hook_paths.py", root / platform / "hooks/trellis_hook_paths.py")

for dest, source in twins.items():
    assert (root / dest).read_bytes() == (templates / source).read_bytes(), dest
for platform in (".claude", ".codex", ".cursor"):
    for name in ("trellis_hook_input.py", "trellis_hook_paths.py"):
        assert (root / platform / "hooks" / name).read_bytes() == (templates / "shared-hooks" / name).read_bytes()
for relative, digest in before.items():
    if relative not in twins:
        assert hashlib.sha256((root / relative).read_bytes()).hexdigest() == digest, relative
scripts_root = root / ".trellis/scripts"
scripts = list(scripts_root.rglob("*.py"))
for file in scripts:
    assert file.read_bytes() == (templates / "trellis/scripts" / file.relative_to(scripts_root)).read_bytes(), file
tracked = subprocess.check_output(["git", "ls-files", "*.py"], cwd=root, text=True, encoding="utf-8").splitlines()
new_helpers = ["packages/cli/src/templates/shared-hooks/trellis_hook_paths.py"] + [f"{p}/hooks/trellis_hook_paths.py" for p in (".claude", ".codex", ".cursor")]
untracked = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard", "--", "*.py"], cwd=root, text=True, encoding="utf-8").splitlines()
files = sorted(set(tracked + new_helpers + untracked))
with tempfile.TemporaryDirectory(prefix="trellis-root-compile-") as cache:
    for index, relative in enumerate(files):
        py_compile.compile(str(root / relative), cfile=str(Path(cache) / f"{index}.pyc"), doraise=True)
print(f"Python {sys.version.split()[0]} compiled {len(files)} files; {len(scripts)} script twins, 6 consumers, 3 stdin helpers, 3 root helpers match; {len(before) - len(twins)} preserved hashes match")
