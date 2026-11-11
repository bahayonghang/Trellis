# `trellis doctor` Command

## Scope and trigger

Read-only local diagnostics for a Trellis project. No repairs, host/model calls,
network requests, user hook execution or verification-receipt persistence.
Changing diagnostic checks must preserve workspace and Git bytes.

## Signatures

```text
trellis doctor [--json]
collectDoctorReport(cwd = process.cwd()): DoctorReport
doctor(options: { json?: boolean } = {}): void
```

`commands/doctor.ts` exports `doctorCheckSchema`, `doctorReportSchema`,
`doctorReportJsonSchema` and schema-derived TS types. Zod is an existing CLI
dependency. JSON Schema is generated from the same strict runtime schema.

## Contracts

V1 JSON has exactly `schemaVersion: 1`, nonempty `cwd`, nullable `root` and
`checks`. Each check has nonempty `id`/`message`, `status` (`ok`, `warn`, `error`),
`confidence` (`configured`, `probed`, `host-verified`), optional nonempty
`suggestion`, and optional details (at most20 strings, each at most500 chars).
Unknown report/check keys are rejected. Normal diagnostic failures still emit
one schema-valid JSON object. Doctor skips the startup version banner so a
project/CLI version mismatch cannot contaminate stdout. Errors exit1; warnings
alone exit0. Human output renders the same checks.

Configured means configuration evidence only. Probed means the stated local
check ran; it does not establish host delivery. This command reaches at most
probed. It does not promote historical/manual receipts into host-verified.

Reuse the project detector, configured-platform registry/template collectors,
AI_TOOLS and template-hash status helpers. Registry ownership determines active
platforms; a native config directory alone is insufficient. Stored-hash drift
means local modification/missing files, not upstream freshness.

The internal packaged `templates/doctor/probe.py` imports shipped canonical
root/session helpers, never project Python. Isolated/no-site/no-bytecode flags,
ignored stdin and bounded execution preserve read-only behavior. No identity
means no inferred task and no shell-ticket fallback: the canonical fallback can
delete expired tickets. Preflight only the pure canonical environment mapper
and explicit override before enabling environment resolution. No single-session
borrowing or modification of the canonical resolver is needed.

Inspect registered command data and known entrypoints without evaluating user
commands. Unknown/custom forms get configured warnings. Known relative paths
remain launch-cwd risks; current portable Codex commands are treated separately.
For Codex portable comparisons, normalize only the exact leading `python`,
`python3` or `py -3` token; all remaining bytes must equal the registered
portable body. Changed bodies stay custom/unexecuted. Probe each recognized
Python alias separately; recognizing a body does not prove its alias exists.
Plugin/prelude platforms get asset/configuration evidence, not invented events;
missing-asset diagnostics include bounded affected path names, not only counts.
Local Git ignore/tracked queries disable optional locks/fsmonitor; no status,
add, fetch, index repair or following nonregular ignore files.

## Validation and error matrix

| Input | Diagnostic | Effect |
| --- | --- | --- |
| Unsupported/missing Python | Runtime error, dependent checks unverified | No guessed execution |
| Missing workflow with another valid root marker | Workflow error plus repair suggestion | No init/update |
| Recognized broken owned hook path | Registration/path error | Never execute it |
| Custom command or unsupported shape | Configured warning | No shell parsing/execution |
| Stale/invalid selected task pointer | Actionable task error | No pointer rewrite |
| No known identity, several sessions, expired tickets | No inferred current task | No ticket deletion |
| Unsafe hash ref or malformed metadata | Bounded diagnostic | No external-path takeover/hash repair |
| Tracked hooks.local.json | Warning with git rm --cached suggestion | Index unchanged |
| Version mismatch with --json | Strict JSON only | No startup banner |

## Good, base and bad cases

Good: initialized Claude/Codex project reports local runtime, root and owned
registration checks without claiming model-visible delivery. Base: unknown
custom command is present but unprobed, with an explicit warning. Bad: a missing
owned script or current task directory produces an error and recovery command,
without writing the missing file or choosing another session's task.

## Required tests

`test/commands/doctor.integration.test.ts` exercises the actual built command
and exported schema. Assert the requested broken hook/workflow/task inputs,
strict JSON under version mismatch, malformed report rejection, confidence cap,
and complete path/file-byte snapshots before/after healthy and broken runs.
Include Git/ignored runtime, expired shell tickets, missing identity with several
sessions, and no Python bytecode artifacts. Compile the new probe on Python3.9,
check test-inclusive TS, build/package the helper, and run both CI platforms
before claiming remote acceptance. Local tests do not substitute for CI runs.

## Wrong versus correct

Wrong: execute a user hook or mutable session fallback, then label exit0
host-verified. Correct: use trusted local helpers, report only the observed
confidence, preserve all bytes and supply repair instructions without repair.
