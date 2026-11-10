"""Exercise the built CLI's root-helper ownership chain in a disposable repo."""
from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

root = next(
    ancestor for ancestor in Path(__file__).resolve().parents
    if (ancestor / "packages/cli/src/templates").is_dir()
)
cli = root / "packages/cli/bin/trellis.js"
canonical = (root / "packages/cli/src/templates/shared-hooks/trellis_hook_paths.py").read_bytes()
hook_dirs = [".claude/hooks", ".cursor/hooks", ".codex/hooks", ".gemini/hooks", ".qoder/hooks", ".codebuddy/hooks", ".factory/hooks", ".kiro/hooks", ".trae/hooks", ".zcode/hooks", ".github/copilot/hooks", ".snow/hooks"]
flags = ["claude", "cursor", "codex", "gemini", "qoder", "codebuddy", "droid", "kiro", "trae", "zcode", "copilot", "snow"]
evidence = []
with tempfile.TemporaryDirectory(prefix="trellis-root-built-") as temporary:
    project = Path(temporary)
    def command(args: list[str], expected: int = 0) -> str:
        result = subprocess.run(args, cwd=project, capture_output=True, text=True, encoding="utf-8", errors="replace")
        evidence.append({"argv": args, "code": result.returncode, "stdout": result.stdout, "stderr": result.stderr})
        assert result.returncode == expected, evidence[-1]
        return result.stdout + result.stderr
    command(["git", "init", "-q"])
    (project / "package.json").write_text('{"name":"root-smoke","version":"0.0.0"}', encoding="utf-8")
    command(["node", str(cli), "init", "--yes", "--user", "root-smoke", "--with-statusline", *[f"--{flag}" for flag in flags]])
    receipt = project / ".trellis/.template-hashes.json"
    paths = [f"{directory}/trellis_hook_paths.py" for directory in hook_dirs]
    def assert_installed() -> None:
        data = json.loads(receipt.read_text(encoding="utf-8"))
        hashes = data["hashes"]
        for relative in paths:
            assert (project / relative).read_bytes() == canonical, relative
            assert hashes[relative] == hashlib.sha256(canonical.replace(b"\r\n", b"\n")).hexdigest(), relative
    assert_installed()
    assert (project / ".claude/hooks/statusline.py").is_file()
    assert "Already up to date!" in command(["node", str(cli), "update", "--dry-run"])
    deleted = project / paths[0]
    deleted.unlink()
    command(["node", str(cli), "update", "--force"])
    assert not deleted.exists(), "receipt-bearing user deletion must stay deleted"
    # Simulate an older release: neither files nor receipts knew the new helper.
    data = json.loads(receipt.read_text(encoding="utf-8"))
    for relative in paths:
        (project / relative).unlink(missing_ok=True)
        data["hashes"].pop(relative, None)
    receipt.write_text(json.dumps(data), encoding="utf-8")
    command(["node", str(cli), "update", "--force"])
    assert_installed()
    assert "Already up to date!" in command(["node", str(cli), "update", "--dry-run"])
    plan = command(["node", str(cli), "uninstall", "--dry-run"])
    for relative in paths:
        assert relative in plan.replace("\\", "/"), relative
    # No commit/bypass: uncommitted task/spec data correctly blocks destructive yes.
    command(["node", str(cli), "uninstall", "--yes"], expected=1)
    assert (project / ".trellis").is_dir()
    assert_installed()
output = Path(__file__).with_name("distribution-smoke.json")
output.write_text(json.dumps({"platforms": flags, "helper_paths": paths, "commands": evidence}, indent=2), encoding="utf-8")
print("PASS: built init, 12 byte/hash receipts, optional statusline, no-op, deletion preservation, old-release update, uninstall ownership and dirty refusal")
