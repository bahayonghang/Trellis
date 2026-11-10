# Pi context-envelope precommit flake (2026-11-10)

## Conclusion

**Confirmed failure mechanism:** these unit tests launch the real PATH Python through the VM's real `require`. During a normal parallel test subset, an unchanged minimal fixture's phase subprocess actually exceeded the product's 1500 ms deadline (`ETIMEDOUT`, status null). `runContextScript` maps that result to `""`; `workflowOverview` then omits `<trellis-workflow>`. Replaying that observed result reproduces the reported combination: session overview present, workflow / Phase 1 absent.

The original commit failure was not instrumented, so its exact subprocess result cannot be recovered. The same phase-spawn failure is now observed in the real Pi test file under ordinary test concurrency, rather than inferred solely from timing. The lower-level reason Windows startup stalled (scheduler, scanning, etc.) is **not established**. No claim that #649 changed Pi behavior.

## Source trace

- `packages/cli/test/templates/pi.test.ts:105-136`: `evaluateExtension` gives the VM a real `createRequire`, retaining actual external-process I/O.
- Same file `:185-214`: `createMinimalTrellisRoot` creates a trivial Python script (`import sys`, two print branches). No product task scripts or archive behavior execute there.
- Same file `:363-364`: initial envelope case unconditionally requires `<trellis-workflow>` and `Phase 1: Plan`.
- `packages/cli/src/templates/pi/extensions/trellis/index.ts.txt:104`: `SESSION_OVERVIEW_TIMEOUT_MS = 1500`.
- Same template `:1155-1194`: `runContextScript` invokes `python` on Windows; any nonzero/null status returns empty; `workflowOverview` requests `--mode phase --platform pi` and suppresses an empty result.
- Same template `:1805-1835`, `:2066-2120`: session overview and phase are separate subprocesses; startup context is memoized. Thus a successful overview cannot prove the phase call succeeded, and a missing startup workflow is cached for that root/session.

## Evidence

Environment: Windows, Node **26.7.0**, Vitest **4.0.18**, `availableParallelism() = 24`; `uv run --locked` resolves `python` to checkout `.venv/Scripts/python.exe`, **CPython 3.9.25**. Committed `test/setup.ts` performs environment isolation; no shell PI-variable unsetting.

1. Original log `C:/Users/lyh/AppData/Local/Temp/trellis-archive-scope-commit.log:1575-1636`: initial envelope assertion fails, but `SESSION CONTEXT / Current task: none.` is present. CLI **1936 passed / 1 failed / 35 existing skipped**.
2. Isolated unchanged Pi test file: **47 passed**, 4.12 s total. The caller's exit-only preload did not emit samples on this isolated invocation; do not count it as a measured subprocess trace.
3. Research-only `pi-context-load-repro.cjs` loads/transpiles the unchanged template, builds the same minimal fixtures, and observes real subprocesses (no injected delays/results). One worker: overview **234 ms**, phase **85 ms**. One bounded 24-worker wave: overview **661–723 ms**, phase **115–525 ms**; all 48 calls succeeded. This wave alone did **not** reproduce the flake; pure parallel fixture launches are insufficient evidence of a timeout.
4. One real test subset with immediate, observation-only preload **did capture an actual timeout**. Log: `C:/Users/lyh/AppData/Local/Temp/trellis-pi-research-subset.log:48`:

   ```json
   {"pid":42020,"phase":true,"command":"python","ms":1529,"timeout":1500,"status":null,"signal":"SIGTERM","error":"ETIMEDOUT","stdout":"","stderr":""}
   ```

   The immediately preceding overview (line 42) succeeded in **383 ms**. Across the 15 fixture calls, the other 14 succeeded in **211–976 ms**. The timeout occurred in a later root-switch/cache case, **not** the first assertion-bearing case, so the subset still reported **790 passed / 20 existing skipped**, 195.41 s; Pi **47 passed**. This passing suite must not be misreported as absence of the fault.
5. Paired diagnostic replay through the unchanged extension (temporary fixture, no product/test edits): real success control produced `{workflow:true, phase:true, overview:true}` with both subprocess statuses 0. Replaying the observed phase-timeout result produced `{workflow:false, phase:false, overview:true}` with overview status 0, phase status null / `ETIMEDOUT`; the next prompt retained the same omission. This is explicitly **result replay**, not another spontaneous timeout. Two earlier inline replay attempts had malformed Python escaping and failed their success control with SyntaxError; they were discarded and are not root-cause evidence.

## Reproduction commands

Use the real pnpm executable directory first (the Scoop shim alone is broken):

```bash
export PATH='/c/Users/lyh/scoop/apps/pnpm/12.18.0/global/v11/2714-18e65c7102ae139c-0/node_modules/pnpm:/c/Users/lyh/scoop/apps/pnpm/current:'"$PATH"
uv run --locked node .trellis/tasks/11-09-archive-commit-scope/research/pi-context-load-repro.cjs 1
uv run --locked node .trellis/tasks/11-09-archive-commit-scope/research/pi-context-load-repro.cjs 24
NODE_OPTIONS='--require=D:/Documents/Code/Agents/Trellis/.trellis/tasks/11-09-archive-commit-scope/research/pi-context-spawn-trace.cjs' \
  uv run --locked pnpm --filter @mindfoldhq/trellis test \
  test/templates/pi.test.ts test/scripts \
  test/templates/snow-write-trellis-context.test.ts \
  test/configurators/index.test.ts test/configurators/platforms.test.ts \
  test/regression.test.ts
```

A repeat may pass without timeout; do not add retries or treat this as a deterministic red test. The trace forwards every original argument and result unchanged and logs immediately, avoiding reliance on worker exit callbacks.

## Narrowest safe fix recommendation (not implemented)

- Isolate **only the external `node:child_process.spawnSync` boundary** for context-envelope unit fixtures in the VM evaluator. Supply deterministic session/phase stdout based on the actual argv, validating interpreter selection, fixture script path, cwd, context env, and timeout options. Keep the real template, filesystem, workflow parser, cache logic, context envelopes, and **all current assertions**. Do not mock an internal Trellis module or `workflowOverview` itself.
- Make the injection explicit/fixture-scoped; unexpected commands should fail loudly or remain real as appropriate. Do not blanket-stub child processes: fake-Pi child execution/protocol tests must still exercise real Node spawning.
- Cover status-null / timeout and success at this external boundary deterministically. Keep any desired real-Python integration smoke separate from envelope unit contracts, with no skips/retries or guessed timeout increase.
- Five before-agent-start scenarios share the minimal-fixture/real-Python coupling: initial envelope, task update, foreign session isolation, root switch, switch back. Consider them together rather than patching only the assertion at line 363.
- Do **not** increase the product timeout to repair a unit-test contract. The product's silent omission + startup caching is a separate real-runtime resilience consideration; the underlying Windows stall source and an appropriate product latency policy remain unproven. Product changes require main-session scope decision and relevant Pi docs; `.pi` dogfood is already different and must not be blindly synchronized.

Relevant contracts: `.trellis/spec/cli/unit-test/mock-strategies.md` permits mocking external non-deterministic/side-effectful child processes, never internal modules; `unit-test/conventions.md` preserves committed host-env scrubbing. No harness behavior or Pi configuration was changed here.

## Scope / tooling notes

- Active task confirmed with `python3 ./.trellis/scripts/task.py current --source`: `11-09-archive-commit-scope`.
- No existing product/test/spec/task files edited, no staging/commit/archive/push, no billed agent sessions. Only the new research artifacts were written. Full `git ls-files --stage` digest before/after is identical: `d6605e1c817dc5d7d274d1f5590171c9ad8156967131ce20c990ae79dc2b6f79`. `git diff --check` passed.
- GitNexus CLI query first failed via the known Scoop pnpm shim. With corrected PATH, `.gitnexus/run.cjs` selected `pnpm dlx gitnexus@latest`, which unexpectedly began fetching uncached 1.6.12/native dependencies and was terminated at the 60 s tool timeout before returning a query. No global installation or repository dependency/lockfile change was made; partial package-cache downloads remain. No retry/reindex, no cache deletion. A subsequent process inspection found no remaining matching runner. Direct source inspection was used; no existing symbol was edited.
- Main session owns any fix, deterministic red/green regression, full quality gate, baseline/spec updates, impact analysis before symbol edits, and precommit retry only after the fix decision. Research files are **untracked**, intentionally not staged.
