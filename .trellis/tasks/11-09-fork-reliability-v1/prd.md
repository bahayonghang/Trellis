# 个人 fork 可靠性首版

## Goal

基于 `ref/Trellis_OpenSpec_对比与Fork方案.md`（审计基准 upstream main `f089cb32`），
先把日常使用的 Trellis（Windows + Claude Code / Codex）修到稳定可用，
再决定是否投入规范/验收增强。本任务是父任务，只承载需求集、任务地图、
跨子任务验收和最终集成复核，本身不作为实现目标。

## 文档评估结论（2026-11-09 对照本仓库源码核对）

采纳（已在源码中确认问题存在）：

| 文档项 | 证据 | 子任务 |
|---|---|---|
| TL05 #653 | `init.ts:909` 加平台时 `initializeHashes(merge)` 仍会重新遍历整个 `.trellis/`（`template-hash.ts:386`） | init-hash-baseline |
| TL07 #649 | `safe_commit.py:181-184` 把整个 `.trellis/tasks/archive` 加入 stage | archive-commit-scope |
| TL08 #650 | `inject-subagent-context.py:75` `find_repo_root` 遇到最近的 `.git` 就停 | hook-trellis-root |
| TL09 #667 | `templates/codex/hooks.json` 命令是相对路径 `.codex/hooks/*.py` | codex-subdir-hooks |
| TL10 #654 | `task_store.py:664` create 在有会话身份时 `set_active_task`，会切走当前任务 | task-create-keep-active |
| TL11 #591 | 只有 `inject-workflow-state.py` 有 stdin guard；session-start / subagent / shell 三个 hook 没有 | hook-stdin-guard |
| TL04 | `ci.yml` 只有 ubuntu-latest + Node 20 + Python 3.9 | windows-ci |
| TL12 #648 | `templates/trellis/gitignore.txt` 不含 `hooks.local.json` | hooks-local-gitignore |
| TL14 | `commands/` 下没有 doctor | doctor-command |
| TL33 #644 | 上游 PR 未合并 | hook-payload-replay |

需要修正的说法：

- TL01：fork 已经存在（`origin` = bahayonghang/Trellis，`dev` 比 upstream 多 3 个本地提交），只缺 `upstream` remote 和基线记录。
- TL02：`justfile` + `scripts/just-tasks.mjs` 已经解决本地安装；改包名/scope 只有在 npm 发布时才需要，暂缓。剩下的真实痛点是 `trellis upgrade` 会覆盖本地 shim → upgrade-linked-guard。
- TL03：本仓库已升级到 pnpm 12.18.0，不是文档里的 10.32.1。
- TL06：`codex.ts:44` 的 `extractCodexAgentModelKeys` 已经按 `\r?\n` 切分；#656 还剩哪些缺口要先复现再定，所以降为 P1。
- TL07：归档提交已经用显式 pathspec（#579），剩下的问题只是 stage 范围过宽。

## 任务地图与顺序

1. `fork-baseline`：所有子任务的前置。
2. P0 修复（彼此独立，可并行）：`init-hash-baseline`、`archive-commit-scope`、`hook-trellis-root`、`task-create-keep-active`、`hook-stdin-guard`。
3. `codex-subdir-hooks`：在 `hook-trellis-root` 之后。
4. `windows-ci`：在 `fork-baseline` 之后，越早越好，为后续修复提供回归保护。
5. P1：`codex-crlf-config`、`hooks-local-gitignore`（在 `init-hash-baseline` 之后，两者都改 init/update）、`upgrade-linked-guard`。
6. `hook-payload-replay`：在 `hook-trellis-root`、`codex-subdir-hooks`、`hook-stdin-guard` 之后。
7. `doctor-command`：最后做，复用前面的根目录与 hook 修复。

## 跨子任务约束

- 只改产品源：`packages/cli/src/templates/**`、`packages/cli/src/**`、`packages/core/src/**`；仓库根的 `.trellis/`、`.claude/`、`.codex/` 等 dogfood 镜像要同步修改，不能只改镜像。
- Python 代码保持 3.9 兼容（CI 有 py_compile 检查）。
- 有上游 PR 的项：先审查 PR diff，再选择性移植并保留归属（commit message 写 `Ported from mindfold-ai/Trellis#NNN`），不整体合入 #618 或 beta 分支。
- 每个子任务各自成 PR/提交，便于以后与上游同步时单独取舍。
- 不改动上游维护者的进行中任务（taosu / wumengye 名下）；`task-create-keep-active` 要先确认与 `08-05-session-identity-*`、`09-09-codex-session-fallback-isolation` 没有冲突。

## 跨子任务验收

- [ ] 所有子任务完成并归档。
- [ ] 在 `dev` 上 `pnpm lint && pnpm typecheck && pnpm build && pnpm test` 通过，新增失败与 `fork-baseline` 记录的基线已知失败可区分。
- [ ] Windows CI 与 Linux CI 均为绿色。
- [ ] 端到端冒烟（Windows，原生 PowerShell）：`trellis init` → 修改 workflow.md → 增加一个平台 → `trellis update --dry-run` 仍识别修改 → 建任务 A、再建 B 后 A 仍是当前任务 → 归档 A，其它已暂存内容不变 → 从 `src/` 子目录启动 Codex，hook 能注入上下文。

## Out of Scope（暂缓的文档项及原因）

- TL13 channel 权限档位、TL32 生命周期 hook 信任：仅在实际使用 channel 或打开不可信仓库时需要。
- TL15/TL16/TL40 任务级 workflow 与派发策略：先用一段时间再决定。
- TL17–TL19 可执行验收：已建独立任务 `verification-receipts`（P2，需 brainstorm）。
- TL20–TL25、TL38 OpenSpec 桥接：外部依赖重、收益未验证；首版完成并实际使用后再评估。
- TL26–TL31、TL34–TL37、TL39：持续完善类，按真实需求再开任务。
- TL02 包名/scope 改造与 npm 发布：只在决定公开发布时做。
