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

- [x] 回归测试：init（平台 A）→ 修改 `.trellis/workflow.md` 和 `.trellis/config.yaml` → init 增加平台 B → `update --dry-run` 把这两个文件报告为用户已修改 → `update` 不覆盖它们（生成 `.new` 或给出冲突提示）。
- [x] 新平台写入的文件被正确登记 hash。
- [x] 现有 `template-hash` 与 init 测试全部通过。
- [x] 模板与 dogfood 镜像不受影响（本改动只涉及 TS 源码）。

## Dependencies

`fork-baseline`。

## Acceptance Evidence (2026-11-10)

Selective port of [mindfold-ai/Trellis#653](https://github.com/mindfold-ai/Trellis/pull/653)
by Huanyi Xie (`xiehuanyi`), fixing upstream #620. Review and attribution:
`research/upstream-653.md`. No wholesale merge or cherry-pick.

Only product behavior changed: `initializeHashes` selects recorded, non-excluded
`.trellis/` paths in merge mode instead of walking untouched files. Fresh init,
platform/root tracking, exclusions, hash schema, and legacy root fallback remain
unchanged. GitNexus upstream impact: LOW, two direct product callers (`init`,
`handleReinit`), three affected symbols, one grouped process.

### Regression matrix

| Case | Coverage | Acceptance proof |
| --- | --- | --- |
| Baseline retention | Unit, three parameterized paths | Modified config/workflow/script keep original hashes and remain modified |
| Untracked workflow | Unit, omitted/empty recorded paths; init integration | A custom workflow is not adopted as a new baseline |
| Actual workflow writes | Unit | Written workflow/new script receive current hashes; exclusions and missing files stay out |
| Fresh initialization | Existing unit/init tests | Recursive `.trellis/` coverage remains intact |
| Add platform | Init integration: Cursor → DSH, no force/skipExisting | Old Cursor entries survive and all DSH template hashes match |
| #7b TL05 dry-run | Update integration: init → customize → add DSH → dry-run | All three paths report `?` / "Modified by you"; full byte snapshot unchanged; no prompt |
| #7b TL05 create-new | Update integration: same setup → createNew | Original UTF-8/CRLF bytes and hashes preserved; template `.new` copies written; no prompt |

Ten new test cases include the seven selectively ported upstream cases, an
omitted-`trackedPaths` sibling, and the two stronger update acceptance cases.

### Verification results

With the real pnpm executable directory first on PATH, followed by Scoop's pnpm
current directory (no tool installation, shell PI env removal, retries, timeout
changes, or added skips):

- RED before editing product code: `pnpm --filter @mindfoldhq/trellis test test/utils/template-hash.test.ts test/commands/init.integration.test.ts test/commands/update.integration.test.ts`
  → **9 failed / 151 passed**, 160 total, 3 failing files. Failures reproduce
  rebased hashes, adopted custom files, misleading auto-update reports, and
  overwritten originals even under `createNew`.
- GREEN after the minimal fix: same command → **160 passed**, 3 passing files.
- `pnpm lint` → passed.
- `pnpm typecheck` → passed.
- `pnpm --filter @mindfoldhq/trellis lint:py` → passed, **0 errors / 68 warnings**
  (unused imports in untouched Python re-export modules).
- `pnpm build` → passed.
- `pnpm test` → passed: core **401 passed / 2 existing skips** (21 files), CLI
  **1930 passed / 35 existing skips** (84 passing files / 1 existing skipped file).
- Built CLI smoke in a disposable temp directory, with real Python/CLI and no
  dependency mocks: `init --yes --cursor -u baseline-smoke` → customize workflow,
  config, script → `init --yes --dsh` → `update --dry-run` → `update --create-new`.
  Verified **47 DSH hashes**, all three original baselines, `?` reports, no dry-run
  byte or mtime changes, and three preserved originals plus three correct `.new`
  files. Temp fixture removed afterwards.
- `git diff --check` → passed. No template, dogfood script, instruction,
  dependency, or unrelated source changes. The updated migrations spec replaces
  the unsafe blanket walk exemption with the fresh/merge contract.

Scope caveat: this prevents future add-platform rebasing; it does not reconstruct
baselines that older runs already overwrote. Existing suite skips and Python
warnings are unchanged and were not suppressed.

Implementation remains uncommitted and unarchived for independent main-session
review and staged `detect_changes` verification.

## Independent Check-Agent Review (2026-11-10)

Review base: `5afda95829b216376d4e3b649c7e8ed1b2595479` (`dev`), including
all nine tracked dirty paths and the untracked upstream research file. No
`design.md` or `implement.md` is present; this is the PRD-only task described
above. Read both CLI layer indexes and their Quality Check guidance, migrations,
quality/filesystem safety, unit-test conventions/mocking/integration patterns,
and the update command contract. No nested agents were dispatched.

**Findings: none.** No product or test edits were needed. Traced both init
callers, the POSIX write recorder, merge/load/save behavior, update classification,
conflict application, and hash refresh. Fresh recursive coverage, existing and
absent workflow baselines, recorded workflow writes/exclusions, and old/new
platform receipts agree with the PRD. The regression fixtures create bootstrap
with `user: "alice"` and add DSH without `force` or `skipExisting`, so they reach
`handleReinit` rather than aborted-init recovery. Internal modules are not mocked.
The dry-run byte snapshot and create-new original/hash/template assertions
exercise the actual report and write paths, including UTF-8 and CRLF content.

Spec-sync assessment (`trellis-update-spec`): the seven-part scenario in
`migrations.md` accurately replaces the unsafe blanket walk exemption. It adds
the fresh/merge receipt contract in its canonical location without duplicating
the update orchestration spec. No additional spec change is needed.

### Commands independently run in this review

- Required three-file focused test command above: **160 passed**, 3 files,
  no skips or retries.
- `pnpm lint` and `pnpm typecheck`: **passed** (the latter also builds core).
  Used the prescribed real pnpm PATH prefix; did not remove PI environment
  variables, install tools, change timeouts, or add skips.
- Exact-source negative control: transpiled `git show HEAD:packages/cli/src/utils/template-hash.ts`
  and current source in memory, using existing built dependencies and real temp
  files. HEAD violated all five baseline/untracked invariants (config, workflow,
  script, omitted writes, empty writes); current source satisfied all five.
  New-platform receipts were correct in both. No source mutation or dependency
  mocks; every disposable fixture was removed. This independently confirms the
  regression sensitivity without reverting the shared worktree.
- `npx --yes gitnexus analyze --force --index-only`, then upstream impact:
  **LOW**, direct callers `init` / `handleReinit`, 3 impacted symbols, 1 grouped
  process. The analyzer warns that its process graph is truncated, so source
  tracing supplements graph results.
- `npx --yes gitnexus detect-changes --scope all`: **low**, 9 tracked files,
  4 expected symbols (`InitializeHashesOptions`, `initializeHashes`, and test
  snapshot/walk helpers). Untracked research was reviewed separately; final
  staged scope verification still belongs to the main session.
- `git diff --check`: **passed**. No template/dogfood/dependency/instruction or
  unrelated-source changes.

Earlier full-suite, CLI build, Python lint and built-binary smoke results above
are implementer evidence, not reruns by this reviewer. No code changed during
review, so a second full suite was not run. Historical overwritten baselines
remain unrecoverable by this preventive fix; cross-OS execution beyond this
Windows run and main-session/human sign-off remain outside this review.
Only this PRD review record was edited. No commit, archive, or push performed
by the check agent.

## Main-session completion

- Committed as `d6f4de29` (`fix(init): preserve template baselines when adding platforms`),
  including the required upstream attribution. Full pre-commit core/CLI tests passed.
- Staged GitNexus detection: LOW, only the expected interface, initializer, and
  new test snapshot/walk helpers. Actual source/tests were reviewed directly.
- Active LSP path probe: product file has no blocking finding; test warnings refer
  to unchanged older lines (execSync cast and UpdateOptions `yes` fixtures) outside
  this port, checked under inferred settings. Required project checks remain green.
- Ready to archive; no push/amend, no template or dogfood modification.
