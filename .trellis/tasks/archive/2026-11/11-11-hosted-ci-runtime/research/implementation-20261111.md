# Runtime CI implementation and focused verification

## Change boundary

Changed only the two Linux runner matrix labels in `.github/workflows/ci.yml` from `ubuntu-latest` to `ubuntu-24.04`, two native watcher setup sites, and the two directly owning watcher test files. Python remains3.9, Node rows remain18.17.0/26.7.0, recursive checkout and existing conditional full-check/smoke coverage remain enabled.

Both `watchEvents` implementations now resolve the existing channel directory through `fs.realpathSync.native` only on Windows, inside their existing setup try/catch, and pass that canonical directory to `fs.watch`. The event-file read path, filter/sequence/UTF8 logic,200ms poll, abort listener and cleanup are unchanged. Resolve/watch failures retain the existing polling fallback. No helper abstraction, public API, package boundary, marketplace input, runtime version or unrelated fixture was changed.

CLI-local watcher remains live for wait/messages/supervisor/inbox use, so fixing only core would leave the same native-process crash on the CLI path.

## Pre-edit impact

Repeated exact file-qualified upstream impact after main's index-only refresh at HEAD09c34d30:

- Core `watchEvents`: HIGH;4 direct callers,6 upstream symbols,3 API processes (`watchChannels`, `watchWorkerInbox`, `watchWorkers`).
- CLI `watchEvents`: CRITICAL;4 direct callers,8 upstream symbols,5 processes (`registerChannelCommand`, `channelRun`, `channelMessages`, `runInboxWatcher`, `channelWait`).

Sent the risk/count/process report to main before edits; these exact risks were already approved by the user. Test-file-qualified lookups for `watchChannelEvents`/`watchEvents` reported no indexed target; added test callbacks are new anonymous functions and there is no indexed existing test symbol to impact. No existing named test/helper function was rewritten. Graph impact remains available despite the installation's unavailable FTS extension.

## Persistent regression additions

Each existing owning test file now has two new tests:

1. Spy on the native path resolver and watcher boundary; require the resolver's canonical path on Windows and unchanged original path elsewhere. Verify iterator return closes the watcher. This is deterministic even when8.3 aliases are disabled on the machine.
2. Force native resolution/watch setup failure, require continued delivery of a Unicode message while filtering a preceding join event, and verify abort terminates the generator. On Windows require the failing resolver to prevent an unsafe native watch call; elsewhere exercise watch setup failure directly.

The original real native UTF8-boundary test remains unchanged. No new skipped tests, increased timeouts or weakened assertions were introduced. The CLI and core tests remain separate because they exercise two current implementations with different creation/addressing APIs.

## Actual RED/GREEN in an isolated fixture

Fixture root: `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-redgreen-61b3d331827a4cc1bb22e291b1a1bb34`.

Extracted a read-only `git archive HEAD` into its `snapshot` directory and copied only the new test files into the snapshot. Attached dependency junctions to the already-installed main checkout packages/root so no install/network change was needed. The actual baseline watcher source was still the unfixed committed version. No shared-worktree revert/stash/index operation was used.

The fixture's long Temp root `.../trellis-runtime-redgreen-61b3d331827a4cc1bb22e291b1a1bb34/short_path_test_root` has the genuine8.3 alias `C:/Users/lyh/AppData/Local/Temp/TRD148~1/SHORT_~1` (obtained from Windows Scripting.FileSystemObject.ShortPath). Child Vitest invocations use this exact Temp root for both RED and GREEN; no Temp-path workaround hides the defect.

| Child run | Actual result | Raw log under fixture root |
| --- | --- | --- |
| core unfixed, `-t 'canonicalizes only'` | exit1;1 assertion failed,2 cases filtered | `core-red-guard.log` |
| CLI unfixed, `-t 'canonicalizes only'` | exit1;1 assertion failed,2 cases filtered | `cli-red-guard.log` |
| core unfixed, `-t 'preserves UTF-8'` | exit1; exact native fs-event.c:72 assertion and Vitest worker unexpected exit;2 cases filtered | `core-red-native.log` |
| CLI unfixed, `-t 'preserves UTF-8'` | exit1; same native assertion/worker exit;2 cases filtered | `cli-red-native.log` |
| core fixed, complete owning test file | exit0;3/3 passed, no skips | `core-green-short.log` |
| CLI fixed, complete owning test file | exit0;3/3 passed, no skips | `cli-green-short.log` |

The RED assertion requires a canonical watcher target and received the original directory instead. The separate native RED logs start with `Assertion failed: !_wcsnicmp(filename, dir, dirlen), file src\win\fs-event.c, line72`; these are process-level native failures, not ordinary failed test assertions. GREEN was obtained by copying only the two patched watcher source files into the same snapshot, then running the same real8.3 path with all three tests per owner. Core3/3 took279ms, CLI3/3 took271ms.

The fixture and dependency junctions are deliberately left in the recorded owned Temp root. No recursive cleanup across junctions was attempted.

## Current-worktree focused checks — PASS

- Core lint (`pnpm --filter @mindfoldhq/trellis-core lint`) and typecheck (`tsc --noEmit`) passed.
- CLI lint and CLI typecheck (`tsc --noEmit`) passed. Main completed the core/CLI build before CLI typecheck; implement agent did not race a dist build.
- Core focused run: `watch.test.ts`, `channel-runtime.test.ts`, `worker-inbox.test.ts`, `worker-state.test.ts`, `wait-supervisor-warning.test.ts`:91/91 passed across5 files,2.01s.
- CLI focused run: `channel-watch.test.ts`, `channel-wait-warning.test.ts`, `channel-supervisor-idle.test.ts`, `channel.test.ts`:50/50 passed across4 files,2.92s.
- `git diff --check` passed.

Commands used `rtk bypass` for raw tool output. Full suites were not duplicated here; main owns the normal commit hook, build/source-launcher smoke, independent review and actual hosted matrix verification. No stage, commit, push, global installation write or upstream operation was performed by this agent.

## Remaining acceptance

This evidence establishes both application watcher regressions and focused local behavior. It does not claim that hosted Linux setup/full suites, Windows CI or all self-use lifecycle checks have passed. Those remain main-session gates. Any subsequent unrelated failure must be diagnosed independently rather than hidden by runtime/skip/timeout adjustments.
