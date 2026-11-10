# Selective port preflight: mindfold-ai/Trellis#654

Reviewed on 2026-11-10 with `gh pr view 654 --repo mindfold-ai/Trellis --json number,title,body,state,url,headRefName,files` and `gh pr diff 654 --repo mindfold-ai/Trellis`. Open PR: https://github.com/mindfold-ai/Trellis/pull/654, fixes #511.

## Required selective boundary

The upstream PR includes two policies: preserve unfinished tasks during create, and require a new `start --switch` flag to switch unfinished work. This task's PRD explicitly says existing explicit `task.py start` switching must remain unchanged. Port only the create guard, its read-only conflict helper, relevant tests and guidance. Do not port the start refusal/flag or tell users to run an unavailable flag. No implementation has begun.

## Session-identity overlap check

- Queried open and all-state upstream PRs for `session`, and read the local PRDs for `08-05-session-identity-propagation` and all four children, plus `09-09-codex-session-fallback-isolation` design/implementation/PRD.
- The August parent is research; its children cover env bridging, active_task env tables/tickets, byte parity and SessionStart reminders. None plans the cmd_create activation block edited by this selective port. The OpenCode shell.env child records that its proposed extra plugin was abandoned.
- September isolation changes `common/active_task.py` fallback policy and hook callers, not task creation. Associated upstream #608 is merged at `992b2ee4bb48710bf6fa3698ecf1f2f3a17becac`; `git merge-base --is-ancestor <sha> HEAD` succeeded. Its task artifacts remain marked in_progress, but the source change is already in this fork baseline.
- The selective create guard must consume the existing resolver read-only and must not change fallback policy, active_task.py, main-session isolation, or any maintainer-owned task.
- GitNexus cmd_create impact is UNKNOWN because its CLI dictionary dispatch is not resolved, not because unused. Source `task.py` imports it and dispatches `create`; caller review is required before the future edit. Rebuild the index before implementation.

## Twin and workflow preflight

- Before edits: task_store.py and task_utils.py product/dogfood pairs are byte-identical.
- `.trellis/workflow.md` is NOT byte-identical to the distributed `packages/cli/src/templates/trellis/workflow.md`. Preserve the dogfood workflow under the user's existing no-drift-overwrite rule.
- Product workflow guidance currently says create automatically activates the new task. It must be updated with the new default behavior under this PRD.
- `packages/cli/test/templates/trellis.test.ts:134-144` requires the initialized Git submodule's `marketplace/workflows/native/workflow.md` to match the bundled workflow (after line-ending normalization). This is an intentional mirror contract, not a baseline failure to skip.
- Updating the product workflow alone would fail that test. Updating and committing the matching native workflow in the marketplace submodule, then recording its gitlink in this repo, is an additional repository change requiring user approval under the continuation Prompt. Do not weaken the test or modify the already-different local workflow as a workaround.

## Approved decision

The user explicitly approved a narrow local marketplace submodule commit for the native workflow mirror and the corresponding gitlink in dev. No push/PR/release, no other marketplace files, no blanket upstream merge. Preserve the already-different local workflow. The submodule starts clean at detached HEAD `7d5298d16e07c328c09493eed1f0652571744b17`; commit only the approved Markdown file and retain the resulting commit in the parent gitlink.
