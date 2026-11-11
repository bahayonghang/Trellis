# Portable Codex launcher implementation evidence

## Boundaries

Implementation and automation only. Current local CLI is Codex 0.167.1, not
the required 0.167.0 host. No paid/model session, trust approval/bypass,
installation/downgrade or real-repository update was run. Native Linux and
GitHub Actions remain unverified. Keep the task unarchived after automation.

Precise impacts before source edits: approved getHooksConfig HIGH (17 upstream,
1 direct caller, 4 grouped processes); configureCodex LOW (14 upstream, 2 direct,
handleReinit); analyzeChanges LOW (2 upstream, update); update LOW (1 direct,
5 unresolved receiver sites checked against source callers); init LOW (1 CLI
caller, no grouped processes). The additional init change preserves only the
selected Codex's skipped existing hook receipt, without changing global hash APIs.

## RED and GREEN

- Before source changes, actual collected commands on Windows/Python 3.9.25:
  cmd raw /C and pwsh, both events, roots PASS 4; child directories FAIL 4 with
  missing-relative-script exit 2. These are shell controls, not host acceptance.
- Launcher matrix: 45 PASS. Actual breadcrumb/PRD injection through both shells,
  nested Git, real nested worktree/nearest root, Chinese/space and non-Git paths;
  missing nearest entry/helper isolation; EOF/malformed/open/delayed stdin;
  exact canonical source decoding, Python 3.9 compile and fixed argument whitelist.
- Pure migration planner: 17 PASS, including byte-preserving command tokens,
  large unknown number/format retention, both commandWindows and command_windows,
  malformed/ambiguous/manual shapes, custom/deleted entries, uninstall ownership.
- New init/update migration integration: initial 9 PASS, expanded to 11 PASS
  during independent review. Dry-run/skip/backup/no-op,
  original custom/malformed/override bytes and receipts under force/create-new,
  force-init old receipt protection, no untracked claims, no unselected claim
  preservation and correct new hash after actual migration.
- Existing init 55 + update 55 PASS before the final exact-content writer fix;
  the complete post-review regression gate is recorded separately below.
- Existing platform parity/configuration: 57 PASS after adapting exactly two
  old relative-command assertions to the decoder prefix and readable final path.
  Other affected suites PASS: Python rendering parity 2, shared hooks 14,
  uninstall scrubbers 26, Codex template 17.

The first expanded stdin matrix assumed empty workflow output. Actual old direct
hook controls emit the established no-task breadcrumb for invalid input. The
tests now compare native/direct output and assert its specific no-task/empty
event behavior; no product stdin behavior or timeout was changed. The first
force-init receipt assertion exposed a real skipped-claim loss; the narrow init
protection fixed it without weakening that assertion or reopening prior tasks.

## Quality and distribution

All commands used `uv run --locked` (CPython 3.9.25).

- PASS: lint, typecheck, build, Python lint (0 errors / 68 existing warnings).
- PASS: strict test-inclusive TypeScript for all three new test files, 0 diagnostics.
- PASS: focused ESLint on every changed source/test, source/new-test formatting,
  diff whitespace checks. Unrelated old formatting in platforms.test.ts retained.
- PASS: built-cli-smoke.mjs in an isolated temporary Git project: real built
  init, user/legacy command migration, dry-run, no-op, uninstall preview and
  noninteractive safe refusal. No writes to the actual project's runtime files.
- PASS: npm pack --dry-run lists compiled Codex generator, raw event config,
  shared-hook index and canonical trellis_hook_paths.py. Used
  `uv run --locked pnpm exec npm pack --dry-run --json`; direct uv npm spawn
  was unavailable on this Windows PATH, and current npm JSON is package-name
  keyed rather than an array. The required assets were checked from that shape.
- PASS: approved .codex/hooks.json was rechecked against the old python3 default
  before syncing; it now equals the generated python3 rendering (5806 bytes).
  Actual command lengths are 2667/2669, below cmd's 8191 limit; source is 1924 bytes.
- PASS: protected-before.json's 89 file SHA-256 values all unchanged, including
  all three divergent subagent hook mirrors, user configs, .pi and workflow/scripts.

No dependency, event, public/environment variable, Python runtime source,
stdin protocol or deadline changes. Full pre-commit remains for the coordinating
session; post-review results are recorded below.

## Independent review correction

Review reproduced an init-only defect: re-rendering the migrated JSON changed
user-owned python3 strings in a custom command and an unknown field on Windows.
A durable force-reinit RED and passing skip control were added. The fix writes
only the already-rendered migration result through existing writeFile after the
normal template-map write, retaining mode/recording while preserving every user
byte. Shared rendering/model helpers were not changed.

Post-fix independent checks passed: 147 focused tests (launcher45, existing
configurator17, planner17, new integration11, platform57), lint/typecheck/build,
strict new-test TypeScript (zero diagnostics), rebuilt byte-preservation control,
and built CLI pipeline. All 89 protected hashes and the approved mirror still
match. See independent-check-20261111.md.

Explicit Git Bash -lc new-bootstrap controls also passed 4/4 (root/child × both
events), asserting actual breadcrumb/PRD output from built init-generated
commands. Both cwd and Python 3.9.25 were checked; no profile workaround or WSL
was used. The durable git-bash-bootstrap-probe.mjs passed syntax, ESLint and
format checks. This remains Windows Git Bash evidence, not native Linux or a
real Codex host.

## Full pre-commit attempt 1

The explicit-pathspec source commit was rejected by the normal full hook; no
commit was created. Core: 401 PASS / 2 existing SKIP. CLI: 2148 PASS / 1 FAIL /
35 existing SKIP. The sole failure was the unchanged
`channel-wait-warning.test.ts` custom warning lead-time case: its 300ms
filesystem poll returned undefined instead of the expected warning. The log
does not establish whether the timer, asynchronous append or filesystem read
was delayed/failed. This is not the core channel-sequence lock timeout.

No source, timeout, skip or assertion was changed in response. Read-only
diagnosis and an unchanged focused control are recorded separately. Final full
pre-commit was unresolved at that point.

## Full pre-commit attempt 2 and source commit

After the unchanged focused 17/17 control and the isolated latency diagnostic,
the same normal full commit gate passed without changing source/tests,
timeouts, concurrency, configuration or skips: core 401 PASS / 2 existing
SKIP; CLI 2149 PASS / 35 existing SKIP (95 files PASS / 1 existing SKIP).
The CLI run took 214.88s. The original full-run failure cause remains unknown;
the later pass does not erase the failure or prove the artificial delay was
its cause. See precommit-warning-diagnostic-20261111.md.

Source commit: `9a9e4b65 fix(codex): bootstrap hooks from nested working directories`.
Before this explicit-pathspec commit, staged GitNexus detect-changes was
inspected separately: 25 files / 58 symbols / 10 expected Codex/init/update
flows, HIGH within the recorded approval. No channel source/test was modified.
The specified real-host acceptance is still NOT RUN; task remains in_progress
and unarchived, with replay/doctor not started.
