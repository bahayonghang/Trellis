# Implementation plan

- [x] Add Ubuntu/Windows CI with dev triggers, real Python 3.9, native shells,
  default autocrlf, full current-runtime gates and built minimum-runtime smoke.
- [x] Add and execute Chinese/space-path init, task create/start/validate/archive,
  CRLF fixture and immutable update --dry-run smoke.
- [ ] Review the diff and run lint, typecheck, build, smoke and pre-commit tests
  (independent review and all local checks passed; commit gate pending).
- [x] Record exact local evidence, existing skips and pending GitHub/host checks.
  Do not archive until both remote jobs are evidenced green.

Validation: pnpm lint; pnpm typecheck; pnpm build;
node packages/cli/test/ci-smoke.mjs; pnpm test (pre-commit).
Rollback: revert only this task's workflow, smoke and artifacts.
