# Task verification receipts

## Ownership and entrypoints

The shipped Python `common/verification.py` owns policy/receipt validation,
input fingerprints and the archive predicate. `common/task_verification.py`
owns execution and CLI output. Every Python file has a byte-identical dogfood
twin under `.trellis/scripts/`. No SDK status/schema or hook executor is changed.
Register new shipped modules in templates/trellis/index.ts:getAllScripts as well
as copying their files into dist. Package presence alone does not install them.

Use `python` on Windows, `python3` elsewhere, with Python3.9 or newer:

```text
python .trellis/scripts/task.py verify <task> --json
python .trellis/scripts/task.py verification-status <task> --json
python .trellis/scripts/task.py verify-confirm <task> <manual-id> --note "Observation" --json
python .trellis/scripts/task.py set-meta <task> verification strict
```

Absent/off `meta.verification` preserves legacy behavior. Strict is explicit per
task; invalid explicit modes fail closed. Creation does not opt tasks in. The
existing validate command still checks context manifests, and finish still
unbinds a session even when evidence fails. No ordinary archive operation runs
registered commands or prompts for manual confirmation.

## V1 contracts

Project `.trellis/verification.json`:

```json
{
  "schemaVersion": 1,
  "commands": {
    "unit": {
      "argv": ["python", "-B", "tests/check.py"],
      "expectedExit": 0,
      "timeoutSeconds": 60
    }
  }
}
```

Task-local `acceptance.json`:

```json
{
  "schemaVersion": 1,
  "inputs": ["src", "tests/check.py"],
  "criteria": [
    { "id": "AC-AUTO", "command": "unit" },
    { "id": "AC-MANUAL", "manual": "Inspect the expected application output" }
  ]
}
```

IDs are stable, unique, nonempty text. Each criterion has exactly one command
reference or manual instruction; optional inert changeId is association data.
Only relevant registered command definitions are bound. No PRD command parsing,
shell expansion or automatic CI import exists. Registry commands are trusted
project code executed by explicit verify, not sandboxed untrusted input.
Deadlines are finite, positive and at most 3600s; expected exit is an integer.
Reject unknown fields/versions and malformed references with actionable errors.

V1 requires a regular local Git checkout whose Trellis and Git roots coincide.
Paths use repo-relative POSIX identities. Outside/shared/symlink/submodule
verification inputs are unsupported, with explicit refusal. Legacy unenrolled
tasks retain their existing linked-root behavior.
Normalize dot segments and trailing slashes before matching Git's file inventory;
otherwise a scope such as ./src/ can silently become an empty directory input.

## Fingerprint and persistence

Bind stable task identity/enrollment, acceptance policy, relevant command
definitions, full PRD/context/spec bytes, declared source scopes and verifier/
Python runtime identity. Directory scopes include tracked plus nonignored
untracked files, detecting additions/deletions; explicit regular files are
hashed even when ignored. Curated files are hashed in full, not at the context
injection truncation boundary. HEAD is recorded as provenance and does not by
itself stale identical relevant inputs. Lifecycle status/completedAt and runtime
receipt/log writes do not self-invalidate the receipt. Archive self-references
map to the same logical task identity after the move.

Use ignored `.trellis/.runtime/verification/<task-key>/` for current.json,
per-attempt bounded log files and the exclusive run.lock directory. Validate
resolved path components, including Windows junctions, before every owned write.
Reuse checked JSON readers and the canonical atomic writer. A new attempt is
persisted as pending before any command runs; failed/interrupted attempts cannot
borrow a previous successful attempt. Forced termination may leave a lock;
report its exact path for inspection rather than deleting another owner's lock.

Run argv with shell=False, ignored stdin and project-root cwd. Remove inherited
Git coordinate overrides from check children. Timeouts kill only the owned
process tree and bound drain/cleanup. Each stream is capped at 1MiB, with explicit
truncation metadata; store references and hashes rather than dumping logs into
JSON stdout. No full environment, credential or user-config capture is required.

## Result and gate behavior

Valid command invocations with --json return one V1 report object. Exit0 means
fresh acceptance; exit1 means failure/pending/stale; exit2 means invalid setup
or data. Interrupted verification returns130 and leaves incomplete evidence.
Per-criterion pass/fail/timeout/not_run/manual_required is separate from
freshness missing/fresh/stale/running/invalid. Human output shows each criterion.
Ordinary argparse usage errors retain the existing CLI usage format.

Manual confirmation needs an existing fresh completed attempt and explicit
nonempty note. It records source manual and optional existing developer identity;
it cannot override an automated failure, stale inputs or a command criterion.
Local receipts are not tamper-proof or proof of independent human identity.

Strict archive recomputes live fingerprints and validates every required result
and log reference/hash. It rejects before completed writes, child unlink,
session clearing, archive move, staging or commit. Branch/no-commit flags cannot
bypass the evidence gate. Enrolled partial/invalid policy is not treated as a
legacy task; existing unenrolled malformed-record handling remains separate.

## Required checks

Real subprocess/CLI tests cover output, failures, expected nonzero exits, launch
errors, stdin isolation, bounded output and descendant timeout cleanup. They
also cover tracked/untracked/spec/registry changes, unrelated commits, interrupted
reruns, manual approval restrictions, real strict archive, legacy finish/archive,
unsafe input/runtime links, malformed receipt/log metadata, read-only byte
snapshots and UTF-8/CRLF subdirectory execution. Include meaningful RED controls
for guards, Python3.9, whole-tree mirror regression and package asset inspection.
Do not substitute allow/exit0 assertions for evidence-content checks.

## Validation matrix and examples

| Condition | Result | Mutation |
| --- | --- | --- |
| Invalid policy/version/path, nonfinite or overflowing deadline | JSON invalid, exit2 | No check runs |
| Relevant bytes changed | Stale, exit1 | Status remains read-only |
| Missing, failed, pending or invalid strict evidence | Archive exit1 | No lifecycle/session/Git writes |
| Fresh complete pass, including explicit manual notes | Accepted, exit0 | Archive may proceed |

Good: verify registered argv, inspect actual logs, then archive against the same
input fingerprint. Base: an unenrolled task uses its existing lifecycle without
an acceptance policy. Bad: changing a spec or command definition then attempting
archive with the old passing receipt must be rejected.

## Wrong vs correct

Wrong: parse a PRD checkbox into a shell command, trust a stored accepted flag,
or call verify implicitly while archiving. Correct: resolve only registered argv
on explicit verify, recompute full current input bytes, validate each result/log,
and reject strict archive before mutations when evidence is not accepted.
