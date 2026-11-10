# 归档提交只包含被移动的任务

## Goal

`task.py archive` 自动提交时，只 stage 和提交本次被归档的任务（源目录删除 +
目标目录新增 + 被修改的子任务 task.json），不能扫入 `archive/` 下其它任务的未提交变更。
（TL07，上游 PR #649，OPEN）

## 现状（已确认）

- `common/task_store.py` 的 `_auto_commit_archive` 已经用显式 pathspec 提交（#579），并能正确处理未跟踪的源目录（#629）。
- 但 `common/safe_commit.py:181-184` 的 `safe_archive_paths_to_add` 在传入 `task_name` 时仍把整个 `.trellis/tasks/archive` 加入 stage，于是其它已归档任务的脏改动也会进入 `chore(task): archive X` 提交。

## Requirements

- 审查上游 #649 并选择性移植。
- stage 路径精确到 `archive/<YYYY-MM>/<task_name>`（以实际移动后的目标路径为准）、源路径（用 `git rm --cached`），以及 `modified_children`。
- 用户在归档前已暂存的其它内容，以及工作区里未暂存的内容，都保持不变。
- 修改 `packages/cli/src/templates/trellis/scripts/common/` 下的产品源，并同步 `.trellis/scripts/common/` 镜像。

## Acceptance Criteria

- [ ] 回归测试：`archive/` 下另一个已归档任务有未提交修改，同时源码中有已暂存文件 → 归档任务 X → 提交只包含 X 的路径；另一个任务的修改和已暂存的源码仍然保留在 index 和工作区中，状态不变。
- [ ] 未跟踪任务归档后也能成功提交（不回退 #629）。
- [ ] `session_auto_commit: false` 时行为不变。
- [ ] Python 3.9 py_compile 通过。

## Dependencies

`fork-baseline`。
