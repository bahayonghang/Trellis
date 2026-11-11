# Windows CI verification

## Local results (2026-11-10)

- PASS: pnpm lint, pnpm typecheck, pnpm build (serial, no concurrent dist cleanup).
- PASS: node --check packages/cli/test/ci-smoke.mjs; git diff --check.
- PASS: `uv run --locked node packages/cli/test/ci-smoke.mjs` on Windows,
  Node 26.7.0 and CPython 3.9.25.
- PASS: `uv run --locked pnpm --allow-build=node dlx node@18.17.0 packages/cli/test/ci-smoke.mjs`
  on Windows and CPython 3.9.25. The ephemeral runtime adds no repository dependency.
- PASS: the workflow-equivalent Python 3.9 compile of all 85 tracked Python
  files and build-output existence checks.
- Full suite: to be recorded after the scoped commit's real pre-commit gate.
- Independent check: no blocking findings and no edits; lint, typecheck,
  Windows Node 26.7/Python 3.9.25 smoke, Prettier and diff checks passed.

## Evidence boundaries

The workflow builds on Node 26.7.0 and smokes built output on Node 18.17.0
and 26.7.0 for ubuntu-latest and windows-latest. Vitest 4 requires Node 20+
and therefore the full suite runs on the current-runtime rows. Checkout retains
default autocrlf behavior. Python is pinned to the supported minimum, 3.9.

Remote CI has not run for this change: this session is explicitly prohibited
from pushing. Neither Linux nor Windows hosted-runner success is claimed.
The task remains unarchived until that acceptance criterion is met.
No Claude Code or Codex host sessions are exercised by this smoke.

## Existing skip inventory

No skip is added or changed. The existing Windows baseline has CLI 35 skips:

| Tests | Count | Existing reason / owning reference |
| --- | ---: | --- |
| regression task write/permission cases | 9 | POSIX mode-bit failure injection cannot provoke the same failure on Windows (`test/regression.test.ts`, audit cases). |
| regression session update notice | 4 | POSIX shell fake CLI cannot be executed by Python CreateProcess on Windows (`test/regression.test.ts`, session-update-hint). |
| ablation parent symlink / permission rollback | 2 | POSIX symlink setup / chmod failure injection (`test/commands/ablate.integration.test.ts`). |
| channel context trust symlink cases | 9 | Directory symlink fixtures require Windows privileges (`test/commands/channel-context-trust.test.ts`). |
| archived context symlink escape | 1 | File symlink fixture requires Windows privileges (`test/scripts/context-injection-limits.integration.test.ts`, archived self-reference #6). |
| managed removal symlinks | 2 | Symlink fixture privilege (`test/utils/managed-removal.test.ts`). |
| update managed parent symlink | 1 | Directory symlink fixture privilege (`test/commands/update-internals.test.ts`). |
| registry Git authentication classification | 1 | Fake Git is a POSIX executable script (`test/utils/template-fetcher.test.ts`). |
| symlinked workflow suite | 6 | External directory symlink fixture (`test/scripts/symlinked-workflow-dir.integration.test.ts`, #567). |

Core's two existing Windows skips are the >2 GiB sparse SQLite test (Windows
truncate may allocate/zero-fill the entire file), and the intentionally disabled
no-Python fallback sentinel when Python is available. Both are in
`test/mem/sqlite-readonly.test.ts`. Interpreter-dependent suites must run when
Python is installed; absence is not evidence of a successful smoke.

Known Windows failures from FORK_BASELINE.md were repaired in the already archived
Windows/R13 tasks; this change does not reopen or modify those implementations.
