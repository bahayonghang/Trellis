# 修复本机 Windows 已知测试失败

## Goal

`FORK_BASELINE.md` 记录了 20 个 CLI 测试失败，它们导致 husky pre-commit（完整
`pnpm test`）在本机 Windows 上必然失败，任何正常提交都会被拦住。修复全部 20 个（以及之后发现的 3 个间歇性失败 R11–R13），
让提交正常通过 hook，并且不削弱测试本来要保护的内容。

## Requirements

- 产品缺陷修产品代码；只是测试本身假设了 POSIX 环境的，修测试。
- 不跳过测试；除非实测证明只是 I/O 负载问题，否则不加大超时（见 R10）。
- 修改的模板如果有内容相同的 dogfood 副本（`.claude/`、`.codex/`、`.cursor/`、`.opencode/`），同步更新。
- Python 保持 3.9 兼容。

| # | 失败 | 根因 | 修复位置 |
|---|---|---|---|
| R1 | env-file-dedup ×4 | `session-start.py` 用文本模式追加 `CLAUDE_ENV_FILE`，Windows 写出 CRLF；Git Bash `source` 后 `TRELLIS_CONTEXT_ID` 带 `\r` | 产品：固定写 LF |
| R2 | workflow-state 非 Trellis 目录 | `find_trellis_root` 把任意 `.trellis/` 当根（本机 `~/.trellis/` 只有 `spec-inject/`），随后 `import common` 崩溃 | 产品：只接受像 Trellis 项目的 `.trellis/` |
| R3 | OpenCode 目录条目 cap | `materializeDirectory` 用平台 `join` 生成展示路径，Windows 下变成 `refdir\a.md` | 产品：相对 jsonl 路径用 POSIX 拼接 |
| R4 | context-injection-limits ×7 | Python 文本模式 stdout 输出 CRLF，断言按 LF 比较 | 测试：探针输出统一换行 |
| R5 | strip-breadcrumb | 经 `cmd.exe` 传 `python -c` 时 `\n` 没有被反转义 | 测试：改用 argv 传参，不经 shell |
| R6 | upgrade ×2 | Windows 下 npm 经 `cmd.exe` 调用，`where trellis`；断言写死 POSIX | 测试：两个用例固定 `process.platform = linux` |
| R7 | python-rewrite-parity POSIX 用例 | Windows 默认解析为 `python`，用例假设默认是 POSIX | 测试：显式设置 `python3` |
| R8 | marketplace workflow 镜像 | `marketplace` 子模块按 `core.autocrlf` 检出为 CRLF | 测试：比较前统一换行（cross-platform guide Rule 2） |
| R9 | atomic-write 写失败 | Windows 上目录 `chmod 0o500` 不阻止创建文件 | 测试：用 spy 模拟 `renameSync` 失败 |
| R10 | platforms byte-for-byte | 单独运行耗时 5.8 s，整套并行时 11.7 s；同文件另有 15.1 s、9.9 s、8.8 s 的遍历全平台用例，其它文件也有 9.7 s 的 | 测试配置：Windows 上 `testTimeout` 设为 30 s，Linux 保持 10 s |
| R11 | core worker-inbox（间歇性） | 用 rename 覆盖 `.seq` 时，若其它进程（杀毒软件、索引服务）正打开该文件，Windows 返回 `EPERM`；本机实测约每 3000–6000 次替换出现 1 次，hook 跑第 3 次提交时撞上 | 产品：`writeSidecar` 在 win32 上对 EPERM/EACCES/EBUSY 短退避重试 |
| R12 | CLI channel-wait-warning（间歇性） | `scheduleSupervisorTimeoutWarning` 以 fire-and-forget 方式追加警告；测试看到警告行时，sidecar 可能仍在写入，teardown 的 `rmSync` 撞上新文件，报 `ENOTEMPTY` | 测试：teardown 的 `rmSync` 加 `maxRetries: 10, retryDelay: 20` |
| R13 | CLI ablate.integration #5（间歇性，**代码已修复，待 hook 连续验证**） | `utils/ablation-store.ts` 的目录 rename 覆盖与 R11 同类，Windows 偶发 `EPERM`；同类未改的还有 `ablation-store.ts:545,786,867`、`utils/atomic-write.ts:22`、Python `templates/trellis/scripts/common/io.py:146` 的 `os.replace` | 产品：抽一个同步版 rename 重试 helper（参考 core `seq.ts` 的 `renameReplacing()`）；Python 对 `PermissionError` 做同样的重试 |

## Acceptance Criteria

- [x] 本机 Windows：`pnpm test` 全部通过（core 与 CLI），没有新增 skip。
- [x] R1：Windows 上追加的 export 行以 LF 结尾；已有的用户内容保留。
- [x] R2：`.trellis/` 内没有 `workflow.md`、`config.yaml`、`scripts/` 中任何一个时不算根，继续向上查找；找不到时静默退出 0。正常项目的行为不变。
- [x] R3：OpenCode 注入的目录条目标题和截断提示使用 `/`。
- [x] `pnpm lint`、`pnpm typecheck`、`lint:py` 通过。
- [x] `FORK_BASELINE.md` 记录修复后的结果。
- [x] R13：上述替换点在 Windows 上对瞬时错误码重试，非 Windows 不变；有注入错误的单元测试；连续 3 次成功提交的完整 hook 测试没有 rename 类失败（4075da63、c582e302、764cddc0）。

## Out of Scope

- `hook-trellis-root` 中其余的根目录统一工作（嵌套 `.git`、`inject-subagent-context.py` 与 `inject-shell-session-context.py` 的各自实现）。
- Python hook 中同类的目录条目路径展示问题（`inject-subagent-context.py:385`，没有尾部 `/` 时 Windows 输出 `\`）：当前没有测试暴露，记录为后续项。
- Windows CI（`windows-ci` 任务）。

## 执行结果（2026-11-09）

- 本机 Windows 全量检查：typecheck、lint、`lint:py`、build 均通过；core 398 通过 / 2 跳过；CLI 1869 通过 / 35 跳过（与基线的 35 个跳过相同，没有新增）。
- R10 实际采用 Windows `testTimeout` 30 s（Linux 保持 10 s），原因见表中 R10 行。
- spec 更新：`guides/cross-platform-thinking-guide.md`（Script Execution Rule 7、Line Endings Rule 3）、`cli/unit-test/index.md`（Timeouts）、`cli/backend/platform-integration.md`（`find_trellis_root` 有效根规则）。
- R11：提交时 hook 中出现 core `worker-inbox` 间歇性 `EPERM`；本机用 3000 次 write+rename 循环复现到 1 次。已在 `seq.ts` 增加 `renameReplacing()` 和 3 个测试（Windows 重试、非 Windows 不重试、超过重试上限后放弃）。其余替换点（CLI `writeFileAtomic`、`ablation-store`、`update.ts`、Python `os.replace`）记录到 `windows-ci`。
- R12：第 4 次提交的 hook 中出现 `channel-wait-warning` teardown `ENOTEMPTY`。修复后该文件连续 5 次运行（每次 17 个测试）全部通过。
- R13（当时未完成）：docs 提交的 hook 中出现 `ablate.integration` #5 `EPERM`。本任务保持 in_progress，修完 R13 后再归档。

## R13 execution evidence (2026-11-10)

- Added CLI `utils/rename.ts:renameSyncWithRetry`, used by `writeFileAtomic`
  and all three `ablation-store.ts` rename sites (staging, mixed-file restore,
  directory restore). Windows-only `EPERM`/`EACCES`/`EBUSY`: one initial attempt
  plus 10 retries, `Atomics.wait` at 10, 20, …, 100 ms (550 ms total).
  Non-Windows and other errors still fail immediately with the original error.
- Python `write_text_atomic` retries only Windows `PermissionError` with the
  same budget. Existing bool / `BaseException` / fd ownership / cleanup
  behavior is unchanged. Verified the template/dogfood pair was byte-identical
  before editing and after mirroring. No core or `update.ts` changes.
- Mandatory red/green: injected failures first; 25 failed / 42 passed against
  unfixed product code. Green: 81 passed / 2 existing skips across rename,
  atomic-write, ablation-store, Python io and ablate integration. A probe fixture
  initially injected the backoff interrupt too early; corrected it and confirmed
  both corrected text/JSON probes fail against isolated HEAD Python source.
  Added 48 cases overall; no skips, Vitest retries or timeout changes.
- Independent check fixed newly discovered test isolation in shared
  `test/setup.ts`: scrub host `PI_SESSION_ID`, `PI_SESSIONID`, and
  `PI_SUBAGENT_PARENT_SESSION`. `evaluateExtension` copies host env into its
  VM, overriding no-session/no-parent fixtures. No Pi runtime/helper changes;
  explicit test env still works. Three new VM sentinel cases execute the
  real setup and preserve unrelated env. Red: 5 failed / 45 passed (three
  sentinels and two existing Pi tests); green: 50/50. Combined R13/Pi/setup
  focused run: 131 passed / 2 existing skips. Total new regression cases: 51.
- Validation: ordinary `pnpm lint`, `pnpm typecheck`, CLI `lint:py` (0 errors,
  68 warnings in untouched files), `pnpm build`, and `pnpm test` passed
  with Pi host env inherited (no env-unset workaround). Full Windows tests:
  core 401 passed / 2 skipped; CLI 1920 passed / 35 skipped. Baseline skip
  counts unchanged. `git diff --check` and all 28 Python twin byte comparisons
  passed.
- Both Python copies passed `ast.parse(..., feature_version=(3, 9))`.
  Runtime tests used Python 3.14.7; no Python 3.9 interpreter is installed.
- Spec contracts updated in filesystem-safety, script-conventions,
  commands-ablate and cross-platform guide. Sibling `commands/update.ts`
  migration renames (four sites) intentionally remain outside R13. The
  one-shot CLI `channel/store/paths.ts:migrateLegacyChannels` rename also
  remains unchanged: it retains the source and warns on failure.
- Independent review confirmed retry limits, original errors/data, caller
  cleanup, fd ownership and conflict checks. Ruff I001 (one excess blank
  after imports) and SIM105 (cleanup try/except/pass) also existed in HEAD;
  narrowly fixed in both Python twins using equivalent `suppress(OSError)`.
  Both files now pass I001/SIM105 and edit-time Python diagnostics. The
  unlink target remains the owned `mkstemp` file; production sleep is the
  intentional bounded backoff, not a test delay. Active `source=lsp` tooling
  is not exposed to this worker; main-session active LSP rescan remains.
- GitNexus `detect-changes --scope all`: HIGH, 10 affected processes;
  changed existing product functions are only the four pre-authorized ones.
  The new helper/tests were not in the starting index and were reviewed
  directly. `JSON_READ_INVALID` is a stale line-mapping hit after import
  movement, not a value change. Compare against `main`: CRITICAL, 19 flows,
  107 files including prior committed fork changes, not new R13 scope.
- Main-session final review completed. Active LSP probes for all 11 changed
  code/test paths were inconclusive (push-only/no server answer), not a clean
  verdict; project lint/typecheck, Ruff, and runtime tests provide validation.
  Session diagnostics retain only the owned-temp unlink path-traversal heuristic
  on the two Python twins; the target is the path returned by `mkstemp`.
- Three successful real pre-commit runs passed full core/CLI suites without
  rename failures: `4075da63` (Pi test isolation), `c582e302` (CLI retries),
  `764cddc0` (Python retries). A failed attempt before `c582e302` stopped at
  lint-staged's broken Scoop pnpm shim before tests; Node `spawnSync` confirmed
  that prepending the existing real `pnpm.exe` directory resolves it. No hooks
  were bypassed, no test environment keys were unset, no push/amend performed.
- GitNexus 1.6.12 CLI and index were configured with explicit user approval,
  using `npx` and `analyze --index-only`; no global install, project dependency,
  or instruction-file edits. Main refreshed the index and ran staged
  `detect-changes` before every commit. Its flow attribution over-expanded
  (even a test sentinel `PATH` mapped to unrelated flows); exact git diffs and
  direct call-site review bounded the actual edit scope instead of treating
  those graph results as proof of correctness. R13 is ready to archive.
