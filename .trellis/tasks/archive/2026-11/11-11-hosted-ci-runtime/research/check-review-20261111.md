# Independent runtime repair review — 2026-11-11

## Findings

No implementation defect or missing directly affected regression found. No product-code fix was needed during review.

Reviewed the task artifacts, applicable package/channel/test contracts, current five code/test diffs and the new Windows watcher spec section. The source changes match the approved boundary:

- CI changes only the two Linux matrix labels to `ubuntu-24.04`; Python3.9, Node18.17.0/26.7.0, recursive checkout, Windows runner, existing conditional full checks and smoke remain intact.
- Both current watcher owners canonicalize the existing directory only on Windows and only before entering `fs.watch`, inside the existing setup guard. Event-file reads, filters, sequence modes, incremental UTF8 decoding, poll interval, abort handling and iterator-return cleanup are unchanged. A native-resolution failure takes the existing polling fallback; non-Windows target behavior is unchanged.
- The CLI-local implementation remains active for messages/wait/inbox/supervisor flows. Fixing both owners is necessary; this does not introduce a new abstraction or alter public package boundaries.
- `.gitmodules`, marketplace gitlink and package manifests are unchanged (`git diff --quiet HEAD` over those paths exited0). No runtime/skip/timeout workaround or installation/global configuration change was introduced.

## Regression evidence independently checked

Read the six child logs under `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-redgreen-61b3d331827a4cc1bb22e291b1a1bb34`:

- `core-red-guard.log` and `cli-red-guard.log` each show a real failed canonical-target assertion against the isolated baseline, exit1 as recorded. The two other cases were filtered, not passed.
- `core-red-native.log` and `cli-red-native.log` each show the exact `!_wcsnicmp(filename, dir, dirlen)` / `src\win\fs-event.c:72` native assertion and a Vitest worker unexpected exit. The native case did not complete; its filtered siblings are not counted as passes.
- `core-green-short.log` and `cli-green-short.log` each show3/3 passing, with no skips or unhandled errors, under the same genuine8.3 Temp-root alias.
- SHA256 comparisons confirm all four fixture watcher-source/test files now exactly match the corresponding current-worktree files. The fixture record describes replacing only the two source files between native RED and GREEN, preserving the short input path.

The permanent tests exercise actual watcher APIs and require a canonical native target/close on iterator return. The fallback tests verify filtered Unicode delivery and abort after setup resolution/watch failure. The original native UTF8 split-read tests remain present and unchanged. This combines a deterministic boundary guard with real native-path failure/recovery evidence rather than relying only on a standalone Node probe.

The implementation receipt records current-worktree focused passes: core91/91 across5 files and CLI50/50 across4 files. These cover the owning watchers and directly affected runtime/inbox/worker/wait/supervisor consumers. Full suites were deliberately not duplicated by this reviewer.

## Verification run by reviewer

All commands used `rtk bypass` and exited0:

- `pnpm --filter @mindfoldhq/trellis-core lint`
- `pnpm --filter @mindfoldhq/trellis-core typecheck` (`tsc --noEmit`)
- `pnpm --filter @mindfoldhq/trellis lint`
- `pnpm --filter @mindfoldhq/trellis typecheck` (`tsc --noEmit`, using the core output main already built)
- `git diff --check`

Raw reviewer check logs are under `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-independent-review-20261111/`. Also inspected the main build log and disposable CLI-smoke log: build/template copy completed, and native Windows Node26.7.0 Chinese/space-path smoke passed. Main's receipt separately records locked Python3.9 syntax and actual source-launcher checks; the reviewer did not modify launchers or repeat smoke.

## Spec and remaining gates

The new seven-part watcher contract in `commands-channel.md` matches the implementation and tests. No further spec or public API change is needed.

Normal complete commit-hook results and actual post-fix hosted matrix results remain main-session gates. Local review and the Python build-manifest evidence do not establish that hosted Ubuntu Python setup or all four jobs are green. Preserve real run/job/source/merge evidence and diagnose any new failure before expanding scope. This reviewer performed no stage, commit, push, dependency install, recursive fixture cleanup or remote write.

## Narrow review of the first normal-hook timeout failure

Read `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-commit-a18aa4b41fea45a9b82104756fefc7f8/commit.log` after the first normal hook exited1. Core passed403 with2 existing skips; its watcher file passed3/3. CLI passed2269, failed3 and retained35 existing skips; its watcher file passed3/3. All three failures were unchanged `test/configurators/platforms.test.ts` all-platform loops at lines203,267 and299, reported as30000ms test timeouts (displayed durations45.592s,44.413s,39.126s). No file-content or parity-assertion mismatch was reported.

Inspected those three bodies and their configurator/collector/write path: platform configuration writes template files, then the tests initialize hashes/detect ownership, compare collected template bytes, walk/snapshot directories and remove owned fixtures. No direct execution path from these cases into either changed `watchEvents` was found. `platforms.test.ts`, its configurator/file-writer/atomic-write helpers and Vitest configuration are unchanged. The new watcher test mocks are local to those tests, restored by their existing `afterEach`; each generator is returned/aborted in `finally`. The existing poll and watcher cleanup remain unchanged.

Main ran the entire unchanged platform test file as a fresh-process control, without changing tests/timeouts/concurrency. Inspected `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-platform-control-0b7948e981b648f08a75872902ffccd7/platforms.log`:57/57 pass in47.66s; the three previously timed-out cases took4.691s,6.241s and6.786s. This does not identify the underlying slow phase or establish a product fix. The original full-run failure remains valid evidence; its cause is unknown. There is no evidenced call-path reason to change the watcher repair or platform tests, and no machine subsystem is assigned blame. Reviewer ran no duplicate control, changed no code/settings, and leaves the normal full-gate retry decision to main.
