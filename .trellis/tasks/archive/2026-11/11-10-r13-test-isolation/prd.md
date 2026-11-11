# Isolate R13 fault injection from native rename timing

## Goal

Restore deterministic R13 verification without changing production rename/retry behavior. Keep real-filesystem publication, data-preservation and cleanup coverage while making exact attempt/backoff assertions independent of native Windows contention.

## Background and authorization

The docs-only Codex planning commit was rejected by pre-commit at HEAD `069d1400`: `atomic-write.test.ts:43` expected three rename calls but observed five. Core: 401 passed / 2 existing skips. CLI: 2,033 passed / 1 failed / 35 existing skips. No retry or bypass followed.

The success fixture injects two errors, delegates to real `fs.renameSync`, and mocks waiting. Additional native transient failures can therefore invalidate its exact schedule assertion despite successful bounded recovery. The native error codes/locker were not captured; do not attribute them to a particular process.

User approved creating this lightweight test-only repair task and then explicitly approved the reviewed implementation plan: `按照此计划开始实施`. Task activation completed on `dev`. The task is standalone; do not reopen archived R13 artifacts or change the original 14-child reliability map. Codex launch design and real sessions remain unapproved.

## Requirements

- Audit the same coupling in four R13 test files: `test/utils/{rename,atomic-write,ablation-store}.test.ts` and `test/scripts/io.integration.test.ts`.
- Controlled syscall tests must pin exact success/fail-fast/cap/backoff behavior without delegating their supposed-success branch to native rename/replace. Run the real production functions; do not mock internal retry/caller modules.
- Real-filesystem integration must retain successful file/directory publication, exact bytes, original-data preservation, interrupted/error cleanup and ablation recovery state. Its timing must use the real production recovery path, not zero-time waits plus exact native-attempt expectations.
- Preserve all three CLI transient codes, Python PermissionError handling, no-wait initial success, final allowed success, exact exhausted-error identity, platform fail-fast behavior and existing cleanup/interrupt controls. Relocate exact assertions rather than weaken or delete their coverage.
- Add deterministic failure controls before the repair, including the observed extra-native-failure shape; verify RED/GREEN without rerunning commits until they happen to pass.
- Clarify the narrow controlled-unit syscall exception in testing specs; integration keeps the real temp filesystem. Record this failure and validation in `FORK_BASELINE.md`.
- Preserve the six existing Codex/parent planning and diagnostic documents byte-for-byte; do not include them in the repair commit. Preserve all production/platform files.

## Acceptance criteria

- [x] Exact attempt/backoff unit cases cannot invoke native rename/replace on their success path; an explicit canary validates that isolation.
- [x] A deterministic control reproduces the extra-native-failure coupling on the previous fixture, then passes under the repaired separation.
- [x] Exact first/final success, 11-attempt cap, 10–100 ms schedule, original errors and fail-fast cases remain asserted at a controlled external boundary.
- [x] Real TS/Python publication and atomic-write/ablation data, cleanup, interruption and recovery-state checks pass without simulated zero waits governing native rename.
- [x] All four files are audited; safe passthrough cases without exact timing assumptions are documented rather than needlessly rewritten.
- [x] No production changes, new dependencies, Vitest retries/skips, timeout increases, preload hooks or environment-stripping workarounds.
- [x] Focused tests, strict TypeScript for changed tests, actual Python 3.9 execution and all five required quality gates pass; an independent check confirms no weakened contracts.
- [x] Baseline/spec evidence is updated, protected document hashes still match, and the isolated repair passes the real pre-commit hook.

## Out of scope

Codex launcher/configuration changes or approval, billed sessions, archived-task state edits, production retry budgets, unrelated filesystem cleanup/refactors, global setup, push/amend/hook bypass. Do not commit the pending Codex plan or journal as part of this repair.

## Artifacts

This is a lightweight single-package testing task: PRD plus a short execution plan and research are sufficient; no product design is introduced. See `implement.md`, `research/scope-and-evidence.md` and `research/protected-documents.json`.
