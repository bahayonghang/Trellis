# Archive commit blocked by unrelated full-suite timeouts

## State

Work commit `7998b571474386b8c811f90efe595d0f28bfac30` succeeded through the
unmodified real pre-commit hook: core 401 passed / 2 existing skips; CLI 2049
passed / 35 existing skips. Its exact 16-path scope excludes all six protected
Codex/parent documents.

The supported `task.py archive --no-commit` command moved this standalone task
to `archive/2026-11/11-10-r13-test-isolation` and marked it completed. The
subsequent scoped archive commit was attempted once and rejected by the real
hook. **No archive commit exists.** HEAD remains `7998b571`; the task move and
completion evidence remain staged for the pending archive commit. Do not run
archive again: its source no longer exists.

## Observed failure

`research/real-hook-archive.log` records core 401 passed / 2 existing skips and
CLI 2047 passed / 2 failed / 35 existing skips (260.01 seconds). Both failures
are deadlines, not failed behavior assertions:

- `test/configurators/platforms.test.ts:203`: the all-platform configuration
  loop exceeded the existing Windows 30000 ms test deadline; reported duration
  46681 ms. Its prior successful work-commit run took 15863 ms.
- `test/commands/uninstall-dirty-guard.integration.test.ts:53`: the `beforeEach`
  that creates a real Git repository and awaits real `init()` exceeded Vitest's
  existing 10000 ms hook deadline. The affected scenario was "committed user
  data does not block --yes uninstall" (reported 11074 ms including setup).
  Its prior successful work-commit run reported 5754 ms.

The unchanged `vitest.config.ts` sets 30000 ms for Windows tests and does not
set a hook timeout. Both failed files and all production/configuration files
have no archive diff. All four R13 files still passed during the rejected hook:
14 rename + 15 atomic-write + 33 ablation-store + 22 Python I/O = 84 tests.
The archive delta is confined to this task's documentation/metadata move.

## Diagnostic control and limits

One diagnostic invocation ran the two original files without changed workers,
timeouts, environment stripping, skips, or source edits:

`uv run --locked pnpm --filter @mindfoldhq/trellis exec vitest run test/configurators/platforms.test.ts test/commands/uninstall-dirty-guard.integration.test.ts`

Both files passed, **62 tests**, 40.19 seconds. The all-platform case took
7879 ms; the affected uninstall case reported 2458 ms. Evidence:
`research/archive-timeout-focused.log`. This rules out a consistently failing
focused reproduction, but **does not establish the root cause or prove that
another full-suite/commit attempt would be reliable**. Full-suite contention is
a hypothesis; the failed run captured neither resource utilization nor per-step
init timings. Do not blame a specific process, antivirus, native rename error,
or the repaired R13 boundary without evidence.

No timeout, worker setting, hook, production code or test was changed; no commit
retry or bypass followed. Further code work on these other tests requires a
separate scope review. The archive commit remains blocked rather than being
retried until green.

## Preservation and handoff

Keep all six protected worktree hashes and the five original index entries from
`protected-documents.json` exact. The five planner entries remain staged and the
Codex diagnostic remains untracked. They must be excluded from the pending
archive commit and any follow-up repair. Leave the reliability parent at 7/14
and Codex in planning. No push, amend, billed session or journal commit occurred.

Next: obtain approval for an independently scoped diagnosis of full-suite
configuration/init timing. After the blocker is understood and validation is
meaningful, scope-gate and commit the already-moved archive, without rerunning
`task.py archive` or sweeping in the pending planner documents.
