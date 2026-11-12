# Reliability v1: native acceptance continuation

The user's 2026-11-11 follow-up changes real Codex acceptance from 0.167.0 to
0.167.1 and requests continued validation, commits and archival of completed
tasks. This supersedes the earlier exact-version stop recorded in
continuation-20261111.md. No push, hook bypass or git add -A is authorized.

## Codex child completed

Native Windows Codex0.167.1 TUI, normal folder/hook trust, current authenticated
model/provider defaults and process-local Python3.9.25 validated actual context
delivery in all four layouts: root, packages/cli/src, real nested Git worktree,
and Chinese/space cwd. Root/subdirectory/worktree completed random marker
echoes. Chinese/space delivery is independently proven by actual parent/child
developer injections; final model echo was interrupted after about3minutes and
remains not_completed, with its delay cause unknown. No counted child read
files or used shell tools. The failed initial subdirectory session that loaded
only global hooks is preserved separately, not counted as passing.

`956cc7bc chore(task): archive 11-09-codex-subdir-hooks` includes the updated
target/AC and host receipt. Normal full pre-commit passed: core401 /2 existing
skips, CLI2149 /35 existing skips. Product code remains9a9e4b65. All89 protected
file hashes were unchanged. Evidence: [native host receipt](../../archive/2026-11/11-09-codex-subdir-hooks/research/host-01671.md).

## Remaining local work

- hook-payload-replay: d7cb0fc0 implements reviewed #644 adaptation,7 sanitized
  captures,56 replay tests and five real temporary-script mutation controls.
  Independent review/lint/typecheck/strict new-test compilation and full
  pre-commit passed (core401 /2skip, CLI2205 /35skip). Remains in_progress and
  unarchived pending remote CI. A mistakenly added code-file JSONL reference
  was removed; manifests contain spec/research documents only.
- doctor-command: design/implement preceded start; implementation and independent
  review complete locally (doctor34 + platforms3 =37). Strict schema, Python3.9,
  build/package and real-checkout byte preservation passed (2,762 entries plus58
  source-cache entries unchanged). Real checkout truthfully reports missing
  .opencode/package.json; no repair performed. Source commit was paused at the
  user's CRITICAL approval gate:63 changed symbols /18 expected diagnostic
  read flows. The user explicitly approved this exact scope after that stop;
  e7583d64 then passed normal full pre-commit (core401 /2skip, CLI2239 /35skip).
  The first full attempt's existing update afterEach timeout and unchanged
  1/1 +55/55 controls are retained; original cause remains unknown and no old
  test/config/timeout/skip was changed. See the child's verification and
  critical-scope records. Remote CI and local Node18
  doctor smoke remain unverified.
- windows-ci remains in_progress: matrix implemented at5cdbcba1, but the
  required remote Windows/Ubuntu green result is unverified under no-push.
- Parent remains planning. Remote-green/all-in-scope-child archive and formal
  parent acceptance are not checked off. After e7583d64, root
  `uv run --locked pnpm lint`, `pnpm typecheck` and `pnpm build` passed serially;
  the same source passed full `pnpm test` in its normal pre-commit. All four
  native Windows/PowerShell local integration steps passed: edited workflow
  preservation/dry-run, A/B active-task isolation, default archive isolation
  with an unrelated staged sentinel, and real Codex0.167.1 delivery from src.
  The final native turn completed in6seconds with the exact injected no_task
  marker and zero tools. All680 protected checkout entries and the sentinel's
  cached mode/blob/path were unchanged. See [integration receipt](windows-integration-20261111.md),
  which also retains initial fixture setup refusals and normal corrections.
  This does not override remote CI/archival gates or start the parent as a
  product implementation task.
- verification-receipts remains untouched: v1 completion and a period of real
  use are prerequisites. Continuing implementation does not satisfy them.

## Cleanup limitation

The native nested worktree was normally removed. The remaining owned fixture
`%TEMP%/trellis-native-host-01671-hMsRhM` could not be deleted: automatic approval
review rejected both recursive PowerShell removal and contained per-file /
empty-directory removal before execution, returning only `blocked by policy`.
No bypass/alternate deletion route was used. Normal Codex history/hook caches
and trust persistence were not manually rewritten; global config byte
invariance is not claimed. The fixture contains generated probe data, not
copied authentication secrets.

The later integration fixture `%TEMP%/trellis-windows-integration-28b7dd8cdd34`
also remains: its single contained native PowerShell recursive removal was
rejected before process start with only `blocked by policy`. No retry or
alternate deletion route was attempted. Functional validation and the final
680-entry checkout comparison had already passed before this cleanup attempt.
