# Journal - bahayonghang (Part 1)

> AI development session journal
> Started: 2026-11-09

---



## Session 1: Fork reliability v1: Windows CI and portable Codex hooks
<!-- trellis-session: v=2 fp=7b4f6cae8c6d9e53 -->

**Date**: 2026-11-11
**Task**: Fork reliability v1: Windows CI and portable Codex hooks
**Package**: cli
**Branch**: `dev`

### Summary

Implemented remaining reliability work through the approved portable Codex launcher. Upgrade/gitignore/CRLF children archived; Windows CI and Codex host acceptance remain open. No push.

### Main Changes

- Added native OS matrix and Chinese/space CLI smoke; protected checkout upgrades and local hook ignore rules.
- CRLF model-key/OMP-heading failure was not reproduced; user accepted preserving documented LF normalization and tests-only archival.
- Implemented portable Codex commands, narrow byte-preserving migration and skipped-receipt protection; synchronized only the approved default hook JSON.

### Git Commits

| Hash | Message |
|------|---------|
| `5cdbcba1` | ci: add native Windows reliability matrix |
| `a3d58384` | fix(upgrade): protect checkout installations from npm replacement |
| `18a1614c` | fix(gitignore): protect machine-local hook configuration |
| `2e5e4f56` | test(codex): lock CRLF update configuration behavior |
| `9a9e4b65` | fix(codex): bootstrap hooks from nested working directories |

### Testing

- [OK] Lint/typecheck/build, Python 3.9 lint/compile, built CLI/package checks and focused shell/migration tests passed.
- [OK] Final normal full pre-commit passed: core401+2 existing skips, CLI2149+35 existing skips. Prior warning-poll failure and unknown original cause retained in research.
- [OK] 89 protected file hashes unchanged. Windows cmd/pwsh and Git Bash controls are automation, not real host acceptance.

### Status

[OK] **Completed**

### Next Steps

- Keep windows-ci and codex-subdir-hooks unarchived pending remote CI and real Codex0.167.0 host smoke; current callable CLI is0.167.1.
- Do not start replay/doctor before dependencies complete. Parent stays planning; combined native Windows integration not_run.
- Leave verification-receipts untouched until reliability v1 is complete and has seen a period of real use.
