# Execution plan

- [x] Obtain task-creation consent, preserve the six pending documents, create a standalone planning task and inspect the four R13 test surfaces.
- [x] Persist requirements, evidence, scope and validation; curate implement/check spec context.
- [x] User explicitly approved the final plan (`按照此计划开始实施`); `task.py start` completed, status is in_progress and branch is dev.
- [x] Refresh only the approved cached GitNexus 1.6.12 index. Before each existing callback/helper edit, inspect its body/callers and upstream impact; document unresolved test-runner edges and warn on HIGH/CRITICAL.
- [x] Add deterministic RED controls for native-success leakage and extra recoverable native failures. Use disposable fixtures/isolated probes, not shared-worktree reverts or repeated commits.
- [x] Put exact first/final success and schedule assertions at controlled syscall boundaries, retaining real retry/caller code. Keep real-publication integration separate, with production waiting and unchanged data/recovery/cleanup assertions. Apply the same separation to the Python probe; do not build a generic fake filesystem.
- [x] Keep safe failure-only/passthrough controls intact where they do not couple exact waits to native operations. Document all audit matches.
- [x] Run the four focused test files and a strict test-aware TS program. Run Python cases on actual uv CPython 3.9.25; do not infer runtime compatibility from pyright alone.
- [x] Add the narrow unit/integration exception to mock-strategies/filesystem-safety as needed, in English, and record observed failure plus new evidence in FORK_BASELINE.md.
- [x] Run serially with `uv run --locked`: `pnpm lint`, `pnpm typecheck`, `pnpm --filter @mindfoldhq/trellis lint:py`, `pnpm build`, `pnpm test`. Do not race destructive build/typecheck setup with full tests.
- [x] Run an independent trellis-check with fresh focused evidence and all contract/preservation checks. LSP tools were unavailable/inconclusive; strict changed-test TypeScript, ESLint, real CPython 3.9.25 and fresh focused/full gates passed. See research/independent-check.md.
- [x] Verify six protected worktree hashes and no production diff. Keep the pre-existing five staged planning files and untracked diagnosis out of the repair commit; do not discard them.
- [x] Main-session staged GitNexus scope gate: 16 repair paths, seven symbols, LOW risk; protected index entries unchanged.
- [x] Real-hook Conventional Commit `7998b571`: core 401/2 existing skips, CLI 2049/35 existing skips. No push/amend/bypass. Codex plan/journal remain separate bookkeeping after this task.
- [x] Archive only this completed repair with `task.py archive --no-commit` to `archive/2026-11/11-10-r13-test-isolation`; staged only its source/destination paths, excluding protected planning documents.
- [ ] Complete the archive bookkeeping commit: the first real-hook attempt was rejected by unrelated 30 s configuration-test and 10 s init-hook timeouts. No retry/bypass followed. Two-file diagnostic control passed 62 tests but does not resolve the full-suite timing cause. See `research/archive-blocker.md`; a wider repair requires scope review.

## Tools and boundaries

Use the existing cached CLI only:
`node C:/home/lyh/.npm-global/.cache/_npx/5e786f48223a616c/node_modules/gitnexus/dist/cli/index.js`.
No npx/dlx/global installation. Prefix the real pnpm directories on PATH when running checks/commits:
`/c/Users/lyh/scoop/apps/pnpm/12.18.0/global/v11/2714-18e65c7102ae139c-0/node_modules/pnpm:/c/Users/lyh/scoop/apps/pnpm/current`.

If another unexplained failure appears, diagnose it rather than adding retries or relaunching the commit. A wider fix requires returning to scope review.
