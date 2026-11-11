# Codex 从子目录启动时 hook 可用

## Goal

在仓库子目录（如 `src/`、嵌套 worktree）里启动 Codex 时，Trellis hook 的脚本入口
仍能被找到并正确注入上下文。（TL09，上游 issue #667，OPEN，无现成 PR）

## 现状（已确认）

- `packages/cli/src/templates/codex/hooks.json` 与生成的 `.codex/hooks.json` 使用相对路径：`{{PYTHON_CMD}} -X utf8 .codex/hooks/inject-workflow-state.py`。Codex 以会话 cwd 执行该命令，从子目录启动时脚本根本找不到。
- 这与 `hook-trellis-root` 是两个不同阶段的故障：本任务解决“脚本能否启动”，前者解决“脚本启动后能否找到正确根目录”。前置已提交为 `2248f9ad`，归档为 `069d1400`。
- 本机版本已确认 `codex-cli 0.167.0`；对应官方 tag `rust-v0.167.0` 的源码确认 Windows 默认 cmd /C 且命令 cwd 为 session/turn cwd。普通 Python 入口探针在根退出 0、`packages/cli/src` 退出 2；这不替代真实 Codex 宿主复现。
- 尚未运行真实/计费 Codex 会话；设计与真实宿主额度是独立审批关卡。证据与其它平台清单见 `research/host-0167.md`。

## Requirements

- 先在本机实际使用的 Codex 版本上复现（记录 Codex 版本和 cwd 行为）。
- 修复方式不能把本机绝对路径写进会被提交的共享配置。候选方案需在 design 阶段比较：Codex 是否提供项目根变量；用一个能自行定位根目录的小型启动器；`git rev-parse` 的跨平台可行性；PowerShell 与 POSIX shell 的引号差异。
- 同时检查其它平台的 hook 配置是否有同样的相对路径问题，列出清单（本任务只修 Codex，其它平台记录到父任务的后续清单）。
- 修改 `configurators/codex.ts` 和模板，同步已确认默认渲染的 `.codex/hooks.json` 镜像；不覆盖三个已有差异的子代理脚本或其它用户配置。当前 JSON 匹配旧模板的 python3 渲染，Windows python 渲染不同，这一同步范围须纳入设计审批。
- 不新增事件或全局安装，不依赖假项目根变量；无 Git、嵌套 Git/worktree、最近有效根及 stdin 有界协议保持兼容。
- 迁移只处理可证明归属的 Trellis command 字段；用户 hook/未知字段/顺序/matcher/timeout/Windows override/有意移除的条目保留。无法安全识别的配置走冲突路径，不全文件强制覆盖。
- 命令变化后通过正常 hook trust 重批，不使用 bypass 或自动修改信任记录。

## Acceptance Criteria

- [ ] 从仓库根目录、`packages/cli/src`、嵌套 worktree、含中文和空格的路径启动 Codex，hook 都能启动，并注入正确任务的上下文（真实宿主冒烟测试，Windows 必测）。
- [x] 生成的 `.codex/hooks.json` 不含本机绝对路径。
- [x] 已有项目执行 `trellis update` 后能迁移到新的 hook 命令，且不覆盖用户自定义的 hooks 条目（离线集成与构建后 CLI 验证，未冒充宿主验收）。

## 规划与审批状态

用户已批准方案 A、旧默认渲染镜像同步，并接受 getHooksConfig 的 HIGH
影响范围。本轮先完成代码与离线测试；实际命令行现为 0.167.1，指定
0.167.0 的真实宿主验收仍未完成。环境做不到时，自动化完成后停止、
不归档，不把回放写成宿主验收。

## Dependencies

`hook-trellis-root`、`windows-ci`（建议）。属于复杂任务：`task.py start` 前需要 `design.md` + `implement.md`。
