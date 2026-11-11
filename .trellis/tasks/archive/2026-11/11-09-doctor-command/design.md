# Read-only doctor design

## Scope and trigger

Implement `trellis doctor [--json]` as a local diagnostic. Inspect Node/Python,
configured platform registrations, nearest Trellis root/workflow, stored
template drift, the current session's task pointer, and hooks.local.json ignore
state. No repair, network, package installation, arbitrary hook execution or
host/model session. Verification-receipts remains outside this task.

Expected product files: `src/commands/doctor.ts`, CLI registration in
`src/cli/index.ts`, and an internal packaged `src/templates/doctor/probe.py`.
The Python asset is not installed into user projects and has no dogfood twin.
Add one command integration test and a backend command spec; no SDK/public
registry redesign, dependencies or user configuration changes.

## Signatures and output

Expose `doctor(options)` for the CLI and a report collector for tests. Use the
existing Zod dependency for an exported strict report schema and JSON Schema;
derive TS report types from it. V1 report fields: `schemaVersion: 1`, `cwd`,
`root: string | null`, `checks: DoctorCheck[]`. Each check has a stable nonempty
`id`, `status: ok | warn | error`, `confidence: configured | probed |
host-verified`, `message`, and optional actionable `suggestion`/bounded details.

JSON stdout is exactly one report object, including diagnostic failures. Skip
the existing startup version banner only for doctor so mismatched `.version`
cannot corrupt JSON. Human output shows the same check results. Exit1 if any
check is error; warnings alone exit0. Unexpected fatal errors follow existing
CLI catch conventions. No receipt ingestion or invented host evidence: doctor
itself reaches at most probed, even if a separate manual host receipt exists.

## Reuse and local probes

- Reuse `detectProjectType`, `getConfiguredPlatforms`, `AI_TOOLS`,
  `collectPlatformTemplates`, `loadHashes` and `getModificationStatus`.
  The registry's ownership/template maps supply platforms and paths; no second
  platform marker table. Missing/invalid ownership metadata is a warning, not
  a claim that native directories are Trellis configured.
- Probe the current Node version against the packaged engines minimum. Probe
  the platform-selected Python alias via known executable/argv only, minimum
  3.9. No shell evaluation of user command strings.
- The internal Python probe imports the shipped canonical
  `trellis_hook_paths.find_trellis_root` and bundled `common.active_task` APIs,
  never project-owned Python. Invoke with isolated/no-site/no-bytecode flags,
  ignored stdin, bounded timeout and captured output. Existing package template
  copying already ships this asset. Root discovery ignores Git boundaries and
  keeps the canonical linked-workflow behavior. Separately flag missing workflow.
- Read the canonical environment mapper before resolving the active task. Only
  call the resolver with environment context enabled when a nonempty explicit
  override or canonical environment identity exists; otherwise disable it and
  report no known identity. No single-session borrowing, fabricated identity or
  shell-ticket fallback. That fallback deletes expired tickets and is unsuitable
  for a read-only command. Do not change the canonical resolver to implement this.
- Read registration data from installed config and registry templates. Check
  expected registration/entrypoint presence, known script path readability and
  Python command resolution without running hooks. Recognize the current Codex
  portable command as safe against the known relative-entry problem; warn on
  old relative entries. Preserve custom commands/unknown shapes and report
  configured/unsupported probing honestly rather than executing them. Platforms
  using plugins/preludes get appropriate configured asset checks, not invented
  Python events or host-verified claims.
- Classify tracked templates against stored hashes only. State that drift is
  local modification, not an upstream freshness check. Reject unsafe/outside
  manifest refs before passing paths to readers; do not initialize/repair hashes.
- Use only local read-only Git queries for ignore/tracked status, disable optional
  locks/fsmonitor, and never run status/add/fetch. A tracked hooks.local.json gets
  the existing `git rm --cached -- .trellis/hooks.local.json` suggestion only.
  Links/nonregular ignore files are reported conservatively, not followed/written.

## Validation and failure matrix

| Case | Expected result |
| --- | --- |
| Healthy initialized Claude/Codex project | Relevant checks ok, confidence at most probed |
| Broken recognized owned hook command/entrypoint | error and repair suggestion; never execute arbitrary command |
| Unrecognized custom command | configured warning explaining that execution was not probed |
| Missing workflow.md with other valid root markers | root found, workflow error and repair suggestion |
| Stale current-session task directory | task error and task.py recovery suggestion |
| No identity with multiple sessions/expired tickets | no task inference, tickets and all bytes unchanged |
| No Python / Python below3.9 | explicit runtime diagnostic, dependent probes unverified |
| Modified/missing tracked template | local drift diagnostic, no writes or network |
| Invalid config/hash JSON or outside ref | bounded diagnostic, no external file takeover |
| Version mismatch with --json | one schema-valid JSON object, no startup banner |

## Required evidence

Exercise the public built CLI and the real report schema. Corrupt each requested
input separately. Snapshot every fixture path/file byte, including `.trellis`,
ignored runtime, Git metadata and expired shell tickets, before/after healthy and
broken runs. Assert no Python bytecode artifacts. Test malformed report rejection
and that no returned confidence is host-verified. Use Python3.9, focused strict TS,
lint/typecheck/build and existing Node18 smoke if its binary is available.
Remote Linux/Windows CI stays separate under no-push.

Wrong: execute user hooks or mutable task fallback and label success host-verified.
Correct: probe only trusted local helpers/runtime, report bounded confidence,
preserve all workspace/Git bytes, and supply repair suggestions without repairs.
