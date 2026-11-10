# 增加平台时保护模板 hash 基线

## Goal

用 `trellis init` 为已有项目增加平台时，不能把用户已修改的
workflow/config/script 重新登记为“未修改的模板”，否则之后 `trellis update`
会把用户内容当成模板静默覆盖。（TL05，上游 PR #653，OPEN）

## 现状（已确认）

- `commands/init.ts:909` 在加平台的重新初始化路径中调用 `initializeHashes(cwd, { trackedPaths: reinitWritten, merge: true })`。
- `utils/template-hash.ts:386` 无论是否 merge，都会 `collectFiles(cwd, ".trellis")` 并用磁盘当前内容覆盖 `.trellis/` 下所有 hash，因此用户修改过的 `workflow.md` / `config.yaml` / scripts 会被重新登记为基线。

## Requirements

- 审查上游 #653 的 diff，选择性移植；保留归属说明。
- merge 模式下只更新本次实际写入文件的 hash；未写入的 `.trellis/` 文件保留原有 hash。
- 全新 init（非 merge）的行为保持不变。
- `update --dry-run` 的报告必须与实际执行一致。

## Acceptance Criteria

- [ ] 回归测试：init（平台 A）→ 修改 `.trellis/workflow.md` 和 `.trellis/config.yaml` → init 增加平台 B → `update --dry-run` 把这两个文件报告为用户已修改 → `update` 不覆盖它们（生成 `.new` 或给出冲突提示）。
- [ ] 新平台写入的文件被正确登记 hash。
- [ ] 现有 `template-hash` 与 init 测试全部通过。
- [ ] 模板与 dogfood 镜像不受影响（本改动只涉及 TS 源码）。

## Dependencies

`fork-baseline`。
