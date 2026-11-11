# Verification receipts implementation checkpoint

The user explicitly approved the written proposal on 2026-11-11. task.py start
set this task in_progress on dev. No remote write is performed.

## Implementation boundary

New common/verification.py owns contracts, fingerprints, receipt validation and
the read-only archive predicate. New common/task_verification.py owns explicit
check execution, status/manual commands and durable current-attempt writes.
task.py adds three command handlers; cmd_archive checks evidence before any
state/session/child/move/stage mutation. Both existing functions received the
exact pre-edit impacts recorded in planning evidence. Root/template twins are
copied byte-for-byte after changes. No hook, SDK or prior archive is edited.

New unindexed helpers receive UNKNOWN impact, not LOW/zero. Source-local
callers bound their adjustments to these modules and the approved CLI/archive
entrypoints. Fresh graph/staged scope checks remain required before commit.

## RED/GREEN and local observations so far

- Initial strict archive regression failed against the original source:
  expected rejection1, actual archive success0. This is the meaningful gate RED.
- After implementation the initial five real-process cases passed,10.48s.
- Expanded19-case run:18 passed, one test harness assertion used task instead
  of the existing current_task JSON field. Corrected the new assertion only;
  existing current/finish implementation was not changed.
- Expanded26-case suite passed,67.80s, including native Windows descendant
  termination, explicit manual confirmation, stale/failed reruns, real Git
  archive, CRLF/Chinese/subdirectory invocation and full fixture/Git byte
  preservation around status/refused archive.
- Numeric boundary RED: huge JSON timeout integer escaped as OverflowError,
  breaking JSON diagnostics. A finite-number boundary validator fixes deadline
  and stored-duration validation. The targeted numeric control passed1/1 after
  correction; full-suite rerun follows other final coverage additions.
- Initial targeted basedpyright of both new Python modules:0 errors/warnings.
  Initial ESLint on the new test also passed. Full quality/build/commit and
  own-task strict dogfood/archive gates are still pending at this checkpoint.

## Final pre-commit checks

The final focused suite passed 28/28. The directly affected five-file suite
passed 60/60 in 78.71s, including timeout/incomplete archive refusal with full
fixture/Git byte snapshots and nested Git/submodule rejection. There are no
new permanent skips or modified old timeouts/concurrency settings.

Root lint and typecheck passed. Strict compilation of the new TS test passed.
Both new Python modules have zero type errors/warnings; full Python lint has
zero errors and the same 68 existing unused-import warnings. Python 3.9.25
syntax compilation and all four root/template byte comparisons passed.

Serial build passed. npm pack --dry-run --ignore-scripts included 846 files
and all four verifier/entrypoint assets matched source bytes. The first local
inspection harness combined stderr with JSON and expected an array; the local
npm output uses a package-name map plus a stderr configuration warning. Reading
stdout separately and inspecting the actual shape passed; no product change.

The project registry and this task's policy now register AC01-AC10 and six
quality checks. Explicit meta.verification=strict is enabled. Status correctly
reported missing evidence before any own-task verification run. These commands
contain no publication operation. AC09/AC10 remain unchecked until the normal
commit and actual own-task verification/archive evidence exist.

## Final staged scope

Index-only refresh completed in 44.3s; FTS remains unavailable. Staged
detect-changes reports HIGH: 21 files, 90 symbols, 15 affected processes. The
source diff stays within the exact user-approved V1 files: two new verification
modules and existing main/cmd_archive integration, their dogfood twins, the new
test, task policy/project registry and task/spec documents. No old hook, SDK,
protected June task or previous archive is changed. This is the approved V1
scope, not an extension of the earlier doctor's CRITICAL authorization.

Fresh exact upstream checks still report main LOW (one module caller, no
resolved process) and cmd_archive UNKNOWN (no graph incoming edges; the dynamic
dispatch map is a real source caller). The aggregate HIGH rating and graph
limitations were reported before the normal feature commit. Its visible flows
cover dispatch/path validation, receipt atomic writes, manual confirmation,
Git/input reads, developer identity and the archive resolution path. No graph
result is treated as proof of comprehensive callers or zero risk.

## Full-gate findings and corrections

The first normal feature commit was refused by its full pre-commit gate: core
passed, but CLI had 128 regression failures, 2141 passes and 35 existing skips.
HEAD remained b176526e. Installed fixtures exposed a real distribution omission:
copying assets to dist is insufficient; getAllScripts did not register the two
new modules, so ordinary installed task.py commands failed to import. Correct
this in the owning templates/trellis/index.ts registry, adding only two exports
and two map entries. Its pre-edit upstream impact is LOW: direct caller
collectTemplateFiles, with update flows. No old test assertion was weakened.
The new fixtures now install through getAllScripts, not a source-tree copy.

An independent full-byte control also found that ./src/ did not match Git's
canonical src/file inventory. A durable AC03 test reproduced fresh instead of
stale (RED). Normalize the declared path before matching; both ./src/ and src/.
then pass the stale-on-source-edit control (GREEN 1/1). capture is unindexed;
its enclosing load_context has HIGH upstream impact: two direct callers,
dispatch and archive_verification_error, six resolved upstream symbols and
dispatch/archive flows. This is the approved input-fingerprint scope; no caller
or lifecycle API is changed. Both root/template verifier twins are synchronized.

Lint/typecheck/build and strict new-test TS/Python checks passed again after
these corrections. Final full gate and own-task evidence must use this corrected
source. A disposable isolated path-control checkout remains in system Temp:
Windows read-only Git objects interrupted its cleanup, and automatic approval
rejected both scoped cleanup attempts with only blocked by policy. No further
cleanup workaround is attempted; the project itself has no such extra path.

The installed current-task group then passed 167 cases and failed one existing
fixture setup: issue-399.1 pushes into the fixed sibling Temp/origin-bare.git,
which retained a different main from a prior run. Its failure is fetch-first in
that local bare fixture, not the verification code. Read the owning lines and
ran the unchanged case with process-local TEMP/TMP/TMPDIR set to a new owned
directory: 1/1 passed in 3.75s. Subsequent complete commit gates use a different
fresh Temp root per invocation. No old fixture is deleted, assertion changed,
skip introduced, or timeout/concurrency loosened. The local fixture Git push
does not target any network repository.

Corrected built CLI smoke passed on Windows, Node26.7.0 and Python3.9.25,
covering init, create/start/current/validate/archive, CRLF/Chinese paths and
update dry-run. It uses the actual built install inventory. No hosted CI,
Node18 or other-platform run is claimed for this new feature.

Receipts/logs are ignored runtime data; fixtures are disposable projects and
never borrow the real task/session or Git coordinates. No native host/model
call or hosted CI pass is claimed. Source HEAD remains b176526e before the
eventual feature commit. This checkpoint is not task completion evidence.
