# 下一对话续做 Prompt

继续完成 Trellis 个人 fork 可靠性首版剩余的三个子任务，以及最终父任务集成复核。请执行下面的工作，满足真实验收后逐个提交、归档。

仓库：`D:\Documents\Code\Agents\Trellis`，分支：`dev`。
交接基线：`1eba38f6 chore(task): record Node 18 verification and archive gates`。
生成本 prompt 前工作区干净；本 prompt 文件是随后新增、尚未提交的交接文档。开工先核对实际 HEAD、工作区和索引，不假定历史状态仍然成立。

## 范围和授权

- 父任务是 `.trellis/tasks/11-09-fork-reliability-v1`，仍为 planning，只承载需求、任务地图和集成复核，本身不写产品代码。
- 14 个首版子任务已有 11 个 completed 并归档。只继续下表三个 in_progress 子任务，不重做已归档工作。
- 沿用此前“不 push”的限制。上次提出的发布授权问题尚未得到答复，本 prompt 不构成 push 或创建 PR 的授权。
- `11-09-windows-ci` 的 PRD 要求一个 PR 实际触发双平台绿色 job。完成归档需要发布本地代码；先完成本地核对、确认可审查的提交范围，再一次性询问是否允许仅 push dev 到 origin，并在本 fork 内创建或复用面向 main 的 draft PR 运行 CI。不向 upstream 提 PR，不合并，不发布 npm，不 force push。只做获批的动作；没有授权则记录剩余门槛，不虚构 CI 或强行归档。
- 不用 `--no-verify`，不用 `git add -A`。暂存和提交始终使用显式 pathspec，保留无关暂存内容。每个子任务分别使用 Conventional Commit；归档通过 `task.py archive`，分别产生归档提交。
- 产品实现限于 `packages/cli/src/**`、其中的 `templates/**`、`packages/core/src/**`，以及已确认的根目录 dogfood 镜像。针对本轮 CI/测试问题，允许必要的 `.github/workflows/ci.yml` 和相关测试文件修改；不得借机扩大产品范围。
- Python 保持 3.9。命令优先加 `uv run --locked` 前缀，已有环境为 CPython 3.9.25，裸 Python 曾为 3.14，需重新核对。
- 修改任何已有函数、类、方法前先做 GitNexus upstream impact，报告调用者、流程和风险。新 HIGH/CRITICAL 范围先停下说明并取得许可；既有精确范围授权不需要重复询问，也不能扩展成任意符号修改授权。每次提交前运行并检查 staged `detect_changes`。
- 不改 `06-17-architecture-diagram`、`06-17-benchmark-showcase`、已归档任务、用户配置，或三个已有差异的镜像：`.claude/hooks/inject-subagent-context.py`、`.cursor/hooks/inject-subagent-context.py`、`.codex/hooks/inject-subagent-context.py`。
- `11-09-verification-receipts` 是独立 P2，本轮不要实现、不要 brainstorm。它要求首版完成并实际使用一段时间后再启动。完成本 prompt 的首版集成复核后即停止。

## 先读这些材料

1. 根目录 `AGENTS.md`、相关 Trellis skill 和 `.trellis/spec/` 索引，按当前 workflow 续接，不新建重复任务。
2. 父任务 `prd.md`。
3. 父任务 `research/november09-closeout-20261111.md`、`research/continuation-20261111-native.md`、`research/windows-integration-20261111.md`。
4. 三个剩余子任务各自的 `prd.md`、`implement.md`，doctor 另读 `design.md`，以及各自 research 中的实施、检查和风险记录。

材料中的“现状”可能描述修改前状态，以当前源码、提交和实际输出为准。旧记录中的未运行 Node18 和 Codex0.167.0 停止条件已被后续证据更新，不要重新当作当前缺口。

## 当前实现与剩余工作

| 顺序 | 子任务 | 已提交实现 | 真正剩余门槛 |
| --- | --- | --- | --- |
| 1 | `11-09-windows-ci` | `5cdbcba1` | 获准发布后，一个实际 PR 的 Windows/Linux CI 绿色结果；处理真实失败后验收归档 |
| 2 | `11-09-hook-payload-replay` | `d7cb0fc0` | 同一批代码的回放套件在 Windows/Linux CI 实际运行通过，再归档 |
| 3 | `11-09-doctor-command` | `e7583d64` | 同一批代码的 doctor 测试在 Windows/Linux CI 实际运行通过，再归档 |

三个任务的产品代码、本机实施和独立复核均已完成，不要重新设计或重写。一次只处理一个子任务；同一份包含三项代码的双平台 CI 结果可以分别作为证据，但要记录被测 SHA、run URL、job、结果及套件，不把不同源码版本的结果混用。

### 1. windows-ci

当前 `.github/workflows/ci.yml` 已实现：

- `ubuntu-latest` / `windows-latest`，Node `18.17.0` / `26.7.0`，push/PR 分支包含 dev。
- 构建使用 Node26.7；完整 lint、typecheck、Python typecheck、tests 在当前运行时行执行，因为 Vitest4 不支持 Node18；两个版本均冒烟真实构建 CLI。
- Windows 使用 pwsh、真实 Python3.9，保留默认 autocrlf。`packages/cli/test/ci-smoke.mjs` 覆盖中文/空格路径、CRLF、init、task create/start/validate/archive、update --dry-run。

本机两个 Node 版本的生命周期冒烟已通过，不能替代 CI。上次 GitHub 只读查询返回 `No commit found for the ref dev`，工作流没有 workflow_dispatch；下次重新核对远端状态。不要运行旧 main 的 workflow 后宣称本地提交已测，也不要用本地 Docker/WSL 结果代替 GitHub hosted CI。

获得发布授权后检查 origin 仍是 `https://github.com/bahayonghang/Trellis.git`，审查全部待发布提交，正常 push 指定 dev 分支，按授权创建或复用本 fork 的 PR。跟踪真实 run 和日志，确认两平台当前运行时行完成全检查、两版本行完成 CLI 冒烟；按实际矩阵解释条件跳过。

有失败先从真实日志定位，不先改超时或并发。基线 Windows 问题只能修复，或有真实平台限制和原因的显式 skip，不扩大既有 skip。相关 archived 修复无需重开。确需修改时走 impact、对应 spec、回归、检查、单独提交，再验证包含修复的 CI。

满足此任务所有 PRD 验收后，更新真实证据，再用：

```powershell
uv run --locked python .trellis/scripts/task.py archive 11-09-windows-ci
```

### 2. hook-payload-replay

先读 `research/verification-20261111.md` 和 `packages/cli/test/fixtures/hook-payloads/README.md`。实现已审查并选择性适配上游 #644，原提交保留 `Ported from mindfold-ai/Trellis#644`。

已有 7 份脱敏输入：5 份带来源版本的 Claude 录制样本、2 份本机 Codex0.167.1 原生输入。派生角色、路径和身份变体已标注来源。56 项回放、161 项相关回归通过；5 类临时脚本输出变异仍退出 0，但实际上下文断言会拒绝它们。

重点核对双平台 CI 确实运行该套件、断言 PRD/spec 等实际上下文，而非只检查退出码。只覆盖 Claude Code / Codex，不增加宿主、外部 Action 或依赖。回放通过不得写成真实宿主验收通过，实际捕获的 default 角色不得改写成原生 Trellis implement 捕获。

同一轮 CI 已覆盖此实现时复用真实结果，更新本子任务证据、核对全部 AC，然后单独归档：

```powershell
uv run --locked python .trellis/scripts/task.py archive 11-09-hook-payload-replay
```

### 3. doctor-command

先读 `research/verification-20261111.md`、`research/critical-scope-20261111.md`、`research/precommit-update-teardown-20261111.md`、`research/node18-smoke-20261111.md`。

已有只读 `trellis doctor [--json]`、严格 V1 Zod/JSON Schema、随包隔离 Python probe。复用 canonical root/session、registry/hash 逻辑；不运行用户 hook，不联网、不修复，不读取历史收据提升可信度。没有真实宿主时最高只能是 probed。保留 stdin 和用户配置。

本机证据已完成：

- doctor34 + platforms3，共 37 项独立复核；lint、typecheck、严格新测试 TS、Python3.9、构建、打包均通过。
- 真实 checkout 诊断前后 2762 条路径/字节及 58 条既有源码缓存不变。现有 `.opencode/package.json` 缺失导致 exit1 是正确诊断，未修复用户配置。
- Node18.17.0 专项已补齐，隔离运行时可用 `uv run --locked pnpm --allow-build=node dlx node@18.17.0 --version` 直接确认，无需再查找缓存。5 类真实构建 CLI 诊断、3 类严格 schema 拒绝控制均通过；每次完整 fixture/Git 字节不变，置信度最高 probed。
- 63 符号/18 条预期诊断读链的 CRITICAL 聚合曾停下并得到用户精确授权，随后正常完整提交已通过。不要把它当作新改动的 blanket approval。

只补真正缺失的双平台 CI 或修复其实际失败。通过后更新证据并单独归档：

```powershell
uv run --locked python .trellis/scripts/task.py archive 11-09-doctor-command
```

## 已有质量和宿主证据

- 最新完整 pre-commit 在 `1eba38f6` 通过：core401 PASS /2 既有 SKIP，CLI2239 PASS /35 既有 SKIP。Windows 的这些数量是历史实测，Linux 应记录实际数量，不强行要求相同 skip 数。
- root `pnpm lint`、`pnpm typecheck`、`pnpm build` 已串行通过。源码未变且没有新失败时，不为补记录重复无关测试。正常提交和归档的完整 pre-commit 仍必须执行。
- doctor 首次完整提交曾遇到既有 update case15a 的 10s afterEach 超时，原因未知；未改测试/超时/并发/skip，原样单例 1/1、整文件 55/55 和完整重试通过。不要把历史偶发超时当新失败的既定根因。
- 若提交只因 packages/core channel seq 并发锁超时失败，按原要求重试同一次提交，不放宽测试。其它失败先诊断，保留真实结果；不使用 --no-verify。
- Codex 子目录 hook 实现 `9a9e4b65`，已按真实 0.167.1 验收并在 `956cc7bc` 归档，不能重开。四布局上下文注入有原生 developer message 证据；其中一次最终回显中断，记录保留，不能写成四次完整回显通过。
- 父任务 `research/windows-integration-20261111.md` 的四步原生 Windows 集成全部通过，最后一次 src 启动真实 Codex0.167.1 用 6 秒完成精确上下文 marker 回显，零工具。结束后 680 项受保护条目及无关暂存哨兵不变。这是实际宿主证据，和回放分开记录。没有新的源码或特定回归时，不重复模型调用。
- 三个临时目录已由用户说明会在重启后自动清理，不再尝试删除，也不以它们是否存在作为任务阻塞；测试证据引用已提交的 research，不依赖 Temp 文件继续存在。

## GitNexus 和收尾

若源码改变需要刷新索引，使用：

```powershell
node .gitnexus/run.cjs analyze --index-only --force --no-parse-cache
node .gitnexus/run.cjs detect-changes --scope staged
```

不要用会改写 AGENTS/CLAUDE/skills 的默认 analyze。FTS 缺失曾导致 keyword query 空结果，可用精确 symbol/context/cypher 和源码查证，不能把不可查询说成没有影响；不为此安装运行库。提交前单独检查 detect_changes 输出，再执行提交。

三个子任务真实验收、分别归档后，再核对父任务跨子任务验收：全部 14 个子任务归档、dev 完整质量门、双平台绿色、已有原生 Windows 端到端证据对当前源码仍有效。源码变化影响旧证据时，只补受影响步骤；未测或失败项如实保留，不能勾成完成。

所有父任务 AC 真正满足后，保存最终集成记录，再用 `task.py archive 11-09-fork-reliability-v1` 单独归档；否则保持 planning，列出确切未满足项。父任务不启动产品实现。

最后记录 session journal，检查显式提交范围、工作区/索引、保护任务与镜像，报告本地提交、CI 被测 SHA 及 run 链接、各任务归档状态和实际未测项。已有授权内持续完成，不重新审批已批准设计，不把任务数量减少当作满足验收。到此停止，保留 verification-receipts 的后置条件。
