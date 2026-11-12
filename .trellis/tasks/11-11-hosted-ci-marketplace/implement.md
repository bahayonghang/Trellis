# Implementation and verification

## Planning status

任务已根据当前 GitHub/本地证据收敛。用户于 2026-11-11 回复“批准”，授权按最终方案执行，包括正常推送 dev 的 8 个既有提交。开始实施和 hosted 验收。

## Steps

1. [ ] 激活任务，复核 HEAD/工作树/远端未变化；实现 agent 仅负责 `.gitmodules` 一行 URL，主会话协调远端发布和提交。
2. [ ] 复查 fork 是否存在；仅在不存在时执行：
   ```powershell
   gh repo fork mindfold-ai/marketplace --clone=false --remote=false
   git -C marketplace -c push.followTags=false push https://github.com/bahayonghang/marketplace.git 1aa9b326baf93257d6142660e49d3120e7f4b4ef:refs/heads/trellis-reliability-v1
   gh api repos/bahayonghang/marketplace/commits/1aa9b326baf93257d6142660e49d3120e7f4b4ef --jq .sha
   git ls-remote https://github.com/bahayonghang/marketplace.git refs/heads/trellis-reliability-v1
   ```
   推送命令即使 fork 已存在仍需执行或验证准确目标分支；非快进拒绝则停止该写操作并调查，禁止 force。
3. [ ] 在新的系统临时目录 `git init`，从明确 fork URL fetch 原 SHA；`git cat-file -t`/`rev-parse FETCH_HEAD` 验证。不得依赖本机 marketplace 对象库、alternates 或 `--reference`；保留命令结果及目录位置。
4. [ ] 修改 URL；检查 `git diff -- .gitmodules marketplace .github/workflows/ci.yml`、`git ls-tree HEAD marketplace`、`git -C marketplace status --porcelain`。gitlink 必须完全不变。
5. [ ] trellis-check agent 验证边界及证据；stage 精确文件，运行 GitNexus detect_changes 和 `git diff --cached --check`，正常提交（不跳过 hook）。无需为一行 URL 编写镜像实现的单元测试；真正回归控制是 fresh fetch 和 hosted recursive checkout。
6. [ ] 再核对待推送 commit 范围，用 `git -c push.followTags=false push origin dev:dev` 正常推送。
7. [ ] 查询 PR #1/dev 新 head 的 CI run，等待四个 Checkout 结束；读取每个 job 的步骤和日志，不以整个 run 的 failure 直接判定 checkout 失败。
8. [ ] 在本任务 `research/hosted-verification-20261111.md` 保存 API/fetch/commit/run/job/日志证据；给旧 windows-ci research 追加承接记录。后续步骤失败则给已归档 fork-reliability-v1 research 追加单独记录。
9. [ ] AC1–AC4 达成后更新任务状态及 journal，正常提交证据。归档前复核实际结果；不把后续测试全绿作为本任务 gate。

## Review controls

- 运行发生在新 `.gitmodules` 配置所在 head；旧 run rerun 不算验收。
- 四个矩阵 job 必须全部成功完成 Checkout，并有检出准确 gitlink 的正面日志。
- `docs-site`、marketplace 内容、workflow、测试和上游仓库均无本任务修改。
- 发布已有 8 个本地提交属于当前 dev push 的实际边界，必须在最终记录中披露。
