# 计划提交被 R13 测试隔离问题阻断

## 状态

尝试提交 `chore(task): plan portable Codex hook launchers` 被真实 pre-commit 拒绝，**未创建提交**。没有重试提交、绕过 hook、修改产品、增加预算或放宽断言。

已提交且归档的最近实现仍为 `2248f9ad` / `069d1400`（根目录），之前 stdin 为 `9d0c72f7` / `2db66eab`。Codex 任务保持 planning、无活动任务、无真实/计费会话。

## 原始失败

日志：`C:/Users/lyh/AppData/Local/Temp/trellis-codex-plan-commit.log`，1668–1698 行。

- core：401 passed / 2 existing skipped。
- CLI：2033 passed / 1 failed / 35 existing skipped。
- 唯一失败：`test/utils/atomic-write.test.ts` → `writeFileAtomic Windows rename recovery (R13)` → `retries EBUSY on Windows without rewriting or leaking the temp file`。
- 43 行：`expected renameSync to be called 3 times, but got 5 times`。
- 紧邻未到达的断言还要求 waits 精确等于 `[10, 20]`。

## 已定位的测试/系统调用耦合

`atomic-write.test.ts:25–44` 注入两次固定错误后，将成功分支转交真正的 `fs.renameSync.bind(fs)`，同时把 `Atomics.wait` 变成不等待的 mock。这使“成功必须恰好发生在第三次调用”的单元断言取决于真实 Windows 文件系统绝不出现任何额外瞬时错误。

`src/utils/atomic-write.ts:writeFileAtomic` 同步调用唯一的 `renameSyncWithRetry`。后者只有在 win32 的 EPERM/EACCES/EBUSY 时才继续循环。原测试的函数调用已正常返回但 spy 为 5 次；在这条同步路径中，受控两次错误后的真实调用又经历了可重试错误。测试没有记录那些原生异常的具体 code 或持锁者，不能指认杀毒软件等具体进程。

该测试假设与已经实测的 Windows 条件矛盾；跨平台指南 6a 记录了原生 rename 的瞬时失败。产品允许最多 11 次尝试，不能把合法恢复误判为必须恰好 3 次。也不能简单放宽断言后宣称单元测试已确定：最终重试成功用例耗尽十次注入预算后仍转交真实 rename，同样存在耦合。

兄弟盘点：

- 同文件 `allows success on the final retry...`：第 11 次转交真实 rename，原生瞬时错误可能令它意外失败。
- `test/utils/ablation-store.test.ts:152–170`：转交真实 rename，同时要求 attempts=3、waits=[10,20]，同形状风险。
- 该文件 197–217 的错误/清理场景也让其它 rename 使用真实 FS，却对全局 wait 次数做精确断言，需区分受控发布点和其它系统调用。

## 建议的独立小修

只处理测试边界：精确次数/退避序列的单测使用确定的系统调用结果；真实 FS 的数据、原子发布与临时文件清理保留独立集成断言。不得调整生产重试次数/等待、引入 Vitest retry/skip、增加 timeout 或忽略失败。应先补确定失败控制，再修、独立检查，按原 Prompt 要求补记 FORK_BASELINE。

这超出尚未获启动设计审批的 Codex 任务，原 R13 子任务已归档，且 task.py 无 reopen 命令。不得为绕过工作流直接启用 Codex 任务、篡改归档状态或挪用其它维护者任务。停下请求用户同意一个轻量补修任务；Codex 启动设计之后再审批。

## 保留的工作区

失败提交原样留下五个已暂存的计划文档：Codex 任务的 prd/design/implement/research-host，以及父任务的后续清单。本文是额外未暂存诊断记录。没有产品或用户配置变更，未清除或混合这些暂存改动。

后续必须保留这些文档，补修不能把它们误装进测试提交。没有运行 journal 自动提交来再次触发同一未知 gate；修复通过后再完成计划文档与 journal 的正常提交。
