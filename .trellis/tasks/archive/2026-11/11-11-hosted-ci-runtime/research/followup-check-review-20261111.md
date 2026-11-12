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

## Final acceptance evidence audit — PASS

The remaining gates above are now evidenced for source commit `c85aff5b019ce2ba14e8643924901ca1aef1e1b2`. Inspected the normal-hook log at `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-followup-commit-03cac5f590ab4c0eb45bcf95a66846f9/commit.log`; independently confirmed core403 pass/2 existing skips, CLI2273 pass/35 existing skips in207.56s and the successful commit. No code/settings changes were made for this audit.

Audited all eight entries of `final-hosted-jobs-20261111.json` against their complete local raw logs:

- dev push run https://github.com/bahayonghang/Trellis/actions/runs/43149689290 and PR run https://github.com/bahayonghang/Trellis/actions/runs/43149695069 each contain the full four distinct OS/Node matrix rows. Both runs and all eight jobs record success.
- All raw-log SHA256 values match. Parsed log text only after handling Windows ANSI/newline representation; hashes were checked against the original unmodified files.
- Source head is `c85aff5b019ce2ba14e8643924901ca1aef1e1b2` in every entry. Actual `git log -1 --format=%H` output is that SHA for dev and synthetic merge `c05065db730cc1b2285276571ab2a3d62cc865bb` for PR. Source head, event type and actual checkout are correctly distinguished.
- All eight Checkout, Python setup and smoke step results are success. Each full log positively confirms the original marketplace SHA `1aa9b326baf93257d6142660e49d3120e7f4b4ef` and `CLI smoke passed:`; none contains its prior not-our-ref error or the prior native fs-event assertion.
- In both Node26 Linux jobs, raw summaries show core404 pass/1 existing skip and CLI2275 pass/no skips. The real six-case `symlinked-workflow-dir.integration.test.ts` suite executed. This supplies the previously pending Linux hook/source-import/containment coverage.
- In both Node26 Windows jobs, raw summaries show core403 pass/2 existing skips and CLI2273 pass/35 existing skips. Full test steps succeeded without the original worker crash.
- Node18 jobs correctly skip the four existing conditional typecheck/Python-typecheck/lint/full-test steps, while their built runtime smoke succeeds. Those skips are not counted as passed full suites.

Version qualification: the observed hosted Windows Python installer is3.9.13; Linux installs3.9.25. Both meet the unchanged Python3.9 floor. The local locked Python3.9.25 smoke must not be generalized to every hosted row.

Final evidence review found no acceptance gap or inconsistent count/hash. All four jobs succeeded in each final run for the repaired source. Reviewer performed no new test/build, remote access, index operation or product edit; archive/journal and documentation publication remain main-session bookkeeping.
