# 执行计划：已批准方案 A

- [x] 用户批准便携 Python 常量 bootstrap 与旧默认 hooks.json 镜像同步。
- [x] 用户接受 getHooksConfig 的 HIGH 范围；不扩事件、环境变量或依赖。
- [x] 配置 implement/check 上下文，保护路径 hash，task.py start。
- [x] 每个既有符号编辑前精确 upstream impact；范围外新的 HIGH/CRITICAL 先停下说明。索引 ID 异常时强制无解析缓存重建。
- [x] 实际生成命令的持久 RED：两事件、根/子目录/嵌套 Git/worktree/中文空格/非 Git/近根隔离；断言实际上下文。
- [x] 规范根源码 + 固定白名单分发的 Base64 常量；不读改 stdin、不切 cwd、不新增事件/环境变量/依赖，Python 3.9。
- [x] 纯 Codex command-only 迁移及窄 init/update 接入；保留用户条目、顺序、matcher、timeout、override 和有意删除；损坏/不确定形状手动冲突，force 不能整份覆盖。
- [x] dry-run/skip/备份/收据/幂等/卸载归属；只同步 .codex/hooks.json，保护三个既有差异脚本及其它配置。
- [x] GREEN：cmd raw_arg 与 PowerShell 命令边界，固定源码等价、命令长度/白名单、EOF/坏 JSON/延迟/未关闭输入。Git Bash 不是原生 Linux。
- [x] uv run --locked 下串行 lint/typecheck/lint:py/build/相关测试，真实 Python 3.9 compile、打包、构建后 init/update/no-op/uninstall；独立 review。
- [ ] 单独检查 staged detect-changes 结果后，再显式 pathspec Conventional Commit，记录 #667；不能把检测/提交串成不经检查的一批。
- [ ] 实际 Codex 0.167.0 宿主四种布局验收。只有 0.167.1 时不冒充通过；做不到就代码/自动化完成后停止、不归档，不启动前置未满足的 replay/doctor，不动 verification-receipts。

本轮指示覆盖旧计划“产品修改前必须真实/计费 RED”的顺序。不自动安装/降级
宿主，不修改信任、不用 bypass、不消费未确认额度。

范围补充：`commands/init.ts` 增加 Codex 专属的旧 hooks hash 保护接线。
仅当本次选择 Codex、存在旧记录且 hooks.json 实际未写入时保留该值；不
引入通用 preservePaths API，不保留未选择平台或新增用户配置归属。实际
写入迁移结果时按新内容记录 hash。独立集成覆盖这些分支。
