# 修复 hosted CI marketplace 子模块不可达

## Goal

恢复 fork 的 hosted CI 输入分发，让 PR #1 或 dev 的 Ubuntu/Windows × Node 18.17.0/26.7.0 四个 job 完成 recursive Checkout。测试是否全绿不作为本任务成功条件。

## Background

- GitHub PR #1：https://github.com/bahayonghang/Trellis/pull/1 ，head `dev`、base `main`，当前远端 head `9cc2f58e6c2103727dc0f448f9bef7f2920b638d`。
- 三次失败 run 的十二个 job 均在 Checkout 失败，后续测试未运行；最新四个 job 的日志均报告 marketplace `not our ref 1aa9b326baf93257d6142660e49d3120e7f4b4ef`。逐项证据见 `research/github-baseline-20261111.md`。
- `.gitmodules:6` 指向 `mindfold-ai/marketplace`；该 commit 的上游 API 返回 422。本地拥有原始对象且 marketplace 工作树干净；个人 fork API 当前返回 404。
- 原任务存在于 `.trellis/tasks/archive/2026-11/11-09-windows-ci/`。它按当时用户要求以仅本地交付归档，不能作为 hosted 验收已通过的证据。本任务独立承接远端分发修复，不重开或改写旧任务结论。

## Requirements

- R1：必要时创建 `bahayonghang/marketplace` fork，仅向其 `trellis-reliability-v1` 分支发布现有完整 SHA `1aa9b326baf93257d6142660e49d3120e7f4b4ef`；对象内容不得改变，不写 mindfold-ai 上游。
- R2：Trellis 配置修改限于 `.gitmodules` 的 marketplace URL，改为 `https://github.com/bahayonghang/marketplace.git`。marketplace gitlink 和工作树内容保持不变，docs-site URL 不变。
- R3：正常提交并推送当前 `dev`，不 force-push，不改 CI 的 recursive checkout、矩阵、测试、skip 或断言。明确记录现有待发布历史范围；运行正常提交检查。
- R4：保留实际新 run URL、源 head SHA、PR merge SHA（适用时）、四个 job URL/ID、Checkout 步骤与日志证据。后续失败单独分类，不把跳过的测试记为通过。

## Acceptance Criteria

- [x] AC1：`gh api repos/bahayonghang/marketplace/commits/1aa9b326baf93257d6142660e49d3120e7f4b4ef` 成功并返回准确 SHA；全新对象库可从该 fork 获取准确 commit。
- [ ] AC2：提交中的 marketplace gitlink 仍是原 SHA；产品配置 diff 仅一行 URL，marketplace 工作树未修改。
- [ ] AC3：最新 PR #1 或 dev 的 CI run 四个矩阵 job 均完成 Checkout 且该步骤为 success；各 job 日志不再包含上述 not-our-ref 错误，并有成功检出原 SHA 的正面证据。
- [ ] AC4：新任务 research 保存完整验收记录，并向旧 windows-ci research 添加承接记录；若出现后续失败，向已归档 fork-reliability-v1 的 research 追加事实记录，不混入本次产品修复。

## Out of Scope

不回退 gitlink，不修改 marketplace 内容，不取消 submodules，不改 mindfold-ai 上游，不合并 PR，不发布 npm，不顺手修复 fork-reliability v1 全量测试，不添加无关工作流或产品功能。
