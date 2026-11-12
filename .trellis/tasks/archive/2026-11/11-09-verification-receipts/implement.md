# Verification receipts implementation proposal

Status: user-approved and in progress as of 2026-11-11. Keep all delivery local.

1. Refresh index using analyze --index-only --force --no-parse-cache. Inspect
   upstream impact for each existing template/root main, cmd_archive and any
   changed test helper. Report real callers/flows; stop on new HIGH/CRITICAL
   scope for the required exact authorization. Do not rewrite managed guidance.
2. Read script, filesystem, workflow-state, Python3.9 and test conventions in
   full for the chosen files. Confirm root/template twins and existing helpers.
   The context validator warns that script-conventions and quality-guidelines
   exceed injection limits; read the relevant owning sections directly instead
   of relying on their truncated injected prefixes or changing user limits.
3. Implement strict V1 policy/registry/receipt contracts and input fingerprints
   in a deep common verification module. Cover relevant tracked/untracked,
   PRD/spec/context changes, unrelated HEAD changes, missing inputs and runtime
   output exclusion. Reuse canonical root/task resolution and atomic writers.
4. Implement explicit runner/status/manual-confirm handlers with real argv
   subprocesses, bounded process-tree timeout, durable attempt replacement and
   versioned human/JSON output. No PRD command extraction or shell hook reuse.
5. Wire the narrow early strict archive guard and task.py command surface.
   Preserve legacy default behavior and finish. Sync root dogfood twins.
6. Establish meaningful RED/GREEN controls: shell-looking prose does not run;
   stale/missing/invalid/failed/pending evidence refuses archive without any
   task/session/child/index mutation; fresh pass permits real scoped archive;
   manual confirmation cannot override automated failure or stale inputs.
7. Test source changes during execution, interrupted/rerun state, directories
   gaining untracked files, own receipt/journal writes, archive location changes,
   schema rejection, path escapes, timeout descendants and old-task regression.
   Keep native Windows/Python3.9 evidence separate from unrun hosted platforms.
8. Run focused suites, strict new-test TS compilation, Python3.9 syntax/type
   checks, lint/typecheck, serial build/package inspection and required full
   normal commit gates. Do not loosen old deadlines, skips or concurrency.
9. Check PRD/design/spec compliance, update one executable backend spec and
   relevant command/help docs. Inspect staged detect_changes, then make explicit
   Conventional Commit(s). No git add -A, no-verify, amend or push.
10. Register reviewed local commands in new `.trellis/verification.json`, enroll
    this task explicitly and run its actual checks with the new tool. Record
    valid fresh evidence, runtime/log references and source SHA; do not invent
    hosted CI or human confirmations. All original AC must actually pass.
11. Inspect strict task.py archive behavior, stage only this task's source/archive
    plus explicitly changed children if any, inspect staged detect_changes and
    produce its separate normal archive commit. Record the journal and finish
    with clean worktree/index and protected-task/mirror/remote-write audit.

Validation commands are finalized against implemented command help. Baseline
entrypoints: uv run --locked python3.9 environment, package-scoped Vitest script
integration tests, root pnpm lint/typecheck/build/test and Python lint:py.
No CI publication, native model calls or peripheral platform/window matrix.
