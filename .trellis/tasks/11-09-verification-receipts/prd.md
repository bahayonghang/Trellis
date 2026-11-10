# 可执行验收与验证收据

## Goal

让“任务完成”基于可复现的证据，而不是 checkbox 或 agent 的自述：为验收标准定义
稳定 ID 和可执行检查，运行结果生成与代码/规范输入绑定的收据；输入变化后收据
自动失效；严格模式下 completed/archive 依赖有效收据。（TL17–TL19，上游 issue #664）

## 状态

**需求未收敛，先做 brainstorm，不直接实现。** 这是独立的 P2 任务，不属于可靠性首版。
必须在 `fork-reliability-v1` 完成并实际使用一段时间之后再启动。

## 待决问题（brainstorm 时逐一确认）

- 验收标准写在哪里：`prd.md` 中的结构化块、`task.json` 字段，还是独立的 `acceptance.yaml`？
- 命令登记的信任边界：只执行可信项目配置中登记的命令，绝不从 PRD 文本中解析出 shell 命令（同时关联 TL32 / #525 的 `shell=True` 问题，见 `common/task_utils.py:427`）。
- 收据内容：HEAD、相关 tracked 与 untracked 文件的指纹、spec/context hash、命令、工具版本、退出码、日志引用、来源（本地 runner 或 CI）。本地收据不宣称防篡改。
- 状态模型：保留现有 planning / in_progress / review / completed，另加验证状态；`task.py finish` 解绑会话不受门禁影响；旧任务如何迁移。
- 是否接入 OpenSpec（TL20–TL24）：本任务的设计不依赖 OpenSpec，但需要给将来的桥接预留 change ID 关联字段（只预留，不实现）。

## Acceptance Criteria（初稿，brainstorm 后修订）

- [ ] 失败、超时、未运行、需要人工确认四种结果分别输出。
- [ ] 验证后修改相关代码、规范或未跟踪输入，收据显示为已陈旧。
- [ ] 严格模式下，缺失或陈旧的证据会阻断 completed/archive；暂停或解绑不受影响。
- [ ] 旧任务没有新字段时仍然正常工作。
