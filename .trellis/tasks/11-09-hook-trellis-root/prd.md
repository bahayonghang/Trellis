# hook 解析最近有效的 Trellis 根目录

## Goal

子代理上下文注入 hook 应以“最近的有效 `.trellis/` 根目录”作为项目根，而不是
最近的 `.git`；否则在嵌套 Git（子模块、vendor 仓库）中会找错根目录，导致注入失败。
（TL08，上游 PR #650，OPEN）

## 现状（已确认）

- `templates/shared-hooks/inject-subagent-context.py:75` 的 `find_repo_root` 从起点向上查找，遇到第一个 `.git` 就返回。
- 副本：`.claude/hooks/`、`.codex/hooks/`、`.cursor/hooks/` 下的 dogfood 镜像（`packages/cli/dist` 是构建产物，不手改）。
- 其它 hook（session-start、inject-workflow-state 等）可能各自有自己的根目录查找逻辑，需要一并盘点。

## Requirements

- 审查上游 #650 并选择性移植。
- 根目录规则：从起点向上查找，第一个包含有效 `.trellis/`（含 `workflow.md`、`config.yaml` 或 `scripts/` 之一）的目录即为根；`.git` 不作为终止条件。
- 盘点 `shared-hooks/*.py` 和平台私有 hook 中所有查找根目录的实现；如果规则不一致，统一到一个共享函数（只在确实存在重复时才抽取）。
- 基线发现（`FORK_BASELINE.md` 失败 #3）：本机 `~/.trellis/` 只有 `spec-inject/`，`inject-workflow-state.py` 从 `%TEMP%` 向上查找时把它当成根目录，然后因 `ModuleNotFoundError: common` 崩溃。无效标记必须被跳过，找不到有效根时应静默退出 0，所有 hook 都要满足。`windows-test-failures` 已先在 `inject-workflow-state.py` 的 `find_trellis_root` 中实现：`.trellis/` 内必须有 `workflow.md`、`config.yaml` 或 `scripts/` 之一。本任务把同一规则推广到其它 hook，并统一实现。
- `.trellis` 是符号链接时保持现有的 realpath 处理（`inject-subagent-context.py:268,1143`）。

## Acceptance Criteria

- [ ] 测试覆盖：普通根目录、嵌套 `.git`（子模块中启动）、非 Git 工作区、更近处有另一个 `.trellis`、`.trellis` 为符号链接、只有空 `.trellis/` 标记（无效）。每种情况的结果都明确并有断言。
- [ ] 模板与所有 dogfood 镜像内容一致（如果仓库已有一致性测试，就用它验证）。

## Dependencies

`fork-baseline`。`codex-subdir-hooks` 依赖本任务。
