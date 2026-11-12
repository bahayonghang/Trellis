# Hosted failures after checkout repair — 2026-11-11

This is follow-up evidence, not a reopening of the archived local-delivery acceptance or a claim that hosted reliability v1 is green. The active repair task is `11-11-hosted-ci-marketplace`.

## New source and runs

Trellis dev source `c3c08559bcef98f0dfdf84f24a22d7a4de5fec6f` changes only the marketplace URL as product configuration; the gitlink remains `1aa9b326baf93257d6142660e49d3120e7f4b4ef`.

- dev push: https://github.com/bahayonghang/Trellis/actions/runs/43139653388
- PR #1: https://github.com/bahayonghang/Trellis/actions/runs/43139663032 (actual synthetic merge `fbbdd12d6ed80f895b88b68ced9aa86e48c90a2e`).

## Confirmed separate failure: Python 3.9 on ubuntu-latest

All four Ubuntu jobs (push IDs 130923278692 / 130923278704, PR IDs 130923309644 / 130923309648) passed Checkout, then failed `Setup minimum supported Python`. The logs report runner Ubuntu 26.04 and:

```text
The version '3.9' with architecture 'x64' was not found for Ubuntu 26.04.
```

The workflow requests Python `3.9`. No product tests or CLI smoke ran in these Ubuntu rows; their skipped checks cannot establish Linux behavior. This run does not prove that a specific alternative runner or interpreter would pass. Choosing a supported runner/Python combination and validating it is follow-up work, outside the authorized one-line checkout repair. No matrix, Python version, assertion, timeout or skip is changed here.

## Local gate fixture failure retained

A local normal commit gate also exposed the already-recorded fixed `Temp/origin-bare.git` fixture collision at `packages/cli/test/regression.test.ts:8473-8481`. CLI had 2269 pass / 1 fail / 35 existing skips; the bare fixture rejected a push because it retained another main. Three unchanged issue-399.1 controls passed with a fresh process-local TEMP. The full normal gate then passed core 401/2 existing skips and CLI 2270/35 existing skips with another fresh TEMP. No fixture was deleted or test changed. Detailed raw-log locations are in the checkout task's verification receipt.

## Confirmed separate failure: Windows Node26 native assertion

Windows / Node 18 jobs passed, including the CLI smoke. Windows / Node 26 failed during `Test (core + cli)` in both runs (push job 130923278624, PR job 130923309508):

```text
Assertion failed: !_wcsnicmp(filename, dir, dirlen), file src\win\fs-event.c, line 72
Error: [vitest-pool]: Worker forks emitted error.
Caused by: Error: Worker exited unexpectedly
```

PR core summary was 400 passed / 2 skipped, 20 of 21 test files passed and 1 unhandled error. The step failed before the CLI suite and smoke; their skipped steps are not passes. This log establishes a native assertion and worker termination while running core tests. It does not establish the triggering file/event or assign root cause to a specific product function, runtime version or fixture. Further diagnosis is outside the checkout repair; no retry-to-green, runtime swap, timeout adjustment or assertion/skip change was made.

## Checkout outcome

Both whole runs are completed/failure, but all eight Checkout steps are success. Downloaded every full log: each positively confirms the exact original marketplace SHA and none contains its prior not-our-ref error. Per-job evidence and hashes are in the new checkout task's `research/hosted-job-evidence-20261111.json`. The distribution fix is accepted independently of these remaining failures; hosted reliability v1 is not declared green.
