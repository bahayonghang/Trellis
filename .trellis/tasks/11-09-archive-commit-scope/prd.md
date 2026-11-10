# 归档提交只包含被移动的任务

## Goal

`task.py archive` 自动提交时，只 stage 和提交本次被归档的任务（源目录删除 +
目标目录新增 + 被修改的子任务 task.json），不能扫入 `archive/` 下其它任务的未提交变更。
（TL07，上游 PR #649，OPEN）

## 现状（已确认）

- `common/task_store.py` 的 `_auto_commit_archive` 已经用显式 pathspec 提交（#579），并能正确处理未跟踪的源目录（#629）。
- 但 `common/safe_commit.py:181-184` 的 `safe_archive_paths_to_add` 在传入 `task_name` 时仍把整个 `.trellis/tasks/archive` 加入 stage，于是其它已归档任务的脏改动也会进入 `chore(task): archive X` 提交。

## Requirements

- 审查上游 #649 并选择性移植。
- stage 路径精确到 `archive/<YYYY-MM>/<task_name>`（以实际移动后的目标路径为准）、源路径（用 `git rm --cached`），以及 `modified_children`。
- 用户在归档前已暂存的其它内容，以及工作区里未暂存的内容，都保持不变。
- 修改 `packages/cli/src/templates/trellis/scripts/common/` 下的产品源，并同步 `.trellis/scripts/common/` 镜像。

## Acceptance Criteria

- [x] 回归测试：`archive/` 下另一个已归档任务有未提交修改，同时源码中有已暂存文件 → 归档任务 X → 提交只包含 X 的路径；另一个任务的修改和已暂存的源码仍然保留在 index 和工作区中，状态不变。
- [x] 未跟踪任务归档后也能成功提交（不回退 #629）。
- [x] `session_auto_commit: false` 时行为不变。
- [x] Python 3.9 py_compile 通过。

## Dependencies

`fork-baseline`。

## Execution Results (2026-11-10)

Selective port of [mindfold-ai/Trellis#649](https://github.com/mindfold-ai/Trellis/pull/649)
by Huanyi Xie (`xiehuanyi`); no wholesale branch merge.

- Threaded the move's concrete `archive_dest` through `cmd_archive` and
  `_auto_commit_archive` into `safe_archive_paths_to_add`. Scoped staging now
  uses only that destination plus explicit modified children; source deletion,
  scoped commit pathspec, never-tracked source handling and disabled auto-commit
  logic are unchanged. Product and dogfood twins are byte-identical.
- Added `packages/cli/test/scripts/task-archive-scope.integration.test.ts`:
  seven real-Git scenarios, no mocks, skips, retries or new timeouts. Three
  staging-state cases (staged / unstaged / partially staged archived PRD) each
  also include staged plus unstaged source code and a dirty active sibling.
  Assertions compare unrelated HEAD blob IDs, index entries, working bytes and
  porcelain status exactly. Other cases cover never-tracked tasks, disabled
  auto-commit with child updates, committed child unlinking, and fail-closed /
  historical-month / legacy helper behavior.
- RED on unchanged product: **6 failed, 1 passed**; failures demonstrate the
  unrelated archived PRD entering the commit or the helper returning the whole
  archive root. The disabled-auto-commit scenario already passed.
- GREEN: new regression **7 passed**; combined with existing archive suite,
  **12 passed**, no skips.
- Required checks, all invoked through `uv run --locked` with the real pnpm
  executable directory prefixed to PATH: `pnpm lint`, `pnpm typecheck`,
  `pnpm --filter @mindfoldhq/trellis lint:py`, `pnpm build`, `pnpm test` passed.
  Python typecheck: **0 errors, 68 pre-existing warnings**. Full suite:
  **Core 401 passed / 2 existing skipped; CLI 1937 passed / 35 existing skipped**.
  Full typecheck/build/test output is temporarily available at
  `C:/Users/lyh/AppData/Local/Temp/pi-bash-419022f1446ada33.log`.
- Actual **CPython 3.9.25** compiled all **73 tracked Python files** using
  `py_compile(..., doraise=True)` with cache output in a temporary directory.
  A Node subprocess launched through the same uv/pnpm wrapper confirmed the
  new tests resolve `.venv/Scripts/python.exe` **3.9.25** on Windows.
- Whole-tree parity: **28 Python script twins byte-identical**;
  `diff -rq .trellis/scripts packages/cli/src/templates/trellis/scripts -x __pycache__`
  and `git diff --check` passed. Canonical safe-commit spec updated without
  changing the checkout Python environment section.
- `task.py validate` passed both curated manifests. It warns that
  `script-conventions.md` exceeds the 32768-byte injection limit; implement
  read the full file manually. The independent reviewer must also read the
  canonical Git-interaction section directly rather than rely on its truncated
  injected prefix.

Limitations / handoff: verified on Windows only; existing platform-dependent
skips and warnings remain unchanged. No implementation blocker found. No
repository commit, archive, push, environment installation or next-task edits
performed. Independent review, GitNexus `detect_changes`, commit attribution
(`Ported from mindfold-ai/Trellis#649`) and task archive remain with the main
session. Pre-existing task context/status/research edits were preserved.

## Independent Check Results (2026-11-10)

- Read the curated manifest, all referenced files (including the full canonical
  Git-interaction section), applicable backend/test indexes, safety and test
  guidelines. No remaining behavioral or requirement finding within this task:
  exact move destination, no scoped archive-root fallback, tracked-source
  deletions, never-tracked tasks, explicit children and opt-out are preserved.
- Compared Ruff output against `git show HEAD:<file>`: every reported diagnostic
  predates this port. Fixed only the requested blocking rules in both twins:
  redundant import spacing (`I001`), the placeholder-free `cmd_create` warning
  f-string (`F541`), and the nested archive condition (`SIM102`). The combined
  condition still short-circuits `--no-commit` and preserves failure reporting.
- Before the `cmd_create` cleanup, independently ran GitNexus upstream impact
  and context; also re-ran upstream impact for `cmd_archive`. Both impact
  results were **UNKNOWN**, zero resolved upstream edges, not proof of no
  callers. Confirmed `task.py:main` dictionary dispatch for both. Context names
  the create-to-output process; affected behavior remains task create/archive,
  with no signature or semantic change from these lint fixes.
- Post-fix focused archive suites: **12 passed, 0 skipped**. An additional
  temporary real-Git `archive --no-commit` probe verified the move succeeds,
  HEAD/full index and staged-plus-unstaged source remain identical, and a
  failing pre-commit hook is never invoked. No internal mocks or test changes.
- Re-ran all required checks through `uv run --locked` with the real pnpm PATH
  prefix: lint, TypeScript typecheck, Python typecheck, build and full tests
  **passed**. Core **401 passed / 2 existing skipped**; CLI **1937 passed /
  35 existing skipped**; basedpyright **0 errors / 68 existing unused-import
  warnings**, all outside the four changed Python files. Full check output:
  `C:/Users/lyh/AppData/Local/Temp/pi-bash-6b6ba3513ccdbd86.log`.
- CPython **3.9.25** `py_compile(..., doraise=True)` again passed all **73**
  tracked Python files using temporary cache output. Whole-tree **28** script
  pairs remain byte-identical; `diff -rq ... -x __pycache__`, manifest validation
  and `git diff --check` passed. The known context-injection size warning
  remains; the complete spec was read directly.
- Targeted Ruff `I001,F541,SIM102` passes across all four changed Python files;
  automatic post-edit diagnostics also reported Python clean. Full Ruff is
  **not clean**: the unchanged `cmd_create` best-effort activation guards retain
  three `BLE001` diagnostics per twin (each catches and reports its failure),
  and its two blank separator prints retain `FURB105`. These are baseline
  advisories, not archive-scope regressions; no blanket suppressions were added.
  Existing slug integer conversions are regex-bounded decimal components.
  Archive destination paths come from the mover after existing task containment
  checks, not a new caller-supplied path; no safety-policy expansion was made.

Reviewer changed only the four Python twins above and this PRD. No commit,
index staging, archive, push, installation or next-task changes. Main-session
live LSP re-probe and staged GitNexus `detect_changes` remain to be performed
before commit; this environment exposes no direct LSP diagnostic tool.

## Follow-up: Pi Precommit Flake Fix (2026-11-10)

The main session's attempted commit exposed an unrelated intermittent Pi test.
Read `research/pi-context-precommit-flake.md`: a real minimal-fixture phase
spawn exceeded 1500 ms (observed 1529 ms, status null / ETIMEDOUT), while its
separate overview succeeded. The original failed call was not instrumented;
the source of the Windows startup stall remains unknown. No #649 product
change was needed or made in this follow-up.

- Changed only `packages/cli/test/templates/pi.test.ts`, the narrow
  `unit-test/mock-strategies.md` convention, `FORK_BASELINE.md` and this PRD.
  The main session already ran upstream impacts for `evaluateExtension`,
  `loadExtensionInternals` and `createMinimalTrellisRoot`: UNKNOWN / no resolved
  edges, not proof of no callers. Re-read all local callers before changing
  those helpers; all seven original minimal-fixture consumer groups are covered,
  including root switches and the two real Node child/protocol tests.
- Registered only minimal fixture scripts, dispatching by the actual Python
  command, script path, cwd and supported argv, never the initial VM cwd.
  External `spawnSync` output is deterministic for these fixtures only.
  Real module loads, template logic, temporary filesystem, parser, caches and
  envelope construction remain live. Nonfixture programs/scripts/cwd/argv and
  optional native call forms pass through; `spawn` stays real. Fixture roots
  and registrations are cleaned after each test. Shared output constants also
  generate the runnable Python script.
- Deterministic RED, before the fixture fix: **2 failed / 47 passed**, no skips.
  One native-boundary injection throws, the other replays phase timeout after
  overview success; both still demand successful fixture envelopes. GREEN:
  **55 Pi passed**, including all original positive assertions and 8 new
  cases. The unchanged real fake-Pi tests assert child-produced args/cwd and
  serving-parent environment/protocol results; both passed in targeted/full runs.
- Exact-boundary tests pin platform Python, script path, both argv forms,
  changed root, session env overrides/inheritance, UTF-8, `timeout: 1500` and
  `windowsHide: true`. Paired success / status-null timeout / nonzero / thrown
  error tests exercise the real `runContextScript` and `workflowOverview`.
  A separate envelope test pins overview preservation, workflow omission and
  startup caching on timeout; nonfixture native forwarding is also asserted.
- Final focused run: **67 passed, 0 skipped** (Pi 55 + archive 12). Separate
  real-Python smoke extracted the actual test factory/constants with the TS
  parser and ran both fixture branches with **CPython 3.9.25** from
  `.venv/Scripts/python.exe`; output matched, with Windows newline normalization.
- All five required checks passed through `uv run --locked` and the supplied
  real-pnpm PATH prefix: lint, TypeScript typecheck, Python typecheck, build,
  full tests. Core **401 passed / 2 existing skipped**; CLI **1945 passed /
  35 existing skipped**; Python **0 errors / 68 existing warnings**. Full log:
  `C:/Users/lyh/AppData/Local/Temp/pi-bash-1cc3898af857ee60.log`.
  This final gate followed the added same-test positive envelope control and
  another focused 67/67 run; the earlier full gate also passed.
  Automatic post-edit TypeScript diagnostics reported clean. No retries,
  skipped regressions, increased deadlines, diagnostic preload or shell
  PI-environment scrubbing was introduced.
- `git diff --check` and Python twin parity passed. Index stage-entry digest
  remains **d6605e1c817dc5d7d274d1f5590171c9ad8156967131ce20c990ae79dc2b6f79**,
  identical to delegation start. Existing staged archive code, spec, tests and
  task/research artifacts were preserved. No stage/unstage, commit, archive,
  push, install, product extension or `.pi` edits.

Remaining risk / handoff: verified on Windows only. Real-runtime silent
omission and startup caching after a timeout remain unchanged and need a
separate product resilience/latency-policy decision; no scheduler/AV cause is
claimed. Independent review and any commit separation remain with main.

## Independent Pi Flake Check (2026-11-10)

- Reviewed only the unstaged Pi test repair and its three documentation files;
  read the research, complete curated context and original fixture consumers.
  No remaining behavioral finding in fixture registration, per-call root/argv
  dispatch, native passthrough, real Node child/protocol tests or paired
  success/failure coverage. No internal context builder is mocked, and no
  product extension, `.pi`, deadline, retry or skip policy was changed.
- Reproduced the introduced `TS2339` on `expectedEnv.TRELLIS_SUBAGENT_CHILD`
  using a strict TypeScript program that includes `test/templates/pi.test.ts`
  and its imports with the package's compiler options. Normal package `tsc`
  excludes tests. Fixed it with `NodeJS.ProcessEnv`, not a cast; the identical
  test-inclusive check then reported **0 diagnostics**. Formatted the complete
  test file with the existing Prettier configuration (including pre-existing
  indentation in the permission-forwarding describe block).
- Independently ran GitNexus upstream impact with `--include-tests` before
  helper edits/formatting. `evaluateExtension`: **LOW**, two direct callers
  (`loadExtensionInternals`, `loadMaxThinkingInternals`), no recorded processes.
  Both loaders, `createMinimalTrellisRoot` and `writeHeartbeat`: **LOW**, test
  file callers only. New `contextScriptResult` is not in the HEAD index
  (**UNKNOWN**); its local callers were read. No reindex was needed.
- Considered removing the literal VM dependency switch. Dynamic forwarding
  triggered the post-edit blocking dynamic-require safety rule; reverted that
  attempted simplification without suppression or
  indirection. Kept all declared dependencies real and documented the reason
  in the test. The optional Pi TUI load remains optional in the real template;
  no development dependency was added to silence its unlisted-dependency
  advisory. Complexity/fan-out reports are maintainability advisories (the
  foreign-session test's fan-out predates this repair), not type/test failures.
- Current-session verification through `uv run --locked` with the supplied real
  pnpm PATH prefix: focused suites **67 passed / 0 skipped**, `pnpm lint`,
  `pnpm typecheck`, strict test-inclusive typecheck, targeted Prettier check,
  whole-tree Python twin comparison and `git diff --check` all passed. The two
  real Node child tests ran within the Pi suite. Full build/Python checks/full
  suite and the Python fixture smoke above are prior implement-session evidence,
  not new reviewer runs; final reviewer code edits are type/comment/format-only.
  No direct live LSP tool is exposed here; main may re-probe its live LSP.
- Tooling deviation: the unforced `.gitnexus/run.cjs --help` unexpectedly used
  pnpm dlx and downloaded GitNexus/native dependencies to the external pnpm
  cache before returning. No repository dependency/lockfile changes or global
  install occurred. Subsequent impacts used the already-indexed cached npx
  executable directly; no further downloads, cleanup or reindex were attempted.
- Stage-entry digest is unchanged:
  **d6605e1c817dc5d7d274d1f5590171c9ad8156967131ce20c990ae79dc2b6f79**.
  Existing staged #649 work and untracked research were preserved. Reviewer
  changed only the Pi test, this PRD, the mock-strategy spec and fork-baseline
  documentation; no staging, commit, archive, push or next-task changes.

Handoff: no remaining blocking finding within this repair. Windows-only
verification and the unchanged real-runtime timeout/cache policy remain the
limits. Commit separation, live LSP and precommit GitNexus `detect_changes`
remain with the main session.
