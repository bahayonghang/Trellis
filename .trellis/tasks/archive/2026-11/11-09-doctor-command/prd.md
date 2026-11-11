# 只读 trellis doctor 诊断命令

## Goal

新增 `trellis doctor`，只读地报告当前机器和项目中 Trellis 是否正确配置，并给出
可执行的修复建议。它应该把“配置存在”“probe 通过”“真实宿主实测通过”三种可信度
明确区分开。（TL14）

## 原始现状（实施前）

`packages/cli/src/commands/` 中没有 doctor；诊断逻辑分散在 init、update 和各个脚本中。

## Requirements

- 检查项（首版）：Node / Python 版本及 `{{PYTHON_CMD}}` 能否解析；已配置平台的 hook 注册（文件存在、命令路径可执行、相对路径风险）；Trellis 根目录解析（复用 `hook-trellis-root` 的规则）；模板漂移（复用 template-hash 的修改状态）；当前任务指针是否有效；`hooks.local.json` 是否被忽略。
- 每项结果分级为 ok / warn / error；可信度分为 `configured` / `probed` / `host-verified`。没有真实运行宿主时，最多报告 `probed`，不能声称 hook 已经生效。
- 支持 `--json` 输出，供 CI 或其它工具使用。
- 完全只读：不写文件，不修改 git，也不联网。
- 复用现有的 `project-detector`、configurator registry 和 template-hash，不新建平行实现。

## Acceptance Criteria

- [x] 测试：分别故意破坏 hook 命令路径、删除 `.trellis/workflow.md`、让任务指针指向不存在的目录，doctor 都能定位问题并给出修复步骤。
- [x] 运行前后工作区和 `.trellis/` 的文件状态完全一致（测试断言）。
- [x] `--json` 输出有 schema 测试。
- [x] 本机 Windows doctor 测试及 Node 18 专项通过，现有 Windows/Linux CI 矩阵包含该套件；远端执行按用户 2026-11-11 的仅本地要求移出本轮验收。

本机独立复核 doctor 34 项及 platforms 3 项，共 37 项通过；lint、
typecheck、新测试严格编译、Python 3.9、构建及打包检查通过。真实仓库
JSON 诊断前后 2,762 个路径/字节条目及 58 个既有缓存条目不变；命令
如实以 exit 1 报出现有 `.opencode/package.json` 缺失，未修复用户配置。
输出置信度最高为 probed，不读取历史收据冒充真实宿主验证。

Node 18.17.0 本机专项冒烟已补齐：真实构建入口与随包 schema 的五类
诊断场景、三类严格 schema 拒绝控制均通过；每次运行完整 fixture/Git
字节不变，置信度最高为 probed。使用隔离临时运行时，未改仓库依赖或
全局 Node。实际双平台 PR CI 因 marketplace 提交不可获取在 checkout 失败，
doctor 测试未在远端运行。用户随后要求“不用发布，保持本地”，本轮按
本地交付验收归档，不把本机通过写成远端或 Linux 通过。
详见 `research/node18-smoke-20261111.md` 及既有实施、独立检查记录。
当前范围和复用证据另见 `research/local-closeout-20261111.md`。

## Dependencies

`windows-ci`、`hook-trellis-root`、`codex-subdir-hooks`（建议）。属于复杂任务：`task.py start` 前需要 `design.md` + `implement.md`。
