# R13 isolation research

## Source evidence

Original failure and preserved log reference:
`.trellis/tasks/11-09-codex-subdir-hooks/research/precommit-r13-fixture.md`.
Log: `C:/Users/lyh/AppData/Local/Temp/trellis-codex-plan-commit.log`, lines 1668–1698.

The product `renameSyncWithRetry` is synchronous. It only repeats after Windows EPERM/EACCES/EBUSY, at most 11 attempts. `writeFileAtomic` calls it once after one temp write. Five observed spy calls therefore fit additional recoverable native errors after the two injected errors. The original error codes/locker are not recorded. No change to production is indicated or authorized.

| Surface | Coupling | Planned separation |
| --- | --- | --- |
| atomic-write.test.ts:25–44 | Two injected errors, then real rename; mocked wait; exact three calls and two waits | Exact syscall/schedule controls remain controlled; real writer recovery retains write-once/data/temp assertions without imposing native call timing |
| atomic-write.test.ts:51–73 | Ten injected errors, then real success with no residual budget | Pin final allowed success at a fully controlled boundary, not on real Windows success |
| rename.test.ts:19–39 | Real file/directory rename but exact first-call/no-wait assertion | Keep separate controlled first-success contract and real file/directory publication checks |
| ablation-store.test.ts:143–181 | Controlled target failures followed by native publication; all waits mocked and counted | Real transaction/publication path retains data/recovery assertions and real waiting; exact schedule is controlled elsewhere |
| ablation-store.test.ts:184–217 | Target errors controlled but other metadata renames native under a global wait count | Pin target failures/identity independently of unrelated native timing |
| io.integration.test.ts:32–45 | Python replace success delegates to real os.replace while sleep is mocked | Exact probe contract gets controlled replace success; separate real text/JSON publication verifies actual bytes/cleanup |
| ablation-store.test.ts:564–591 | EIO injected only at prepared directory publish; other renames native with real waiting, no exact global schedule | Already safe for this failure mode; preserve unless new evidence requires a narrow change |

## Chosen testing boundary

Only nondeterministic external syscall results and waiting may be controlled in exact retry unit tests. Production retry/atomic-write/ablation implementations remain real. Exact counts and schedules move to that boundary rather than being relaxed.

Real-FS integration still uses real rename/replace and the production wait mechanism, including when a small controlled error prefix exercises the caller's recovery path. Verify the controlled prefix itself, bytes, preserved data, cleanup and recoverable state, not a total native-attempt count that the OS can legitimately change. Keep final-budget and fail-fast proofs deterministic in the controlled layer.

Do not replace native publication with copy/unlink and claim that it proves atomicity, construct a generic in-memory filesystem, or mock internal modules to force outcomes. Python test code remains inside the existing TS subprocess fixture; product Python files/twins do not change.

## Spec consistency

The general mock guide says to keep fs real. Its existing R13 requirement also explicitly calls for injected syscall failures. Clarify a narrow pure-unit exception for native rename/replace and wait, not blanket fs module mocking. Command/integration filesystem rules stay unchanged. This narrow exception is part of the reviewed plan, now explicitly approved for implementation.

## Preservation

`protected-documents.json` captures six worktree SHA-256 values and five pre-existing index entries before implementation. Task creation itself leaves those entries untouched. New task artifacts must not be used as a reason to include the pending Codex plan in a repair commit.

This standalone task leaves the original parent at 7/14 archived and leaves Codex in planning. User subsequently approved implementation with `按照此计划开始实施`; `task.py start` set this repair to in_progress on dev. Before implementation, six protected document hashes and five index entries were rechecked unchanged. No test/source modification, commit retry, billed session or Codex design approval occurred in that preflight.

## Implementation evidence (2026-11-10)

- RED replay: the old TS fixture with two additional deterministic native
  `EBUSY` failures failed at **5 rename calls vs 3 expected**. The old Python
  fixture with the same extra native-failure shape failed at **5 replace
  attempts vs 3 expected** for both text and JSON. The old Python success path
  also failed a throwing-native canary, proving it delegated controlled success
  to `os.replace`. Temporary replay files were deleted after each run.
- GREEN replay: the repaired TS/Python controls passed the extra-failure and
  native-success canary probes. The four focused files passed **84 tests**.
- `rename.test.ts` now owns controlled first success/no wait, two-failure
  success, final allowed success, three transient codes, 11-attempt cap,
  10–100 ms schedule and exact final error. Real file/directory publication is
  separate and uses the production helper without mocked waiting.
- `atomic-write.test.ts` and `ablation-store.test.ts` retain native publication,
  real production waiting, exact data/original-preservation/cleanup and recovery
  assertions. Their controlled prefixes count only injected target failures;
  unrelated native metadata renames are not included in a global wait count.
  The existing late directory `EIO` passthrough cleanup case was audited and
  left unchanged.
- `io.integration.test.ts` separates a controlled external replace probe (real
  temp bytes and syscall arguments, no native-success delegate) from real
  text/JSON publication with a small injected PermissionError prefix. Existing
  Python fail-fast, final-success, exact schedule and interrupt cases remain.
- Strict test-inclusive TypeScript, ESLint and Prettier passed. Serial gates
  passed: root lint, typecheck, CLI Python lint (0 errors / 68 existing
  warnings), build, and full tests (core **401/2 skipped**, CLI **2049/35
  skipped**). The longer full run took 340 seconds on Windows; no new skips,
  retries or timeout settings were added. A separate `uv run --locked` smoke
  exercised both writers' controlled 0/2/10-failure schedules and real
  publication on CPython **3.9.25**.
- The six protected SHA-256 values and five pre-existing index entries were
  revalidated after implementation; all matched. No production/platform file
  changed. The real pre-commit hook is intentionally deferred to the main
  session's scoped commit because this sub-agent must keep the repair unstaged
  while pre-existing planner documents remain staged.

## Independent check

See [independent-check.md](independent-check.md) for the fresh review. Two narrow
issues were fixed: replay now pins pre-repair `069d1400ea88d46f1480a6e8987fd582d19b9446`
instead of moving HEAD, and Python controlled cases also assert the exact total
directory cardinality so the temp canary does not weaken cleanup coverage.
Active/archive root resolution, both RED/GREEN modes, 84 focused tests, strict
changed-test TypeScript, ESLint/Prettier, actual CPython 3.9.25 (18 controlled and
4 native cases), and all five serial quality gates passed after those fixes.
Fresh full results remain core 401/2 existing skips and CLI 2049/35 existing
skips (CLI 178.18 seconds). Six protected hashes and the five original index
entries remain exact; repair changes remain unstaged. LSP was unavailable, not
reported clean. The incomplete initial gate log and checker setup errors are
explicitly diagnosed in the independent report; none were hidden by a retry.

## Main-session commit and archive handoff

User approved the scoped commit and archive. Work commit `7998b571`
(`test(fs): isolate retry contracts from native rename timing`) contains exactly
16 repair paths. The staged GitNexus gate reported seven symbols, zero indexed
affected processes and LOW risk; graph limits for test callbacks still apply.
The real pre-commit hook passed on its first repair attempt: core 401 passed /
2 existing skips; CLI 2049 passed / 35 existing skips (165.37 seconds).
`lint-staged` ran but had no matching source files, so the separately verified
strict test-inclusive tsc, ESLint and Prettier evidence remains necessary.

Post-commit checks matched all six protected worktree hashes and five original
index entries. Only the five original planner paths remain staged; the Codex
diagnostic remains untracked. No production/platform files were committed.
Archive uses the supported `--no-commit` option so its actual moved/staged scope
can be checked with GitNexus before the separate normal-hook bookkeeping commit.
No push, amend, hook bypass, Codex session or journal commit is part of this repair.

`task.py archive 11-10-r13-test-isolation --no-commit` moved this task to
`.trellis/tasks/archive/2026-11/11-10-r13-test-isolation`; metadata is completed
and records the work commit. Only this task's two manifests were updated for
their moved research reference. The source task is absent and the session no
longer has an active-task pointer (so `task.py current` returns 1 as expected).
The original reliability parent remains at 7/14; Codex stays in planning.
Six protected document hashes and all five original index entries were checked
again after the move. Archive staging/commit is restricted to this task's exact
source and destination; no unrelated archive, planner or journal is included.

**Archive commit blocked:** the first normal-hook archive attempt failed two
unmodified configuration/init tests at their existing 30 s / 10 s deadlines.
All 84 R13 tests passed in that run. A single unchanged two-file diagnostic
passed 62 tests, but the full-suite timing cause is unresolved. No commit retry
or timeout/worker/hook adjustment followed. HEAD remains `7998b571`; the move
is staged, not committed. See `research/archive-blocker.md` before continuing.
