# 执行计划（等待启动设计审批）

- [x] 核对本机 Codex 0.167.0、对应官方 tag 源码、#667 与当前模板/镜像/更新接口；记录同形状平台清单。
- [x] 运行非计费的已有 Python 入口 RED 与固定常量的 shell 引号探针；明确它们不是实际宿主验收。
- [x] 持久化 PRD、推荐设计、范围/迁移/回滚及授权边界。
- [ ] 用户批准最新 design.md，明确接受便携常量 bootstrap 与已核对的旧默认渲染镜像同步。
- [ ] 配置真实 implement/check context；仅在审批后 task.py start。
- [ ] **代码前关卡：** 单独取得额度与正常 trust 授权，在 Codex 0.167.0 实际运行根/子目录 RED，记录次数、模型、提示词、cwd、事件输入与上下文证据；不得 bypass trust。未获授权则停止，不动产品。
- [ ] 读取完整适用 specs；强制刷新批准缓存的 GitNexus；每个既有符号编辑前 impact + caller 搜索，高风险先告知。
- [ ] 添加并运行实际生成命令的持久 RED；并加入 command-only JSON 迁移、用户条目/缺失条目/override/损坏配置/dry-run/skip/收据/卸载归属回归。
- [ ] 实现 Codex 范围的规范源码 bootstrap 生成与固定脚本分发；不读 stdin、不切 cwd、不新增事件/变量/依赖；验证 cmd raw_arg 与 PowerShell 的真实命令边界。
- [ ] 实现纯 Codex hook 升级计划与窄 update 接入，不更改其它文件分类；仅同步已批准的镜像基线，保留所有已有差异与用户配置。
- [ ] GREEN：两事件 × 根/子目录/嵌套 worktree/中文空格/非 Git/近根隔离；输入 EOF/未关闭/坏 JSON/延迟；只运行固定角色，不执行 payload。
- [ ] 检查固定代码与规范根源码一致、命令长度与可读路径归属、严格 test TypeScript、Python 3.9 compile 和镜像/保护 hash；active LSP 不可用时用直接验证且明确覆盖不足。
- [ ] 构建后的 init/update/no-op/hash/打包/uninstall 全链路验证；跑 uv run --locked 的 lint、typecheck、CLI lint:py、build、full test，串行避免 dist 清理与测试竞争。
- [ ] trellis-update-spec 与独立 review；补齐所有结果，再单独申请真实 GREEN 会话额度，覆盖 PRD 四种布局及实际任务上下文/原生子代理。
- [ ] 若真实宿主暴露不同约束，返回设计，不增加重试/超时或伪造验收。真实验收未完成不得归档。
- [ ] 最终 staged detect-changes 后本地 Conventional Commit，记录 #667；正常 scoped archive。无 push/amend/hook bypass。

当前无活动任务；本计划不代表实现或计费授权。不实施后续任务越过这个用户决策点。
