# Independent doctor review (2026-11-11)

Status: local source review, focused regressions and actual-checkout read-only
smoke passed. This is not remote CI, native-host delivery or parent end-to-end
acceptance. No commit/archive/push, native/model session, dependency installation
or retry of the earlier policy-blocked cleanup was performed.

## Findings fixed

### Missing plugin/prelude assets were not identified in their error message

The actual checkout exposed `hooks.opencode.assets` as error/configured, while
its message only counted inspected assets. Local inspection identified an owned
but absent `.opencode/package.json`. A durable built-CLI test declared that
missing canonical asset and required its name plus repair advice. It failed
against the existing build because the path was absent from the message.

`platformChecks` now reports the missing/unsafe count and at most three canonical
asset paths. Healthy output, schema, confidence and read-only behavior remain.
The new regression passed after the narrow change and serial build.

### Known portable Codex commands with another supported Python alias looked custom

Both protected root Codex commands matched the canonical portable body exactly
after replacing only their leading `python3` with the Windows default `python`.
The initial actual-checkout smoke therefore reported them as custom/configured.
The commands themselves were never changed.

Durable known-prefix controls showed RED for `python3` and `py -3`; the `python`
and altered-body custom controls passed. Recognition now normalizes only the
exact leading `python`, `python3` or `py -3` prefix when comparing an expected
Codex base64 portable command. All remaining bytes and its registration group
must match. No arbitrary command canonicalization or hook execution was added.
An appended sentinel-writing shell command remains custom/configured and is
never executed. Alias cases permit an explicit probed runtime error if that
alias is unavailable; they do not add an OS skip or fabricate availability.

Both product edits were confined to `platformChecks`. Exact upstream GitNexus
impact was run before each edit, with tests included: LOW, five upstream symbols,
one direct caller, one affected process entry (`collectDoctorReport`) and one
module. No HIGH/CRITICAL edit was performed. Test helper `run` and `workspace`
impacts were also LOW: one direct indexed dependant, zero processes/modules.

## Additional boundary coverage

Three new controls passed without product changes:

- A selected session directory linked outside `.trellis` produces a task error.
- An outside task reference and malformed selected task metadata produce task
  errors instead of accepting the outside/invalid task.
- A lexical stored-hash child passing through an external directory link is
  reported unsafe instead of being read as a workspace template.

All reuse complete fixture path/byte snapshots, including external fixture
stores, Git state, ignored runtime and link entries. No deadline/skip was changed.

## Full-scope review

Reviewed check context, PRD/design/implementation, command/backend/test quality
specs, the report collector, packaged Python bridge, narrow CLI wiring and all
new integration tests. The six required check families are present: runtimes,
registrations/assets, canonical root/workflow, stored-hash drift, session task
and local-hook ignore state. Existing project/registry/hash APIs are reused.

The bridge imports only bundled helpers under isolated/no-site/no-bytecode
Python, with ignored stdin. Its pure identity preflight prevents the canonical
expired-ticket cleanup path; no single-session borrowing is enabled. Checked
selected-pointer JSON distinguishes corruption from a missing optional pointer.
No canonical helper, registry, SDK, dependency, user hook/config or mirror was
edited by this reviewer. The JSON schema is strict; diagnostic errors exit1,
warnings alone exit0, and every collected confidence remains at most probed.
Doctor-only banner suppression leaves the other command startup path unchanged.

## Independent gates

Commands used `uv run --locked`; Python in-memory compilation reported 3.9.25.

| Check | Actual result |
| --- | --- |
| Initial doctor26 + platforms3 | 29/29 pass,36.16 s |
| Three added boundary controls | 3 pass;26 filtered by `-t`, not permanent skips |
| Doctor after boundary additions | 29/29 pass,44.42 s |
| Missing plugin diagnostic regression before fix | 1 failed as expected;29 filtered |
| After plugin diagnostic fix: doctor30 + platforms3 | 33/33 pass,40.84 s |
| Alias/body controls before fix | 2 failed as expected (python3/py -3),2 passed;30 filtered |
| Final doctor34 + platforms3 | 37/37 pass,47.70 s |
| Final CLI lint/typecheck | PASS |
| Explicit strict TypeScript compilation including new test | PASS |
| Final source/test Prettier | PASS |
| Final serial CLI build | PASS; no concurrent dist cleanup/testing |
| Python3.9 in-memory compile and source/dist probe equality | PASS |
| Targeted probe basedpyright | 0 errors,0 warnings |

Normal CLI tsconfig excludes tests, so explicit strict compilation used
`--noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext
--esModuleInterop --skipLibCheck --resolveJsonModule` on the doctor test.
The implementer's full Python lint/distribution evidence remains separately
recorded in `verification-20261111.md`; neither was repeated for message/prefix
comparison changes. Full precommit is main-owned and was not run by this reviewer.

## Actual checkout smoke after final build

Ran exactly `uv run --locked node packages/cli/bin/trellis.js doctor --json`,
capturing raw stdout/stderr only under the owned temporary directory
`%TEMP%/trellis-doctor-checkout-mG7lZ5`. Raw reports and byte manifests were not
copied into Git. The tracked receipt contains no host identity, personal path,
custom command arguments or account/config contents.

During each comparison, edits were frozen. Snapshots covered all in-tree
`.trellis` paths/content including ignored runtime, platform configuration
directories from the canonical registry, `.claude`, `.codex`, `.agents`,
`AGENTS.md`, Git index/config/HEAD and optional related Git files. Link targets
were recorded without following them. Final result: **2,762 snapshot entries
identical** before/after. An additional source Python cache inventory contained
**58 existing directory/file entries**, unchanged; no project/source caches were
created or deleted. Receipts were written only after comparison completed.

Final report was one strict-schema-valid JSON object, with empty stderr, correct
checkout root and confidence no higher than probed. The command truthfully
returned exit1 for existing configuration diagnostics; it was not forced healthy:

| Check/group | Final actual result |
| --- | --- |
| Node/Python/root/type/workflow | ok/probed |
| `task.current` | ok/probed, current session task **none**; no doctor task inferred from unrelated metadata |
| Ownership/configured platforms | ok/configured |
| Stored-hash drift | warn/probed; local modification evidence only |
| Claude/Cursor relative commands | warn/probed; native launch-cwd risk remains |
| OpenCode assets | error/configured; owned `.opencode/package.json` missing, now identified with repair advice |
| Two root Codex portable commands | ok/probed; python3 prefix recognized, protected config bytes unchanged |
| Pi assets | ok/configured; host activation unprobed |
| `hooks.local.ignore` | ok/probed |

The missing OpenCode asset was left untouched: this command and smoke are
read-only, and a local ownership/configuration discrepancy requires review
before repair. The earlier pre-fix raw capture is retained separately in that
same owned temp directory. Its initial Codex configured warnings are historical,
not the final result. No temporary native-host fixture cleanup was attempted.

## Remaining limits and handoff

Local Node18 smoke remains not_run because no existing executable was found;
no runtime was downloaded/installed. Remote Linux/Windows CI remains unverified
under no-push, so that acceptance must remain unchecked. No new native-host
claim is made. Main owns final metadata/spec receipts, staged detect_changes,
normal full precommit, explicit commit scope and task status.

Reviewer touched only `src/commands/doctor.ts`, the new doctor integration test
and this receipt. No commands are left running; source is stable for handoff.
