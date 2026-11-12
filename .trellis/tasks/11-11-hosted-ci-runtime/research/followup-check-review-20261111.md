# Independent review of classified hosted blockers — 2026-11-11

## Findings

No blocking implementation defect found in the finite R6 follow-up. No source/test fix was needed by this reviewer. Read the updated PRD/design, first-hosted blocker classification and per-job JSON, current seven source/fixture diffs, owning hook/test/spec contracts and final implementer report. The four first-hosted raw-log SHA256 values match their recorded JSON values.

## Product and protocol boundary

- The Codex/Copilot template diffs and tracked Codex mirror touch only `configure_project_encoding`. Both mains still return before it when no owned root/runtime is selected. Existing skip flags, root lookup, containment and context assembly are unchanged.
- The optional common helper call remains; the selected hook then uses `getattr`/`callable` to configure stdout as UTF8. There is no change to global `common.configure_encoding`, Unix stdin/stderr handling, `ensure_ascii=False`, payload schema or final print logic. The Codex template and dogfood mirror match as UTF8 text.
- Existing no-root tests still demand an empty result and no stream/subprocess configuration. Escaping context/task canaries, alternate-root selection and symlink containment assertions are unchanged. The source import-probe fix only adds the hook's companion directory before importlib loading; it does not alter production hook imports, platform eligibility or the six symlink/escape cases.
- Doctor's four `toBe` root assertions now compare native physical identities. Hook-root's ticket membership and existing formatted Repo assertion retain their operators while canonicalizing the expected physical path. No substring rewriting/case folding or product root-resolver change is used.
- OMP uses the already-imported `os.tmpdir()` API. Its one new guard removes TMPDIR only for the test, verifies OS-temp placement plus task creation, and restores the prior variable in `finally` while cleaning only the owned fixture.

Protected-input diff checks confirmed no changes to global common scripts, marketplace URL/gitlink or the inspected settings/hash paths. No unrelated runtime or deadline/concurrency adjustment was introduced.

## Evidence independently inspected

Raw controls are under `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-followup-df71447bd61b4c75a828fdf0bf832e53`:

- `encoding-red.log` records both actual helper ASTs failing Unicode output with a cp1252 TextIOWrapper and simulated nonWindows common no-op; `encoding-final-green.log` records both passing. Inspected the probe: it executes the real helper bodies, writes actual Unicode JSON into the stream and decodes/asserts that output. This is focused helper evidence, not a claimed Linux full-hook execution.
- `hook-source-import-red-green.log` records missing `trellis_hook_input` before the source-probe import-path correction and successful source-module loading after it.
- Confirmed doctor/hook-root short-path RED logs fail their actual expected-short/actual-long physical-identity assertions. Expanded same-short-root GREEN logs show doctor4/4 and hook-root9/9, with respectively30 and25 other cases filtered; filtered cases are not counted as passes.
- The new OMP absent-TMPDIR guard is RED against the original fixture and GREEN1/1 against the corrected fixture, with24 other cases filtered in that control. The final report separately records the complete OMP file25/25 and complete hook-root file34/34 passing.
- `doctor-final-full.log` confirms doctor34/34 pass in83.05s after the final build was idle. The earlier dist-clean/build overlap generated missing-module/template errors and is retained as an execution artifact; it was not treated as a path regression or fixed by altering tests/settings. Reviewer ran neither doctor nor a duplicate full suite.

### Ordinary-output guard interpretation

The existing current-HEAD control compares the complete returned status/stdout/stderr for all eight protocols. Its runner decodes UTF8 and normalizes CRLF to LF before equality, so it is stronger than a JSON/schema or substring check but is **not a raw Buffer-byte oracle**. Its HEAD baseline advances after a commit; the independent root/context/Unicode assertions remain the persistent guards. Current source preserves JSON escaping, schema and print construction, and the complete hook-root control passed. Do not overstate this as a permanently pinned historical byte baseline.

## Reviewer checks

All reviewer commands used `rtk bypass` and exited0:

- CLI lint (`pnpm --filter @mindfoldhq/trellis lint`).
- CLI TypeScript noEmit typecheck (`pnpm --filter @mindfoldhq/trellis typecheck`).
- Locked Python basedpyright (`uv run --locked pnpm --filter @mindfoldhq/trellis lint:py`):0 errors,68 existing warnings.
- `git diff --check`.

Reviewer logs are in `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-independent-review-20261111/followup-*.log`. Python design guidance and the focused script/test-spec additions agree with the implemented ownership boundaries. No further spec change is required.

## Remaining gates

Normal complete commit-hook verification and a new actual hosted matrix remain required. Local Windows AST/import controls do not establish Linux full-hook/symlink execution; those existing Linux cases must run remotely. No four-job-green claim is made from this review. The reviewer changed only this receipt and performed no dist write, code/test/settings edit, stage, commit, remote operation, dependency install or fixture cleanup.
