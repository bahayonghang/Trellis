# Claude/Codex hook 协议回放回归

## Goal

为主力平台（Claude Code、Codex）保存脱敏的真实 hook payload fixture，在 CI 中回放，
并断言 hook **实际输出的上下文内容**，而不只是“返回成功”。（TL33，上游 PR #644，OPEN）

## Requirements

- 审查上游 #644，复用其回放思路；只覆盖 Tier1：Claude Code 与 Codex。
- fixture 记录来源宿主的版本，并去除个人路径和会话 ID。
- 覆盖的事件：SessionStart、UserPromptSubmit（workflow-state）、子代理启动（Claude PreToolUse/Task、Codex SubagentStart）。
- 断言：输出 JSON 的结构符合宿主协议，并且注入的上下文包含预期的任务 PRD/spec 片段（例如 `updatedInput` / `additionalContext` 的内容）。
- fixture 场景覆盖：仓库根目录、子目录 cwd、嵌套 `.git`、CRLF/UTF-8 中文路径、有和没有会话身份。
- 在测试报告中明确区分“回放通过”与“真实宿主冒烟通过”，回放不能冒充宿主实测。

## Acceptance Criteria

- [ ] 故意破坏 hook 输出（例如删掉上下文字段）时，CI 失败。
- [ ] 在 Linux 与 Windows CI 中都运行。
- [ ] 更新 fixture 的方法写在测试目录的 README 中。

## Dependencies

`hook-trellis-root`、`codex-subdir-hooks`、`hook-stdin-guard`、`windows-ci`。
