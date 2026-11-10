# 所有 hook 有界读取 stdin

## Goal

宿主不关闭 stdin 时，任何 Trellis hook 都不能一直挂到 EOF；同时不能因为超时过短
而丢掉有效的 JSON 输入。（TL11，上游 PR #591，OPEN）

## 现状（已确认）

- 只有 `shared-hooks/inject-workflow-state.py`（约 :395-415）使用线程+队列的 guard，超时时间是硬编码的 **0.2 秒**。
- `shared-hooks/session-start.py`、`inject-subagent-context.py`、`inject-shell-session-context.py`、`codex/hooks/session-start.py` 都直接调用 `sys.stdin.read()`，没有 guard。
- 0.2 秒对于启动慢或负载高的宿主可能太短，会把有效输入当成空输入。

## Requirements

- 审查上游 #591 并选择性移植。
- 所有 hook 共用一个读取 stdin 的 helper（各平台模板文件是独立部署的，需确认共享方式：复制 helper 还是放在 `.trellis/scripts/common` 中 import）。
- 超时时间合理（建议默认 1–2 秒，可通过环境变量覆盖），并且 stdin 一旦关闭就立即返回，不额外等待。
- 超时、空输入、坏 JSON 三种情况分别有可诊断的结果（例如写到 stderr 或调试日志），并且都不让宿主失败。

## Acceptance Criteria

- [ ] 测试覆盖：stdin 一直不关闭 → 在超时内返回；延迟 0.5 秒才到达的有效 JSON → 被完整读取；空输入；坏 JSON；超大但合法的输入。
- [ ] 每个 hook 的有效上下文输出不变（与现有测试对比）。
- [ ] 模板与 dogfood 镜像同步；Python 3.9 兼容。

## Dependencies

`fork-baseline`。
