# Execution plan

- [x] Review #591 diff and inventory all hook stdin readers; preserve non-hook CLI reads.
- [x] Snapshot source/dogfood pairs and original valid-output controls. Record upstream impact/callers for every existing symbol edited, including collectors and test fixture helpers; warn before HIGH/CRITICAL changes.
- [x] Add real-process regression tests first and run RED on the existing scripts. Include delayed 0.5s payload, held-open pipe, complete-open payload and Unicode/multi-megabyte input, diagnostics and native shutdown.
- [x] Add the one canonical standalone reader/support asset and wire all hook entrypoints and distribution paths. Keep support assets distinct from event capabilities. Preserve Snow parser semantics.
- [x] Adapt installed-asset test fixtures and type-resolution paths narrowly. Mirror only previously byte-identical dogfood scripts and install their helper.
- [x] Run targeted helper/hook/registry/configurator tests and inspect successful protocol output parity.
- [x] Run all required checks under `uv run --locked` with real pnpm executable first on PATH: `pnpm lint`, `pnpm typecheck`, `pnpm --filter @mindfoldhq/trellis lint:py`, `pnpm build`, `pnpm test`.
- [x] Compile all tracked and newly added Python files with actual 3.9.25; check twin parity and changed-file diagnostics. Classify pre-existing findings without unrelated security-policy refactors.
- [x] Update canonical spec contracts with `trellis-update-spec`; record exact red/green, process exit and artifact-distribution evidence in PRD.
- [x] Independent full-scope review: fixed Snow's wrapped-empty-object completion, added failing-then-passing native regression, reran all five checks plus focused/distribution/compatibility probes. See `research/verification.md` → Independent check-agent review.
- [x] Main-session final staged GitNexus detection: 45 files, 63 symbols, 43 expected hook/distribution flows, CRITICAL within the warned scope. Commit `9d0c72f7` includes `Ported from mindfold-ai/Trellis#591`; real pre-commit checks passed. No push/amend/hook bypass.

Archive handoff: run normal `task.py archive` after this gated implementation commit; keep bookkeeping separate.

Rollback point: before changing entrypoints, tests and new support asset are isolated. Roll back consumers and helper delivery together; never leave importing scripts without the installed support file.
