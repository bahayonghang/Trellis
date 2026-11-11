# Reliability v1 continuation checkpoint

## Scope and commits

All work remains local on dev; no push, hook bypass or git add -A. The two
protected 06-17 tasks and previously archived product tasks were not modified.

| Child | Local result |
| --- | --- |
| windows-ci | 5cdbcba1: native OS matrix/dev triggers, Node 18.17/26.7, Python 3.9 and Chinese/space CLI smoke. Local smoke passed; remote Actions not run. Remains unarchived. |
| upgrade-linked-guard | a3d58384 implementation; c61ce63b archive. Installed shim dry-run/default-refusal acceptance and full gates passed. |
| hooks-local-gitignore | 18a1614c selective #648 implementation; a6414b37 archive after the user's explicit aggregate-impact approval. |
| codex-crlf-config | 2e5e4f56 tests-only #656 regression adaptation; 44b96630 archive. Actual update 未能复现 model loss/duplicate heading. User accepted canonical LF normalization, explicitly recorded instead of claiming byte invariance. |
| codex-subdir-hooks | 9a9e4b65: approved portable bootstrap and command-only migration, including exact-content init writes and narrow skipped-receipt preservation. Real 0.167.0 host acceptance remains not_run; keep in_progress/unarchived. |

The initial cleanup commits were bd6370f6 (R13 archive only) and a6434b10 (the
requested Codex/parent planning files only). The earlier aggregate-impact stop
is historical and superseded by the user's approval; see
checkpoint-20261110-critical.md and the active child authorization record.

## Verification and material limits

Task 5's detailed RED/GREEN, shell, migration, package and protection evidence is
in its research/verification-20261111.md and independent-check-20261111.md.
First source-commit pre-commit: FAILED (core 401 PASS / 2 existing SKIP; CLI
2148 PASS / 1 FAIL / 35 existing SKIP). The unchanged CLI custom warning-time
case did not observe its asynchronous file event within 300ms. Exact stall
cause is not captured; this is not the core seq-lock exception. No test,
timeout or archived task was changed to bypass it. After an unchanged 17/17
focused control and an isolated latency diagnostic, the unchanged normal full
gate passed: core 401 PASS / 2 existing SKIP; CLI 2149 PASS / 35 existing SKIP.
No concurrency/configuration overrides were used. The original stall cause
remains unknown; the artificial delay is only a demonstration of the polling
oracle's limitation. Both full-run outcomes are recorded in the child research.
No editor LSP session was used; direct
TypeScript, strict new-test compilation and GitNexus supplied code checks.

Current callable CLI is codex-cli 0.167.1. Neither a real Codex 0.167.0 host
session nor normal updated hook-trust acceptance was run. Script/shell injection
tests are not host-verified. Native Linux and remote Ubuntu/Windows Actions are
unverified; no push was authorized to obtain hosted-runner results.

Two unrelated gate observations are retained rather than hidden: a pre-commit
crossing midnight used a stale describe-time MM-DD test prefix; a later archive
gate under unwrapped system Python 3.14 observed one hook exiting with null code
after its expected diagnostic (exact transient cause not captured). The unchanged
midnight groups passed after the day stabilized. The documented uv Python 3.9
environment passed all 26 stdin tests and the archive full suite. No archived
fix, timeout, skip or assertion was changed to bypass either observation.

## Parent acceptance still open

The parent remains planning. All-child archive and remote-green criteria are
unmet, so final parent integration acceptance has not been entered or checked off.
The exact combined Windows/PowerShell end-to-end sequence remains not_run:

- workflow edit → add platform → update dry-run still identifies that edit;
- task A → task B → A remains current;
- archive A while preserving unrelated staged content;
- start actual Codex from src/ and observe model-visible hook context.

Independent/unit/script coverage of these components does not substitute for
that combined run. The built init/update/uninstall smoke is recorded separately.

## Stop and resume boundary

Per the user's explicit instruction, stop after task 5 code/automation if the
specified real-host smoke is unavailable; do not archive it. Payload replay
waits for windows-ci and codex-subdir-hooks completion; doctor stays last and
has not started. Their PRDs remain intact.

11-09-verification-receipts was neither implemented nor brainstormed. Its PRD
requires reliability v1 completion and a period of real use; both are still
outstanding. Do not start it merely because implementation work has advanced.
