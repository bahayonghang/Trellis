# Read-only diagnosis: update teardown gate failure (2026-11-11)

Status: unchanged focused controls pass. The original full-gate failure is
confirmed as an afterEach wall-clock timeout; its underlying stall cause and
individual teardown phase remain unknown. No fix or full-suite retry was run
by this reviewer.

## Original failure

Main's normal doctor commit attempt failed precommit; HEAD remained `d7cb0fc0`.
The original log is retained locally at `%TEMP%/trellis-doctor-commit.log`.

- Core:401 passed,2 skipped.
- CLI:2238 passed,1 failed,35 skipped;244.56 s total.
- Sole failure: `test/commands/update.integration.test.ts` > `#15a backfills
  .gitattributes journal merge=union rule when missing (#415)`.
- Reported case duration:12.210 s; update file duration:172.721 s.
- Error: `Hook timed out in 10000ms`, attributed to afterEach at line196.
  No .gitattributes assertion failure was reported.
- The new doctor34 cases and existing warning17 cases passed in that gate.

The teardown, in source order, calls `vi.restoreAllMocks()`,
`vi.unstubAllGlobals()`, then synchronous
`fs.rmSync(tmpDir, { recursive: true, force: true })`. The stack identifies the
hook declaration, not a measured stalled phase. The log contains no timing or
stack sample within those three operations.

## Source explanation and limits

The existing CLI Vitest config sets Windows `testTimeout` to30 seconds but does
not set `hookTimeout`. Installed Vitest4.0.18's config resolver defaults nonbrowser
hookTimeout to10,000 ms separately from testTimeout. Its runner `withTimeout`
(`@vitest/runner/dist/index.js`, around line1198) starts a wall-clock timer and
also checks elapsed time on a synchronous callback's return. A synchronous
hook can therefore fail the10-second budget even when a timer cannot execute
while that hook is running.

This explains the error category and why the30-second test budget did not
prevent it. It does **not** identify whether mock restoration, global unstubbing,
recursive removal or scheduling/resource delays accounted for the original
elapsed time. Antivirus/filesystem contention is not established as fact.
No artificial-load or delay-injection experiment was performed or needed to
make that distinction.

The target case initializes a temporary project, removes its .gitattributes,
runs update with force and checks the restored journal merge rule. Its imports
call init/update directly; the failure is in existing test teardown, not an
observed doctor diagnostic assertion. Parallel full-gate resource interaction
has not been causally measured, so neither doctor nor a particular OS service
is assigned blame.

## Unchanged controls

Both commands ran serially from the same checkout with `uv run --locked` and
CPython3.9.25. No timeout, concurrency, skip or environment override was added;
the checked-out test/config files were not changed.

| Command suffix after `uv run --locked pnpm --filter @mindfoldhq/trellis exec` | Result |
| --- | --- |
| `vitest run test/commands/update.integration.test.ts -t '#15a backfills'` | 1 selected case passed;54 filtered;1.98 s total;case1.069 s |
| `vitest run test/commands/update.integration.test.ts` | 55/55 passed;63.04 s total;test time62.217 s;#15a0.949 s |

The54 filtered cases in the first command are selection output, not newly added
permanent skips. The second command executed the entire file with no filtering.
The full-file control's raw stdout is retained by RTK in
`%LOCALAPPDATA%/rtk/tee/1794390612_uv-run-stdout.log`.

## Recommendation and scope

One unchanged normal full-gate retry is reasonable after these two successful
controls, to determine whether the original timeout recurs. It would be a new
observation, **not** a root-cause fix, a passing gate claim or application of the
user's core channel-sequence-lock retry exception. Main decides and performs
that retry; this reviewer has not retried the commit or full suite.

If the same teardown fails again, preserve that log and investigate with
phase-level timing in an isolated/in-memory diagnostic before choosing any
separate test-harness change. The current evidence does not justify loosening
timeouts, changing concurrency, suppressing the failure, touching archived
Windows fixes or modifying product code. No such changes were made.

Only this new research receipt was written. No checked-out source, test, config
or existing task artifact was edited; no build/native session/commit/archive/
push or previously blocked temporary-directory cleanup was attempted. No
commands are left running by this reviewer.
