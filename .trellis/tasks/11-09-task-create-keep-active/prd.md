# 创建任务不覆盖未完成的活动任务

## Goal

`task.py create` 在当前会话已有未完成任务时，不应隐式把会话指针切换到新任务；
切换必须通过显式动作完成。（TL10，上游 PR #654，OPEN）

## 现状（已确认）

- `common/task_store.py:641-664` 的 `cmd_create` 在能解析到会话身份时调用 `set_active_task`，不管当前是否已有 in_progress 任务。
- 已有 `--no-start` 可以避免切换，但默认行为仍然是覆盖。

## Requirements

- 审查上游 #654 并选择性移植。
- 当前会话没有任务，或当前任务已完成/已归档/指针无效：保持现有行为（自动激活新任务）。
- 当前任务未完成：新任务创建成功但不激活，输出提示说明如何显式切换（`task.py start <new>`）。
- 显式 `task.py start <task>` 的切换行为不变。
- 先比对上游维护者进行中的会话身份任务（`08-05-session-identity-*`、`09-09-codex-session-fallback-isolation`）是否修改同一段代码；如有重叠，在本 PRD 中记录处理方式。
- 修改模板源并同步 `.trellis/scripts` 镜像；工作流文档中描述 create 行为的段落一并更新。

## Acceptance Criteria

- [x] A 为 in_progress 时创建 B → `task.py current` 仍是 A；B 为 planning。
- [x] `task.py start B` 后当前任务为 B。
- [x] 无当前任务时创建 → 自动激活（行为不变）。
- [x] 指针指向已删除目录或已归档任务时，按“无当前任务”处理，并有测试覆盖。
- [x] Python 3.9 py_compile 通过。

## Dependencies

`fork-baseline`。

## Preflight / Approved Boundary (2026-11-10)

- Reviewed upstream #654 and the named session-identity tasks; evidence and
  selective-port boundary are in `research/upstream-654.md`. No same-hunk
  overlap found. #608 is already a merged ancestor of this fork; do not modify
  its resolver behavior or maintainer-owned task artifacts.
- Upstream also adds `start --switch`, but this PRD requires explicit start
  switching to remain unchanged. Port only create preservation and corresponding
  helper/tests/guidance; do not introduce the upstream start restriction.
- Product/script twins are byte-identical; the dogfood workflow is not identical
  to the template and must remain untouched under the continuation Prompt.
- The required product workflow documentation change also needs a matching
  update to `marketplace/workflows/native/workflow.md`. The user explicitly
  approved a narrow local marketplace submodule commit and parent gitlink
  update. No push/PR/release, other marketplace file edits, or mirror-test
  weakening is authorized.
- Planning is ready: use the existing PRD-only task, configure real context,
  then start. The already-different dogfood workflow remains untouched.

## Implementation / Verification (2026-11-10)

- Selectively adapted the create guard and read-only `active_task_conflict`
  helper from mindfold-ai/Trellis#654. Archived locations also release stale
  planning metadata, per this PRD. Switching guidance uses the native Python
  alias and plain `start`, never upstream's `--switch`.
- Only existing product function changed: `cmd_create`, mirrored in dogfood.
  `task.py`, `active_task.py`, session fallback policy and maintainer tasks are
  untouched. No extra status writer, parser gate or lifecycle hook changes.
- Updated conditional create/planning guidance in the product workflow and
  only `marketplace/workflows/native/workflow.md`; `.trellis/workflow.md`
  retains blob `158142e1679afdf8cd665b104ddea49c3147c414`.
- Spec judgment: update the existing active-task lifecycle's guard signature,
  conservative metadata rules, matrix and tests, plus a seven-part create-only
  workflow-state contract. Do not import upstream start restrictions.

### Real CLI test matrix

`packages/cli/test/scripts/task-create-keep-active.integration.test.ts`:

| Cases | Scenario | Assertions |
| --- | --- | --- |
| 1–3 | `in_progress`, `planning`, custom `review` | A pointer/metadata and sibling bytes unchanged, B planning, explicit start B succeeds and runs hook |
| 4–7 | Missing, malformed, unreadable metadata, invalid status | Create succeeds but conservatively retains A and prints native plain-start guidance |
| 8–12 | `completed`, `done`, no pointer, deleted dir, archive ref | Normal activation of new planning task; sibling unchanged |
| 13 | Malformed exact pointer with sole sibling | Never adopts sibling; activates only exact session |
| 14 | Canonical path alias | Unfinished task is still protected |
| 15 | `--no-start` with replaceable terminal pointer | Pointer stays byte-identical |
| 16 | No session identity | Only task files created; sibling pointer untouched |

### Results

- Tests first, unfixed source: **8 failed / 8 passed**; failures reproduce pointer
  replacement. After implementation: **16 passed**.
- All five required checks passed via `uv run --locked`: root `pnpm lint`,
  `pnpm typecheck`, CLI `lint:py` (**0 errors / baseline 68 warnings**), root
  `pnpm build`, root `pnpm test` (**core 401 passed / 2 existing skipped;
  CLI 1961 passed / 35 existing skipped**). No retries, new skips or timeouts.
- Actual CPython **3.9.25** compiled all **73 tracked Python files**; all
  **28 script pairs** byte-identical. Marketplace workflow matches after the
  existing newline normalization; its diff is only four prose replacements.
- Strict TypeScript check including the new test and Prettier check passed;
  root/submodule `git diff --check` clean (existing task-file CRLF notices only).
- Pre-edit cached GitNexus upstream impact: product `cmd_create` UNKNOWN,
  0 resolved callers/processes; dictionary dispatch manually confirmed in both
  `task.py` entrypoints. Dogfood is not indexed separately. No HIGH/CRITICAL
  result in that pre-edit impact. This is not evidence of an unused function.
- Post-edit forced index refresh and `detect_changes --scope all`: **HIGH**
  aggregate risk, 13 tracked changed files, 6 indexed symbols/sections and 9
  flows. Code symbols are only `cmd_create` and the new guard; remaining symbols
  are workflow sections (including coarse enclosing parser sections). New test
  is untracked and was verified separately. All flows are create or guard →
  existing resolver/JSON/path helpers. Warning reported before handoff; no
  additional product edits after this finding. Refreshed upstream impact of
  `active_task_conflict`: **LOW**, exactly one direct caller/process,
  `cmd_create`. Main must independently inspect the aggregate result and rerun
  detection on its final staged scope, including the new test/gitlink.
- No staging, commits, archive, push or nested agents by implement. Main session
  subsequently reviewed the final diff and created the approved local marketplace
  commit `1aa9b326baf93257d6142660e49d3120e7f4b4ef`
  (`docs(workflow): preserve unfinished task during creation`), changing only
  `workflows/native/workflow.md`. Parent gitlink and attributed parent commit
  follow after staged scope detection. Read/check/write remains non-serialized for
  concurrent commands in one session; this task does not introduce locking.

## Independent Check (2026-11-10)

- **No blocking issues remain.** Deep review covered the complete task diff,
  untracked real-CLI test, both Python trees, specs and native workflow mirror;
  security/architecture and adversarial passes ran directly, without agents.
- Fixed wording at `packages/cli/src/templates/trellis/workflow.md:78` and its
  marketplace native mirror: switching guidance is conflict-only, not promised
  without identity. Also corrected the same paragraph's existing claim that
  identity-free start fails: it succeeds in degraded mode without a pointer.
  No Python or test edits were needed; dogfood workflow remains untouched.
- Independently reran root lint/typecheck, CLI `lint:py` (0 errors, existing 68
  warnings), and build via `uv run --locked`. Focused create/template/regression
  run: **534 passed / 13 existing skipped**. After the prose fix, create/template
  rerun: **42 passed**, including all 16 new cases. No retries or new skips.
- Strict TypeScript including the new test: 0 diagnostics; Prettier passed.
  Actual CPython 3.9.25 compiled 73 tracked files; all 28 Python pairs match.
  Old/new real-CLI control independently reproduced pointer replacement on HEAD
  and preservation on candidate. Built assets match source; built-script smoke
  confirms silent no-identity create and successful degraded plain start.
- AST comparison against HEAD confirms only existing `cmd_create` changed;
  every old `task_utils` function is identical. Reported UP024/SIM105 and
  shell-injection diagnostics concern unchanged bodies. `shell=True` executes
  repository-authored config hooks by the explicit script-conventions trust
  contract; changing that authority is outside this selective port.
- Spec judgment: existing lifecycle updates and seven-part create contract are
  sufficient; no new writer, fallback policy or parser/flag change. Canonical
  archive containment is read-only and uses path components, not string prefixes.
- Cached GitNexus detection independently returned the expected **HIGH**
  aggregate, 6 indexed symbols/sections and 9 create/guard flows; warning reported.
  No unexpected product flow found. LSP tools were unavailable here; executable
  typechecks supplied diagnostics instead. Full-suite totals above remain the
  implement agent's evidence, not a new full-suite run by check.
- Nothing staged, committed, archived or pushed. Main still must commit only the
  approved native workflow in marketplace, update the parent gitlink, and rerun
  GitNexus detection on final staged scope including the currently untracked test.
