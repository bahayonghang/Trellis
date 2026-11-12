# Design

## Boundary and mechanism

Checkout 读取主仓库提交内的 `.gitmodules` URL 和 gitlink。失败发生在任何测试之前；本机对象缓存不能代替 GitHub runner 从指定远端取得对象。将原 commit 发布到个人 fork 的命名分支，再仅替换 URL，保留输入内容和 recursive checkout 行为。

主仓库唯一产品配置改动是 `.gitmodules:6`。任务文件、验收 research 和必要的旧任务承接记录属于过程证据。没有函数、类或方法修改，符号 impact 不适用；提交前仍必须运行 GitNexus detect_changes 并检查 staged 文件及 gitlink。

## Publication and trigger contract

2026-11-11 fetch 后本地 `dev` 为 `f5a79411`，较 `origin/dev` 领先 8 个提交、落后 0 个。正常推送当前 dev 会同时发布这 8 个既有提交，含 verification receipts 功能，不能声称远端只收到一行 URL。完整列表在 baseline research；本任务不重写或重排历史。

`.github/workflows/ci.yml:6-14,17-25` 的路径过滤不含 `.gitmodules`。本次待推送历史包含 CLI 源码，PR 的累计 diff 也包含已有矩阵修改，应观察实际新 head 的 run，不能凭 push 成功认定触发。保持 workflow 不变；不得通过 rerun 旧 SHA 冒充修复后输入。如没有新 head run，先记录触发事实并评估，不临时修改 workflow 或发布空提交。

## Evidence and compatibility

先用 commit API、命名分支和独立空 Git 对象库获取验证远端分发，再观察 hosted runner。API 可读是必要条件，四个实际 runner 成功才完成 hosted 验收。PR checkout 可能使用 synthetic merge commit，分别记录源 head 和实际 checkout SHA。

后续 setup/install/typecheck/test 失败仅描述真实失败步骤和日志，不扩展修复。原 windows-ci/fork-reliability-v1 的 archived 状态保持不变；追加 research 说明新证据来源，不修改历史验收事实。

## Risks and rollback

- fork 创建和 branch push 是有意的公开分发操作；只推原 SHA 到个人仓库的指定分支，禁用 followTags，不向 upstream 推送。
- 正常 git push 若因远端前进被拒，先获取并检查差异，不强推、不擅自改历史。
- 原 URL 恢复会重新引入已知 checkout 故障；如需回滚，用正常 revert，不删除新 fork/分支，也不重写远端历史。
- 提交 hook 或 hosted 测试可能揭示独立问题；保留失败证据，不放宽检查以伪造完成。
