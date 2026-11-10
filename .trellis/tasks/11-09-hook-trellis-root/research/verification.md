# Verification evidence

## Main-session pre-edit impact / caller review

Approved cached GitNexus 1.6.12 only: `node C:/home/lyh/.npm-global/.cache/_npx/5e786f48223a616c/node_modules/gitnexus/dist/cli/index.js`. Forced `analyze --force --index-only` refreshed at HEAD before edits. Used `query 'hook Trellis root discovery'` for process orientation, then `impact <symbol> --direction upstream --repo Trellis --file <canonical path> --summary-only` for each planned existing symbol.

- Shared subagent `find_repo_root`: LOW, 2 direct callers (`_handle_codex_subagent_start` and legacy `main`), 1 grouped affected process. Read legacy main and existing realpath containment; no fallback-policy edit authorized.
- Shared workflow `find_trellis_root`: LOW, 1 direct caller (`main`), 1 process. Root acceptance already has the desired typed marker predicate. Its `_resolve_active_task` imports project-local runtime; marker-only fixtures must not hit an unrelated global `common` fallback.
- Shell `_find_trellis_root`: LOW, 1 direct `_resolve_trellis_root` caller, 1 process. Its existing payload-then-process-cwd policy remains intact.
- Shared/Codex/Copilot SessionStart `main`, workflow `main`, Snow `main`, statusline `main`: LOW entrypoints, one module-level invocation each; graph reports no further upstream process, not evidence that generated hooks have no consumers.
- Snow `_find_repo_root`: LOW, 1 main caller, 1 process; remove its no-workspace fallback and guard before log writes.
- Statusline `_find_trellis_dir`: LOW, 1 main caller, 1 process; preserve `.trellis` return type, gate no-root rendering.
- `SHARED_HOOK_SUPPORT_FILES`: UNKNOWN/no resolved callers (bare constant reads are not indexed). Manual search confirms both support enumeration and the event-file exclusion use it. Do not treat UNKNOWN as no impact.
- Companion `getSharedHookSupportFiles`: CRITICAL, 2 direct callers (`getSharedHookScriptsForPlatform`, Snow `getAllHooks`), 19 impacted symbols, 18 grouped processes across init/update and platform configurators. Only the support-file list is expected to change, but its broad distribution must be validated as one unit.

Main read the complete edited root functions and entrypoints through symbol tools, source collectors and original #650 diff. Source/caller search confirmed the names above, support getter references and installed test fixture paths. Additional existing-symbol edits (including fixtures) still require their own pre-edit impact/caller check.

The user was warned before source edits that the support boundary is CRITICAL across 18 flows, with two direct collectors; individual Python root/entrypoint edits are LOW. The graph is advisory and may omit generated-event/constant-read edges. No source code was changed during this planning/impact pass.

## Implementation and checks

### Implementation

Canonical stdlib-only module: `packages/cli/src/templates/shared-hooks/trellis_hook_paths.py`.
It resolves the start once, walks inclusive ancestors, checks directory/file marker
types, ignores Git and returns the containing workspace for a linked `.trellis`.
All eight consuming entrypoints import it, using aliases except the legacy string
subagent and `.trellis`-returning statusline adapters. Existing hint precedence,
Windows shell normalization, native/legacy session policies, realpath second-base
containment and bounded stdin helper/configuration are unchanged.

No-root exits now precede encoding, common-runtime imports, context/env persistence,
shell tickets, Snow logs and statusline subprocesses. Marker-only partial roots do
not fall through to parents. Task-runtime consumers require local `common/__init__.py`
AND `active_task.py`: an `active_task.py` in a namespace-only directory is not enough,
because Python can otherwise prefer an unrelated regular global `common` package.
This absence guard is deliberately narrow, not a new blanket runtime exception mask.
Snow can still render its existing partial-install orientation at that selected root.

The existing support-file list adds the root module after the unchanged stdin module;
no event registrations, platform capability tables, collectors or common resolver
policies changed. Shared events remain the original four. No existing test fixture
or AST allowlist needed changing. The executable platform-integration CWD section
now records the seven-section root/distribution/partial-install contract.

### RED / GREEN and fixture corrections

Commands use actual CPython 3.9.25 through `uv run --locked`, with this pnpm prefix:

```bash
export PATH=/c/Users/lyh/scoop/apps/pnpm/12.18.0/global/v11/2714-18e65c7102ae139c-0/node_modules/pnpm:/c/Users/lyh/scoop/apps/pnpm/current:$PATH
uv run --locked pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/hook-root.integration.test.ts
```

- `red.log`: 23 failed before product edits. Decisive separate Claude PreToolUse
  and native Codex SubagentStart cases fail to inject actual `parent-PRD-CONTENT`
  without Git; the layout matrix also exposes nested-cwd runtime import crashes,
  no-root output/errors and partial-root/global-package failures. Not every failed
  case is product evidence: see the fixture-only corrections below.
- The first draft fixture used empty JSONL and triggered the existing intentional
  warning; it was made genuinely curated before the saved RED run. Initial snapshot
  scripting also used `Path.write_text(newline=...)`, unsupported on 3.9; corrected
  to byte writes before snapshots/product edits. Neither was a product failure.
- `green-first.log`: 13 passed / 10 failed. Eight failures were a Snow assertion
  expecting a title absent from its compact protocol; corrected to assert the
  selected `Repo` plus the label in its full log. HEAD controls needed the same
  existing `renderTemplateMap` Python-command rewrite as installed assets. The
  precedence fixture also needed a Qoder session pointer when QODER_PROJECT_DIR
  intentionally changes platform identity. Runtime behavior was not changed to
  accommodate these fixture issues.
- `root-green.log`: initial 23 cases pass after those corrections. The final new
  suite has **27 passing cases**, adding exact typed-marker checks, escaping
  context/pointer controls, no-root stream/subprocess probes and namespace-only
  partial-runtime isolation.
- `focused-final.log`: **181 passed / 1 existing skip**, seven files:
  `test/scripts/{hook-root,hook-input-reader,hook-stdin,context-injection-limits}.integration.test.ts`,
  `test/templates/{shared-hooks,snow-write-trellis-context}.test.ts`, and
  `test/configurators/platforms.test.ts`. No added skips, retries or budgets.

The installed-map root suite covers all eight entrypoints (plus native Codex) for
ordinary root, subdirectory, nested `.git` directory/worktree file, non-Git root,
nearer valid/invalid root and a real Windows junction. No-root absence, empty,
home-cache, file, wrong marker types and broken junction are tested with empty
stdout/stderr, exit 0 and whole-directory/env-file snapshots. Separate subprocess
probes assert no encoding/detach/subprocess calls before the no-root exit. Partial
roots have a poison global package with a filesystem canary: it is never imported.
All three valid marker alternatives and individual wrong types have exact helper
selection assertions. Filesystem-root inclusion and resolution failures use isolated
Path mocks, never real drive writes. Native POSIX was not available on this host.

### Required quality gates

Final sequential run (all exit 0):

```bash
uv run --locked pnpm lint
uv run --locked pnpm typecheck
uv run --locked pnpm --filter @mindfoldhq/trellis lint:py
uv run --locked pnpm build
uv run --locked pnpm test
```

- `lint.log`, `typecheck.log`, `build.log`: success.
- `lint-py.log`: 0 errors, the same 68 baseline unused-import warnings.
- `full-final-v2.log`: core **401 passed / 2 existing skips**; CLI
  **2,027 passed / 35 existing skips**, 89 files passed / 1 existing skipped file.
- `strict-test-types.mjs` creates a strict test-aware TypeScript program because
  package tsc excludes tests; `strict-test-types.json` has **0 diagnostics**.
  Prettier was explicitly run on the new test file.
- `changed-python-types.log`: direct basedpyright Python-3.9 validation of all
  changed canonical consumers/helpers and dogfood copies: **0 errors / 0 warnings**.
  No callable `source=lsp` diagnostic interface is exposed to this implement agent;
  edit-time Pi-lens results were inconclusive/baseline-sensitive, so these direct
  changed-path checks supplement rather than masquerade as an active LSP scan.
- `ruff-baseline.json`: HEAD/current comparisons of every 14 changed tracked
  Python files, rules `UP009,UP012,UP037,E402,I001,SIM105,S110,F`, have no increased
  counts. All four new root-helper files are clean for these rules. Mirror warnings
  marked STOP by the edit-time checker are first-seen inherited style, not new
  defects. No suppression or unrelated style refactor was added.

**One invalid check orchestration was diagnosed, not hidden:** `full-first.log`
ran while the parallel typecheck/build clean step removed `trellis-core/dist`.
Seven suites failed importing `@mindfoldhq/trellis-core/task`, and three built-CLI
platform tests exited during the same removal window; 1,857 CLI tests still passed.
The cause was concurrent destructive build setup, not a runtime/test flake. Gates
were then serialized, giving `full-final.log` (2,026 CLI passes before the final
partial-runtime case) and `full-final-v2.log` (2,027). No automatic reruns, product
budget increases, env stripping or preload hacks were used.

### Preservation and protocol controls

`before-hashes.json` snapshots 92 paths before source edits; the verification
script refuses to overwrite that snapshot. Six pre-matched consumer copies remain
byte-identical; three new root-helper copies are installed beside unchanged stdin
helpers in `.claude/hooks`, `.codex/hooks`, `.cursor/hooks`.

```bash
uv run --locked python .trellis/tasks/11-09-hook-trellis-root/research/verify-python.py
```

`python-final.log`: CPython **3.9.25 compiles all 84 tracked/new Python files**
(81 product files plus three task-local verification scripts), using temp pyc paths; **28 script twins, 6 consumer twins, 3 stdin helpers and 3 root
helpers match**, and **86 preserved hashes match**. In particular, all three
already-divergent subagent dogfood copies, `.pi`, local workflow and the common
script trees are unchanged. Marketplace and other maintainer tasks were not edited.

The root test runs original HEAD source through the same installer rewrite and
compares exact exit/stdout/stderr for **all eight ordinary-root protocols**, with
nonempty controls. Root selection is tested separately with actual parent/child
PRDs, avoiding the earlier task's weak silent-subagent control. Existing escaped
realpath protections remain intact and their external-context/pointer canaries do
not leak. No task #591 stdin reader/deadline/Python pipe behavior was modified.

### Built distribution and ownership

```bash
uv run --locked python .trellis/tasks/11-09-hook-trellis-root/research/distribution-smoke.py
uv run --locked pnpm --filter @mindfoldhq/trellis exec npm pack --dry-run --json
```

`distribution-smoke.json` contains each real built-binary command/output/exit code;
`distribution-final.log` reports success. Init explicitly selects all twelve Python
platforms plus `--with-statusline`. Every generated root helper matches canonical
bytes and its SHA-256 receipt. Initial and post-upgrade dry-runs are clean. A removed
file WITH its receipt remains intentionally deleted after force-update. Removing
files AND receipts models the prior release and installs all twelve new assets.
Uninstall dry-run owns all twelve helper paths; dirty `uninstall --yes` correctly
refuses, retaining workflow and helpers. No fixture commit or bypass was used.
This exercises ZCode's direct provider and Snow/Codex/Copilot private paths, not
merely registry enumeration.

`pack-dry-run.json`: **835 entries**, including
`dist/templates/shared-hooks/trellis_hook_paths.py`, with no `__pycache__` or `.pyc`.
The only npm warning is the pre-existing unknown project config key
`ignore-workspace-root-check`; packaging itself exits 0. Dist was rebuilt, never
hand-edited or copied back to source.

### Additional impacts and handoff

`implement-impacts.log` repeats the planned canonical pre-edit upstream analyses.
Additional `_handle_codex_subagent_start` and annotation-only `build_breadcrumb`
analyses are LOW: one direct main caller / one affected process each. New fixture
helpers were unindexed before creation; a later `workspace` impact has UNKNOWN
edges, manually limited to its same-file root-test callers. Hidden dogfood `main`
impacts return UNKNOWN, not LOW/unused; their scope is established by inspected
entrypoints, canonical pair provenance and byte snapshots.

After the final approved `analyze --force --index-only`, `root-impact.json` reports
the new canonical helper as **CRITICAL: 8 direct callers, 20 impacted symbols,
8 grouped hook processes**. User was warned. `detect-all.txt` reports the expected
tracked scope: **20 files, 15 symbols, 25 flows, CRITICAL**, limited to the announced
hook/support boundary. Untracked helper/test additions are not included by that
diff scan; main MUST run staged detection after review/staging. No index entries,
commits, archives, pushes or nested agents were created by the implement agent.

The implementation-pass handoff above is superseded by the independent review
below. Native POSIX execution remains a CI requirement; Windows junction/native-3.9
evidence must not be described as POSIX validation.

## Independent full-scope check (2026-11-10)

Review base remained `2db66eab854db531ca9a6f993068634ae92dd94d`; all dirty paths
belong to task #6. Read the full check manifest/specs, artifacts, source/mirror
diffs, new test, support collector paths and evidence runners. No nested agents,
index staging, commits, archives, pushes or billed host sessions were performed.

### Findings fixed

1. **P2 — unreadable nearer marker aborts the entire search.**
   `trellis_hook_paths.py:find_trellis_root` caught `OSError` around the whole
   ancestor loop. On actual CPython 3.9, a patched `Path.is_dir` / `is_file`
   raising `PermissionError` for an invalid child caused `None` despite an
   accessible valid parent. `review-red.log` contains **2 failed / 2 passed**
   selected tests before the fix (the other 27 were excluded by the test-name
   filter, not new skip declarations). Resolve errors still return `None` with
   no lexical fallback; per-candidate `OSError` now skips only that candidate.
   Applied to canonical helper and its three new dogfood siblings; no consumer,
   session policy, common runtime or stdin helper needed another change.
2. **P3 — task-local evidence paths break on archival.** Three Python runners
   used `parents[4]`; `strict-test-types.mjs` used the equivalent fixed URL depth.
   They now discover only an enclosing checkout containing
   `packages/cli/src/templates`, failing rather than borrowing home/global state.
   `snapshot.py` also publishes with `open('xb')`, preserving the original even
   if an existence check races. `review-evidence-portability.log` proves all
   four root-selection blocks work at active/archive depths, runs an archived
   snapshot fixture, and confirms repeat/racing writes refuse without changing
   bytes. Original `before-hashes.json` SHA-256 remains
   `0ae314a02423439b8731994e560ffbff9aad968a3bec2cae67c9e7629c260229`.

Pre-edit refreshed GitNexus root impact: **CRITICAL**, 8 direct callers, 20
impacted symbols, 8 grouped hook processes (`review-root-impact.json`); warning
reported before edits. Hidden helper mirrors return UNKNOWN/unindexed, not
unused; their provenance and installed importers are established by the byte
checks and consumer inventory. Only the narrow helper behavior changed.

### Additional review controls and conclusions

- Added two real generated private SessionStart controls with
  `PYTHONIOENCODING=cp1252`, Unicode task titles and parsed `SessionStart`
  envelopes. Both pass on Windows CPython 3.9, showing removal of pre-root
  inline encoding is not being masked by the suite's usual UTF-8 environment.
- Marked the HEAD comparison explicitly as a **worktree-vs-HEAD compatibility
  smoke**, not a frozen historical oracle. Its prior nonempty byte comparison
  is useful during this port; after commit independent layout/PRD/envelope
  assertions remain the persistent regressions. No shallow-clone-unsafe hash pin.
- Kept the narrow local runtime presence checks. The partial-root poison/global
  package tests demonstrate why `__init__.py` plus `active_task.py` is necessary;
  extracting a whole bootstrap framework would expand scope, not improve this fix.
- Architecture/security/adversarial passes checked root candidate precedence,
  partial-child isolation, canonicalization failure, Git boundaries, linked
  workflow containment, malformed marker types, no-root side effects and
  source-to-installed support ordering. No remaining in-scope findings.
- Evidence runners intentionally fail fast on malformed self-generated JSON
  snapshots/receipts. Their unchecked-JSON editor warnings are verification-context
  false positives; catching parse errors into empty proof would weaken the checks.
  No suppressions or catch-and-ignore blocks were added.
- No callable active LSP interface is exposed to this check agent. Direct strict
  test TypeScript, basedpyright and real 3.9 compile are the available validators;
  automatic edit-time reports are not misrepresented as an active LSP scan.

### Fresh verification after fixes

All commands below ran in this independent review through `uv run --locked`
with the same explicit pnpm PATH documented above. Required gates were serialized,
not run alongside clean/build steps:

```bash
uv run --locked pnpm lint
uv run --locked pnpm typecheck
uv run --locked pnpm --filter @mindfoldhq/trellis lint:py
uv run --locked pnpm build
uv run --locked pnpm test
```

- `review-lint.log`, `review-typecheck.log`, `review-build.log`: exit 0.
- `review-lint-py.log`: **0 errors / 68 unchanged baseline warnings**.
- `review-full.log`: core **401 passed / 2 existing skips**; CLI **2,031 passed /
  35 existing skips**, 89 passing files / 1 existing skipped file.
- `review-focused.log`: the same seven focused files listed earlier,
  **185 passed / 1 existing skip**; root suite **31 passed** (4 added by review).
  No retry flags, timeout increases, new skip declarations or environment hacks.
- `review-changed-python-types.log`: explicit direct basedpyright of all 18
  changed canonical/dogfood product Python paths, `--pythonversion 3.9`,
  **0 errors / 0 warnings**. An initial shell output-redirection typo prevented
  launching that validator; corrected destination, then the validator ran once.
- `strict-test-types.mjs`: **0 diagnostics**; test-file Prettier check passes.
- `review-python.log`: **84 files compile on CPython 3.9.25**, 28 common script
  twins / 6 consumer twins / 3 stdin helpers / 3 root helpers match;
  **86 protected hashes match**, including drifted subagent copies, `.pi`, local
  workflow and untouched common runtime scripts.
- Rebuilt binary `distribution-smoke.py`: all twelve helpers match source and
  receipts, optional statusline exists, no-op/update/deletion-preservation/
  uninstall ownership and dirty-refusal controls pass (`review-distribution.log`
  and refreshed `distribution-smoke.json`).
- `review-pack-dry-run.json`: **835 entries**, canonical root helper present and
  equal to rebuilt dist, no Python caches. Npm output is a package-name-keyed
  object on this host, not an array; a verification-only array-shape assumption
  was corrected before the successful artifact assertions. Only the known npm
  `ignore-workspace-root-check` warning remains.
- `git diff --check` passes. Refreshed approved cached GitNexus
  `review-detect-all.txt`: **20 tracked files / 15 symbols / 25 flows, CRITICAL**,
  expected hook/support scope. Untracked helpers/test/evidence still require the
  main session's final staged scan; this review did not stage anything.

Remaining handoff: main-session precise staging, final staged detection, attributed
commit and normal scoped archive. Native POSIX still needs CI validation. Stop
before task #7 launcher implementation or billed host sessions pending user design
approval.

## Second independent check — preserve marker OR semantics (2026-11-10)

This section supersedes the first review's completion claim and final counts.
Main reported a fresh actual CPython 3.9 probe: parent `.trellis/scripts` is valid,
child `.trellis/config.yaml` is valid, and only the child's `workflow.md.is_file`
raises `PermissionError`. The per-candidate catch still selected the parent
(`valid_child_selected: false`, `parent_selected: true`), violating the OR rule
and nearer-valid-root isolation. This is a confirmed P2 selector defect, not an
argument for changing any caller, runtime bootstrap or session policy.

### Pre-edit impact and narrow fix

Fresh upstream analysis using only the approved cached GitNexus CLI reports
**CRITICAL: 8 direct callers, 20 impacted symbols, 8 grouped hook processes**
(`review2-root-impact.json`). `review2-root-context.json` confirms the indexed
canonical helper is the then-current per-candidate implementation. Caller
inspection covers the legacy adapter, shell fallback, three SessionStart paths,
workflow entrypoint, Snow and optional statusline. Warning was reported before
editing. The three hidden mirrors return **UNKNOWN / target not found**
(`review2-mirror-impacts.txt`), not unused; their canonical provenance is checked
byte-for-byte by the existing verification runner. No index refresh was necessary.

Only `find_trellis_root` in `packages/cli/src/templates/shared-hooks/trellis_hook_paths.py`
and its three new `.claude`/`.codex`/`.cursor` mirrors changed product behavior in
this pass. An inaccessible `.trellis` directory still skips the whole candidate;
start resolution failure still returns `None`. A short loop calls each bound
internal marker predicate under its own `OSError` boundary. Any successful
alternative selects the child before visiting a parent. The module still exposes
only the existing public `find_trellis_root`; no helper merging, caller changes,
framework extraction or common-runtime policy change was made.

### Persistent RED / GREEN

Three new cases in `test/scripts/hook-root.integration.test.ts` use real temporary
parent/child layouts, the generated helper, actual CPython 3.9 and isolated stdlib
`Path.is_file` fault injection:

- Valid child config with failed workflow stat: child must win.
- Valid child scripts with both earlier file stats failing: child must win.
- Both child file stats failing with no other valid marker: valid parent wins.

The test-name-filtered command was run before and after the product fix:

```bash
uv run --locked pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/hook-root.integration.test.ts -t 'marker stat errors preserve sibling alternatives'
```

`review2-red.log`: **2 failed / 1 passed**. `review2-green.log`: **3 passed**.
The 31 excluded cases in those filtered runs are not new skip declarations.
`review2-main-probe.json` independently repeats main's exact config-only child
probe after the fix: Python **3.9.25**, `valid_child_selected: true`,
`parent_selected: false`. No real ACL manipulation or filesystem-root writes
were used; this evidence must not be presented as a native ACL or POSIX test.
The executable spec and design now distinguish directory-wide failure from
individual alternative failure, with exact assertions for all three cases.

### Fresh post-fix verification

All checks used `uv run --locked` and the explicit real pnpm PATH documented
above. All five required gates ran again, serialized, each exiting 0:

```bash
uv run --locked pnpm lint
uv run --locked pnpm typecheck
uv run --locked pnpm --filter @mindfoldhq/trellis lint:py
uv run --locked pnpm build
uv run --locked pnpm test
```

- `review2-{lint,typecheck,build}.log`: success. `review2-lint-py.log`:
  **0 errors / 68 unchanged baseline unused-import warnings**.
- `review2-full.log`: core **401 passed / 2 existing skips** (21 files);
  CLI **2,034 passed / 35 existing skips** (89 passing / 1 existing skipped file).
- `review2-focused.log`: same seven focused files, **188 passed / 1 existing
  skip**; root suite **34 passed**. No new skips, retries or timeout increases.
- `review2-strict-test-types.log` and refreshed `strict-test-types.json`:
  **0 diagnostics**; explicit test-file Prettier check passes.
- `review2-changed-python-types.log`: direct basedpyright of all 18 changed
  canonical/dogfood product Python paths, `--pythonversion 3.9`, **0 errors /
  0 warnings**. No callable active LSP tool is exposed to this check agent;
  main's session-only false-positive classification of fail-fast JSON proof
  parsing remains intact. No verification runner, suppression or catch was added.
- `review2-python.log` (rechecked after gates): CPython **3.9.25 compiles 84
  files**; **28 script twins, 6 consumer twins, 3 stdin helpers, 3 root helpers**
  match; **86 protected hashes** match. The original snapshot hash remains
  `0ae314a02423439b8731994e560ffbff9aad968a3bec2cae67c9e7629c260229`.
- `review2-distribution.log` and refreshed `distribution-smoke.json`: rebuilt
  init installs all **12** helper paths with current canonical bytes/receipts,
  optional statusline present; no-op, prior-release upgrade, intentional deletion,
  uninstall ownership and dirty refusal all pass.
- `review2-pack-dry-run.json` / `review2-pack-assertions.log`: **835 entries**,
  helper present at **1,312 bytes**, rebuilt dist byte-identical, no Python caches.
  Current canonical helper SHA-256 is
  `45e6732aaae8d494c3d263006273b2e2acd43c5187b36df0b75f58a45ab139f6`.
  Only the known npm `ignore-workspace-root-check` warning remains.
- `git diff --check` passes. `review2-detect-all.txt` again reports expected
  **20 tracked files / 15 symbols / 25 flows, CRITICAL**. The untracked helpers,
  root test and task evidence remain outside that diff scan; main must run final
  staged detection. No staging, commit, archive, push, nested agent or billed
  host session was performed.

No remaining in-scope findings after this second review. Native POSIX and real
ACL execution remain unverified on this Windows host. Main owns precise staging,
final staged GitNexus detection, the attributed local commit and normal scoped
archive; task #7 and billed sessions remain outside this review.
