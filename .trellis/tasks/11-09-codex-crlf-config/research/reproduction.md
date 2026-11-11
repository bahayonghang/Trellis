# Actual update reproduction (2026-11-10)

Command: `uv run --locked node .trellis/tasks/11-09-codex-crlf-config/research/reproduce-update.mjs`.
This invokes the built CLI in an isolated temporary Git project, initializes
Codex and OMP, writes a CRLF agent TOML with live model/effort keys and a CRLF
OMP command, then executes `update --force`. No actual AI host is started.

Windows / Node 26.7.0 / CPython 3.9.25; current bundled agent and common command
templates contain LF only.

- Codex: both model and effort survive the actual update. Output is canonical LF.
- OMP: no leading H1 before or after update. Body bytes differ because CRLF is
  rewritten to the bundled LF. The body is equal after EOL normalization.
  The body is 2405 bytes before and 2351 bytes after, SHA-256 respectively
  `a1bc3d755338564378deb7868cf482fd59d6ac0dcafe35978c1fdf288f6df519`
  and `b7617624d2fe654e2544eaf5d055c2b0c67028097fb9fbde924978b4de9d6797`.
- Therefore this environment does not reproduce #656's lost settings or retained
  H1 through actual update. It also does not satisfy a literal claim that OMP body
  bytes remain unchanged: the observed newline rewrite is recorded explicitly.

No production function is modified. `applyCodexAgentModelKeys` has a separately
confirmed HIGH upstream impact, and the direct-helper CRLF possibility is not
substituted for the required actual-update reproduction.

The new integration test locks LF and CRLF disk-input model preservation and
exact canonical OMP output. It does not normalize assertion output or claim
raw input/output byte preservation for CRLF. Remote Windows CI has not run.

Focused results: 97 passed across the new update regression (2), Codex
configurator (17), shared configurator (54), and OMP template tests (24).

## Accepted disposition

The user explicitly chose the nonreproduction/archive branch, retaining and
recording canonical LF output. The task PRD now states that accepted behavior;
no test claims unchanged raw CRLF body bytes. No production regex fix is ported.
Independent check passed: new integration 2/2, actual built CLI reproduction
with identical recorded hashes, lint/typecheck, strict test-inclusive TypeScript
(zero diagnostics), Prettier and diff checks. No production/spec edits or existing
assertion changes. Full pre-commit result will be appended before archive.

## Midnight commit-gate failure

The first pre-commit started 2026-11-10 23:57:55 and crossed midnight. Core
passed 401/2 existing skips; CLI failed 13 existing regression cases, all in the
task-rename/worktree-identity groups. Their describe-time `datePrefix` was
11-10 (regression.test.ts around 11882/12187); Python task creation uses a
fresh current-date prefix and created 11-11 paths. Errors therefore requested
nonexistent 11-10 task paths. No CRLF regression failed.

Both Node and CPython confirmed local 2026-11-11 after the failure. Without
changing code, the targeted task-rename/worktree-identity run passed all 17
selected tests at 00:02:10 (the other 488 tests were not selected by -t).
This identified a pre-existing test-date lifetime boundary, not an introduced
CRLF failure. The same scoped commit is retried after the date stabilized;
no clock manipulation, source/archived-task fix, assertion relaxation, new skip,
timeout increase or hook bypass is used. The midnight edge remains unfixed
because unrelated/archived work is outside this request's allowed scope.
