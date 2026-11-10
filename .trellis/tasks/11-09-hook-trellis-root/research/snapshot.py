"""Snapshot preservation boundaries before task #650 edits (run with uv)."""
import hashlib
import json
from pathlib import Path

root = next(
    ancestor for ancestor in Path(__file__).resolve().parents
    if (ancestor / "packages/cli/src/templates").is_dir()
)
paths = []
for directory in (".claude/hooks", ".codex/hooks", ".cursor/hooks", ".pi", ".trellis/scripts"):
    paths.extend(p for p in (root / directory).rglob("*") if p.is_file() and "__pycache__" not in p.parts)
paths.append(root / ".trellis/workflow.md")
result = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
output = Path(__file__).with_name("before-hashes.json")
if output.exists():
    raise SystemExit("Snapshot already exists; refusing to replace")
with output.open("xb") as handle:
    handle.write((json.dumps(result, indent=2) + "\n").encode("utf-8"))
print(f"Snapshotted {len(result)} paths")
