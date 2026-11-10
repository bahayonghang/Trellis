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

- [ ] A 为 in_progress 时创建 B → `task.py current` 仍是 A；B 为 planning。
- [ ] `task.py start B` 后当前任务为 B。
- [ ] 无当前任务时创建 → 自动激活（行为不变）。
- [ ] 指针指向已删除目录或已归档任务时，按“无当前任务”处理，并有测试覆盖。
- [ ] Python 3.9 py_compile 通过。

## Dependencies

`fork-baseline`。
