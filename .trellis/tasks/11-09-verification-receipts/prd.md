# Runnable acceptance and verification receipts

## Goal

Make task completion depend on reproducible evidence: stable acceptance IDs,
registered executable checks, input-bound local receipts and an optional strict
archive gate (TL17-19, related upstream issue #664). Keep task lifecycle status
separate from evidence status and preserve existing task behavior by default.

## Status and source requirements

In progress. On 2026-11-11 the user explicitly approved this proposal for
implementation. Reliability v1 is completed locally; the earlier trial-period
deferral is superseded for this task. Work remains local, with no push or
publication.

The original four requirements are retained: distinguish failure/timeout/not-run/
manual confirmation, invalidate evidence after relevant input changes, enforce
valid evidence for strict completion/archive, and keep old tasks compatible.
The approved design defines the implemented first-version contracts.

## Scope and requirements

- Acceptance criteria have stable IDs in task-local `acceptance.json`. It stores
  command IDs or manual instructions, never executable shell text. PRD prose and
  checkboxes remain descriptive; neither is parsed into commands.
- Commands are registered in trusted project `.trellis/verification.json` as
  argv arrays, expected exit codes and bounded timeouts. Only an explicit verify
  invocation runs them. Do not reuse the fail-open lifecycle shell-hook runner
  (`common/task_utils.py:run_task_hooks`, current shell sink at line449; the
  original draft referenced line427, TL32/#525).
- Use existing `task.json.meta.verification`: absent or `off` keeps current
  behavior; `strict` enables the evidence gate. Unknown explicit values are
  errors. New tasks are not enrolled automatically; no bulk legacy migration.
- Keep planning/in_progress/review/completed unchanged. Gate the existing
  archive command's completed write and move before any mutation. Finish/session
  unbinding remains available with failed or missing evidence. Do not introduce
  a second completion command or an SDK-wide status refactor.
- Run checks, inspect current evidence, and explicitly acknowledge manual items
  through task.py commands, with human and versioned JSON output. Manual
  acknowledgements must remain distinguishable from automated passes.
- Receipts bind task identity, policy, registered check definitions, relevant
  tracked and nonignored untracked inputs, PRD, curated context/spec inputs and
  verifier/runtime identity. Record HEAD, argv, timestamps, runtime versions,
  exit codes, bounded log references and source. HEAD is provenance; unrelated
  commits alone do not stale unchanged relevant inputs.
- Inspect freshness live. Failed/incomplete new attempts cannot silently reuse
  an earlier passing receipt. Input changes during execution prevent fresh-pass
  evidence. Receipt/log writes themselves must not invalidate their own input.
- Store runtime evidence under ignored `.trellis/.runtime/verification/`, not in
  tracked user configuration or automatically staged logs. Local receipts are
  diagnostic evidence, not tamper-proof attestations or proof of human identity.
- V1 targets local Git projects on the current Windows/Python3.9 baseline, with
  portable argv/path/process handling. New verification requires regular,
  repo-contained inputs; external/shared-store inputs are explicitly unsupported
  in V1. Existing unenrolled linked-workflow tasks keep their current behavior.
- Preserve existing host/user settings, task hooks, divergent hook mirrors and
  archived tasks. Add no dependency, network client or background execution.

## Acceptance Criteria

- [x] AC01: Duplicate/invalid IDs, schema versions, command references and unsafe
      paths are rejected with actionable diagnostics; a PRD shell-looking sentinel
      is never executed.
- [x] AC02: Actual subprocess checks report pass, fail, timeout, not_run and
      manual_required separately. Spawn errors are not successful checks; JSON
      stdout is one schema-valid object, and command deadlines bound descendants.
- [x] AC03: Changing relevant tracked source, adding/changing/removing relevant
      untracked input, editing PRD/spec/context or changing a command definition
      makes the receipt stale. Irrelevant journal commits and receipt writes alone
      do not. HEAD provenance and dirty input coverage are tested independently.
- [x] AC04: Input changes during execution and interrupted/failed reruns cannot
      leave the previous attempt accepted as the current fresh pass.
- [x] AC05: Strict archive rejects missing, invalid, stale, failed, timed-out,
      incomplete or manually pending evidence before status/session/child/Git/move
      mutation. Existing no-commit/branch options cannot bypass this evidence gate.
- [x] AC06: Fresh passing evidence permits a real archive. A manual criterion
      requires an explicit recorded acknowledgement, which cannot turn a failed or
      stale automated check into a pass.
- [x] AC07: Legacy tasks without enrollment retain create/start/validate/finish/
      archive behavior. Finish still unbinds an enrolled task with bad evidence.
      Task/SDK canonical field contracts and existing hook behavior remain intact.
- [x] AC08: Status inspection executes no checks and does not rewrite task,
      receipt or Git state. Declared invalid/outside/symlink inputs fail explicitly;
      no writes escape the owned runtime evidence directory.
- [ ] AC09: Durable tests prove the negative controls above and real output/
      byte-preservation behavior. Python3.9 checks, lint/typecheck/build/package and
      normal full commit gates pass without new skip/timeout/concurrency changes.
- [ ] AC10: Installed template and dogfood scripts match. This task exercises
      the new verification path on itself after implementation, then receives its
      own strict, locally evidenced archive and separate normal archive commit.

## Out of scope

- OpenSpec integration, external CI receipt import, cloud signing, anti-tamper
  claims, sandboxing arbitrary project commands, global default enforcement,
  automatic policy generation from prose, and modifying archived tasks.
- Preserve only optional inert `changeId` association metadata in the contract;
  no OpenSpec API, dependency or synchronization behavior (TL20-24).
- No hosted CI-green or native model/host claim is required for this local task.
  The existing unpublished-submodule CI limitation is not repaired here.

## References

- `research/planning-evidence-20261111.md`: current source and issue review.
- `design.md`: proposed contracts, boundaries and error handling.
- `implement.md`: ordered implementation and validation gates.
