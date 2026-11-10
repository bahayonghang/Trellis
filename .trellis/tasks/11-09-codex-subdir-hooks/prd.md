# Codex 从子目录启动时 hook 可用

## Goal

在仓库子目录（如 `src/`、嵌套 worktree）里启动 Codex 时，Trellis hook 的脚本入口
仍能被找到并正确注入上下文。（TL09，上游 issue #667，OPEN，无现成 PR）

## 现状（已确认）

- `packages/cli/src/templates/codex/hooks.json` 与生成的 `.codex/hooks.json` 使用相对路径：`{{PYTHON_CMD}} -X utf8 .codex/hooks/inject-workflow-state.py`。Codex 以会话 cwd 执行该命令，从子目录启动时脚本根本找不到。
- 这与 `hook-trellis-root` 是两个不同阶段的故障：本任务解决“脚本能否启动”，前者解决“脚本启动后能否找到正确根目录”。

## Requirements

- 先在本机实际使用的 Codex 版本上复现（记录 Codex 版本和 cwd 行为）。
- 修复方式不能把本机绝对路径写进会被提交的共享配置。候选方案需在 design 阶段比较：Codex 是否提供项目根变量；用一个能自行定位根目录的小型启动器；`git rev-parse` 的跨平台可行性；PowerShell 与 POSIX shell 的引号差异。
- 同时检查其它平台的 hook 配置是否有同样的相对路径问题，列出清单（本任务只修 Codex，其它平台记录到父任务的后续清单）。
- 修改 `configurators/codex.ts` 和模板，同步 `.codex/` 镜像。

## Acceptance Criteria

- [ ] 从仓库根目录、`packages/cli/src`、嵌套 worktree、含中文和空格的路径启动 Codex，hook 都能启动，并注入正确任务的上下文（真实宿主冒烟测试，Windows 必测）。
- [ ] 生成的 `.codex/hooks.json` 不含本机绝对路径。
- [ ] 已有项目执行 `trellis update` 后能迁移到新的 hook 命令，且不覆盖用户自定义的 hooks 条目。

## Dependencies

`hook-trellis-root`、`windows-ci`（建议）。属于复杂任务：`task.py start` 前需要 `design.md` + `implement.md`。
