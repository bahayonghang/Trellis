# Independent replay review (2026-11-11)

Status: local test-only review passed. Remote Linux/Windows CI acceptance
remains unverified. This review did not run native/model sessions, repeat the
full precommit gate, commit, archive, or retry the previously blocked cleanup.

## Scope and findings

Reviewed check context, PRD, implementation plan, #644 selective-port receipt,
the new executable suite, all seven sanitized inputs, fixture README/license,
implementation verification, and the main-owned recorded-replay addition to
`integration-patterns.md`. No product source, hook template/config, dogfood
mirror, dependency, timeout, skip, or workflow was changed by this review.

Two local improvements were made:

1. The captured Claude research oracle now asserts the exact fixture-generated
   spec tree line `└── replay/ (backend)`, instead of only the generic word
   `backend`. This strengthens project provenance without pretending research
   loads implementation PRD/spec bodies. GitNexus upstream impact for exact UID
   `Function:packages/cli/test/scripts/hook-payload-replay.integration.test.ts:assertContext`,
   with tests included, returned LOW: one direct indexed dependant, zero
   affected processes/modules. Text search confirmed four local call sites.
   The initial query without test inclusion resolved no edges and returned
   UNKNOWN; that result was not treated as proof of no dependants.
2. Six fixture JSON redaction arrays were formatted by Prettier. These changes
   are whitespace only; captured payload values, source refs/blob IDs, raw
   pre-redaction input hashes, review caveats and license remain unchanged.
   The broader formatting check first failed on those six files and then
   passed. No product defect or product RED/GREEN fix is claimed.

No blocking implementation defect was found in the reviewed local scope.

## Behavior checked

- Five pinned Claude captures retain the original Task/Agent tool names,
  research role, extra input fields and upstream review status. Two early-event
  captures remain explicitly unreviewed upstream. Immutable source paths,
  original blobs and the MIT notice are recorded; review does not upgrade
  source-reported observations to independent native Claude evidence.
- Two Codex 0.167.1 inputs retain their observed event/identity relationships.
  Captured SubagentStart remains `agent_type: default`; both configuration
  matcher exclusion and direct-script silence are exercised. Implement-role
  inputs and changed cwd/identity/newline cases are explicitly derived.
- Hooks run as real subprocesses from installed temporary scripts/config.
  Assertions inspect event envelopes, preserved tool-input fields and aliases,
  workflow/current-task/breadcrumb text, the actual research spec tree, and
  exact implementation PRD/curated-spec markers. No-identity controls retain
  multiple session pointers and reject borrowing their active task.
- Root, subdirectory, nested Git and Chinese/space CRLF layouts are exercised.
  Windows Codex commands use actual generated registrations through cmd raw
  `/C` and PowerShell; Claude uses an installed absolute script with payload
  cwd. The latter is not native Claude launch-cwd verification.
- All five mutation controls alter only a temporary installed hook's output
  key, rerun the real process, and prove the same positive-case oracle rejects
  the result despite exit 0. Checked-out product files are never mutated.
- Fixture identities and personal paths use inert replay placeholders. Manual
  field review and a targeted personal-path/secret-pattern scan found no
  personal paths, account/auth contents or unredacted host identities.
- The existing CI matrix's Node 26.7.0 jobs call `pnpm test` on Ubuntu/Windows,
  and Vitest includes the new file. Wiring is not evidence of remote execution.
  The PRD's CI execution checkbox correctly remains unchecked.

## Independent verification

All commands used `uv run --locked`; `python --version` reported 3.9.25.

| Check | Result |
| --- | --- |
| New suite before checker assertion improvement | 56/56 pass; 23.09 s total |
| New suite after exact research-tree assertion | 56/56 pass; 25.16 s total |
| CLI `lint` (`eslint src/ test/`) | PASS |
| CLI `typecheck` (`tsc --noEmit`) | PASS |
| Explicit strict TypeScript compilation including the new test | PASS |
| Prettier new test plus all fixture JSON/README files | Initially six JSON format failures; PASS after whitespace-only formatting |
| Targeted fixture personal-path/secret-pattern scan | No matches |

Strict compilation used `--noEmit --strict --target ES2022 --module NodeNext
--moduleResolution NodeNext --esModuleInterop --skipLibCheck
--resolveJsonModule` against the new integration test, because normal CLI
tsconfig does not include tests. The implementer's separate 161-test related
run is recorded in `verification-20261111.md`; it was not rerun unnecessarily
for these test/assertion and JSON-formatting changes.

Remaining limits are remote CI/native POSIX execution and native Claude host
acceptance. Existing Codex input-capture evidence is separate from replay and
from task5's context-delivery receipt. Normal native trust may persist settings
through CODEX_HOME; no global-config byte-invariance claim is made. Main owns
final staged scope/detect_changes, normal full precommit gate, commit and task
status. No commands are left running by this reviewer.
