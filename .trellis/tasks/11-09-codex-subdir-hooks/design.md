# 设计提案：便携 Codex hook bootstrap

**状态：用户已批准方案 A 与旧默认 hooks.json 镜像同步。** 用户另行接受
getHooksConfig 的 HIGH 影响范围（17 个上游节点），允许按既定方案继续。
未完成真实 Codex 0.167.0 宿主验收。

## 根因与约束

0.167.0 的 hook runner 在 session/turn cwd 通过 shell 启动命令。原有相对脚本路径在子目录尚未进入 Python hook 就失败，不能靠 hook 内部的新根选择器补救。版本源码与非计费探针见 `research/host-0167.md`。

必须保留无 Git 工作区、嵌套 Git/worktree、中文空格路径、现有上下文选择与 stdin 边界。共享配置不能写入本机绝对路径，不能要求全局安装或虚构根变量。

## 候选方向

| 方向 | 优点 | 约束下的结论 |
| --- | --- | --- |
| Git 顶层 + 相对脚本（最短改动） | 命令短 | 非 Git、嵌套 Git 都违反刚完成的根规则，不推荐 |
| 自动项目根变量 | 零自定义 bootstrap | 未找到 project-hook 的受支持契约；PLUGIN_ROOT 仅插件可用，不采用假变量 |
| 初始化时写绝对路径 | 启动直接 | 违反共享配置约束；移动/克隆/worktree 会失效，不采用 |
| **Python 常量 bootstrap（推荐 A）** | 仅用既有 Python；复用规范根选择器；同一命令跨 shell | 命令较长，生成与迁移必须严格测试；用户要正常重批 hook 信任 |

## 推荐 A 的边界与数据流

```text
Codex 的 session cwd
  → hooks.json 的 Python 常量 bootstrap
  → 规范根选择器选择最近有效工作区
  → 该根下的固定 .codex/hooks/<script>.py
  → 原 hook 的有界 stdin 读取与上下文注入
```

- bootstrap 的代码只来自受版本管理的模板，不来自 hook payload、网络或环境代码字符串。
- 生成器复用 `trellis_hook_paths.py` 的规范源码，避免在第三处维护根谓词及权限错误规则。bootstrap 在找到根前只用标准库，不导入其它项目的 `common`。
- 固定代码用 UTF-8/Base64 常量封装，通过 Python `-c` 解码执行。Base64 只用于 cmd/PowerShell/POSIX 的一致引号处理，不是安全沙箱或加密；解码内容必须可在测试中核对为规范源码与固定分发段。
- 不读、消费、重写或转存 stdin。事件 JSON 留给原 hook；不重置其期限，也不新建输入线程。
- 分发参数仅允许现有两个自有脚本的完整相对路径，且在命令末尾保持可读，以延续卸载归属识别。不得把 payload 当作待执行代码或任意脚本名。
- 找到有效根后，只运行该根的目标入口；残缺近工作区缺入口时静默退出，不退到父工作区。保留 root task 已定义的部分安装隔离。
- 添加目标脚本目录到子进程 import path，使用同一 Python 进程运行目标入口，不切换 cwd。原 hook 仍依据自己的提示优先级处理上下文。
- 不新增事件、CLI 命令、环境变量、公共配置开关、外部服务或 Python 依赖。保留 `{{PYTHON_CMD}}` 与 `-X utf8` 的既有平台渲染。

固定 ASCII 常量已通过源码等价 cmd raw_arg、PowerShell 7、Windows Git Bash 的只读引号探针；完整 bootstrap 还未实现或验证。原生 Linux 验证仍归 CI，不能用 Git Bash 替代。

## 源与镜像

`templates/codex/index.ts` 生成启动命令，`templates/codex/hooks.json` 保留原事件/匹配器/超时配置，`configurators/codex.ts` 负责 Codex 范围的合并/迁移。

本地 `.codex/hooks.json` 匹配旧模板的 python3 渲染，而非 Windows python 渲染。此次审批若通过，允许针对这个已核对的旧默认渲染同步新配置；不据此改动三个已有差异的子代理 hook、其它配置、模型设置、`.pi`、marketplace 或本地 workflow。

预计涉及约 12 个源/测试/镜像/规范文件，**超过 8 个**：Codex 模板 index/hooks.json、Codex configurator、update 接入、模板/平台/update 测试、新 launcher 进程测试、卸载测试、dogfood hooks.json、平台与更新规范。不是通用平台启动器重构。

另需在 `init.ts` 接入一处窄收据保护：仅本次选择 Codex、已有 hooks.json
收据且该文件未被写入时保留原项。不为用户未跟踪配置创建归属，不保留未选择
平台的项，不修改全局 initializeHashes 或其它 force reinit 策略。

## 只迁移 Trellis 自有命令

- 设计一个无副作用的 Codex JSON 升级计划器，仅处理 `.codex/hooks.json`。
- 按事件、handler 及完整已知旧命令签名识别两个自有命令；不因包含相似 basename 就接管自定义 wrapper。
- 只替换已确认归属的 command 字段。用户 hook、未知事件、数组顺序、额外字段、timeout、matcher、自定义 Windows override 和有意移除的条目都保留。
- 已存在的自定义 command 不擅自重写，也不重复插入默认 handler。无法证明安全的形状、无效 JSON 或有冲突的 override 返回 manual 计划：原文件与收据不写；只显示冲突，或在用户选择 create-new 时生成候选副本。`--force` 也不能把这条窄保护变成全文件覆盖。
- update 在写入前使用同一纯计划，单独识别这一安全 command-only 迁移；不改变其它文件的 hash 分类。遵守 update.skip、dry-run 零写入、备份、用户删除及 hash 收据规则。
- init 与 update 复用相同生成器；首次安装只产生原来的两个事件。后续更新不得借模板生成器抹去用户条目。
- 不新增通用 migration action 类型，不做用户信任数据迁移。命令 hash 变化后正常 `/hooks` 重批属于用户操作。

## 验证与授权关卡

1. **按本轮用户指示，先完成代码与自动化测试。** 先做实际生成命令的持久离线 RED，再实现方案 A。本轮命令行实测为 0.167.1，历史 0.167.0 证据仍保留；不得替代指定的 0.167.0 真实宿主验收。环境做不到时，代码和自动化测试完成后停止、不归档，不操作信任记录。
2. 产品修改前加入持久离线 RED。使用实际生成命令和相同 cwd/input/执行 shell，覆盖两个事件、根/子目录、嵌套 Git/worktree、无 Git、近根隔离、中文空格、缺 helper/入口、空/坏/延迟/未关闭 stdin。
3. 固定代码解码与规范根源码逐字节一致；参数白名单、命令长度低于 Windows cmd 限制、无绝对路径/假环境变量、无 stdin 预读。
4. Windows 必测 Codex 等价 cmd raw_arg 与 PowerShell；显式 Git Bash 只作为 shell 检查，native POSIX 由 CI验证。
5. 用真实 init → 用户自定义 hooks → update dry-run/写入 → 再次 no-op → uninstall dry-run/安全拒绝验证命令迁移、收据及归属。损坏/不确定配置不能被静默覆盖。
6. 质量门和独立 review 通过后，单列真实宿主四种路径及实际任务上下文验收。指定版本或正常信任不可用时，按用户指示停止，不把探针或回放写成通过。

## 风险与回滚

最脆弱假设是 hook 进程 cwd 位于某个 Trellis 工作区内部；0.167.0 源码支持本任务的根/子目录情形。工作区外没有可选根时静默退出，不借绝对路径或全局变量强行跨目录。

编码命令不便直接人工阅读，生成器与解码对照测试是审计入口。若用户不接受这种编码，应调整设计，而非默认为批准。命令长度与真实三种 shell 是合入门槛。

部署与回滚都需正常重批信任；不自动操作信任记录。将生成器、配置、迁移及测试作为一个改动单元回滚，不删除用户 hook 或会话数据。保持 #591/#650 独立提交可追溯。任何 push、全局安装、发布或计费会话仍须单独授权。
