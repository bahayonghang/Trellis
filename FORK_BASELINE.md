# Fork Baseline

Personal fork of [mindfold-ai/Trellis](https://github.com/mindfold-ai/Trellis).
This file records the upstream point the fork builds on and the test results of
that point on the maintainer's machine, so later changes can be told apart from
pre-existing failures.

Recorded: 2026-11-09 (task `.trellis/tasks/11-09-fork-baseline`).

## Upstream

| Item | Value |
| --- | --- |
| upstream remote | `https://github.com/mindfold-ai/Trellis.git` |
| origin remote | `https://github.com/bahayonghang/Trellis.git` |
| Baseline commit | `f089cb3286071199e84118dee86b6d76aab032f1` (Merge #629, 2026-09-29) |
| Package versions at baseline | `@mindfoldhq/trellis` 0.6.17, `@mindfoldhq/trellis-core` 0.6.17 |
| Submodule `docs-site` | `587a1c8d5c3f77d0c97f47c7882f598c5f4002cb` (same as upstream) |
| Submodule `marketplace` | `7d5298d16e07c328c09493eed1f0652571744b17` (same as upstream) |

To find the baseline in a fresh clone:

```bash
git clone --recurse-submodules https://github.com/bahayonghang/Trellis.git
cd Trellis
git remote add upstream https://github.com/mindfold-ai/Trellis.git
git fetch upstream main
git merge-base dev upstream/main   # f089cb32 until the fork syncs upstream again
```

## Branches

- `main` follows upstream; no personal commits.
- `dev` holds personal changes; `feature/*` branches start from `dev`.
- Upstream updates are reviewed as a diff before merging into `dev`; never
  reset `dev` to upstream.

Personal commits on `dev` at baseline time:

| Commit | Summary |
| --- | --- |
| `46bb1b93` | chore: ignore local ref directory |
| `7d2d8742` | chore: bump packageManager to pnpm 12.18.0 (also CI and publish workflows) |
| `7edffcbb` | chore: add justfile for local checkout tasks |

## Baseline Environment

| Tool | Version |
| --- | --- |
| OS | Windows 11 Pro 10.0.26300 |
| Node.js | v26.7.0 |
| Python | 3.14.7 |
| pnpm | 12.18.0 |
| git | 2.56.0.windows.4 |
| just | 1.59.0 |

Global `trellis` / `tl` point at this checkout through `just install`
(`just which` confirms; `trellis --version` prints 0.6.17).

## Checkout Python Environment (2026-11-10)

The historical baseline above used system Python 3.14.7. This checkout now has
an explicit uv development environment, initialized with `uv init --bare
--no-package --python 3.9` and pinned by `.python-version`:

```bash
uv sync --locked
uv run python --version
uv run pnpm test
```

- Verified with uv 0.13.7 and `.venv` CPython **3.9.25**, without changing the
  system interpreter or global PATH. `uv sync` downloads Python when needed.
- `requires-python = ">=3.9"` retains the runtime compatibility floor; the pin
  selects 3.9 for local development. `uv.lock` is tracked, `.venv/` is ignored.
- This is a non-packaged, standard-library-only Python environment. pnpm still
  owns the TypeScript dependencies and basedpyright. See `CONTRIBUTING.md`.
- Real Python 3.9 `py_compile` passed for all **73 tracked Python files**,
  including the initialized marketplace submodule; bytecode went to a temp dir.
- All five required checks passed under `uv run --locked`: lint, typecheck,
  CLI `lint:py` (0 errors, 68 existing warnings), build, and full tests.
  Tests: core **401 passed / 2 skipped**, CLI **1930 passed / 35 skipped**.
  No added skips, timeouts, or retry settings.

Earlier results below retain their original interpreter and test counts.

## Results

Commands run on `dev` at `7edffcbb` with no source changes:

| Step | Command | Result |
| --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | **Failed** at `7edffcbb`: `ERR_PNPM_IGNORED_BUILDS` (esbuild@0.27.3). Fixed afterwards, see Known Issues 1 |
| install (used for this baseline) | `pnpm install --frozen-lockfile --config.strict-dep-builds=false` | Pass |
| typecheck | `pnpm typecheck` | Pass |
| Python lint | `pnpm --filter @mindfoldhq/trellis lint:py` | Pass |
| lint | `pnpm lint` | Pass |
| build | `pnpm build` | Pass |
| core tests | `pnpm test` (core) | 21 files pass; 398 passed, 2 skipped |
| CLI tests | `pnpm test` (cli) | 8 of 82 files fail; 20 failed, 1849 passed, 35 skipped |

## Known Failures (CLI tests)

Category key: **win** = caused by native Windows behaviour (line endings, path
separators, `cmd.exe` shims, permissions); **env** = caused by this machine's
state; **defect** = the product behaves wrongly on Windows, not just the test.

| # | Test | Count | Cause | Category |
| --- | --- | --- | --- | --- |
| 1 | `test/scripts/context-injection-limits.integration.test.ts` (truncate_utf8, caps, #580 control) | 7 | Python stdout in text mode emits `\r\n`; assertions expect `\n` | win |
| 2 | `test/regression.test.ts` `[env-file-dedup]` ×4 | 4 | SessionStart writes `export TRELLIS_CONTEXT_ID=...\r\n` to the env file; a bash `source` would keep the `\r` in the value | win, likely defect |
| 3 | `test/regression.test.ts` `[workflow-state] silent exit 0 when not a Trellis project` | 1 | `~/.trellis/` exists on this machine (contains only `spec-inject/`); the hook walks up from `%TEMP%`, treats the home dir as a Trellis root, then crashes with `ModuleNotFoundError: common` instead of exiting silently | env + defect (invalid `.trellis` marker accepted; see task `hook-trellis-root`) |
| 4 | `test/regression.test.ts` `[strip-breadcrumb] ... backreference parity` | 1 | `\n` escapes reach the Python helper as literal backslash-n under Windows argument quoting | win (test harness) |
| 5 | `test/commands/upgrade.test.ts` (real upgrade, npm non-zero) | 2 | On Windows the npm spawn goes through `cmd.exe`; the mock expects a direct `npm` call | win (test) |
| 6 | `test/configurators/python-rewrite-parity.test.ts` (POSIX default rendering) | 1 | Default rendering on win32 uses `python`, the test expects `python3` | win (test) |
| 7 | `test/templates/opencode.test.ts` (directory entries per-file cap) | 1 | Injected headers and truncation hints use `refdir\a.md` instead of `refdir/a.md` | win, likely defect |
| 8 | `test/templates/trellis.test.ts` (marketplace workflow mirror) | 1 | `marketplace` submodule checked out with CRLF (`core.autocrlf`); compared byte-for-byte with LF bundle | win (checkout) |
| 9 | `test/utils/atomic-write.test.ts` (preserves original when write fails) | 1 | The forced write failure relies on POSIX permissions, which do not block the write on Windows | win (test) |
| 10 | `test/configurators/platforms.test.ts` (byte-for-byte for every platform) | 1 | 10 s timeout exceeded on Windows filesystem | env (slow FS) |

Total: 20 failures, matching the vitest summary.

The husky pre-commit hook runs the full `pnpm test` (upstream #436), so these
failures blocked every commit through the hook on this machine.

**Status: all 20 fixed** in task `11-09-windows-test-failures` (product fixes
for #2, #3 and #7; test or config fixes for the rest, including a 30 s
`testTimeout` on Windows for #10). After the fix, on the same machine:
CLI 1869 passed, 35 skipped (the same skips as the baseline); core 398 passed,
2 skipped.

Three more Windows failures showed up later, during the hook runs for
commits. All are intermittent:

- `packages/core/test/channel/worker-inbox.test.ts` failed once with `EPERM`
  on the `.seq` sidecar rename. That rename failed about once per 3000-6000
  file replaces on this machine, because another process briefly held the
  file. Fixed with a Windows-only retry in `writeSidecar`.
- `packages/cli/test/commands/channel-wait-warning.test.ts` failed once in
  teardown with `ENOTEMPTY`: the supervisor warning is appended
  fire-and-forget, so its sidecar write could still be running while the
  test removed the temp dir. Fixed with `maxRetries` on that `rmSync`.
- `packages/cli/test/commands/ablate.integration.test.ts` (#5) failed once
  with `EPERM` renaming a restore temp dir onto `.codex/hooks` in
  `utils/ablation-store.ts`. Same cause as the `.seq` failure. **R13 fixed
  and verified (2026-11-10)**: CLI `renameSyncWithRetry`
  now covers all three ablation rename sites and `writeFileAtomic`;
  Python `common/io.py` and its byte-identical dogfood twin retry
  `PermissionError` on Windows. Each allows 10 retries at 10–100 ms
  (550 ms total), with immediate failure elsewhere. `commands/update.ts`
  migration rename sites remain outside this fix. The sibling sweep also
  found the one-shot CLI `channel/store/paths.ts:migrateLegacyChannels`
  rename; it retains the source and warns on failure, and is outside R13.

R13 verification (2026-11-10):

- Fault-injection red run before implementation: 25 failed / 42 passed.
  Green focused run including ablate integration: 81 passed / 2 existing
  skipped; 48 regression cases added, no new skips/timeouts/retries.
- Independent check added three setup sentinel regressions: red 5 failed /
  45 passed (three sentinels plus two existing Pi failures), green 50/50;
  combined R13/Pi/setup focused run 131 passed / 2 existing skipped.
- Full Windows suite via ordinary `pnpm test`, with Pi host env inherited:
  core 401 passed / 2 skipped; CLI 1920 passed / 35 skipped. Lint,
  TypeScript checks, Python checks (0 errors, 68 warnings in untouched
  files), build, and all 28 Python twin byte comparisons passed.
- Fixed the newly discovered Pi test isolation failure in `test/setup.ts`:
  scrub host `PI_SESSION_ID`, `PI_SESSIONID`, and
  `PI_SUBAGENT_PARENT_SESSION` before tests load. `evaluateExtension`
  spreads host env into its VM, which otherwise overrides no-session and
  no-parent fixtures. Tests may still supply explicit per-test env; Pi
  product runtime is unchanged. `test/setup.test.ts` runs the real setup
  against isolated host sentinels, preserving unrelated env. No shell env
  workaround is required.
- Both Python copies passed Python 3.9 grammar parsing. Runtime probes used
  installed Python 3.14.7; a real Python 3.9 interpreter is not installed.
- Three successful real hook commits passed the full suite without rename
  failures: `4075da63`, `c582e302`, `764cddc0`. No new skips, hook bypass,
  test-env unsetting, amend or push. One earlier attempt stopped before tests
  because lint-staged selected the broken Scoop pnpm shim; see Known Issues 2.

Any failing test needs investigation; no known environment workaround is required.

## Follow-up: Pi Context-Envelope Test Flake (2026-11-10)

A later ordinary pre-commit run failed the initial Pi envelope test (CLI
1936 passed / 1 failed / 35 existing skipped). That original call was not
instrumented. A subsequent parallel subset captured the unchanged fixture's
real phase subprocess timing out: **1529 ms**, deadline **1500 ms**, status
null / `ETIMEDOUT`; its preceding overview succeeded in **383 ms**. Replaying
that result reproduced overview present / workflow absent. Windows startup's
underlying stall source (scheduler, scanning, etc.) is **not established**, and
there is no evidence the archive-scope port changed Pi product behavior.
Evidence: `.trellis/tasks/11-09-archive-commit-scope/research/pi-context-precommit-flake.md`.

- Fixed only `packages/cli/test/templates/pi.test.ts` VM fixture isolation.
  Registered minimal `get_context.py` invocations receive deterministic output
  at the external `spawnSync` boundary, selected by actual script/cwd/argv.
  Their runnable Python scripts share the output constants. Template logic,
  filesystem, parsing, caches and envelopes remain real; other child-process
  calls pass through. Both fake-Pi Node child tests remain unchanged and pass.
- Deterministic red: **2 failed / 47 passed** before isolation. Green: Pi
  **55 passed** (8 new cases), plus archive **12 passed**, no skips. Explicit
  boundary success, status-null timeout, nonzero and thrown-error tests pin
  the existing omission behavior separately. No timeout/retry/skip increase.
- A separate smoke extracted the actual fixture factory/constants and ran both
  overview and phase scripts with real checkout **CPython 3.9.25**; both passed.
  All five required checks passed through `uv run --locked` with real pnpm's
  directory prefixed to PATH: core **401 passed / 2 existing skipped**, CLI
  **1945 passed / 35 existing skipped**, Python **0 errors / 68 existing warnings**.
  No diagnostic preload or shell PI-environment unsetting was used.
  Independent review additionally fixed a test-only environment typing error;
  strict test-inclusive TypeScript validation reported **0 diagnostics** and
  focused Pi/archive tests again passed **67 / 67**, without skips. The usual
  package typecheck excludes tests; Prettier was run explicitly on this file.
- Remaining product consideration: a real phase timeout still silently omits
  workflow and memoizes that startup omission. Runtime resilience/latency
  policy needs a separate scope decision; the extension, `.pi` dogfood,
  product deadline and harness settings were not changed.

Historical baseline and R13 counts above remain unchanged.

## Follow-up: R13 test isolation (2026-11-10)

The rejected planning-hook run at HEAD `069d1400` observed the original
`atomic-write.test.ts` fixture expecting three rename calls but receiving five
after two injected transient failures. This is consistent with extra recoverable
native failures, but the native error codes and locking process were not captured;
this evidence does not attribute them to antivirus, indexing, or any process.

Deterministic RED controls replayed that coupling without changing the shared
worktree: a disposable copy of the old TS fixture injected two additional
recoverable native failures and failed with **5 calls instead of 3**; the old
Python fixture likewise observed **5 attempts instead of 3** for both writers.
A throwing-native-success canary also failed the old Python success cases,
proving that the supposed-success branch delegated to native `os.replace`.
The replay controls were removed after each run.

The repaired boundary separates exact syscall contracts from publication:
`rename.test.ts` controls the real retry helper at the external `renameSync`
boundary and pins first success/no wait, 2→success, final allowed success,
all three Windows lock codes, the 11-attempt cap, 10–100 ms waits and exact
final error. Atomic-write and ablation tests retain native publication,
production waiting, old-data preservation, exact bytes, cleanup and recovery;
they count only their injected target prefix where native contention is allowed
to add legitimate retries. The Python test has the same controlled replace
boundary with prepared temp-byte/argument assertions and a separate real
text/JSON publication probe.

Validation evidence: four focused files **84 passed**; deterministic replay
**3 passed** on the repaired worktree (including the extra-failure and canary
controls); strict test-inclusive TypeScript, ESLint and Prettier passed; the
serial lint, typecheck, Python lint (0 errors, 68 existing warnings), and build
gates passed. The full suite then passed with core **401 passed / 2 existing
skipped** and CLI **2049 passed / 35 existing skipped** (89 files passed, 1
existing-skipped file; 2084 tests total). The implementer reported that the first
full-test invocation exceeded the agent's 120-second command ceiling. Its
`gate-test.log` ends after passing Windows configurator tests, without a CLI
summary or recorded assertion failure; it is incomplete, not passing evidence.
The longer invocation recorded the complete pass in `gate-test-final.log`
(340.33 seconds). No production files, platform copies, dependencies, retries,
skips or timeout settings were changed. A separate `uv run --locked` CPython
3.9.25 smoke also passed both writers' controlled 0/2/10-failure schedules and
real publication checks.

Independent review restored an exact Python directory-cardinality check (target
plus one controlled-success temp, target only on failure/interrupt) and pinned
replay RED to pre-repair commit `069d1400ea88d46f1480a6e8987fd582d19b9446`,
so moving HEAD or archiving the task does not invalidate the replay. Fresh
post-review checks passed: 84 focused tests, strict test-inclusive TypeScript,
ESLint/Prettier, both RED/GREEN modes, CPython 3.9.25's full 18 controlled and
4 native-publication cases, and all five serial quality gates. The fresh full
suite again passed core 401/2 existing skips and CLI 2049/35 existing skips
(CLI duration 178.18 seconds). See the task's `research/independent-check.md`
for findings, command evidence, tool limits and protected-document checks.

## Known Issues

1. **pnpm 12 install failed by default (fixed).** Commit `7d2d8742` moved the
   repo, CI and publish workflows to pnpm 12.18.0. pnpm 12 turns an
   unapproved dependency build script into an error, so plain
   `pnpm install --frozen-lockfile`, `just deps`, the fork's CI and the
   publish workflow all failed on esbuild's postinstall. Fixed right after
   the baseline by `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml`
   (via `pnpm approve-builds esbuild`); a fresh frozen install in a clean
   worktree then passed, followed by the core build and tests (398 passed,
   2 skipped).
2. **Local scoop pnpm shim is broken.** `~/scoop/apps/pnpm/current/pnpm.exe`
   is missing (a `.pnpm.exe.*.retired` file remains), so the `pnpm` shim
   fails to start. The baseline ran with `~/scoop/apps/pnpm/current/pnpm.cmd`
   prepended to `PATH`. This works for Bash, but Node subprocesses (including
   lint-staged's nested `pnpm`) can still resolve the broken shim. For those,
   prepend the directory of the existing real executable reported by
   `pnpm exec node -p 'process.env.npm_execpath'`; verify with Node
   `spawnSync("pnpm", ["--version"])` before committing. This is a process-local
   `PATH` workaround, not a global install change. Machine-local; not a
   repository issue.
3. **`docs-site` submodule is not initialized** in this checkout. No test
   needed it.
4. **Dogfood `.trellis/` is older than the CLI.** The local
   `.trellis/.version` records 0.6.14, so running `trellis` in this repo
   reports `0.6.14 → 0.6.17` available. Not updated as part of the baseline.
