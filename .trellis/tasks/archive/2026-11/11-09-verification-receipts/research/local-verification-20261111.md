# Local V1 completion evidence

## Source and normal gate

Feature commit: 4963f82cff2618fe46f3deffacd15275f331caab on dev. Its normal
pre-commit passed core 401 tests with 2 existing skips and CLI 2270 tests with
35 existing skips. The 29-case installed verification suite passed inside that
gate. No skip, timeout or concurrency setting was relaxed. Earlier failed gates
and their actual causes are preserved in implementation-20261111.md.

Root lint/typecheck, strict new-test TS, Python3.9.25 syntax/type checks, serial
build and built CLI smoke passed. Python lint has zero errors and the existing
68 unused-import warnings. Shipped modules install through getAllScripts; the
four modified Python root/template twins match byte-for-byte.

## Actual own-task check and archive

The new registry and strict task policy ran 16 real checks: AC01-AC10 plus lint,
typecheck, Python lint, strict new-test TS, build and package dry-run. Every
criterion passed. Runtime evidence is ignored and is not included in package
assets. Actual package output contained 846 assets and the verifier/entrypoint
assets matched source bytes. No publish operation is registered or executed.

First own-task attempt: b8bf64ce69c04e3387a6e40f6d24e037.
Source HEAD: 4963f82cff2618fe46f3deffacd15275f331caab.
Fingerprint: 5ce3bf471c913d69ba855fe60f4a45ca5d9d19a815888a4b7c99a4faef348374.
It returned fresh and accepted=true. Live status during execution returned
running and accepted=false with pending criteria, preserving the current attempt.

task.py archive 11-09-verification-receipts --no-commit then performed a real
strict archive. It wrote completed and moved the task to
.trellis/tasks/archive/2026-11/11-09-verification-receipts. Immediate read-only
status at the archived path remained fresh and accepted with the same fingerprint;
the archive move/lifecycle fields did not erase its evidence or invalidate it.

Updating the final PRD completion text/AC10 checkbox intentionally changes a
bound input. Re-verification at the archived path is required before its normal
archive commit; the final attempt is recorded below after it actually completes.

## Final archived-path receipt

The final PRD edit was observed as stale, with accepted=false. A new explicit
verify against the archived path reran all 16 checks, which all passed. Final
status is fresh and accepted=true; no prior pass was reused after the edit.

- Attempt: bf1c09f8d8b148fb9b5f4bcdfa94f063.
- Task key: 351c02c6f84d9087a2c9aa0ed8545f2cb5069fc4bea0fde835b2f9c216a7330f.
- Fingerprint: 0e7009377582ff3f497bf5214b878db08d77f6c49466a76d6e749274837dc420.
- Source HEAD remains 4963f82cff2618fe46f3deffacd15275f331caab.
- Local receipt: .trellis/.runtime/verification/351c02c6f84d9087a2c9aa0ed8545f2cb5069fc4bea0fde835b2f9c216a7330f/current.json.
- Each command's stdout/stderr paths and SHA256 digests are in that validated
  receipt under the final attempt's owned directory.

Both archived context manifests validate with eight entries. Their two original
large-spec truncation warnings are retained; the fingerprint hashes full bytes.
Current task is null/source none after archive. A scope-limited audit confirms
all 17 real task records created since 2026-10-09 are completed and archived.
Older January archives include malformed legacy records and remain untouched;
they are outside this requested cohort. No June task is closed by assumption.

The task is staged and committed separately from the feature through a normal
archive commit; its required hook runs the full suite again. Journal recording
and final read-only receipt/cohort/clean-worktree inspection follow that commit.

## Boundaries

This is Windows local evidence, not hosted CI or cross-platform/native-host
acceptance. No network repository was pushed and no package was published.
OpenSpec integration, tamper-proof attestations, shared-store/symlink inputs and
automatic enrollment remain outside V1. Protected June tasks, previous archives,
existing hook mirrors, marketplace gitlink and user configuration are untouched.

The runtime current.json and per-attempt stdout/stderr log references/hashes are
local ignored evidence, not tracked output. The status command recomputes live
freshness; it does not trust this narrative or execute registered commands.
