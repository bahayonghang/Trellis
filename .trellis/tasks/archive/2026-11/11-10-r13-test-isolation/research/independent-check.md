# Independent R13 check — 2026-11-10

## Verdict and scope

**PASS; no remaining in-scope issues.** Reviewed against
`069d1400ea88d46f1480a6e8987fd582d19b9446` on `dev`. The repair remains
unstaged. No staging, commit, archive, push, nested agent, Codex session or
production change was performed by this checker. The main session still owns
the staged-scope GitNexus gate, real pre-commit hook and scoped archive.

Review depth: deep, because the entire four-file test surface, replay and
spec/baseline evidence were audited, not just selected changed assertions.
The approved separation of controlled syscalls from native publication remains
appropriate; no new abstraction or dependency is needed.

## Findings fixed

1. **Replay baseline moved with HEAD.** `research/replay-isolation.py` previously
   read `git show HEAD:<fixture>`. After the repair commit, `--baseline` would
   select the repaired fixture and invalidate RED. It now pins the complete
   pre-repair commit above and prints it in the control result. The root-finding
   expression was evaluated with both active and archived task paths; both
   resolve to the repository root. This also supports a worktree `.git` file
   because it tests existence, not directory type.
2. **Python cleanup assertion lost directory completeness.**
   `packages/cli/test/scripts/io.integration.test.ts:76,258` now checks
   `fileCount` as well as original target contents and `tempCount`. Failures
   and both interrupt paths require exactly the original target and zero temps;
   controlled successes require exactly the original target plus one prepared
   temp. This restores the original no-extra-files proof without falsely claiming
   that controlled success publishes or removes its temp.

`FORK_BASELINE.md` also distinguishes inferred extra native failures from
captured facts, and distinguishes the incomplete first gate log from a pass.

## Contract review

- `rename.test.ts`: controlled first/third/final success for EPERM, EACCES and
  EBUSY pins every `(source, target)` call and exact waits (none / 10,20 /
  10–100 ms). Missing-source paths make native-success leakage fail. Separate
  distinct-error exhaustion cases require 11 calls, all ten waits, and identity
  of the final error. Native file/directory publication keeps production waiting,
  exact bytes and no leftover source.
- `atomic-write.test.ts`: native recovery retains a two-error injected prefix,
  old target contents during faults, one temp write, exact published contents and
  complete directory cleanup. Controlled failure cases retain platform/code
  fail-fast, exact attempt counts, original error identity and cleanup, including
  cleanup-error masking prevention. Final-budget success is relocated to the
  controlled helper test rather than deleted.
- `ablation-store.test.ts`: all staging/file/directory success cases retain
  native metadata/publication and production waits. Only the injected prefix is
  counted. Always-failing selected publication targets still require their exact
  11/1 cap and original error identity. Existing recovery status, lock/temp
  cleanup, rollback/retry recovery and fingerprint verification remain. The late
  directory EIO passthrough control is unchanged and has no timing coupling.
- Python: both real writer functions run; only external replace outcomes and
  sleep are controlled in exact units. Prepared temp bytes and syscall paths are
  asserted; controlled success never delegates to native replace. First/final
  success, cap, schedule, platform fail-fast and both interrupt identities remain.
  Separate text/JSON native publication keeps real sleeps and checks exact native
  newline bytes, old data during the injected prefix, and the entire final file set.
- No internal module mocks, blanket fake filesystem, copy/unlink publication
  substitute, product-budget change, dependency, new retry/skip/timeout, preload
  hook or environment-stripping workaround was introduced.

## Earlier full-test invocation

The first `research/gate-test.log` records core 401 passed / 2 existing skips.
It ends after passing CLI configurator output, with **no CLI result summary and
no recorded assertion failure**. The implementer reported a 120-second agent
command cutoff; the log alone cannot prove that external cutoff. It is an
incomplete invocation, not passing evidence and not evidence of an application
assertion failure. The original `gate-test-final.log` records the complete
401/2 and 2049/35 pass (CLI 340.33 seconds). No product/test timeout was changed.
This checker additionally ran the full gates afresh after its assertion fix.

## Fresh command evidence

All commands used `uv run --locked`, with the required real pnpm directories
prepended to PATH. Only the already-approved cached GitNexus 1.6.12 CLI was used.

- `pnpm --filter @mindfoldhq/trellis exec vitest run test/utils/rename.test.ts test/utils/atomic-write.test.ts test/utils/ablation-store.test.ts test/scripts/io.integration.test.ts`
  — **4 files / 84 tests passed**, no skips, 4.64 seconds (`check-focused.log`).
- `pnpm --filter @mindfoldhq/trellis exec tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --lib ES2022 --esModuleInterop --resolveJsonModule --skipLibCheck <the same four tests>`
  — exit 0; explicitly includes the changed tests and their imports, unlike the
  package's source-only tsconfig. Explicit ESLint and Prettier checks for those
  four tests also exited 0.
- `python <task>/research/replay-isolation.py --baseline` and the same with
  `--canary`: verifier exit 0, correctly requiring child Vitest exit 1. Extra
  native faults reproduce **3 failures** (TS 5 calls vs 3; both Python writers
  5 attempts vs 3); the canary reproduces **2 Python failures**. Without
  `--baseline`, corresponding controls exit 0 with **3 and 2 passed**.
  See `check-{red,green}-{extra,canary}.log`. Selector-filtered cases are not
  new skips in the real suite. Disposable replay files were removed.
- CPython **3.9.25** directly executes the current TS probe strings using
  `sys.executable` and real temp directories: **18 controlled cases and 4 native
  publication cases passed**, including platform fail-fast and both interrupts
  (`check-python39-final.log`). Runtime version was asserted, not inferred from
  pyright or interpreter lookup.
- Serial gates, each exit 0, recorded in `check-gate-*.log`:
  `pnpm lint`; `pnpm typecheck`;
  `pnpm --filter @mindfoldhq/trellis lint:py` (0 errors / 68 existing warnings);
  `pnpm build`; `pnpm test`.
  Fresh full results: core **21 files, 401 passed / 2 existing skips**;
  CLI **89 passed files / 1 existing-skipped file, 2049 passed / 35 existing
  skips**, 2084 total tests; CLI duration **178.18 seconds**.
- `git diff --check` and `python .trellis/scripts/task.py validate <task>`
  — exit 0; both context files have seven valid entries.

Two checker-command setup mistakes were diagnosed rather than treated as product
failures: a log-summary helper initially hit GBK stdout encoding (fixed by explicit
UTF-8 reconfiguration), and the first Python smoke command failed parsing its
backslash-heavy heredoc before executing any probe (`check-python39.log`). The
corrected smoke uses `chr(92)` during extraction and passes the full matrix; no
application/test retry, source change or environment stripping was used for either.

## Tool limits and preservation

The available tools do not expose an active changed-path LSP diagnostic call.
Automatic edit feedback is not being substituted for that missing scan: LSP is
**unavailable/inconclusive, not a clean LSP claim**. Strict test-inclusive tsc,
ESLint, actual Python 3.9 execution, compile validation and live tests provide the
direct evidence above.

The stale GitNexus index was refreshed with the cached CLI's
`analyze --index-only` (exit 0; no instruction injection). Before editing the
Python probe serialization, upstream impact and context for `probe` resolved
zero graph callers/processes but returned risk **UNKNOWN**, explicitly warning
that bare const reads are not indexed. Source inspection confirms its local
Vitest parameterized subprocess consumer. The untracked top-level replay script
is not indexed and has no existing function/class/method edits; its impact query
also returned UNKNOWN/not found. These are graph limitations, not proof of no
callers. No HIGH/CRITICAL result was ignored.

Post-gate byte checks matched **all six protected worktree SHA-256 hashes** and
**all five original mode/blob/stage/path index entries**. The entire staged path
list remains exactly those five pending planner documents. The only tracked
unstaged changes are the four approved tests, two testing specs and
`FORK_BASELINE.md`; production/platform files have no diff. HEAD remains the
pre-repair commit above. The protected documents, including the untracked Codex
diagnostic, were not edited. No parent/archived task state was changed.

## Main-session pre-commit checkpoint

The main session rechecked all six protected worktree hashes and all five original
index entries after this review; all matched. The tracked unstaged set is exactly
the four approved tests, two specs and `FORK_BASELINE.md`. No staging or commit
has occurred. An active seven-path LSP probe returned zero diagnostics, two
confirmed-clean paths and five inconclusive paths; this is not a clean verdict
for all changed files. The direct validators above remain the verification basis.
Spec-sync review confirms the narrow R13 boundary is already captured in
`mock-strategies.md` and `filesystem-safety.md`; no further spec change is needed.
The user approved the scoped commit and archive (`行，请提交并归档对应的任务`).
After staging exactly the 16 repair paths, the cached GitNexus 1.6.12 index was
refreshed with `analyze --force --index-only`. The staged scope gate reported
16 changed files, seven symbols, zero indexed affected processes and LOW risk.
Test callback/constant graph limitations still apply; zero processes is not proof
of no execution impact. For this gate only, an alternate Git index excluded the
five protected planner entries; the real index remained byte-identical. The
actual commit uses an explicit repair pathspec and the unmodified real hooks,
not the alternate index or a modified test environment. Gate evidence is in
`main-staged-scope.log`.
