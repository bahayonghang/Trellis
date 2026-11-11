# Reliability v1 local integration closeout

## Current acceptance boundary

On 2026-11-11 the user requested local completion without further publication,
then explicitly selected first-version local closeout with verification-receipts
remaining deferred. These instructions supersede the hosted-green archive gate
in the earlier handoff. The PRDs now state local acceptance explicitly.

No marketplace fork/branch, submodule URL repair, further push, PR update,
merge, tag or npm publication is performed after that scope change. The
previously published dev and draft PR remain historical external state.
Hosted runs 43022012893 and 43023805660 failed Checkout because marketplace
commit 1aa9b32 is unavailable from its configured remote. Their tests never ran.
Future hosted/public delivery still requires distribution repair and a real
green matrix; local archival certifies the revised local deliverable only.

## Task inventory and archive reconciliation

The cutoff is 2026-10-09. Exact active and monthly archive task metadata contains
17 valid matching task records: 12 were already completed, with three remaining
reliability children, this parent and the separate verification-receipts task.
The two June tasks are outside scope. Ten malformed legacy January records
were observed in the full archive scan and left untouched; they were not
accepted as parsed task evidence or rewritten during this work.

The parent still lists its original 14 children. Each now has exactly one
November archive task.json, status completed, with no active duplicate:
fork-baseline, windows-ci, init-hash-baseline, archive-commit-scope,
hook-trellis-root, codex-subdir-hooks, task-create-keep-active, hook-stdin-guard,
codex-crlf-config, hooks-local-gitignore, upgrade-linked-guard,
hook-payload-replay, doctor-command and windows-test-failures.

This round's separate normal archive commits are:

- `2d4efc93`: windows-ci, local matrix/smoke/configuration delivery.
- `6c700c84`: hook-payload-replay, saved/derived payload and mutation assertions.
- `7994943a`: doctor-command, read-only diagnostic/schema/runtime delivery.

Each passed full normal pre-commit: core 401 pass/2 existing skips, CLI 2239
pass/35 existing skips. Staged GitNexus found only the corresponding moved
task documents and local-acceptance records, with no indexed symbol overlap.
Original implementation, provenance, independent reviews and failed-run
receipts are preserved. No skip, deadline, concurrency or product source changed.

## Cross-child evidence

The exact source comparison from e7583d64 through 7994943a is empty for packages,
GitHub workflows, Claude/Codex/Cursor, dogfood scripts, marketplace and package/
runtime manifests. Therefore the prior root lint/typecheck/build checks after
e7583d64 apply to identical source inputs. Full tests also ran in each current
archive gate, most recently doctor at 7994943a (CLI 210.77s). Static/build/native
checks were not needlessly rerun for documentation/archive-only changes.

The native Windows integration receipt windows-integration-20261111.md remains
applicable: workflow-edit preservation and update dry-run, A/B active-task
isolation, default archive with an unrelated staged sentinel preserved, and
actual Codex 0.167.1 context delivery from src all passed on this source. The
native turn completed its exact injected marker in 6 seconds with zero tools.
It is distinct from replay and from the input-capture receipts. No new model
call, window/display matrix, WSL or credential/config intervention was made.

Existing limitations remain explicit: no hosted Linux/Windows suite execution;
doctor's historical real-checkout exit 1 for a missing owned OpenCode asset;
doctor confidence at most probed; the original intermittent platform/update
timeouts have unknown causes despite unchanged controls and later full passes;
and old Temp fixtures are untouched. None is converted into a fabricated pass.

## Protected scope and final gate

Git comparison against 9cc2f58e confirms both June tasks, verification-receipts
and every previously archived task outside the three newly archived children
are unchanged. All three divergent inject-subagent-context.py mirror SHA256
values still match their initial 9b68be8d...6f2a8caa value. Product sources,
user configuration and submodule contents are unchanged.

This parent remains a requirements/integration container, never a product
implementation target. Its dev branch metadata is recorded through task.py
before archive, without starting implementation. All revised cross-child AC
are supported above. Parent archive is performed through task.py, staged
detect_changes is inspected, and a separate normal full-gate commit follows.
Its actual result is recorded in the final session journal.

After that archive the date cohort is 16 completed/archived tasks and one
explicitly deferred planning task, verification-receipts. The user selected
that remaining task's deferral; no acceptance/schema/strict-archive feature
is added or marked complete. Stop after the local journal and final scope check.
