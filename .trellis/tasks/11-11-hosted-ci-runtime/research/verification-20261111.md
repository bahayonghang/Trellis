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
