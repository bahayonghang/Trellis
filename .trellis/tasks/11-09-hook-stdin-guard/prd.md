# 所有 hook 有界读取 stdin

## Goal

宿主不关闭 stdin 时，任何 Trellis hook 都不能一直挂到 EOF；同时不能因为超时过短
而丢掉有效的 JSON 输入。（TL11，上游 PR #591，OPEN）

## 现状（已确认）

- 只有 `shared-hooks/inject-workflow-state.py`（约 :395-415）使用线程+队列的 guard，超时时间是硬编码的 **0.2 秒**。
- `shared-hooks/session-start.py`、`inject-subagent-context.py`、`inject-shell-session-context.py`、`codex/hooks/session-start.py` 都直接调用 `sys.stdin.read()`，没有 guard。
- 0.2 秒对于启动慢或负载高的宿主可能太短，会把有效输入当成空输入。

## Requirements

- 审查上游 #591 并选择性移植。
- 所有 hook 共用一个读取 stdin 的 helper（各平台模板文件是独立部署的，需确认共享方式：复制 helper 还是放在 `.trellis/scripts/common` 中 import）。
- 超时时间合理（建议默认 1–2 秒，可通过环境变量覆盖），并且 stdin 一旦关闭就立即返回，不额外等待。
- 超时、空输入、坏 JSON 三种情况分别有可诊断的结果（例如写到 stderr 或调试日志），并且都不让宿主失败。

## Acceptance Criteria

- [x] 测试覆盖：stdin 一直不关闭 → 在超时内返回；延迟 0.5 秒才到达的有效 JSON → 被完整读取；空输入；坏 JSON；超大但合法的输入。
- [x] 每个 hook 的有效上下文输出不变（与现有测试对比）。
- [x] 模板与 dogfood 镜像同步；Python 3.9 兼容。

## Dependencies

`fork-baseline`。

## Implementation evidence (2026-11-10)

- Selective port of #591: one standalone `shared-hooks/trellis_hook_input.py`, not three copied 0.2-second readers. All eight Python hook entrypoints use it; non-hook `add_session.py` intake is unchanged.
- Default 2-second total deadline; finite overrides in (0, 10] via `TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS`; invalid settings use 2 seconds. `TRELLIS_HOOK_INPUT_DEBUG=1` enables payload-free diagnostic categories. Default stderr and successful stdout remain compatible.
- Pre-product RED: initial 24-case run was 21 failed / 3 passed (also exposed an unrelated fixture cwd mistake, corrected before product edits). Tightened RED controls then proved delayed workflow input and the decisive field after a multi-megabyte payload were lost: 5 failed / 1 passed in the selected six-case run. Held-open real entrypoints required the 5-second safety kill where the original readers waited for EOF; no missing-module-only root proof was used.
- Windows investigation: the first raw-os.read helper returned/terminated itself, but a pending raw pipe read stalled later inherited-stdin children. Real CPython 3.9 reproduction showed this even with `os.dup`; the initial implementation run was 8 failed / 16 passed. Windows now peeks available bytes before reading; POSIX keeps the raw daemon path. No `os._exit`, retries, new skips, increased test budgets or environment stripping.
- Final focused run: 76 passed / 1 existing skip across the two new reader suites and adapted context-limit probes. The new suites add 38 tests in total. All eight installed entrypoints terminate natively with held-open stdin and preserve closed/open output with 0.5-second delayed input. Unicode digest coverage verifies the complete 3.6 MB value, not a prefix.
- Eight original closed-pipe controls are equal in `research/valid-output-before.json` and `valid-output-after.json` (temporary root normalized). Positive subagent research context is separately asserted, and existing full context/protocol regressions pass.
- Built distribution smoke: all 12 Python-hook platform installations receive byte-identical, hash-tracked support assets; optional statusline has its helper; both initial and post-upgrade dry-runs are clean. A prior-release fixture without helper files/receipts gains all 12 assets on update. Existing recorded user-deletion semantics and dirty-uninstall refusal remain intact; the uninstall plan owns all 12 helpers. See `research/distribution-smoke.json`. `npm pack --dry-run --json` includes `dist/templates/shared-hooks/trellis_hook_input.py`.
- All five required `uv run --locked` checks pass with the specified real pnpm PATH: lint, typecheck, lint:py, build, test. Full suite: core 401 passed / 2 existing skips; CLI 1,999 passed / 35 existing skips. Python checker: 0 errors / the same 68 baseline warnings. All 77 tracked/new Python files compile with actual CPython 3.9.25.
- Supplemental strict test compilation: five focused changed test files have 0 diagnostics. Including the large historical regression file yields the same two pre-existing TS2345 JS-template-inference findings as its HEAD control; no new finding. Mirror Ruff comparisons likewise introduce no rule findings. See `research/strict-test-types.json`.
- Six pre-identical dogfood entrypoints were mirrored; three support copies added. The three already-drifted subagent files retain their snapshot hashes. Common-script twins remain byte-identical. `.pi`, marketplace, local workflow and other task artifacts were not edited.
- Executable contract added to `.trellis/spec/cli/backend/platform-integration.md`. Detailed root cause, impact notes and verification are in `research/verification.md`.

## Independent review evidence (2026-11-10)

- Check agent found and fixed one missed Snow case: a complete wrapped empty object was treated as incomplete because the completion predicate tested dict truthiness. Completion and final parsing now share a validated document extractor, retaining the original first/last-brace rule. Native regression: 1 failed / 1 passed before the fix → 2 passed after it. No test timeout changes.
- Fresh post-fix focused run: 154 passed / 1 existing skip (six files); full suite: core 401 passed / 2 existing skips, CLI 2,000 passed / 35 existing skips. All five required checks passed; Python checker still 0 errors / 68 baseline warnings. Five focused test files compile strictly with 0 diagnostics; actual CPython 3.9.25 compiles all 77 Python files.
- Independent built-CLI smoke verified all 12 canonical helpers and receipts, clean initial/post-upgrade dry-runs, prior-release asset installation, recorded deletion preservation, uninstall plan ownership and dirty-uninstall refusal. The built Snow hook consumes wrapped `{ }` with stdin held open, exits 0 and emits nonempty context. Archive dry-run includes the helper and no Python caches.
- Split CRLF, separately arriving UTF-8 bytes, redirected regular-file input, total-deadline trickling and 15 Snow parser HEAD controls passed. All 28 script twins, six hook twins, three helper copies and three preserved drift hashes were rechecked. No further in-scope issues found; native POSIX remains CI-only. Details and command evidence: `research/verification.md`.

Final **staged** GitNexus detection, commit with `Ported from mindfold-ai/Trellis#591`, and archive remain main-session work. Neither agent staged, committed, archived, pushed or spawned another implement/check agent. This host is Windows.
