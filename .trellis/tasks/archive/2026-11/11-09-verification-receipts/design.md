# Local verification receipts V1 design proposal

## Behavior and scope

Add optional evidence to the existing Python task lifecycle. Unenrolled tasks
keep their current defaults. New verification commands run only on explicit
invocation; strict archive reads current evidence and never invokes checks.
Do not change context validate, finish, hooks, SDK fields or workflow seed text.
The user explicitly approved this proposal on 2026-11-11; implementation is active.

## Configuration ownership

Use existing task metadata: `meta.verification` is absent/`off` by default or
`strict` when enrolled, set through existing task.py set-meta. Invalid explicit
values fail closed. Creation does not enroll tasks or rewrite old records.

Task-local acceptance.json V1 contains required stable criterion IDs, optional
inert changeId, repo-relative file/directory input scopes, and criteria of two
forms: a registered command ID, or manual instructions. It contains no argv,
shell expressions, dependency graph or executable Markdown extraction.

Project `.trellis/verification.json` V1 maps command IDs to nonempty argv arrays,
expected exit codes and positive bounded deadlines. It is developer-controlled
project configuration, used only when verify is explicitly invoked in a trusted
project. Task/prose content cannot register or replace commands. This is not a
sandbox for a malicious project registry. Do not execute arbitrary --version
probes; record known runner/runtime identity and the exact registered command.

Use strict standard-library JSON readers/validators with typed internal records.
Reject duplicate IDs, invalid/unknown fields and schema versions, malformed
definitions, unsafe paths and unresolved references. A registered argv may
intentionally name a shell, but the runner itself always uses shell=False and
does not interpret shell operators or expand prose into executable strings.

## Command surface

- task.py verify <task> [--json]: explicitly run registered automated checks,
  leave manual items pending and persist the current local attempt.
- task.py verification-status <task> [--json]: recompute freshness without
  executing a check or changing task/receipt/Git state.
- task.py verify-confirm <task> <criterion-id> --note <text> [--json]: explicitly
  acknowledge one manual criterion against an existing current attempt. Record
  the note and existing developer identity when available; do not execute checks
  or overwrite an automated failure. This is an acknowledgement, not identity
  attestation or a claimed automated/host pass.

Successful fresh acceptance returns0. Failed/pending/stale evidence returns1;
invalid configuration or setup returns2. JSON mode emits exactly one V1 object;
per-criterion outcomes remain pass/fail/timeout/not_run/manual_required, separate
from freshness. Human output includes actionable rerun/repair instructions.

## Input identity and freshness

Use repo-relative POSIX identities and deterministic sorted file inventories.
V1 requires a local Git project and regular, contained inputs. Reject outside,
symlink/shared-store verification input with an actionable unsupported-input
result. This restriction applies to the new opt-in feature, not legacy tasks.

Bind evidence to stable task identity/enrollment, acceptance policy, relevant
registry definitions, PRD, implement/check manifests and their curated context/
spec inputs, declared source/test scopes, and verifier/runtime identity.
Fingerprint full file bytes, including content beyond a host injection limit;
do not hash only the truncated context prefix delivered to an agent.
Declared directories include newly added/deleted tracked and nonignored
untracked inputs, not just a fixed list captured by an earlier run. No traversal
of `.git`, runtime evidence, caches or generated logs as implicit inputs.
Explicit regular input files are hashed even when ignored by Git; ignored
directory contents are not implicitly discovered as source inputs.
Explicit missing/unsafe input is an error rather than silently omitted evidence.

Record HEAD/dirty provenance separately. A different commit with identical
bound input bytes remains fresh; source/config/spec changes stale the receipt.
Lifecycle-only status/completedAt and journal changes do not self-invalidate it.
Normalize a task's active/archive location to the same logical identity, so the
archive move does not erase access to its evidence. Do not claim cross-clone
portability or hermetic coverage of undeclared system dependencies.

Capture relevant inputs before and after a check attempt. If they differ, retain
the observed process results but do not issue fresh-pass evidence. Status and
strict archive recompute current inputs; they do not trust a stored fresh flag.

## Execution and persistence

Resolve only registry argv; ignore stdin, use bounded deadlines, capture bounded
stdout/stderr with truncation metadata, and terminate only the owned process
tree on timeout/interruption (POSIX process group, native Windows tree cleanup).
Drain/cleanup must also be bounded. No timeout/concurrency changes to old tests.
Treat launch errors and skipped/not-started criteria distinctly from pass.

Evidence lives under ignored `.trellis/.runtime/verification/<stable-task-key>/`.
Store versioned current-attempt receipt plus bounded log references. Validate
keys and resolved destinations before creation/writes; reject unsafe links.
Reuse common checked-read and atomic-write helpers. Do not stage logs or store
credentials, arbitrary environment dumps or full user configuration in receipts.

Before execution, atomically replace the current attempt with not_run/pending
results. Update results durably; a failed/interrupted rerun must not expose the
previous passing receipt as the latest attempt. A receipt records task/check
identities, schema version, input fingerprint, source local/manual, runtime,
HEAD, argv, expected/actual exit, timing, and bounded log metadata.

Manual confirmation requires a matching fresh attempt and manual criterion.
Changing inputs requires re-verification; confirmation cannot repair stale data,
omit required checks, or relabel an automated failure. Old artifacts/schema
versions and incomplete criterion sets fail validation. Local edits can forge
local files; this design makes no anti-tamper or independent-human proof claim.

## Archive integration and compatibility

Add one small guard before cmd_archive writes completed, unlinks children,
clears sessions, moves paths, stages or commits. Strict requires all required
criteria passing and a valid current fingerprint. Reject partial/invalid policy
for an enrolled task, including missing files; do not silently treat it as legacy.
Keep old malformed-record handling only for tasks with no verification enrollment
or artifacts. Direct manual JSON/SDK edits remain outside enforcement.

Existing no-commit/auto-commit/branch flags do not skip verification. Preserve
normal branch checks, scoped staging, errors and hooks after the guard. Finish
continues to unbind regardless of evidence; no new pause/complete API is added.
After archival, runtime receipt lookup follows the same logical task identity.

## Files and validation

Expected product ownership: template scripts/common/verification.py (contract,
fingerprint and gate), common/task_verification.py (execution/CLI handlers),
task.py (parser/dispatch), common/task_store.py (early archive guard). Sync each
with its root `.trellis/scripts` dogfood twin. Avoid an SDK/module refactor.
Register the two modules in templates/trellis/index.ts:getAllScripts so init and
update install them. Full-gate regression exposed this necessary distribution
wiring; file presence in a pack dry-run is insufficient installation evidence.

Add focused executable integration tests and only directly affected archive/
finish regressions. Cover real commands, stale/untracked inputs, manual pending/
confirmation, dirty HEAD provenance, interrupted/racing attempts, unsafe paths,
bounded timeout descendants, JSON/error outcomes and byte-preserving refusal.
Test installed template behavior as well as mirror equality and Python3.9.

Add one backend contract spec and example configuration. This repository's own
task will explicitly enroll and register real local checks for dogfood acceptance;
adding the new project registry is part of the reviewed implementation scope.
No existing user/hook configuration or marketplace gitlink is changed.

Rollback is a targeted revert of this feature's scripts, tests/docs and new
dogfood registry/policy, preserving unrelated staged work. No receipt requirement
is retroactively applied to existing reliability archives.
