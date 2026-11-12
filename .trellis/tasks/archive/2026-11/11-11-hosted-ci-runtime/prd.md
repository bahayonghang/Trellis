# 修复 hosted CI 后续失败并验证自用源码安装

## Goal

让当前 fork 的原生 Windows/Linux CI 完成既定兼容性验证，并确认本机通过现有源码启动器使用修复后的 Trellis。主要自用，不进行 npm 发布。

## Confirmed background

- 最新 PR run https://github.com/bahayonghang/Trellis/actions/runs/43141109344 ，source `09c34d30d7afe1faeebe7692fd6a782e595ebf46`。四个 Checkout 全部成功，marketplace 分发修复没有回归。
- Ubuntu 两行失败于 Python3.9 setup：实际 ubuntu-latest 已为26.04，官方分发清单的3.9.25支持22.04/24.04而非26.04。
- Windows Node26 core 测试触发 libuv fs-event.c:72 断言。独立探针复现8.3短路径崩溃；同目录长路径、短路径经 native realpath 规范化均成功。
- core 与 CLI 的活动 watchEvents 都将未经规范化的目录交给 fs.watch。二者都属于本次相同缺陷的修复范围；不借机合并模块。
- 本机 trellis.ps1 已指向本仓库 packages/cli/bin/trellis.js，运行版本0.6.17；无需重装启动器。

## Requirements

- R1：保留 Python3.9 最低版本验证，将 Linux runner 固定为官方清单支持的 Ubuntu24.04；保留 Windows、Node18.17/26.7覆盖。
- R2：两处 watchEvents 在进入原生 fs.watch 前使用一致的真实目录路径，避免8.3短路径引起进程级断言；保持原 API、过滤、UTF8增量读取、200ms轮询、abort/return 清理和现有错误 fallback。
- R3：加入真实回归保护，未修复版本必须失败，修复后通过；不靠禁用 watch、换掉Node26、跳过测试、放宽断言或增大超时转绿。
- R4：构建最新 core/CLI 并验证现有 trellis/tl 启动链路，在临时项目验证核心生命周期；不覆盖真实用户项目配置或重写已有全局启动器。
- R5：正常提交、推送 dev，并获取修复后真实 hosted 矩阵结果；出现新失败先分类诊断，明确范围，禁止无限扩展修复或重复 rerun 冒充修复。
- R6：首次修复后 run43146333078 已越过 Python setup/native watcher 阻塞，后续失败被分类为本任务全矩阵验收的直接阻塞：仅修复 Codex/Copilot 已选中工作区的 UTF8 JSON stdout（保留普通 UTF8原始输出字节和协议）、symlink 源码导入探针的支持模块路径、Windows物理路径等价断言和 OMP夹具临时目录选择。不修改通用脚本的全局编码策略、不扩大 hook 权限或 containment边界。

## Acceptance

- [x] AC1：两条 Linux job 均成功安装 Python3.9并继续运行后续检查。
- [x] AC2：core/CLI watch 的8.3路径回归 red/green 实际执行；普通路径、事件过滤、UTF8边界和终止/清理相关回归通过。
- [x] AC3：修复后的新 hosted run 四个 job 全部成功；Node26 两行执行现有全套检查，Node18 两行完成现有build/runtime smoke。原有条件跳过单独记录。
- [x] AC4：本机源码构建和启动器版本/帮助命令、临时项目生命周期冒烟通过，不发布 npm。
- [x] AC5：research 记录根因、影响范围、提交、run/job链接与实际结果，任务正确收尾。

## Out of scope

不发布 npm，不改个人/上游 marketplace 内容或 gitlink，不改 CLI 默认 marketplace 源，不动全局 Node/用户配置，不删已有 Temp 夹具，不改 channel 公共 API，不做 supervisor 重构。新独立缺陷须先举证并说明是否属于本任务直接阻塞项；R6 已根据实际 hosted 日志完成分类，目标和验收约束不变。
