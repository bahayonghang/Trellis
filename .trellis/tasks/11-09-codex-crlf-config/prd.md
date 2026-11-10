# Codex 配置在 CRLF 下保留模型设置

## Goal

Windows 下文件是 CRLF 行尾时，`trellis update` / init 不得丢失用户在
`.codex/agents/trellis-*.toml` 中设置的 `model` / `model_reasoning_effort`，
也不得多改 OMP 正文。（TL06，上游 PR #656，OPEN）

## 现状

- `configurators/codex.ts:44` 的 `extractCodexAgentModelKeys` 已经用 `split(/\r?\n/)` 解析，所以文档“CRLF 导致模型配置丢失”的描述**可能已经部分修复**。
- #656 声称还有两处生产代码中的正则问题（codex.ts 写回路径、`configurators/shared.ts` 的 OMP 标题处理），需要核实。

## Requirements

- 先复现：用 CRLF 的 agent toml 和 OMP 文件运行一次 update，记录是否丢失或被改写。
- 如果能复现，移植 #656 中仍缺失的 CRLF-safe 修复以及相关测试；不放宽断言，也不加大超时。
- 如果不能复现，补一个 CRLF 回归测试锁定当前行为后关闭本任务，并在父任务中记录。

## Acceptance Criteria

- [ ] LF 和 CRLF 两种输入下，`model` 与 `model_reasoning_effort` 都保留（有测试）。
- [ ] OMP 文件的正文在 update 前后逐字节相同（标题处理除外，以实际预期为准）。
- [ ] 测试在 Windows CI 中运行。

## Dependencies

`fork-baseline`；`windows-ci` 建议先完成。
