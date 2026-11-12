"""Local acceptance contracts, input fingerprints and the read-only archive gate."""

from __future__ import annotations

import hashlib
import json
import math
import os
import stat
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import cast

from .io import read_json_checked


class VerificationError(ValueError):
    """An invalid contract, unsafe input or unavailable verification resource."""


@dataclass(frozen=True)
class Command:
    argv: tuple[str, ...]
    expected_exit: int
    timeout: float


@dataclass(frozen=True)
class Criterion:
    id: str
    command: str | None
    manual: str | None


@dataclass(frozen=True)
class Context:
    root: Path
    task: Path
    key: str
    mode: str
    criteria: tuple[Criterion, ...]
    commands: dict[str, Command]
    inputs: dict[str, str]
    fingerprint: str
    head: str

    def evidence_dir(self) -> Path:
        return safe_path(self.root, f".trellis/.runtime/verification/{self.key}", missing=True, runtime=True)


def object_value(value: object, required: set[str], optional: set[str], label: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise VerificationError(f"{label}: expected an object")
    data = cast(dict[str, object], value)
    if not required.issubset(data) or set(data) - required - optional:
        raise VerificationError(f"{label}: missing or unknown fields")
    return data


def text_value(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip() or "\0" in value:
        raise VerificationError(f"{label}: expected nonempty text")
    return value


def list_value(value: object, label: str) -> list[object]:
    if not isinstance(value, list):
        raise VerificationError(f"{label}: expected an array")
    return cast(list[object], value)


def load_object(path: Path) -> dict[str, object]:
    data, reason = read_json_checked(path)
    if data is None:
        raise VerificationError(f"{path.name}: {reason}; restore valid verification configuration")
    return cast(dict[str, object], data)


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()


def file_digest(path: Path) -> str:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError as exc:
        raise VerificationError(f"Cannot fingerprint {path}: {exc}") from exc


def finite_number(value: object, label: str) -> float:
    if type(value) not in (int, float):
        raise VerificationError(f"{label}: expected a finite number")
    try:
        number = float(cast(float, value))
    except OverflowError as exc:
        raise VerificationError(f"{label}: numeric value is too large") from exc
    if not math.isfinite(number):
        raise VerificationError(f"{label}: expected a finite number")
    return number


def safe_path(root: Path, relative: str, *, missing: bool = False, runtime: bool = False) -> Path:
    """Validate every existing component, including Windows directory junctions."""
    if not relative or "\0" in relative or "\\" in relative or PureWindowsPath(relative).drive:
        raise VerificationError(f"Unsafe verification path: {relative!r}")
    parts = PurePosixPath(relative).parts
    if PurePosixPath(relative).is_absolute() or ".." in parts:
        raise VerificationError(f"Outside verification path: {relative!r}")
    lowered = tuple(part.lower() for part in parts)
    if ".git" in lowered or (not runtime and (lowered[:2] == (".trellis", ".runtime") or "__pycache__" in lowered)):
        raise VerificationError(f"Reserved verification path: {relative}")
    candidate = root
    for part in parts:
        candidate /= part
        try:
            info = candidate.lstat()
        except FileNotFoundError:
            continue
        except OSError as exc:
            raise VerificationError(f"Cannot inspect {relative}: {exc}") from exc
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
            raise VerificationError(f"Symlink/shared-store verification input is unsupported: {relative}")
    try:
        candidate.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise VerificationError(f"Outside verification path: {relative}") from exc
    if not missing and not candidate.exists():
        raise VerificationError(f"Missing verification input: {relative}")
    return candidate


def git_output(root: Path, *args: str) -> str:
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env["GIT_OPTIONAL_LOCKS"] = "0"
    try:
        result = subprocess.run(["git", "-c", "core.fsmonitor=false", *args], cwd=root, env=env,
                                stdin=subprocess.DEVNULL, capture_output=True, timeout=10,
                                encoding="utf-8", errors="strict")
    except (OSError, subprocess.TimeoutExpired, UnicodeError) as exc:
        raise VerificationError(f"Cannot inspect verification Git inputs: {exc}") from exc
    if result.returncode:
        raise VerificationError("Verification V1 requires a readable local Git checkout")
    return result.stdout.rstrip("\r\n")


def enrollment(task: Path) -> str:
    data, reason = read_json_checked(task / "task.json")
    if data is None:
        if (task / "acceptance.json").exists():
            raise VerificationError(f"task.json: {reason}; cannot determine verification enrollment")
        return "off"
    meta = data.get("meta", {})
    if not isinstance(meta, dict):
        if (task / "acceptance.json").exists():
            raise VerificationError("task.json.meta must be an object for verification")
        return "off"
    mode = meta.get("verification", "off")
    if mode not in ("off", "strict"):
        raise VerificationError("meta.verification must be off or strict")
    return cast(str, mode)


def load_context(root: Path, task: Path) -> Context:
    root = root.resolve()
    try:
        task_rel = task.absolute().relative_to(root).as_posix()
    except ValueError as exc:
        raise VerificationError("Verification task must be inside this Git project") from exc
    safe_path(root, task_rel)
    if Path(git_output(root, "rev-parse", "--show-toplevel")).resolve() != root:
        raise VerificationError("Verification V1 requires the Trellis root to be the Git root")
    head = git_output(root, "rev-parse", "HEAD")
    task_data = load_object(safe_path(root, f"{task_rel}/task.json"))
    mode = enrollment(task)
    policy_path = safe_path(root, f"{task_rel}/acceptance.json")
    policy = object_value(load_object(policy_path), {"schemaVersion", "inputs", "criteria"}, {"changeId"}, "acceptance.json")
    if type(policy["schemaVersion"]) is not int or policy["schemaVersion"] != 1:
        raise VerificationError("acceptance.json: unsupported schemaVersion")
    if "changeId" in policy:
        text_value(policy["changeId"], "changeId")
    scopes = [text_value(value, "input") for value in list_value(policy["inputs"], "inputs")]
    criteria: list[Criterion] = []
    for value in list_value(policy["criteria"], "criteria"):
        item = object_value(value, {"id"}, {"command", "manual"}, "criterion")
        ident = text_value(item["id"], "criterion ID")
        if ("command" in item) == ("manual" in item) or any(existing.id == ident for existing in criteria):
            raise VerificationError(f"Duplicate ID or invalid criterion kind: {ident}")
        criteria.append(Criterion(ident, text_value(item["command"], ident) if "command" in item else None,
                                   text_value(item["manual"], ident) if "manual" in item else None))
    if not criteria:
        raise VerificationError("acceptance.json: at least one criterion is required")
    commands: dict[str, Command] = {}
    needed = {item.command for item in criteria if item.command is not None}
    if needed:
        registry = object_value(load_object(safe_path(root, ".trellis/verification.json")),
                                {"schemaVersion", "commands"}, set(), "verification registry")
        if type(registry["schemaVersion"]) is not int or registry["schemaVersion"] != 1:
            raise VerificationError("verification registry: unsupported schemaVersion")
        if not isinstance(registry["commands"], dict):
            raise VerificationError("verification registry commands must be an object")
        definitions = cast(dict[str, object], registry["commands"])
        for ident in needed:
            item = object_value(definitions.get(ident), {"argv", "expectedExit", "timeoutSeconds"}, set(), f"command {ident}")
            argv = list_value(item["argv"], f"{ident}.argv")
            if not argv or not all(isinstance(arg, str) and "\0" not in arg for arg in argv):
                raise VerificationError(f"command {ident}: argv must be strings")
            text_value(argv[0], f"{ident} executable")
            timeout = item["timeoutSeconds"]
            if type(item["expectedExit"]) is not int or type(timeout) not in (int, float):
                raise VerificationError(f"command {ident}: invalid exit/deadline")
            deadline = finite_number(timeout, f"command {ident} deadline")
            if not 0 < deadline <= 3600:
                raise VerificationError(f"command {ident}: deadline must be in (0, 3600] seconds")
            commands[ident] = Command(tuple(cast(list[str], argv)), cast(int, item["expectedExit"]), deadline)

    visible = git_output(root, "ls-files", "-z", "--cached", "--others", "--exclude-standard").split("\0")
    inputs: dict[str, str] = {}
    active_prefix = f".trellis/tasks/{task.name}"

    def capture(relative: str) -> None:
        relative = PurePosixPath(relative).as_posix()
        actual = relative
        if relative == active_prefix or relative.startswith(active_prefix + "/"):
            actual = task_rel + relative[len(active_prefix):]
        target = safe_path(root, actual)
        files = [actual]
        if target.is_dir():
            if (target / ".git").exists():
                raise VerificationError(f"Nested Git/submodule verification inputs are unsupported: {relative}")
            prefix = actual.rstrip("/") + "/"
            files = sorted({value for value in visible if value and (actual == "." or value.startswith(prefix))})
        for name in files:
            if name.startswith(".trellis/.runtime/") or "/__pycache__/" in name or name.endswith(".pyc"):
                continue
            file = safe_path(root, name, missing=True)
            if file.is_dir():
                raise VerificationError(f"Verification input is not a regular file: {name}")
            label = "@task" + name[len(task_rel):] if name == task_rel or name.startswith(task_rel + "/") else name
            if label == "@task/task.json":
                continue
            inputs[label] = file_digest(file) if file.exists() else "missing"

    capture(f"{task_rel}/prd.md")
    capture(f"{task_rel}/acceptance.json")
    for manifest_name in ("implement.jsonl", "check.jsonl"):
        manifest_rel = f"{task_rel}/{manifest_name}"
        manifest = safe_path(root, manifest_rel, missing=True)
        if not manifest.exists():
            inputs[f"@task/{manifest_name}"] = "missing"
            continue
        capture(manifest_rel)
        try:
            for line in manifest.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    entry = json.loads(line)
                    if not isinstance(entry, dict):
                        raise VerificationError(f"{manifest_name}: context entry must be an object")
                    capture(text_value(entry.get("file") or entry.get("path"), manifest_name))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise VerificationError(f"Cannot read {manifest_name}: {exc}") from exc
    for scope in scopes:
        capture(scope)
    for name in ("verification.py", "task_verification.py"):
        inputs[f"@verifier/{name}"] = file_digest(Path(__file__).parent / name)
    inputs["@verifier/task.py"] = file_digest(Path(__file__).parent.parent / "task.py")
    identity = {key: task_data.get(key) for key in ("id", "name", "createdAt", "package")}
    identity["directory"] = task.name
    inputs["@task/identity"] = digest({"identity": identity, "mode": mode})
    inputs["@commands"] = digest({ident: {"argv": item.argv, "expectedExit": item.expected_exit,
                                          "timeoutSeconds": item.timeout} for ident, item in commands.items()})
    inputs["@runtime"] = digest({"python": sys.version, "platform": sys.platform})
    key = digest({"root": str(root), "task": identity})
    return Context(root, task, key, mode, tuple(criteria), commands, inputs, digest(inputs), head)


RECEIPT_FIELDS = {"schemaVersion", "taskKey", "taskName", "attemptId", "fingerprint", "inputs", "head",
                  "runtime", "startedAt", "finishedAt", "source", "results"}
RESULT_FIELDS = {"id", "kind", "status", "source", "commandId", "argv", "expectedExit", "exitCode",
                 "durationSeconds", "stdout", "stderr", "stdoutHash", "stderrHash", "outputTruncated", "note", "confirmedBy"}


def read_receipt(context: Context) -> dict[str, object] | None:
    folder = context.evidence_dir()
    path = safe_path(context.root, (folder / "current.json").relative_to(context.root).as_posix(), missing=True, runtime=True)
    if not path.exists():
        return None
    receipt = object_value(load_object(path), RECEIPT_FIELDS, set(), "receipt")
    if receipt["schemaVersion"] != 1 or type(receipt["schemaVersion"]) is not int or receipt["taskKey"] != context.key or receipt["taskName"] != context.task.name or receipt["source"] != "local":
        raise VerificationError("Invalid receipt version/task/source")
    for field in ("attemptId", "fingerprint", "head", "startedAt"):
        text_value(receipt[field], f"receipt.{field}")
    attempt = text_value(receipt["attemptId"], "attemptId")
    if len(attempt) != 32 or any(char not in "0123456789abcdef" for char in attempt):
        raise VerificationError("Invalid receipt attemptId")
    if receipt["finishedAt"] is not None:
        text_value(receipt["finishedAt"], "finishedAt")
    if not isinstance(receipt["inputs"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in receipt["inputs"].items()):
        raise VerificationError("Invalid receipt input inventory")
    if digest(receipt["inputs"]) != receipt["fingerprint"]:
        raise VerificationError("Receipt input fingerprint does not match its inventory")
    runtime = object_value(receipt["runtime"], {"python", "platform"}, set(), "receipt runtime")
    if not all(isinstance(value, str) for value in runtime.values()):
        raise VerificationError("Invalid receipt runtime")
    results = list_value(receipt["results"], "receipt results")
    same_inputs = receipt["fingerprint"] == context.fingerprint
    if same_inputs and len(results) != len(context.criteria):
        raise VerificationError("Receipt is missing required criteria")
    seen: set[str] = set()
    for index, raw in enumerate(results):
        item = object_value(raw, RESULT_FIELDS, set(), "receipt result")
        ident = text_value(item["id"], "receipt criterion ID")
        if ident in seen:
            raise VerificationError("Duplicate receipt criterion ID")
        seen.add(ident)
        kind = item["kind"]
        if kind not in ("command", "manual"):
            raise VerificationError("Invalid receipt criterion kind")
        if same_inputs and (item["id"] != context.criteria[index].id or kind != ("command" if context.criteria[index].command is not None else "manual") or item["commandId"] != context.criteria[index].command):
            raise VerificationError("Receipt criterion identity mismatch")
        if item["status"] not in ("pass", "fail", "timeout", "not_run", "manual_required"):
            raise VerificationError("Invalid receipt result status")
        if finite_number(item["durationSeconds"], "receipt duration") < 0 or type(item["outputTruncated"]) is not bool:
            raise VerificationError("Invalid receipt timing/output metadata")
        if item["exitCode"] is not None and type(item["exitCode"]) is not int:
            raise VerificationError("Invalid receipt exitCode")
        if kind == "command":
            command_id = text_value(item["commandId"], "receipt commandId")
            argv = list_value(item["argv"], "receipt argv")
            if not argv or not all(isinstance(arg, str) for arg in argv) or type(item["expectedExit"]) is not int:
                raise VerificationError("Invalid receipt command definition")
            if same_inputs and (argv != list(context.commands[command_id].argv) or item["expectedExit"] != context.commands[command_id].expected_exit):
                raise VerificationError("Receipt command definition changed")
            if item["source"] != "local" or item["note"] is not None or item["confirmedBy"] is not None:
                raise VerificationError("Receipt command contract mismatch")
            if item["status"] == "manual_required" or (item["status"] == "pass" and item["exitCode"] != item["expectedExit"]):
                raise VerificationError("Receipt command result mismatch")
        else:
            if item["argv"] != [] or item["expectedExit"] is not None or item["exitCode"] is not None or item["source"] != "manual" or item["status"] not in ("pass", "manual_required"):
                raise VerificationError("Invalid manual receipt")
            if item["status"] == "pass":
                text_value(item["note"], "manual confirmation note")
            if item["confirmedBy"] is not None:
                text_value(item["confirmedBy"], "confirmedBy")
        for stream in ("stdout", "stderr"):
            ref = item[stream]
            if ref is None:
                if item[stream + "Hash"] is not None or (kind == "command" and item["status"] in ("pass", "fail", "timeout")):
                    raise VerificationError("Missing receipt log evidence")
                continue
            expected_prefix = (folder / attempt).relative_to(context.root).as_posix() + "/"
            if not isinstance(ref, str) or not ref.startswith(expected_prefix) or kind != "command":
                raise VerificationError("Unsafe receipt log reference")
            log = safe_path(context.root, ref, runtime=True)
            if not log.is_file() or log.stat().st_size > 1024 * 1024 or file_digest(log) != item[stream + "Hash"]:
                raise VerificationError("Receipt log evidence changed")
    return receipt


def verification_report(context: Context) -> dict[str, object]:
    receipt = read_receipt(context)
    freshness = "missing"
    accepted = False
    if receipt is not None:
        freshness = "fresh" if receipt["fingerprint"] == context.fingerprint else "stale"
        if receipt["finishedAt"] is None or (context.evidence_dir() / "run.lock").exists():
            freshness = "running"
        results = cast(list[dict[str, object]], receipt["results"])
        accepted = freshness == "fresh" and all(item["status"] == "pass" for item in results)
    return {"schemaVersion": 1, "task": context.task.name, "mode": context.mode, "freshness": freshness,
            "accepted": accepted, "message": "Verification accepted" if accepted else "Verification requires fresh passing evidence; run task.py verify or acknowledge pending manual criteria",
            "receipt": receipt}


def archive_verification_error(task: Path, root: Path) -> str | None:
    """Legacy tasks are untouched; strict failures return before any archive mutation."""
    try:
        if enrollment(task) == "off":
            return None
        report = verification_report(load_context(root, task))
        if not report["accepted"]:
            return f"verification {report['freshness']}: {report['message']}"
    except VerificationError as exc:
        return f"verification invalid: {exc}"
    return None
