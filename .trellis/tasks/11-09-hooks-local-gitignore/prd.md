# hooks.local.json 默认被 gitignore

## Goal

`.trellis/hooks.local.json` 存放个人 hook 配置（例如 `scripts/hooks/linear_sync.py` 的 Linear token/team）。
它不应被意外提交。（TL12，上游 PR #648，OPEN）

## 现状（已确认）

- `templates/trellis/scripts/hooks/linear_sync.py:18` 的注释说明该文件是“Local config (gitignored)”，但 `templates/trellis/gitignore.txt` 中没有这条规则。

## Requirements

- 审查上游 #648 并选择性移植。
- init 和 update 都要确保 `.trellis/.gitignore` 包含 `hooks.local.json`；保留用户已有的注释、否定规则、BOM 和 CRLF 行尾。
- 多次运行时幂等，不重复追加。
- 如果 `.trellis/.gitignore` 是指向仓库外部的符号链接，不修改链接目标，给出提示。
- 如果 `hooks.local.json` 已经被 Git 跟踪，提示用户执行 `git rm --cached`，不自动修改 index。
- 与 `init-hash-baseline` 的 hash 处理协调：用户修改过的 `.gitignore` 不应被模板覆盖。

## Acceptance Criteria

- [ ] `git check-ignore .trellis/hooks.local.json` 在新 init 和旧项目 update 之后都命中。
- [ ] init/update 连续运行两次，`.gitignore` 内容不变。
- [ ] CRLF 和带 BOM 的 `.gitignore` 测试通过。

## Dependencies

`init-hash-baseline`。
