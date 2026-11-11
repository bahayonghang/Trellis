# 原生 Windows CI 矩阵

## Goal

为 fork 增加原生 Windows CI，让 CRLF、路径、PowerShell 和 Python 启动方式
相关的问题在 CI 中暴露，而不是在日常使用时才发现。（TL04）

## 原始现状（实施前）

`.github/workflows/ci.yml` 只有一个 `ubuntu-latest` job（Node 20、Python 3.9、pnpm 12.18.0），
并且只在 `main` 的 push/PR 上触发。

## Requirements

- 增加 job 矩阵：`ubuntu-latest` 与 `windows-latest`；Node 版本取 `package.json` engines 的最低版本，以及本机实际使用的版本。macOS 暂不加。
- 触发分支包含 `dev`（fork 的工作分支）。
- Windows job 使用 `pwsh` 以及真实的 Python（不用 WSL）。
- 在 checkout 时保持 `core.autocrlf` 的 Windows 默认行为，至少有一个测试 fixture 覆盖 CRLF 输入。
- 增加一条 CLI 冒烟流程（Windows 与 Linux 都跑）：在路径含中文和空格的临时目录中执行 `init` → `task.py create/start` → `task.py validate` → `task.py archive` → `update --dry-run`。
- 基线中已知的 Windows 失败（见 `fork-baseline`）要么修复，要么显式 skip 并注明原因与 issue；不能通过放宽断言或加大超时来掩盖问题。

- 在本机 Windows 完整回归中覆盖“写临时文件再 rename 覆盖”类修复（`EPERM`/`EACCES`/`EBUSY`、Python `PermissionError`）。修复本身在 `windows-test-failures` 的 R11 和 R13 中；规则见 `guides/cross-platform-thinking-guide.md` 第 6a 节。本轮按用户最新要求仅做本地交付，远端 Windows CI 验收不再作为归档条件。

## Acceptance Criteria

- [x] 本地交付 Ubuntu/Windows 与 Node 18.17/26.7 矩阵及 dev 触发配置，并完成配置复核。远端绿色结果移出本轮本地验收，历史 checkout 失败保留。
- [x] 冒烟流程在中文/空格路径下通过（本机 Windows，Node 18.17/26.7，Python 3.9.25）。
- [x] 每个 skip 都列出原因；真实宿主（Claude Code / Codex）的冒烟测试不在 CI 范围内，并在文档中注明。

2026-11-11 用户明确改为“不用发布，保持本地”，按本地交付验收收尾。
原远端绿色要求由此移出本轮范围，不被改写成已通过。两个已发生的 PR CI
run 均在 checkout 因 marketplace 提交不可获取而失败，测试未运行；不再
创建 marketplace fork 或发布修复。证据见 `research/local-closeout-20261111.md`、
`research/ci-checkout-failure-20261111.md` 及原始 `research/verification.md`。

## Dependencies

`fork-baseline`。
