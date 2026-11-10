# 建立 fork 基线与 upstream 追溯

## Goal

让 fork 的每个改动都能追溯到确定的上游基线，并保存一份未改动代码在本机
（Windows）上的构建/测试结果，后续回归才能与既有失败区分开。（TL01 + TL03）

## 现状

- `origin` = `https://github.com/bahayonghang/Trellis.git`，没有 `upstream` remote。
- `dev` = upstream `f089cb32` + 3 个本地提交（ignore ref/、pnpm 12.18.0、justfile）。
- 本机尚未跑过完整测试基线。

## Requirements

- 添加 `upstream` = `https://github.com/mindfold-ai/Trellis.git` 并 fetch；确认 upstream/main 是否仍为 `f089cb32`。如果上游有新提交，只列出差异，不自动 rebase/merge。
- 新增 `FORK_BASELINE.md`（仓库根目录）：上游 SHA、子模块指针（docs-site、marketplace）、本地提交列表、Node/Python/pnpm 版本、操作系统、分支策略（`main` 跟随上游，`dev` 和 `feature/*` 承载个人改动）。
- 在 `dev` 上运行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm --filter @mindfoldhq/trellis lint:py`、`pnpm lint`、`pnpm build`、`pnpm test`，结果写入 `FORK_BASELINE.md`：通过/失败/跳过数量，每个失败的测试名和一句原因归类（Windows 相关 / 环境相关 / 真实缺陷）。
- 用 `just install` 验证打包后的本地 CLI 可以运行（`trellis --version`）。

## Acceptance Criteria

- [x] `git remote -v` 显示 origin 与 upstream。
- [x] `FORK_BASELINE.md` 记录了基线 SHA、环境和完整测试结果；在全新 clone 中按文档能定位同一基线。
- [x] 已知失败列表可用于判断后续 PR 是否引入新回归。
- [x] 本任务不修复任何测试失败（只记录）。

## 执行结果（2026-11-09）

- `upstream` 已添加；upstream/main 仍为 `f089cb32`，`dev` 领先 3 个提交、不落后，本地 `main` 也停在 `f089cb32`。
- 构建/lint/typecheck 全部通过；core 测试全过；CLI 测试 20 个失败，已在 `FORK_BASELINE.md` 中逐条归类。
- 计划外发现：pnpm 12.18.0 下 `pnpm install --frozen-lockfile` 失败（`ERR_PNPM_IGNORED_BUILDS`，esbuild），原因是本地提交 `7d2d8742`。本任务只记录，修复方式待决定。
- 计划外发现：本机 `~/.trellis/` 会让 hook 误判根目录，已补充到 `hook-trellis-root` 的 PRD 中。
