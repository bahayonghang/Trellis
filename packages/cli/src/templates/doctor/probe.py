"""Trusted, read-only doctor bridge; never import Python from the project."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING, TypedDict


class TaskProbe(TypedDict):
    path: str | None
    stale: bool
    invalid: bool


class ProbeResult(TypedDict):
    root: str | None
    identity: bool
    task: TaskProbe | None


def inspect(cwd: str) -> ProbeResult:
    templates = Path(__file__).resolve().parent.parent
    # Both paths belong to this installed CLI, never the inspected workspace.
    sys.path.insert(0, str(templates / "shared-hooks"))
    sys.path.insert(0, str(templates / "trellis" / "scripts"))
    from trellis_hook_paths import find_trellis_root
    if TYPE_CHECKING:
        from ..trellis.scripts.common.active_task import (
            _context_path,
            _lookup_env_context_key,
            resolve_active_task,
            resolve_context_key,
            resolve_task_ref,
        )
        from ..trellis.scripts.common.io import JSON_READ_MISSING, read_json_checked
    else:
        from common.active_task import (
            _context_path,
            _lookup_env_context_key,
            resolve_active_task,
            resolve_context_key,
            resolve_task_ref,
        )
        from common.io import JSON_READ_MISSING, read_json_checked

    root = find_trellis_root(cwd)
    result: ProbeResult = {"root": str(root) if root else None, "identity": False, "task": None}
    if root is None:
        return result

    # The no-identity shell-ticket fallback deletes expired files. Preflight
    # only the canonical pure mapper, then explicitly disable that branch.
    identity = bool(os.environ.get("TRELLIS_CONTEXT_ID", "").strip()) or bool(
        _lookup_env_context_key(None)
    )
    result["identity"] = identity
    context_key = resolve_context_key(allow_environment_context=identity)
    if context_key:
        pointer = _context_path(root, context_key)
        try:
            pointer.resolve().relative_to((root / ".trellis").resolve())
            record, error = read_json_checked(pointer)
            pointer_invalid = (error is not None and error != JSON_READ_MISSING) or (
                record is not None
                and record.get("current_task") is not None
                and not isinstance(record.get("current_task"), str)
            )
        except (OSError, ValueError):
            pointer_invalid = True
        if pointer_invalid:
            result["task"] = {"path": None, "stale": False, "invalid": True}
            return result
    active = resolve_active_task(
        root, allow_environment_context=identity, allow_single_session_fallback=False
    )
    invalid = False
    if active.task_path and not active.stale:
        task_dir = resolve_task_ref(active.task_path, root)
        record, error = read_json_checked(task_dir / "task.json") if task_dir else (None, "missing")
        invalid = error is not None or record is None or not isinstance(record.get("status"), str) or not record.get("status")
    result["task"] = {"path": active.task_path, "stale": active.stale, "invalid": invalid}
    return result


if __name__ == "__main__":
    print(json.dumps(inspect(sys.argv[1]), ensure_ascii=False))
