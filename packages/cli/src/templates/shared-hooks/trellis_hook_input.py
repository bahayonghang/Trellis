"""Standalone bounded hook stdin intake (Python 3.9+, standard library only).

Installed beside hook entrypoints, before any repository/root discovery.
TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS accepts finite values in (0, 10]; invalid
settings fall back to 2 seconds. TRELLIS_HOOK_INPUT_DEBUG=1 reports categories
on stderr, never payloads. Complete JSON can finish before the host closes stdin.
"""
from __future__ import annotations

import codecs
import json
import math
import os
import queue
import stat
import sys
import threading
import time
from collections.abc import Callable
from contextlib import suppress
from typing import Any

DEFAULT_TIMEOUT_SECONDS = 2.0
MAX_TIMEOUT_SECONDS = 10.0


def diagnose_hook_input(category: str) -> None:
    """Opt-in diagnostics must not change stdout or fail the host."""
    if os.environ.get("TRELLIS_HOOK_INPUT_DEBUG") == "1":
        # Closed diagnostic streams must not fail a hook.
        with suppress(OSError, ValueError):
            print(f"[trellis-hook-input:{category}]", file=sys.stderr)


def _timeout_seconds() -> float:
    setting = os.environ.get("TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS")
    if setting is not None:
        try:
            value = float(setting)
            if math.isfinite(value) and 0 < value <= MAX_TIMEOUT_SECONDS:
                return value
        except ValueError:
            pass  # Invalid settings use the same bounded default.
        diagnose_hook_input("invalid-timeout")
    return DEFAULT_TIMEOUT_SECONDS


def _is_complete_json(text: str) -> bool:
    try:
        json.loads(text)
        return True
    except (ValueError, RecursionError):
        return False


def _windows_pipe_size(fd: int) -> Callable[[], int]:
    """Return a Windows-only peek: available byte count, or -1 for EOF."""
    import ctypes
    import msvcrt
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    peek = kernel.PeekNamedPipe
    peek.argtypes = [wintypes.HANDLE, ctypes.c_void_p, wintypes.DWORD,
                     ctypes.c_void_p, ctypes.POINTER(wintypes.DWORD), ctypes.c_void_p]
    peek.restype = wintypes.BOOL
    handle = msvcrt.get_osfhandle(fd)

    def available_bytes() -> int:
        available = wintypes.DWORD()
        if not peek(handle, None, 0, None, ctypes.byref(available), None):
            error = ctypes.get_last_error()
            if error in (109, 232, 233):  # Broken/closing/disconnected pipe = EOF.
                return -1
            raise OSError(error, "Cannot inspect hook stdin pipe")
        return available.value

    return available_bytes


def _pipe_reader(fd: int, chunks: queue.Queue[bytes | Exception], stop: threading.Event) -> None:
    """Never hold a Python buffered lock or a pending Windows pipe read."""
    try:
        get_size = None
        if sys.platform == "win32" and not stat.S_ISREG(os.fstat(fd).st_mode):
            get_size = _windows_pipe_size(fd)
        while not stop.is_set():
            size = 65536
            if get_size is not None:
                available = get_size()
                if available < 0:
                    chunks.put(b"")
                    return
                if not available:
                    stop.wait(0.01)
                    continue
                size = min(size, available)
            chunk = os.read(fd, size)
            chunks.put(chunk)
            if not chunk:
                return
    except (OSError, ValueError) as exc:
        chunks.put(exc)


def read_hook_stdin(*, is_complete: Callable[[str], bool] = _is_complete_json) -> str:
    """Read UTF-8 until one complete document, EOF, or one total deadline.

    os.read avoids buffered-stream shutdown locks. On Windows a pending raw
    pipe read ALSO stalls subprocesses inheriting that pipe, so the worker
    peeks and reads only available bytes. POSIX can block the daemon directly.
    The queue bounds read-ahead, not payload size. Snow supplies its existing
    wrapper-tolerant parser's completion predicate; actual reads stay here.
    """
    deadline = time.monotonic() + _timeout_seconds()
    try:
        if sys.stdin is None or sys.stdin.closed or sys.stdin.isatty():
            diagnose_hook_input("empty")
            return ""
        fd = sys.stdin.fileno()
    except (OSError, ValueError, AttributeError):
        diagnose_hook_input("read-error")
        return ""

    chunks: queue.Queue[bytes | Exception] = queue.Queue(maxsize=16)
    stop = threading.Event()
    try:
        threading.Thread(target=_pipe_reader, args=(fd, chunks, stop), daemon=True).start()
    except RuntimeError:
        diagnose_hook_input("read-error")
        return ""

    decoder = codecs.getincrementaldecoder("utf-8")()
    parts: list[str] = []
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                diagnose_hook_input("timeout")
                return ""
            try:
                chunk = chunks.get(timeout=remaining)
            except queue.Empty:
                diagnose_hook_input("timeout")
                return ""
            if isinstance(chunk, Exception):
                diagnose_hook_input("read-error")
                return ""
            try:
                text = decoder.decode(chunk, final=not chunk)
            except UnicodeError:
                diagnose_hook_input("read-error")
                return ""
            parts.append(text)
            if not chunk:
                raw = "".join(parts)
                if not raw.strip():
                    diagnose_hook_input("empty")
                return raw
            # Candidate filter only: validate the ENTIRE accumulated input, not
            # a prefix. Avoid reparsing megabytes of an unfinished JSON string.
            if is_complete is not _is_complete_json or text.rstrip().endswith(
                ("}", "]", '"', "e", "l", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9")
            ):
                raw = "".join(parts)
                # Custom predicates extend completion (Snow wrappers), not
                # replace it: even an empty object or non-object JSON is done.
                if _is_complete_json(raw) or (
                    is_complete is not _is_complete_json and is_complete(raw)
                ):
                    return raw
    finally:
        stop.set()


def parse_hook_json(raw: str, *, diagnose: bool = True) -> dict[str, Any]:
    """Validate one object, failing soft without logging sensitive input."""
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
    except (ValueError, RecursionError):
        if diagnose:
            diagnose_hook_input("invalid-json")
        return {}
    if not isinstance(data, dict):
        if diagnose:
            diagnose_hook_input("non-object")
        return {}
    return data


def read_hook_json() -> dict[str, Any]:
    """The standard hook boundary: bounded intake, object validation, fail soft."""
    return parse_hook_json(read_hook_stdin())
