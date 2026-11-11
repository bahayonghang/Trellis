# Verification planning evidence

## Starting state

dev HEAD b176526e4fbe05869722a1ded33440ce50e9ca80, clean worktree/index.
Only this P2 task remains active for the current developer. It has a draft PRD
and empty context manifests, with no implementation/design/receipt engine.
Latest user direction requests progressing this task as well; no remote writes
are authorized. Existing reliability archives are historical and remain intact.

## Owning source inspected

- task.py exposes context validation and lifecycle commands, but no verification
  runner, evidence status or manual acknowledgement commands. Its main function
  dynamically dispatches the command-name map.
- common/task_context.py:cmd_validate validates implement/check JSONL references.
  Reuse that validation meaning; do not quietly turn validate into an executor.
- common/task_store.py:cmd_archive owns the official completed write, followed
  by child unlink, session clearing, move and scoped auto-commit. The new guard
  must precede these changes, not run as an after_archive hook.
- task.py:cmd_finish clears the current session and runs the existing finish
  hook; it does not mark a task completed. Receipt failure must not trap a user
  in that session.
- common/config.py:_load_config deliberately falls back to defaults on invalid
  YAML. Its parser supports only a subset, including scalar lists but not maps
  inside lists. A strict JSON registry avoids a new YAML dependency/parser and
  avoids using fail-open configuration semantics for strict evidence.
- common/task_utils.py:run_task_hooks executes trusted configured shell strings,
  warns on failure and continues. That is appropriate to its existing lifecycle
  contract but unsuitable for a fail-closed receipt runner. No rewrite is planned.
- common/io.py:read_json_checked/write_json/write_text_atomic provide checked
  reads and atomic writes with the established Windows retry contract. Reuse
  these instead of another JSON/atomic implementation.
- packages/core/src/task/records.ts preserves meta and unknown fields on writes;
  canonical task status/schema remains unchanged. No SDK change is needed for
  the proposed task-meta opt-in. Direct SDK/filesystem writes are not a security
  boundary; the gate covers official task.py archive completion.

## Upstream issue inspection

Read mindfold-ai/Trellis#664 through the GitHub connector on 2026-11-11:
https://github.com/mindfold-ai/Trellis/issues/664. It is an optional acceptance
item proposal, with backward compatibility, executable vs manual items and
explicit open trust questions around #525. It contains no ready receipt/gate
implementation. Retain the optional/explicit evidence idea. The local PRD's
registered-command trust boundary overrides the proposal to execute PRD text.
No upstream code is copied or whole PR merged.

## Graph evidence and limits

GitNexus keyword query is degraded by its missing FTS runtime library and
returned no process results. This is not evidence of no callers/impact.
Exact cmd_archive context resolves the template function at 1270-1474 and
identifies two archive flows. The CLI dispatch also exists in source even
though the incoming graph list is empty. The initial index was11 commits
behind; an index-only refresh completed before the following impact analysis.
No symbol edit has occurred. Implementation must run fresh upstream impact for
every existing main/archive/test symbol in both template and dogfood files.
Any HIGH/CRITICAL scope still needs its exact report and authorization.

Fresh exact-UID upstream results after the index-only refresh:

- Template task.py:main: LOW, one direct caller (the same task.py module),
  zero graph-resolved affected processes/modules.
- Template task_store.py:cmd_archive: UNKNOWN, no resolved incoming caller;
  task.py main's dynamic command dictionary is a real source-level caller.
- Both root dogfood UIDs: UNKNOWN/target not indexed. Their task.py and
  task_store.py files are byte-identical to the corresponding template files.
  This supplies a bounded source comparison, not a false LOW/no-impact claim.

The refresh succeeded with FTS still unavailable. It also reported process
entry/callee budget truncation; absent graph edges/flows are not a completeness
guarantee. No runtime-library repair or managed guidance rewrite was pursued.

## Proposed minimum scope

One existing complex task, no duplicate task tree: explicit task-meta strict
enrollment; JSON acceptance IDs and trusted argv registry; local runner and
freshness inspection; manual acknowledgement; an early archive guard. Preserve
all old lifecycle defaults. Keep OpenSpec/CI/publication outside the first local
version and expose any V1 input limitations honestly. Planning documents are
review artifacts, not implementation or acceptance evidence.

## Planning verification

Both manifests contain seven real spec/design/research references and pass
task.py validate. It warns that script-conventions and quality-guidelines
exceed the existing per-file injection limit. That is not suppressed: the
implementation plan requires direct reading of relevant owning sections.
No injection/user limit is raised. Markdown formatting and git diff checks
pass. Product tests/builds are not rerun for this planning-only edit.
