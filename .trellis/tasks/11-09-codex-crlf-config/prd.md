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

- [x] LF 和 CRLF 两种输入下，`model` 与 `model_reasoning_effort` 都保留（有测试）。
- [x] OMP 输出符合用户确认的实际预期：保留模板 LF 规范化现状，正文文本未额外改写；不声称 CRLF 输入原始字节不变。
- [x] 测试已纳入 Windows CI 的常规测试选择，并在本机原生 Windows 通过；远端 Actions 尚未运行，不声称远端通过。

## 复现与用户确认

实际 built CLI update 未能复现 #656 的模型键丢失或重复标题。观察到 OMP
正文因 CRLF→LF 从 2405 变成 2351 字节。用户明确选择：
“按‘未能复现’分支归档，明确保留并记录 LF 规范化现状”。因此调整上述正文
验收口径，仅补回归、不改生产正则；保留具体哈希和前后字节证据。
详见 `research/reproduction.md`，完成独立检查及 pre-commit 后归档。

## Dependencies

`fork-baseline`；`windows-ci` 建议先完成。
