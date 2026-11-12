"""Read-only workspace discovery for installed Python platform hooks."""
from __future__ import annotations

from pathlib import Path


def find_trellis_root(start: str | Path) -> Path | None:
    """Return the nearest valid Trellis ancestor, including the filesystem root.

    A cache/empty marker is not a workspace. Git boundaries are irrelevant;
    a linked .trellis validates through its target but belongs to its container.
    """
    try:
        current = Path(start).resolve()
    except (OSError, RuntimeError, ValueError):
        # Never fall back to a lexical path after failed canonicalization.
        return None
    for candidate in (current, *current.parents):
        marker = candidate / ".trellis"
        try:
            if not marker.is_dir():
                continue
        except OSError:
            # An unreadable directory must not hide an accessible ancestor.
            continue
        for check in (
            (marker / "workflow.md").is_file,
            (marker / "config.yaml").is_file,
            (marker / "scripts").is_dir,
        ):
            try:
                if check():
                    return candidate
            except OSError:
                # A failed alternative must not hide a valid sibling marker.
                continue
    return None
