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

- [x] 测试覆盖：普通根目录、嵌套 `.git`（子模块中启动）、非 Git 工作区、更近处有另一个 `.trellis`、`.trellis` 为符号链接、只有空 `.trellis/` 标记（无效）。每种情况的结果都明确并有断言。
- [x] 全部 8 个 Python 平台 hook（含私有 SessionStart、Snow、可选 statusline）遵守有效根规则；找不到有效根时 stdout/stderr 为空、退出 0，且不产生上下文/环境票据/Snow 日志等副作用。
- [x] 生成的 Claude PreToolUse 与 Codex 原生 SubagentStart 在上述布局中选择正确任务上下文；更近的有效根不泄漏父工作区内容，已有 realpath 包含性保护保留。
- [x] 所有有效标记变体及错误类型、无效近标记跳过、文件系统根包含性有明确断言；Windows 使用真实目录 junction 验证链接，不新增 skip。
- [x] 共享依赖在全部 12 个 Python-hook 平台与可选 statusline 中交付，仍与事件能力分离；构建产物的 init/update/hash/打包/卸载归属验证通过。
- [x] 修改前逐字节一致的 dogfood 副本在修改后仍与模板一致；本来有差异的副本按用户续作约束保持原样并记录 hash，不为追平而覆盖。
- [x] 普通有效工作区输出协议、各 hook 的路径提示优先级/Windows 归一化、会话身份与 fallback 策略不变；真实 Python 3.9 和全部必需质量检查通过。

## Implementation evidence

`research/verification.md` records the RED/GREEN details and exact commands.
Independent review fixed per-candidate permission-error handling and made task
verification scripts archive-location independent. The second independent pass
fixed the remaining marker-alternative error boundary: an inaccessible internal
marker cannot hide an accessible valid sibling at the same child root. Three new
persistent regressions reproduce the two failures and retain a parent-fallback
control; all three now pass. Final focused: 188 passed / 1 existing skip (root
suite: 34 passed). Full: core 401 passed / 2 existing skips; CLI 2,034 passed /
35 existing skips. All five required gates passed again, serialized; CPython
3.9.25 compiled 84 files (81 product + 3 task verification scripts). All twelve
rebuilt installations, receipts, upgrade/deletion/uninstall ownership and 835-entry
npm packaging checks passed with the updated helper bytes. No remaining in-scope
findings after the second review. Permission errors were injected into stdlib
Path predicates, not exercised with real ACLs; native POSIX remains unverified on
this Windows host.

Main-session staged detection included all new assets/tests/evidence: 49 files,
33 symbols and 25 expected hook/support flows (CRITICAL within the warned scope).
Implementation commit: `2248f9ad fix(hooks): resolve the nearest valid Trellis workspace`,
with #650 attribution and real pre-commit lint/full tests passing. Normal scoped
archive follows as separate bookkeeping; no push/amend/hook bypass.

## Dependencies

`fork-baseline`。`codex-subdir-hooks` 依赖本任务。
