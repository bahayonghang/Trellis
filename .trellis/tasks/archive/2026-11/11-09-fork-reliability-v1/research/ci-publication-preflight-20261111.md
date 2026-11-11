# CI publication preflight (2026-11-11)

## State and publishing boundary

Initial dev HEAD: `1eba38f66c93f680aea6f4e9043913ca2f582857`. Index empty;
the only untracked file was next-session-prompt-20261111.md, retained unchanged.
`uv run --locked python --version` returned Python3.9.25.

GitHub branch/PR queries and `git ls-remote --heads origin` found only main at
`f089cb3286071199e84118dee86b6d76aab032f1`, no dev and no head:dev/base:main PR.
`git fetch --no-tags origin main` confirmed that base. Origin is
https://github.com/bahayonghang/Trellis.git, a public fork whose default is main.
No push, PR creation or hosted CI run was performed.

The handoff explicitly retains no-push until a separate publishing answer.
Approval is needed to push only dev to origin and create/reuse a draft
dev-to-main PR inside this fork. Use an explicit dev refspec and
`push.followTags=false`. Upstream PR, merge, force push, tags and npm publication
are outside this request.

## Delivery scope

The initial range has **57 commits**, **343 files**, **+32525/-1057 lines**
(Git rename-aware shortstat). The earlier 50-entry terminal display was
condensed; subprocess output below lists all 57. Publishing includes this
whole history plus the session documentation/journal commits.

All 343 paths are accounted for: CLI77, core2, task records210, specs17,
workspace2, dogfood `.trellis` scripts4, `.trellis` ignore1, Claude4, Codex5,
Cursor4, OpenCode1, GitHub workflows2, other root/tooling14 (including the
marketplace gitlink). Early commits include ref ignore, pnpm12/local tooling,
LF environment exports, valid-root selection and OpenCode POSIX paths.
Later commits include reliability implementations, previous task archives
and their research. This session does not reopen those tasks.

Reviewed the complete commit/path inventory and root/tooling/workflow delivery
surfaces. Reused the committed implementation and independent-review receipts
for product behavior; this is not a new line-by-line audit of all 343 files.

The following source comparison was empty:

```text
git diff e7583d64..HEAD -- packages .github .claude .codex .cursor .trellis/scripts marketplace
```

Thus the recorded final source gate
and native Windows integration inputs remain unchanged. Marketplace matches
its recorded gitlink; the unchanged docs-site checkout is uninitialized locally.

The publish workflow diff only changes pnpm setup to12.18.0. Its triggers are
published releases/v* tag pushes. The proposed branch push/PR triggers CI,
not npm publication. No package version or release action is proposed.

## CI and acceptance

Actual YAML: Ubuntu/Windows times Node18.17.0/26.7.0, native bash/pwsh,
real Python3.9, recursive checkout and default autocrlf. All rows install/build
with Node26, compile tracked Python, verify output, switch to the row runtime,
then smoke the built CLI in Chinese/space paths with CRLF input. Only Node26
rows run full TS/Python typecheck, lint and core/CLI tests; Vitest4 needs newer
Node than18. Push/PR main/dev path filters include this source range.
There is no workflow_dispatch.

Root pnpm test invokes both packages. CLI Vitest includes test/**/*.test.ts,
including replay56 and doctor34. Source assertions inspect workflow/PRD/spec
content and five output mutations, plus doctor schema, confidence bounds and
full fixture/Git snapshots. Wiring does not prove hosted execution.

All14 exact child names resolve to one task.json each:11 completed/archived;
windows-ci, hook-payload-replay and doctor-command remain in_progress. Parent
remains planning with its four AC boxes unchecked. No AC/status/archive is
changed here. verification-receipts retains its post-v1-use prerequisite.

After approval, require an actual PR-triggered green matrix and record PR URL,
source head SHA, actual run SHA/event/URL, all four jobs and step outcomes.
Identify a PR merge SHA separately from dev HEAD. Node18 full-suite conditional
skips are expected, not passing tests. Confirm replay and doctor execute in
both Node26 jobs; retain actual platform counts/skips. Diagnose failures from
logs. Accept/archive each child in order with its own normal gate and staged
detect_changes, then audit all parent AC before any parent archive.

## Reused evidence and this session

Reused: full source pre-commit recorded at1eba38f6 (core401 pass/2 existing
skips, CLI2239 pass/35 existing skips), root lint/typecheck/build aftere7583d64,
independent replay/doctor checks, Node18 doctor five-case/three-schema controls,
and the four-step native Windows receipt. The source diff above confirms
unchanged inputs. Hosted Linux/Windows results remain unverified.

This documentation commit uses normal full pre-commit; its actual result is
recorded afterward in the session journal. No source rewrite, build, model call,
timeout/concurrency change or skip change was needed.

Protected initial paths: the two June tasks, verification-receipts and the
three divergent inject-subagent-context.py mirrors. Only new parent research
and journal files change here. No existing product symbol is edited; each
commit still requires staged GitNexus inspection. Earlier CRITICAL doctor
approval does not authorize new scope. User configuration/old Temp fixtures
are untouched.

## First documentation commit gate and unchanged controls

The first normal commit attempt created no commit. Core passed401/2 existing
skips; CLI passed2238, failed1, retained35 existing skips (284.81s). Replay56
and doctor34 passed in that same run. The only failure was the existing
platforms.test.ts:267 full-platform byte-parity case, reported as a30000ms
test timeout. No byte-parity assertion error was reported.

The source loops all platforms through configure, template collection, file
reads/assertions and fixture removal. The original log has no per-phase timing,
so the underlying stall and phase remain unknown. No antivirus, scheduler or
specific product function is assigned blame.

Unchanged controls, both through uv run --locked:

- The exact case passed1/1 in7.178s (56 filtered by selection, no new skips).
- The entire platforms.test.ts passed57/57 in60.92s total.

No source/test/config, deadline, concurrency or skip was changed. The original
log is retained locally as %TEMP%/trellis-ci-publication-preflight-20261111-commit.log;
control logs use trellis-ci-platform-parity-control-20261111.log and
trellis-ci-platforms-file-control-20261111.log. A single unchanged-source full
commit retry follows these controls; passage is not presumed or a root-cause fix.

## Complete existing commit range

```text
46bb1b93 chore: ignore local ref directory
7d2d8742 chore: bump packageManager to pnpm 12.18.0
7edffcbb chore: add justfile for local checkout tasks
d4464fe0 build(deps): allow esbuild build script under pnpm 12
a0d017b7 fix(hooks): write CLAUDE_ENV_FILE exports with LF line endings
ef6d0e00 fix(hooks): skip .trellis dirs that are not Trellis projects
6a2b6bf1 fix(opencode): keep POSIX paths in directory context entries
c9f290e4 fix(core): retry transient Windows rename failures on the seq sidecar
577971f7 test: make the CLI suite pass on native Windows
2d9bc053 docs: record the fork baseline and the Windows pitfalls it found
b84ffc58 chore(task): plan the fork reliability v1 tasks
4075da63 test: isolate Pi fixtures from host session environment
c582e302 fix(cli): retry transient Windows atomic renames
764cddc0 fix(scripts): retry Windows atomic replacements
94c88e5c docs: record R13 verification and Windows hook results
a2a800ad chore(task): archive 11-09-windows-test-failures
5afda958 chore(task): archive 11-09-fork-baseline
d6f4de29 fix(init): preserve template baselines when adding platforms
8365bb99 chore(task): archive 11-09-init-hash-baseline
dd721110 chore(dev): initialize uv Python 3.9 environment
a4af3311 test(pi): isolate context envelopes from interpreter startup timing
6ffcec06 fix(scripts): scope archive commits to the moved task
2aa1d1d3 chore(task): archive 11-09-archive-commit-scope
cb12aea5 chore(task): record selective task activation port boundaries
cb895dba fix(task): preserve unfinished active work during creation
6bfdaeff chore(task): archive 11-09-task-create-keep-active
9d0c72f7 fix(hooks): bound stdin intake across Python hook entrypoints
2db66eab chore(task): archive 11-09-hook-stdin-guard
2248f9ad fix(hooks): resolve the nearest valid Trellis workspace
069d1400 chore(task): archive 11-09-hook-trellis-root
7998b571 test(fs): isolate retry contracts from native rename timing
91181499 chore(task): archive 08-05-opencode-shell-env
f3aa4375 chore(task): archive 08-05-session-identity-propagation
b0f1dcac chore(task): archive 08-05-purge-fake-env-names
c26b8ce4 chore(task): archive 08-05-session-identity-hardening
a3bbbf20 chore(task): archive 08-05-shell-ticket-bridge
076b5310 chore(task): archive 07-23-codex-inline-default-agent-model
f53cfe21 chore(task): archive 08-06-converge-platform-templates
de84cfda chore(task): archive 08-06-mem-full-recall
8d7e468a chore(task): archive 08-06-purge-stale-references
10c465da chore(task): archive 09-09-codex-session-fallback-isolation
bd6370f6 chore(task): archive 11-10-r13-test-isolation
a6434b10 chore(task): plan portable Codex hook launchers
5cdbcba1 ci: add native Windows reliability matrix
a3d58384 fix(upgrade): protect checkout installations from npm replacement
c61ce63b chore(task): archive 11-09-upgrade-linked-guard
18a1614c fix(gitignore): protect machine-local hook configuration
a6414b37 chore(task): archive 11-09-hooks-local-gitignore
2e5e4f56 test(codex): lock CRLF update configuration behavior
44b96630 chore(task): archive 11-09-codex-crlf-config
9a9e4b65 fix(codex): bootstrap hooks from nested working directories
1905dae0 chore(task): record reliability v1 acceptance checkpoint
956cc7bc chore(task): archive 11-09-codex-subdir-hooks
d7cb0fc0 test(hooks): replay versioned Claude and Codex payloads
e7583d64 feat(doctor): add read-only local reliability diagnostics
9b8122d8 chore(task): record native reliability integration checkpoint
1eba38f6 chore(task): record Node 18 verification and archive gates
```
