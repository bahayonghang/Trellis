# GitHub and local baseline — 2026-11-11

## Sources actually inspected

- PR https://github.com/bahayonghang/Trellis/pull/1 ：OPEN，title `ci: validate fork reliability v1 on Windows and Linux`，head `dev` at `9cc2f58e6c2103727dc0f448f9bef7f2920b638d`，base `main`。
- `gh run view <id> --json url,event,headSha,jobs`：三次 run 的所有 Checkout 步骤均为 failure，随后测试步骤 skipped。

| Run | Event / source head | Four failed Checkout job IDs |
| --- | --- | --- |
| https://github.com/bahayonghang/Trellis/actions/runs/43021979545 | push / 9b8df9a6aec07053bd9dc030e985036ed776c481 | 130527143273, 130527143577, 130527143621, 130527143649 |
| https://github.com/bahayonghang/Trellis/actions/runs/43022012893 | pull_request / 9b8df9a6aec07053bd9dc030e985036ed776c481 | 130527257177, 130527257507, 130527257553, 130527257659 |
| https://github.com/bahayonghang/Trellis/actions/runs/43023805660 | pull_request / 9cc2f58e6c2103727dc0f448f9bef7f2920b638d | 130533305831, 130533306260, 130533306309, 130533306310 |

最新 run 的 `gh run view 43023805660 --log-failed` 确认四个矩阵 job 均包含：

```text
fatal: remote error: upload-pack: not our ref 1aa9b326baf93257d6142660e49d3120e7f4b4ef
fatal: Fetched in submodule path 'marketplace', but it did not contain 1aa9b326baf93257d6142660e49d3120e7f4b4ef. Direct fetching of that commit failed.
```

上游 commit API `repos/mindfold-ai/marketplace/commits/1aa9b326baf93257d6142660e49d3120e7f4b4ef` 返回 HTTP 422 / No commit found。`repos/bahayonghang/marketplace` 返回 HTTP 404 / Not Found。

## Local state

- 当前仓库 `D:/Documents/Code/Agents/Trellis`；branch dev；起始工作树干净，HEAD `f5a79411`。
- `git ls-tree HEAD marketplace`：`160000 commit 1aa9b326baf93257d6142660e49d3120e7f4b4ef`；`git -C marketplace cat-file -t <sha>` 为 commit；子模块 status 空。
- `.gitmodules:3` docs-site 指向 `https://github.com/mindfold-ai/docs.git`；`:6` marketplace 指向 `https://github.com/mindfold-ai/marketplace.git`。
- `git fetch origin` 后 `git rev-list --left-right --count HEAD...origin/dev` 为 `8 0`，远端 dev 仍为 `9cc2f58e`。

现有未推送提交（最新在前）：

```text
f5a79411 chore: record verification receipts journal
91ddc078 chore(task): archive 11-09-verification-receipts
4963f82c feat(cli): add opt-in task verification receipts
b176526e chore: record journal
b65e0561 chore(task): archive 11-09-fork-reliability-v1
7994943a chore(task): archive 11-09-doctor-command
6c700c84 chore(task): archive 11-09-hook-payload-replay
2d4efc93 chore(task): archive 11-09-windows-ci
```

## Existing records and trigger caveat

已读取 `.trellis/tasks/archive/2026-11/11-09-windows-ci/{prd.md,research/ci-checkout-failure-20261111.md,research/local-closeout-20261111.md}`，以及已归档 fork-reliability-v1 的 `research/ci-publication-preflight-20261111.md`。

旧任务不是不存在，而是已归档；其最后边界是用户要求不再发布、仅本地验收。本轮原始请求明确提出个人 fork 和 dev 的发布修复，新任务承接该范围，不将旧归档改写为 hosted 成功。

`.github/workflows/ci.yml` 保留 Ubuntu/Windows × Node 18.17.0/26.7.0 和 `submodules: recursive`。push/PR 都设 paths，包含 CLI/core、marketplace gitlink 和 workflow，自身不包含 `.gitmodules`；没有 workflow_dispatch。单独 URL-only push 不能保证触发；当前本地待发布范围有 CLI 变更，但仍须以实际新 head 的 run 为准。

本轮创建规划文件时未进行远端写入、URL 修复或 CI rerun。后续结果必须写入新的 verification receipt，不能用此 baseline 代替验收。
