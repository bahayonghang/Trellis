"""Explicit local check execution, evidence inspection and manual acknowledgement."""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO, Iterator, cast

from .io import write_json
from .paths import get_developer, get_repo_root
from .task_utils import resolve_task_dir
from .verification import (Command, Context, VerificationError, file_digest, load_context,
                           read_receipt, safe_path, text_value, verification_report)

MAX_LOG_BYTES = 1024 * 1024


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def evidence_lock(context: Context) -> Iterator[Path]:
    folder = context.evidence_dir()
    folder.mkdir(parents=True, exist_ok=True)
    lock = safe_path(context.root, (folder / "run.lock").relative_to(context.root).as_posix(), missing=True, runtime=True)
    try:
        lock.mkdir()
    except FileExistsError as exc:
        raise VerificationError(f"Verification is already running; if its process was forcibly terminated, inspect and remove only {lock}") from exc
    try:
        yield folder
    finally:
        lock.rmdir()


def save_receipt(context: Context, receipt: dict[str, object]) -> None:
    path = safe_path(context.root, (context.evidence_dir() / "current.json").relative_to(context.root).as_posix(), missing=True, runtime=True)
    if not write_json(path, receipt):
        raise VerificationError("Cannot atomically save verification receipt; archive remains blocked")


def terminate_tree(process: subprocess.Popen[bytes]) -> None:
    if os.name == "nt":
        try:
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=5, check=False)
        except (OSError, subprocess.TimeoutExpired):
            pass
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    if process.poll() is None:
        process.kill()
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        pass


def execute(command: Command, root: Path) -> tuple[str, int | None, float, bytes, bytes, bool]:
    buffers = [bytearray(), bytearray()]
    truncated = [False, False]

    def drain(pipe: BinaryIO | None, index: int) -> None:
        if pipe is None:
            return
        while True:
            chunk = pipe.read(8192)
            if not chunk:
                break
            remaining = MAX_LOG_BYTES - len(buffers[index])
            buffers[index].extend(chunk[:remaining])
            if len(chunk) > remaining:
                truncated[index] = True

    env = dict(os.environ)
    for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES"):
        env.pop(key, None)
    started = time.monotonic()
    try:
        process = subprocess.Popen(list(command.argv), stdin=subprocess.DEVNULL,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   cwd=root, env=env, shell=False, start_new_session=os.name != "nt")
    except OSError as exc:
        return "not_run", None, time.monotonic() - started, b"", str(exc).encode("utf-8"), False
    readers = [threading.Thread(target=drain, args=(pipe, index), daemon=True)
               for index, pipe in enumerate((process.stdout, process.stderr))]
    for reader in readers:
        reader.start()
    outcome = "fail"
    try:
        process.wait(timeout=command.timeout)
        outcome = "pass" if process.returncode == command.expected_exit else "fail"
    except subprocess.TimeoutExpired:
        outcome = "timeout"
        terminate_tree(process)
    except BaseException:
        terminate_tree(process)
        raise
    finally:
        for reader in readers:
            reader.join(timeout=2)
    incomplete = any(reader.is_alive() for reader in readers)
    if incomplete:
        terminate_tree(process)
        if outcome == "pass":
            outcome = "fail"
    return outcome, process.returncode, time.monotonic() - started, bytes(buffers[0]), bytes(buffers[1]), any(truncated) or incomplete


def run_attempt(context: Context) -> None:
    with evidence_lock(context) as folder:
        attempt = uuid.uuid4().hex
        logs = folder / attempt
        safe_path(context.root, logs.relative_to(context.root).as_posix(), missing=True, runtime=True).mkdir()
        results: list[dict[str, object]] = []
        for criterion in context.criteria:
            command = context.commands[criterion.command] if criterion.command is not None else None
            results.append({"id": criterion.id, "kind": "command" if command else "manual",
                            "status": "not_run" if command else "manual_required",
                            "source": "local" if command else "manual", "commandId": criterion.command,
                            "argv": list(command.argv) if command else [],
                            "expectedExit": command.expected_exit if command else None,
                            "exitCode": None, "durationSeconds": 0, "stdout": None, "stderr": None,
                            "stdoutHash": None, "stderrHash": None, "outputTruncated": False,
                            "note": None, "confirmedBy": None})
        receipt: dict[str, object] = {"schemaVersion": 1, "taskKey": context.key, "taskName": context.task.name,
                                      "attemptId": attempt, "fingerprint": context.fingerprint,
                                      "inputs": context.inputs, "head": context.head,
                                      "runtime": {"python": sys.version, "platform": sys.platform},
                                      "startedAt": timestamp(), "finishedAt": None, "source": "local", "results": results}
        save_receipt(context, receipt)
        try:
            for index, criterion in enumerate(context.criteria):
                if criterion.command is None:
                    continue
                command = context.commands[criterion.command]
                outcome, exit_code, duration, stdout, stderr, truncated = execute(command, context.root)
                result = results[index]
                result.update(status=outcome, exitCode=exit_code, durationSeconds=duration, outputTruncated=truncated)
                for stream, content in (("stdout", stdout), ("stderr", stderr)):
                    file = safe_path(context.root, (logs / f"{index}.{stream}.log").relative_to(context.root).as_posix(), missing=True, runtime=True)
                    with file.open("xb") as output:
                        output.write(content)
                    result[stream] = file.relative_to(context.root).as_posix()
                    result[stream + "Hash"] = file_digest(file)
                save_receipt(context, receipt)
        finally:
            receipt["finishedAt"] = timestamp()
            save_receipt(context, receipt)


def confirm_manual(context: Context, ident: str, note: str) -> None:
    text_value(note, "manual confirmation note")
    with evidence_lock(context):
        receipt = read_receipt(context)
        if receipt is None or receipt["fingerprint"] != context.fingerprint or receipt["finishedAt"] is None:
            raise VerificationError("Manual confirmation requires an existing fresh completed attempt; run verify first")
        results = cast(list[dict[str, object]], receipt["results"])
        selected = next((item for item in results if item["id"] == ident), None)
        if selected is None or selected["kind"] != "manual":
            raise VerificationError("Only a declared manual criterion can be acknowledged")
        if any(item["kind"] == "command" and item["status"] != "pass" for item in results):
            raise VerificationError("Manual confirmation cannot override a failed/incomplete automated check")
        selected.update(status="pass", note=note, confirmedBy=get_developer(context.root))
        save_receipt(context, receipt)


def emit(report: dict[str, object], as_json: bool) -> None:
    if as_json:
        print(json.dumps(report, ensure_ascii=False, allow_nan=False))
    else:
        print(f"Verification: {report['freshness']}; accepted={report['accepted']}")
        print(report["message"])
        receipt = report.get("receipt")
        if isinstance(receipt, dict):
            for result in receipt["results"]:
                print(f"  {result['id']}: {result['status']} ({result['source']})")


def dispatch(args: argparse.Namespace, action: str) -> int:
    try:
        root = get_repo_root()
        task = resolve_task_dir(args.dir, root)
        if task is None:
            raise VerificationError("Pass a task directory inside this project")
        context = load_context(root, task)
        if action == "run":
            run_attempt(context)
        elif action == "confirm":
            confirm_manual(context, args.criterion, args.note)
        report = verification_report(load_context(root, task))
        code = 0 if report["accepted"] else 1
    except (VerificationError, OSError) as exc:
        report = {"schemaVersion": 1, "task": str(args.dir), "mode": "unknown", "freshness": "invalid",
                  "accepted": False, "message": str(exc), "receipt": None}
        code = 2
    except KeyboardInterrupt:
        report = {"schemaVersion": 1, "task": str(args.dir), "mode": "unknown", "freshness": "invalid",
                  "accepted": False, "message": "Verification interrupted; rerun verify", "receipt": None}
        code = 130
    emit(report, args.json)
    return code


def cmd_verify(args: argparse.Namespace) -> int:
    return dispatch(args, "run")


def cmd_verification_status(args: argparse.Namespace) -> int:
    return dispatch(args, "status")


def cmd_verify_confirm(args: argparse.Namespace) -> int:
    return dispatch(args, "confirm")
