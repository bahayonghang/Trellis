# Execution plan

## Status

User approved the final plan on 2026-11-11, including the reported HIGH/CRITICAL watcher impact, normal commits and dev publication. Implementation is active. Research contains a native probe with the same failure and successful canonical-path controls.

## Order

1. [x] After final plan approval, activate task, refresh GitNexus with index-only, repeat file-qualified upstream impact before every modified function/test. Report full blast radius; preserve user's worktree.
2. [x] Implement agent owns the CI runner pin, both watcher boundaries and directly related regression tests. It must not spawn recursively or touch git/index/remotes. Load curated manifests and package specs.
3. [x] Establish a persistent regression that actually fails against the unfixed application code in an isolated temporary checkout/fixture, without reverting or stashing the shared checkout. Native crash probes must be child processes. Preserve raw logs.
4. [x] Apply the minimum Windows watcher normalization in both active owners and switch Linux runner to24.04. Run regression green plus ordinary-path, UTF8/filter and abort/return/fallback checks. Record why the CLI sibling is also necessary.
5. [x] Run package lint/typecheck, core and relevant CLI channel regressions, Python3.9 syntax check, then build core/CLI. Run existing disposable-project smoke and verify actual global trellis/tl wrappers still call this checkout. Do not mutate a real user project or publish npm.
6. [x] Independent check agent reviews scope, contracts, red/green and tests. Capture the native watcher-path contract in the owning spec. No dead-code cleanup or module migration.
7. [x] Main stages exact task files, runs staged GitNexus detect_changes and whitespace checks, then normal commit hooks. Use a fresh process-local TEMP/TMP/TMPDIR for each full hook invocation because the already-known fixed Temp/origin-bare.git fixture otherwise collides; do not delete the old fixture or edit that unrelated test.
8. [x] Normal push dev, preserving marketplace SHA/URL. Observe new CI run four rows. Collect actual source/merge SHA, job links, all step outcomes/counts/skips and failures. Do not infer success from build/config review.
9. [x] If additional failures appear, diagnose their owning path and relation to this repair before editing; scope or public behavior changes return to plan review. Do not rerun unchanged failures until green.
10. [x] All AC satisfied: record evidence, archive and journal, normal commit/push final records. No npm release/tag/PR merge.

## Direct-blocker follow-up under step9 / R6

First actual run43146333078 completed/failure after reaching the full suites: both Node18 jobs passed, Windows core403/2existing skips passed, Linux CLI4failed/2270passed and Windows CLI22failed/2250passed. Follow-up is bounded to the R6 files/contracts in design, and does not change the four-job goal or approval constraints. Use existing failing tests as RED evidence and isolated reproduction where practical, add only missing durable guards, preserve ordinary hook stdout bytes and containment checks. Rebuild and review before the next normal commit/push; no rerun of the unchanged failed hosted head.

## Validation commands

```text
pnpm --filter @mindfoldhq/trellis-core exec vitest run test/channel/watch.test.ts
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis lint
pnpm typecheck
pnpm build
uv run --locked node packages/cli/test/ci-smoke.mjs
trellis --version
tl --version
gh run view <new-run> --repo bahayonghang/Trellis --json url,headSha,jobs
```

Extend targeted test selections only for directly affected channel callers; no broad new platform/display acceptance.
