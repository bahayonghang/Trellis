# Design

## 1. Scope and trigger

Two independent blockers follow successful checkout: unsupported Linux runner/Python pairing, and a Windows native watcher crash. The repository also retains a CLI-local watcher with the same unsafe input; both live implementations must be addressed. The user's self-use preference means validating the existing source launcher, not publishing packages.

## 2. Signatures and boundaries

Keep both `watchEvents(channelName, filter, opts): AsyncGenerator<ChannelEvent, void, unknown>` signatures and public exports unchanged. Expected source changes: `.github/workflows/ci.yml`, core/CLI `channel/.../store/watch.ts`, directly owning regression tests and focused spec/research records. No shared watcher extraction or supervisor refactor.

## 3. Contracts

- Linux matrix label becomes `ubuntu-24.04`; Windows remains `windows-latest`. Node rows stay18.17.0/26.7.0 and Python stays3.9. Checkout remains recursive and both conditional full-check rows remain enabled.
- On Windows, canonicalize the already-created channel directory with `fs.realpathSync.native` inside the existing watcher setup try/catch before passing it to `fs.watch`. Keep non-Windows watcher input unchanged to avoid unnecessary symlink-semantic changes.
- Continue reading events from the original event-file path; normalization only changes the native notification target. Resolve/watch errors retain the existing200ms poll fallback. Do not catch or suppress native-process exits.
- Preserve UTF8 decoding, sequence/filter behavior, abort/iterator-return cleanup and public event payloads.
- Current `trellis`/`tl` wrappers already target this checkout. Rebuild core then CLI and test them; do not install a second global executable or run update against a real user project.

## 4. Validation and error matrix

| Condition | Expected |
| --- | --- |
| Windows8.3 channel directory | watcher receives canonical real path; event arrives without native abort |
| Ordinary Windows path | same event/filter/termination behavior |
| Non-Windows path | existing watch behavior |
| Canonicalization or watcher setup fails | existing polling fallback remains live |
| Abort/return | interval/listener/watcher released as before |
| Ubuntu24.04 + Python3.9 | setup succeeds, syntax/full-check/smoke gates execute as configured |

## 5. Good/base/bad cases

Good: short and long directory aliases observe the same event stream without crashing. Base: existing UTF8 incremental-read test remains green. Bad: only replacing the CI Temp path, disabling fs.watch, switching away from Node26 or weakening tests would hide a real self-use crash.

## 6. Required evidence

Actual application-level regression red/green, not only a standalone Node demonstration. Use a subprocess for native-crash probes so an unfixed implementation cannot kill the entire suite. Reuse existing test setup and keep regression plumbing small; tests must fail on uncanonicalized watcher input even when a machine lacks8.3 aliases. Validate both current watcher owners. Run relevant package lint/typecheck and watch/channel tests, build and temporary-project smoke; then normal commit gate and a real new hosted run. No unrelated window/host/platform matrix.

## 7. Wrong versus correct

Wrong: move CI Temp to a long path and declare the native crash fixed. Correct: canonicalize at both actual fs.watch boundaries, prove the short-path regression and retain Node26 hosted execution.

## Risks and rollback

Core impact HIGH; CLI impact CRITICAL. These are preliminary exact-file impact results over an index two documentation/config-only commits behind HEAD; refresh/re-run before editing. Public API consumers and CLI wait/messages/supervisor/inbox need focused regression coverage. Rollback via ordinary revert, never force push. No task success until hosted four-job results and source-launcher checks actually exist; new independent failures require evidence and a scope decision rather than ad hoc patches.

## Classified hosted blockers after the first repair

Run43146333078 confirms Linux Python3.9 setup and Windows native watcher repair, but exposes previously unreachable CLI failures. These are direct blockers to the already-approved four-job acceptance, with no new product goal or API/permission decision:

- Codex/Copilot `configure_project_encoding` imports a helper that only configures Windows streams. An explicitly cp1252 Linux stdout still fails when emitting Unicode JSON. Fix stdout encoding only after owned-workspace selection, preserving ordinary UTF8 output byte-for-byte and existing structured payloads. Do not change global `common.configure_encoding` semantics or use ensure_ascii to bypass the ordinary-byte compatibility test. Sync the tracked Codex dogfood mirror only where necessary; leave settings/template hashes alone.
- The symlink fixture imports a source hook through importlib but omits adjacent support modules from sys.path. Repair the probe's import environment; preserve all containment assertions and existing platform eligibility.
- Node's legacy fs.realpathSync preserves Windows8.3 components while Python/native canonicalization expands them. Canonicalize physical-path assertions with native realpath in the existing doctor/hook-root fixtures. Keep exact identity assertions; do not weaken them to substrings or case-insensitive guesses.
- OMP `makeOmpProject` uses TMPDIR-or-/tmp instead of the already-imported os.tmpdir(). Use the OS temp API and prove operation with TMPDIR absent. No CI environment workaround.

Preliminary source-qualified impact of each template configure_project_encoding is LOW:1 direct main caller,2 upstream symbols,1 process. Refresh/recheck before edits. Detailed log evidence and test counts are retained in verification. Root/source ownership must be explicit in the implement follow-up; no changes to unrelated platform runtime or test deadlines.
