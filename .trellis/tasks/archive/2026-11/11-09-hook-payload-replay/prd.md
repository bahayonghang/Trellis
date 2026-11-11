# Claude/Codex hook 协议回放回归

## Goal

为主力平台（Claude Code、Codex）保存脱敏的真实 hook payload fixture，在自动化套件中回放，
并断言 hook **实际输出的上下文内容**，而不只是“返回成功”。（TL33，上游 PR #644，OPEN）

## Requirements

- 审查上游 #644，复用其回放思路；只覆盖 Tier1：Claude Code 与 Codex。
- fixture 记录来源宿主的版本，并去除个人路径和会话 ID。
- 覆盖的事件：SessionStart、UserPromptSubmit（workflow-state）、子代理启动（Claude PreToolUse/Task、Codex SubagentStart）。
- 断言：输出 JSON 的结构符合宿主协议，并且注入的上下文包含预期的任务 PRD/spec 片段（例如 `updatedInput` / `additionalContext` 的内容）。
- fixture 场景覆盖：仓库根目录、子目录 cwd、嵌套 `.git`、CRLF/UTF-8 中文路径、有和没有会话身份。
- 在测试报告中明确区分“回放通过”与“真实宿主冒烟通过”，回放不能冒充宿主实测。

## Acceptance Criteria

- [x] 故意破坏 hook 输出（例如删掉上下文字段）时，回放断言失败（同一套件本机验证五类临时脚本输出变异：仍退出 0，但实际上下文断言拒绝）。
- [x] 本机 Windows 回放 56 项通过，现有 Linux/Windows CI 矩阵收录该套件；远端执行按用户 2026-11-11 的仅本地要求移出本轮验收。
- [x] 更新 fixture 的方法写在测试目录的 README 中。

本机新增回放 56 项通过；相关回归合计 161 项通过。7 份脱敏输入包含
固定上游版本的 5 份 Claude 录制样本及本机 Codex 0.167.1 的 2 份原生
采集；研究/默认角色与路径、身份变体保留来源和派生标记。详情见
`research/verification-20261111.md` 及测试目录 README。

2026-11-11 用户改为“不用发布，保持本地”，本轮按本地回放交付归档。
实际 PR CI 曾因 marketplace 提交不可获取在 checkout 失败，回放未在远端
运行；本机通过不被记为 Linux 或远端通过，也不宣称真实 Claude 宿主通过。
Codex 输入采集与上一子任务的真实上下文交付验收是两种独立证据。
当前范围和复用证据见 `research/local-closeout-20261111.md`。

## Dependencies

`hook-trellis-root`、`codex-subdir-hooks`、`hook-stdin-guard`、`windows-ci`。
