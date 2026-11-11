# Read-only doctor implementation verification (2026-11-11)

## Scope and implementation

Implementer-owned product paths:

- `packages/cli/src/commands/doctor.ts`: strict shared Zod/JSON Schema report,
  collector, local runtime/root/task/ownership/registration/drift/ignore checks
  and human/JSON rendering.
- `packages/cli/src/templates/doctor/probe.py`: internal packaged trusted helper;
  not installed into projects and no dogfood mirror. Its runtime imports resolve
  only this CLI's canonical shared root helper and bundled `common` source.
  TYPE_CHECKING imports name those same shipped modules; no type suppression.
- `packages/cli/src/cli/index.ts`: doctor registration plus a doctor-only guard
  at the existing startup version-banner call. Existing function bodies remain.
- `packages/cli/test/commands/doctor.integration.test.ts`: built CLI and collector
  integration controls. Main owns the task plans/manifests/PRD/backend spec.

No SDK, package dependency, existing canonical reader, template registry, tracked
dogfood hook/config, archived task or native host configuration was changed.
No user hook command is executed. Runtime execution is limited to known Python
aliases with argv-only version checks and isolated `-I -S -B` trusted probing.
Stdin is ignored. No init/repair/network/status/add/fetch occurs in doctor.

The probe preflights only explicit context identity or the existing pure canonical
environment mapper. With no identity it calls the canonical resolver with
environment context disabled and never borrows a session or reaches mutable
shell-ticket fallback. Selected pointer corruption is distinguished with canonical
`resolve_context_key`/`_context_path` and bundled `read_json_checked`; ordinary
missing optional session files still mean no active task. No resolver API/body
was changed.

## GitNexus impact

Before CLI integration, exact UID upstream impact for
`Function:packages/cli/src/cli/index.ts:checkForUpdates` returned **LOW**,
one direct caller (`File:packages/cli/src/cli/index.ts`), zero processes.
Context and source confirmed the sole module-startup call. Only that call is
guarded; checkForUpdates itself is unchanged.

The new unindexed helper UIDs (platformChecks, collectDoctorReport, inspect and
test workspace/run) returned **UNKNOWN / target not found**, not zero/LOW.
Source-local caller review bounds platformChecks to collectDoctorReport, inspect
to its __main__ entry, collectDoctorReport to doctor and the new integration test,
and test helpers to this file's cases. No HIGH/CRITICAL edit was performed.
Main must inspect the final staged detect_changes before committing.

## Meaningful RED and corrections

1. Initial public built-CLI test failed because doctor was an unknown command;
   after implementation/build, the missing-workflow diagnostic passed.
2. A selected malformed session pointer initially returned exit0/no-task through
   the tolerant resolver. A real corruption control reproduced that failure;
   new-probe-only checked-reader preflight makes it an actionable task error.
3. The first expanded21-case run passed20 and exposed test harness env mismatch:
   spawned CLI scrubbed host identity while the source collector inherited it.
   Matching the test environments fixed the comparison without product changes.
4. New source's first lint flagged one optional-boolean logical-or style issue;
   an explicit nonnull task guard corrected it. No test deadline/skip was changed.

## Byte preservation and confidence

Every built-command test snapshots all fixture directories, link targets and
file-content SHA256 values before/after execution. This includes Git metadata
and staged index, `.trellis`, ignored runtime, local hook config and external
linked-workflow fixture data. Both healthy and deliberately broken inputs retain
identical snapshots. Fixtures contain no Python bytecode before/after.

Source templates already contained ignored Python3.9/3.14 caches from prior work;
they were not deleted or copied into fixtures. The existing build copier excludes
them. Doctor's new source/dist probe directories contain only probe.py, and the
distribution dry run contains zero cache artifacts.

Controls cover missing workflow, broken owned command/entrypoint/support files,
invalid hook JSON, stale/malformed selected pointers, canonical exported identity,
no identity with multiple sessions and an expired ticket, custom commands that
would write a sentinel if executed, unresolved Python placeholders, plugin assets,
linked workflow, nested Git, stored-hash modification, unsafe outside hash refs,
invalid ownership, tracked/negated/nonregular local-ignore state, missing Python,
project-Python execution sentinel, version-banner isolation and strict schemas.
Reported confidence never exceeds probed; plugin/custom evidence stays configured.
No historical receipt is ingested and no verification-receipt feature is added.

## Validation

Checks use `uv run --locked`, CPython3.9.25 and current Node26.7.0.

| Gate | Actual result |
| --- | --- |
| CLI lint | PASS |
| CLI typecheck | PASS |
| New test strict TypeScript compilation (explicit test file; CLI tsconfig excludes tests) | PASS |
| CLI build | PASS; serial, no simultaneous tests/dist cleanup |
| Probe targeted basedpyright | 0errors/0warnings |
| Full lint:py | 0errors/68 existing unused-import warnings |
| Python3.9 in-memory compile and source/dist probe byte equality | PASS; no py_compile cache output |
| Earlier focused doctor25 + platforms3 | 28/28pass,33.64s |
| Final focused doctor26 + platforms3 (after canonical-env control and platform-selected task-repair alias) | 29/29pass,43.01s |
| Final source/test Prettier formatting | PASS |
| Package dry run (`pnpm --ignore-scripts pack --dry-run --json`) | PASS:845files; doctor.js, doctor.d.ts and templates/doctor/probe.py included;0cache artifacts; no tarball/lifecycle execution |

The unavailable `uv run npm` command was not a successful packaging check; the
existing pnpm pack dry run supplied the actual result above. No package install
or dependency change was used.

Doctor-specific local Node18 smoke is **not_run**: neither implementer nor main
found an exact cached Node18 executable in the selectively inspected pnpm caches.
Do not reinstall/download/reconstruct a runtime just for this check. Existing
CI minimum-runtime rows can supply that evidence when actually run.

Remote Linux/Windows CI remains **unverified** under no-push. Local tests do not
establish native Claude/Codex delivery or remote CI acceptance. No native/model
calls or full precommit suite were run by this implementer. No commit/archive/
push was performed; main owns final independent review and integration decisions.

## First full source-commit gate

The normal approved source commit attempt did not create a commit. Core passed
401 tests /2 existing skips; CLI passed2238, failed1 and retained35 existing
skips (244.56s). Sole failure: unchanged update.integration.test.ts case#15a,
the10s afterEach hook at line196. New doctor34 cases passed in the same run.

Read-only controls passed without timeout/concurrency/config/source changes:
the selected case1/1 (54filtered, not added skips), then the entire update
file55/55 (63.04s). Installed Vitest's synchronous timeout check confirms the
wall-clock budget mechanism; the original log contains no per-phase trace,
so the original cause remains unknown. No old test or archived fix was changed.
This is not the core channel-sequence lock exception. See
precommit-update-teardown-20261111.md. A bounded unchanged full-gate retry is
recorded separately; passage is not presumed.

## Unchanged full retry and source commit

After both unchanged update controls passed, the unchanged normal full gate
passed: core401 PASS /2 existing SKIP; CLI2239 PASS /35 existing SKIP (97files
PASS /1 existing SKIP),239.63s. No timeout, concurrency, test/config/source or
skip adjustment was used to obtain the later pass. The original stalled phase
and underlying cause remain unknown; this is not a root-cause fix.

`e7583d64 feat(doctor): add read-only local reliability diagnostics` contains
the reviewed implementation, evidence and explicit CRITICAL approval. Final
staged scope was16 files /63 symbols /18 expected read flows. Remote CI remains
unverified and the task stays in_progress/unarchived.
