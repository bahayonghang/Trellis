# Pre-commit warning-timer diagnostic

## Original failed gate

The normal Python 3.9 pre-commit gate did not create the task5 source commit.
Core passed 401 tests with 2 existing skips. CLI passed 2148 tests, failed 1,
and retained 35 existing skips. Log:
`C:/Users/lyh/AppData/Local/Temp/trellis-bootstrap-commit.log`, lines 1814-1842.

Only failure: `test/commands/channel-wait-warning.test.ts`,
`scheduleSupervisorTimeoutWarning > uses a custom warning lead time`, line312:
the warning was undefined instead of matching timeout_ms500 / remaining_ms400.
This is not a reported core seq-lock timeout and is not covered by the user's
specific automatic commit-retry exception.

## Source trace and limits

The production scheduler requests a real100ms timer for timeout500 / lead400.
Its callback fire-and-forgets the real core event append. The test polls the
real asynchronous filesystem using wall-clock deadlines: first50ms, then300ms.
Its logger is a no-op, so the failed gate records neither callback timing nor
append completion or error. The original full-run cause remains unknown. The
log does not establish a lock failure, an antivirus cause, timer starvation,
or a Codex-bootstrap regression.

The same50+300ms oracle appears in the final scheduler-delay test. Other warning
tests also use real deadline polling. Commit577971f7 changed only this file's
teardown handling for Windows ENOTEMPTY while a seq-sidecar write is still in
flight; it did not change these warning timing assertions. The current task
does not change warning production code, warning tests or core channel code.

## Unchanged focused control

`uv run --locked pnpm --filter @mindfoldhq/trellis exec vitest run test/commands/channel-wait-warning.test.ts`
passed17/17, with no skips, timeout changes or concurrency overrides. Duration:
2.22s overall, 1.84s tests. Runtime is native Windows / Node26.7.0 / CPython3.9.25.
This passing focused run does not convert the failed full gate into a pass.

## Controlled external-I/O latency probe

An isolated Node process invoked the unchanged built production scheduler and
real core channel append/read against a disposable temporary channel root.
It copied the test's exact deadline/poll algorithm. Only the external
`fs/promises.appendFile` boundary was instrumented: one control delegates
immediately, and one adds450ms before delegating. The probe also observed the
requested timer delay and callback time, eventual real event, and append errors.
No shared product/test file, test budget, config or staged path was changed.

| Control | Timer requested / fired | Append started / published | Poll returned | Original field assertion | Eventual real event |
| --- | --- | --- | --- | --- | --- |
| no artificial latency | 100ms /101ms | 107ms /109ms | 116ms | pass | timeout_ms500 / remaining_ms400 |
| artificial450ms append latency | 100ms /109ms | 112ms /574ms | 372ms | undefined, would fail | timeout_ms500 / remaining_ms400 |

Both early50ms polls returned undefined. Both eventual events had the exact
expected fields; both append-error lists were empty. This demonstrates that
the test's observation window can fail despite a correct scheduler/event. The
artificial delay does not prove what happened in the original failed gate.

## Disposition

Read-only diagnosis only. No warning-timer test rewrite is included in task5.
A possible later test-only fix would control the external scheduling boundary,
assert the exact100ms delay, observe/delegate the real append promise and await
completion before reading, while retaining real-I/O coverage. That is separate
channel-test scope and requires its own decision; widening the polling budget
or suppressing the failure is not the proposal.

The coordinator may decide whether to attempt the unchanged normal full gate
again, retaining the original failed-gate evidence. This diagnostic does not
perform or authorize a commit/full-suite retry and does not claim full passage.

## Subsequent coordinator result

The coordinator subsequently repeated the unchanged normal full commit gate.
It passed: core401 /2 existing skips; CLI2149 /35 existing skips, including
all17 warning tests. Commit9a9e4b65 was created. No timeout, concurrency,
configuration, skip, assertion, channel source or warning test changed.
This records a later complete pass and does not identify the original stall
cause or turn it into the core seq-lock exception.
