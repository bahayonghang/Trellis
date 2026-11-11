# 本地 checkout 安装时保护 trellis upgrade

## Goal

本机的 `trellis` / `tl` 由 `just install` 指向本 fork 的 checkout。此时运行
`trellis upgrade` 不应静默安装官方 npm 包覆盖 fork。（TL02 精简版）

## 现状（已确认）

- `commands/upgrade.ts:69-70` 执行 `npm install -g ${PACKAGE_NAME}@${tag}`，`PACKAGE_NAME` 来自 `packages/cli/package.json`（`@mindfoldhq/trellis`）。
- `justfile` 的注释已经说明这个陷阱：upgrade 之后需要重新运行 `just install`。
- 包名/scope 改造只有在 npm 发布 fork 时才需要，不在本任务范围内。

## Requirements

- `upgrade` 检测到当前 CLI 是从 git checkout 运行时（例如 `bin/trellis.js` 所在的包目录向上能找到 `.git`，且不在 npm 全局 `node_modules` 下），默认拒绝执行，并提示用 `git pull` + `just build`（或 `just install`）更新。
- 提供显式参数（例如 `--force-npm`）允许用户确认后仍然安装官方包。
- `--dry-run` 显示检测结果。
- 从 npm 全局安装运行时，行为完全不变。

## Acceptance Criteria

- [x] 单元测试覆盖：checkout 运行 → 拒绝并给出提示；npm 全局安装 → 正常执行；显式参数 → 继续安装。
- [x] 在本机 `just install` 之后实测 `trellis upgrade --dry-run` 的输出符合预期。
- [x] 不引入新的依赖。

执行证据见 `research/verification.md`；独立检查及真实 pre-commit 完成后再归档。

## Dependencies

`fork-baseline`。
