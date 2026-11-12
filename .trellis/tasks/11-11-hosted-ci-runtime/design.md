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
