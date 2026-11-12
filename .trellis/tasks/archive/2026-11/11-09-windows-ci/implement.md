# Implementation plan

- [x] Add Ubuntu/Windows CI with dev triggers, real Python 3.9, native shells,
  default autocrlf, full current-runtime gates and built minimum-runtime smoke.
- [x] Add and execute Chinese/space-path init, task create/start/validate/archive,
  CRLF fixture and immutable update --dry-run smoke.
- [x] Review the diff and run lint, typecheck, build, smoke and pre-commit tests
  (independent/local checks and later unchanged-source full commit gates passed).
- [x] Record exact local evidence, existing skips and pending GitHub/host checks.
  The user's 2026-11-11 local-only scope supersedes the remote-green archive
  gate. Preserve the actual failed-checkout evidence; do not label it passing.

Validation: pnpm lint; pnpm typecheck; pnpm build;
node packages/cli/test/ci-smoke.mjs; pnpm test (pre-commit).
Rollback: revert only this task's workflow, smoke and artifacts.
