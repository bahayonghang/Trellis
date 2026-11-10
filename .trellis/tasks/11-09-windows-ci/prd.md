# 原生 Windows CI 矩阵

## Goal

为 fork 增加原生 Windows CI，让 CRLF、路径、PowerShell 和 Python 启动方式
相关的问题在 CI 中暴露，而不是在日常使用时才发现。（TL04）

## 现状

`.github/workflows/ci.yml` 只有一个 `ubuntu-latest` job（Node 20、Python 3.9、pnpm 12.18.0），
并且只在 `main` 的 push/PR 上触发。

## Requirements

- 增加 job 矩阵：`ubuntu-latest` 与 `windows-latest`；Node 版本取 `package.json` engines 的最低版本，以及本机实际使用的版本。macOS 暂不加。
- 触发分支包含 `dev`（fork 的工作分支）。
- Windows job 使用 `pwsh` 以及真实的 Python（不用 WSL）。
- 在 checkout 时保持 `core.autocrlf` 的 Windows 默认行为，至少有一个测试 fixture 覆盖 CRLF 输入。
- 增加一条 CLI 冒烟流程（Windows 与 Linux 都跑）：在路径含中文和空格的临时目录中执行 `init` → `task.py create/start` → `task.py validate` → `task.py archive` → `update --dry-run`。
- 基线中已知的 Windows 失败（见 `fork-baseline`）要么修复，要么显式 skip 并注明原因与 issue；不能通过放宽断言或加大超时来掩盖问题。

- 在 Windows CI 上确认“写临时文件再 rename 覆盖”类偶发失败（`EPERM`/`EACCES`/`EBUSY`、Python `PermissionError`）已经消失。修复本身在 `windows-test-failures` 的 R11（已完成）和 R13 中；规则见 `guides/cross-platform-thinking-guide.md` 第 6a 节。

## Acceptance Criteria

- [ ] 一个 PR 能触发 Linux 与 Windows 两个 job，并都为绿色。
- [ ] 冒烟流程在中文/空格路径下通过。
- [ ] 每个 skip 都列出原因；真实宿主（Claude Code / Codex）的冒烟测试不在 CI 范围内，并在文档中注明。

## Dependencies

`fork-baseline`。
