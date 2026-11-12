# Runtime repair verification

## Scope and approval

Initial dev HEAD `09c34d30d7afe1faeebe7692fd6a782e595ebf46`; initial product worktree clean. User approved the final plan, including the HIGH/CRITICAL watcher impacts and normal dev publication. No npm package/release/tag is part of this task.

Index-only GitNexus refresh succeeded before implementation (no source changes compared with the prior index); FTS remains unavailable, so exact file-qualified symbol impact is used. Implementer rechecked core HIGH (4 direct callers, 6 upstream symbols) and CLI CRITICAL (4 direct, 8 upstream symbols) before changes. Source ownership is explicitly limited to two watcher boundaries, regression tests and the CI Linux runner selection.

## Existing self-use launcher

The first PowerShell commands resolve to `C:/home/lyh/.npm-global/trellis.ps1` and `tl.ps1`; both invoke `D:/Documents/Code/Agents/Trellis/packages/cli/bin/trellis.js` and forward arguments/stdin. The first cmd launchers at the same prefix also invoke that exact source path. No launcher installation or PATH change is needed. Other lower-priority pnpm launchers exist but were not modified. Baseline Node is26.7.0; uv locked Python is3.9.25.

Build, disposable-project smoke, final source-launcher checks and hosted outcomes will be recorded below after execution. Existing project-version notices do not establish which executable is installed; no `trellis update` against a real user project is performed.

## Build and self-use — PASS

`rtk bypass pnpm build` rebuilt core and CLI and copied templates successfully. Raw log: `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-build-20261111.log`.

`rtk bypass uv run --locked node packages/cli/test/ci-smoke.mjs` passed on native Windows, Node26.7.0 and locked Python3.9.25 in a disposable Chinese/space path. It exercises init, generated hooks, task create/start/current/validate/archive, CRLF preservation and update dry-run with real built output. Raw log: `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-self-use-20261111.log` (reported project `trellis 中文 smoke 8c6xUW`). No real user project was initialized or updated.

Actual PATH commands `trellis --version` and `tl --version` both returned0.6.17 with exit0; `trellis --help` succeeded. The already-inspected first PS/cmd wrappers forward to this rebuilt checkout. No global installation or configuration change was required.

Compiled every tracked Python file including initialized submodules with uv's locked Python3.9.25, using the same recurse-submodules inventory as CI: pass. Marketplace gitlink/content and recursive checkout remain unchanged. Hosted Linux runner availability and actual matrix results remain to be validated remotely.

## Implementation regression — PASS

See `implementation-20261111.md` for exact impact, fixture paths, child commands and results. Both existing watcher test files contain persistent canonical-target/return cleanup guards and setup-failure filtering/abort guards. In an isolated archive of the actual unfixed HEAD, each new canonical guard failed; each original native UTF8 test independently reproduced the exact process-level libuv assertion under a genuine8.3 Temp alias. Copying only the two fixed source files into the same fixture/path made each complete owning test file pass3/3. No shared-worktree revert, fixture relocation, skip or timeout change produced GREEN.

Current-worktree directly affected tests: core91/91 across5 files, CLI50/50 across4 files. Both package lint/typecheck commands passed. Spec-sync review added the explicit Windows watcher contract to `commands-channel.md` without changing package/public APIs.

## First full commit gate — failed, retained

Staged GitNexus detect_changes identified exactly the two expected `watchEvents` functions across16 changed files and5 affected flows (diff risk medium); raw report `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-staged-impact-20261111.log`. This diff report does not supersede the separately approved per-symbol HIGH/CRITICAL upstream impact.

First normal commit hook used fresh TEMP/TMP/TMPDIR `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-commit-a18aa4b41fea45a9b82104756fefc7f8`, raw `commit.log`. No commit was created. Core403 passed/2 existing skips. CLI2269 passed/3 failed/35 existing skips,343.64s. All3 failures were30000ms timeouts in unchanged `test/configurators/platforms.test.ts` at203 (tracked-platform detection),267 (byte parity),299 (reverse template inventory). The log does not report template content/inventory assertion mismatches or a watcher failure.

Read the owning test loops, then ran the unchanged entire file as a control with a new process-local TEMP root `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-platform-control-0b7948e981b648f08a75872902ffccd7`; `platforms.log` records57/57 pass in47.66s. No source/test/timeout/concurrency/skip change was used for this control. The underlying cause/phase of the original timeout remains unknown; isolated passage alone is not a root-cause fix. A single unchanged-product normal gate retry follows the control and call-path review, rather than an unbounded rerun-to-green loop.

## Normal gate retry and dev publication — PASS

Independent narrow review found no direct call path from the three platform loops to either watcher. Configurator/file-writer/atomic-write code and the platform tests were unchanged. New mocks are restored and watcher generators close/abort; both owning watcher files passed in the first failing gate. The original slow phase remains unknown.

The single unchanged-product normal retry used fresh TEMP/TMP/TMPDIR `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-commit-retry-40df19e701a842fe97b1d5e636c52535`; raw `commit.log` records core403 passed/2 existing skips, CLI2272 passed/35 existing skips (98 files passed/1 skipped,243.27s). All57 platform tests passed in the full retry. No hook bypass, timeout/concurrency adjustment, new skip or assertion change was used.

Commit `c8972b98a0ca686581587a515f4af7713d6c58e8` contains the minimal CI/watcher changes, persistent regressions, spec and task evidence. Immediately before normal push, origin/dev remained09c34d30; local dev was1 ahead/0 behind. `git -c push.followTags=false push origin dev:dev` succeeded. No force push, upstream write, package/tag/release publish or global install change occurred. Hosted outcome remains pending at publication time.

## First hosted result and bounded follow-up

Push run43146333078 completed/failure. All four checkout/Python setup steps succeeded; both Node18 jobs passed, including CLI smoke. Windows core403/2existing skips passed without the prior native assertion; Linux core404/1existing skip passed. Full CLI execution exposed Linux4 and Windows22 failures in previously blocked code paths. Exact source/job/step/count/hash evidence and classification are in `first-hosted-jobs-20261111.json` and `first-hosted-blockers-20261111.md`. Four-job acceptance remains pending, not checked off.

Per the already-approved step9/R5, classified these as direct blockers to the unchanged four-job objective and recorded finite R6 source/test boundaries before editing. Follow-up avoids API/protocol/root-selection/permission changes: hook-owned UTF8 stdout, source-probe companion import environment and precise physical-path/OS Temp fixture corrections. No new runtime version, skip, deadline, broad environment override, npm publication or global configuration change is used.

## Follow-up build and local verification

First follow-up clean/build (raw `Temp/trellis-runtime-followup-build-20261111.log`) overlapped an active doctor test reading dist. The resulting9 doctor errors were missing built modules/copied templates during that rebuild, rather than behavior assertions. The execution overlap was acknowledged; its raw failure log is retained by the implementer. Do not count that run as a product regression or a pass. The unaffected hook-root34/34 and OMP25/25 tests passed in that invocation. No product fix was made for the build/test race.

After the final stdout type-narrowing refinement (getattr+callable, no ignore), main waited for explicit final-source-ready, completed `pnpm build` (6.01s, raw `Temp/trellis-runtime-followup-final-build-20261111.log`), then notified the implementer to rerun doctor only. No further dist writes were scheduled during that rerun.

Final rebuilt CLI lifecycle smoke passed on native Windows, Node26.7.0 / Python3.9.25 with Chinese/space/CRLF fixture (`trellis 中文 smoke qD0Hxr`), raw `Temp/trellis-runtime-followup-final-smoke-20261111.log`. Tracked recurse-submodule Python3.9 syntax passed. Actual trellis/tl source launchers still returned0.6.17. No real user project, global installation or launcher was rewritten. Full Linux follow-up behavior still requires a new hosted run.

Follow-up implementation receipt now records genuine isolated baseline/current controls for the physical-path assertions, OMP missing-TMPDIR guard, source-import companion module and both actual encoding helpers under a nonWindows common no-op. It distinguishes these from fixture setup errors and from full Linux execution. Expanded short-path controls passed doctor4/4 and hook-root9/9. Current complete owning files passed doctor34/34 (final idle-build rerun,83.05s), hook-root34/34, OMP25/25; the existing six Windows-ineligible symlink cases were not counted as passes.

CLI lint and TypeScript noEmit passed; final basedpyright0 errors/68 existing warnings, Python3.9 syntax and tracked Codex mirror UTF8 parity passed. Exact log names, raw RED/GREEN and the AST-probe limitation are in `followup-implementation-20261111.md`. Final independent follow-up review and next normal commit/hosted run remain gates.

Independent R6 review passed without code changes (`followup-check-review-20261111.md`), including raw final doctor34/34 evidence, scoped stdout ownership, exact identity/containment assertions and unchanged protocol serialization. It independently repeated lint/noEmit/Python static checks. Evidence qualification: the ordinary-current-HEAD guard compares UTF8-decoded status/stdout/stderr after CRLF normalization; it is not an original-Buffer byte oracle or a pinned historical baseline after HEAD advances. Unchanged JSON/print code and the meaningful existing comparison support ordinary output compatibility without claiming stronger raw-byte instrumentation.
