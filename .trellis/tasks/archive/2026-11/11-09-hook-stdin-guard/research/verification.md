# Implementation verification — hook stdin guard

## Design and delivery

Canonical standard-library helper: `packages/cli/src/templates/shared-hooks/trellis_hook_input.py`.
It is installed beside entrypoints, without depending on root discovery or `.trellis/scripts/common`.

`getSharedHookSupportFiles` describes support assets separately from event capabilities.
`getSharedHookScripts` still returns only the four registered entrypoints.
`getSharedHookScriptsForPlatform` prepends support dependencies, reaching both
`collectSharedHooks` and ZCode's direct consumer. Codex/Copilot collector order was
changed so custom SessionStart also follows the helper. Snow's `getAllHooks`
prepends the same canonical asset. Claude's existing shared collector supplies
the optional statusline dependency; its opt-in/update/uninstall residual policy
was not redesigned. Map parity tests pass across the whole registry.

Default deadline is 2 seconds, finite override range (0, 10], invalid values fall
back to 2. Diagnostics are opt-in, category-only stderr. A complete document may
finish before EOF; the full accumulated UTF-8 document is validated. No small
payload limit, timeout reset per chunk, prefix parse or new fallback algorithm.
Snow retains first/last-brace wrapped-payload parsing. Custom completion augments
normal JSON completion, so `{ }` is complete even though its parsed dict is falsy.

## Windows root cause found during implementation

A daemon calling buffered stdin can leave its buffered-reader lock held. The
first implementation deliberately used raw `os.read` instead; a minimal helper
process returned `{}` and exited 0 with its pipe held open, confirming that an
`os._exit` shutdown shim was not justified.

The installed entrypoint experiment nevertheless failed in 8/24 cases: shared,
Codex and Copilot SessionStart and Snow launch subprocesses after intake. A
pending raw Windows pipe read stalled a later Python child inheriting that pipe.
A minimal CPython 3.9.25 probe, with `faulthandler.dump_traceback_later(1)`, reached
`before spawn`, then timed out in `subprocess._communicate` / `_readerthread`;
`os.dup` did not avoid it. This was not fixed by enlarging any timeout.

The Windows worker now uses standard-library ctypes `PeekNamedPipe` and reads
only the available bytes. EOF pipe codes 109/232/233 terminate immediately;
other errors flow through the queue. An event stops polling when the main
thread finishes. POSIX keeps raw daemon reads; redirected regular files are
read directly. No buffered worker reads, POSIX select on Windows, or `os._exit`.
The explicit regression launches an actual inherited-stdin Python subprocess
after the reader returns while the host still holds stdin open.

## Red / green evidence

- `red.log`: first pre-product run, 21 failed / 3 passed. Held-open real hooks
  required safety kills. This also exposed a fixture-only cwd/root mistake,
  corrected before implementation; those unrelated errors are not root proof.
- `red-focused.log`: tightened pre-product controls, 5 failed / 1 passed among
  six selected cases (18 not selected). Decisive prompt data is placed AFTER
  the large padding; delayed 0.5-second input and large full input both fail
  with the old workflow reader. Initial weaker large-input assertion was not
  accepted as evidence.
- `green-initial.log`: raw Windows pending-read problem, 8 failed / 16 passed.
- `green-native.log`: all 24 initial installed-hook cases passed after the
  Windows available-byte fix.
- `targeted.log`: existing fixture import assumptions plus stderr CRLF assertion
  mismatch surfaced; fixed fixture delivery/import paths and newline comparison,
  not runtime semantics.
- `focused-final.log`: 76 passed / 1 pre-existing skip in the two new suites
  and context-limit suite. New suites contain 25 + 13 = 38 tests.
- `full-test-final.log`: core 401 passed / 2 existing skips; CLI 1,999 passed /
  35 existing skips (88 files passed, 1 existing skipped file). New failures,
  retries or skips: none. The first full run had only 19 source-import fixture
  failures in context-limit probes; they now install real hook-map assets.

Default/invalid deadlines are tested with actual held-open processes, not mocked
timers. Native exit 0 is asserted. Valid input arriving after 0.5 seconds is
compared with closed-pipe output for every entrypoint. The helper test hashes the
full Unicode value (`中🧪é` repeated 400,000 times; 3,600,000 UTF-8 bytes). Invalid
and truncated UTF-8, empty/malformed/non-object JSON, read errors and opt-in
stderr categories have real-process coverage. EOF is tested with an accepted
10-second deadline and a 5-second outer safety bound, proving no deadline wait.

## Output controls and dogfood

`valid-output-before.json` and `valid-output-after.json` compare equal after
normalizing only the temporary root. Their subagent control is the original
non-repository silent branch; meaningful research-context output is separately
asserted by the installed-map delayed-input test, and historical full subagent
protocol/context tests pass.

`dogfood-before.json` records all installed Python hook hashes before changes.
Mirrored six pre-identical entrypoints: Claude/Cursor shared SessionStart,
Codex standalone SessionStart, Claude/Codex workflow state, Cursor shell ticket.
Three helper copies are byte-identical to canonical. All three already-drifted
subagent scripts retain their original hashes. Common-script twins are unchanged
and byte-identical. `.pi`, marketplace, local workflow and other tasks are untouched.

## Built distribution and ownership

`distribution-smoke.json` records actual built-binary init with all 12 Python
hook platforms plus `--with-statusline`: exact support bytes and hash receipts,
clean initial dry-run, prior-release new-asset update, clean post-update dry-run,
all 12 helper paths in the uninstall plan, and unchanged dirty-uninstall guard.
`npm pack --dry-run --json` includes `dist/templates/shared-hooks/trellis_hook_input.py`.

Two smoke assumptions were corrected rather than changing product policy:

1. Removing a file WITH a stored receipt is an intentional user deletion;
   update correctly respects it, even with `--force`. A previous release that
   never shipped this helper has neither the file nor its receipt. That real
   upgrade scenario was tested separately and installs all helpers correctly.
2. The fixture has uncommitted spec/tasks/workspace, so `uninstall --yes` correctly
   refuses. No bypass or fixture commit was used. Dry-run verifies ownership;
   existing uninstall tests pass. The temporary fixture is cleaned normally.

## Required checks and supplementary diagnostics

All five checks pass under `uv run --locked`, with the delegated real pnpm
executable first on PATH: lint, typecheck, CLI lint:py, build, test.
Python typecheck: 0 errors / the same 68 baseline unused-import warnings.
Actual CPython 3.9.25 compiles all 77 tracked/new `.py` files using temporary pyc
outputs. Direct changed-hook basedpyright scans are clean.

`strict-test-types.json`: strict TypeScript with a test-aware root checks the
five focused changed files with 0 diagnostics. Including the large historical
regression file yields two TS2345 errors caused by pre-existing JS-template
inference (`getActiveTask`'s null default). Overriding that test file with its
HEAD contents yields exactly the same findings. No unrelated JS typing change
or diagnostic suppression was introduced. The required source tsc gate passes.

Ruff stdin comparisons of HEAD and mirrored files show no newly introduced rule
counts (legacy coding-header, import-order and broad-exception findings remain).
Pi-lens initially reported stale missing-helper imports and later inherited the
legacy mirror warnings as first-seen findings; explicit canonical extraPaths,
fresh basedpyright scans and HEAD comparisons classify them without ignores.

## Additional impact analysis

Main-session pre-edit analysis/warning covered shared distribution (CRITICAL,
17 grouped init/update/configurator flows), all eight hook entrypoints and the
workflow/Snow read wrappers, plus Snow delivery. Additional upstream analyses:

| Symbol | Risk | Direct callers / affected processes |
| --- | --- | --- |
| collectCodexTemplates | CRITICAL | 3 direct; 6 grouped processes (init/update/uninstall/ablate/configure) |
| collectCopilotTemplates | LOW | 1 direct configure path |
| Snow _parse_stdin_json | LOW | 1 direct main; no additional indexed process |
| regression writeProjectFile | MEDIUM | 11 direct fixture callers; no product process |
| runPythonWithLegacyStdinLocale | LOW | fixture callers only |
| Snow writeFixtureRepo / runHook | LOW | fixture callers only |
| context-limit runHookProbe | LOW | fixture callers only; 19 concrete test uses audited |
| new read_hook_stdin, after refresh | CRITICAL | 2 direct (read_hook_json, Snow drain), reaching exactly the 8 inventoried entrypoints |
| new installHooks / probe test helpers | LOW | fixture setup/cases only |

Critical warnings were reported before edits. None extends beyond the announced
hook/distribution boundary. Hidden installed dogfood symbols are not indexed:
impact calls returned UNKNOWN, not LOW; their scope was established from
pre-identical source pairs, direct entrypoint inspection and hash snapshots.
New symbols were initially unindexed, then verified after a forced index-only
refresh using the approved cached GitNexus 1.6.12 CLI. No wrapper/download,
instruction/skill injection, staging or commit was used.

## Unstaged handoff detection

After the final forced index-only refresh, `detect-changes --scope all` reports
28 tracked changed files, 23 symbols and 42 affected processes, CRITICAL as
expected for shared collectors and hook intake. No unexpected product area was
identified. This tracked-diff scan does NOT cover the untracked new helper/test
files; main must run final staged detection after review and staging. Summary is
in `detect-all.json`. Git index remains empty.

## Independent check-agent review (2026-11-10)

Reviewed HEAD `6bfdaeff59290219d78bf352c20fd8ba3cd6ca2b` plus the entire
tracked/untracked task diff. Sequential correctness, security, architecture and
adversarial passes covered the canonical reader, all eight consuming entrypoints,
12-platform distribution (including ZCode's direct getter), optional statusline,
source-import fixtures, mirrored bytes and task/spec contracts. No nested agent.

### Finding fixed

Snow `_drain_stdin` tested the truthiness of `_parse_stdin_json`, so a complete
wrapped empty object (`wrapper\n{ }\nend`) waited until the deadline and emitted
`timeout`. A separate CPython 3.9 held-open probe reproduced it. A table-driven
installed-hook regression was added BEFORE changing product code:

- `vitest run test/scripts/hook-stdin.integration.test.ts -t 'recognizes an empty Snow object'`:
  RED 1 failed / 1 passed; GREEN 2 passed. The 24 unselected cases were filters,
  not new skips; they all ran in the subsequent focused/full suites.
- `_stdin_json_document` now owns validated whole-document / first-last-brace
  extraction for both completion and final parsing. A nonempty document is not
  confused with the falsiness of its decoded dict. Fifteen closed-pipe parser
  controls match HEAD, including invalid input, non-objects and wrapped objects.
- Pre-edit upstream impacts for `_drain_stdin` and `_parse_stdin_json` were LOW:
  Snow main and the completion callback only. After forced index refresh, the
  new extractor is also LOW, with those two direct callers and one grouped Snow
  main flow. No shared-reader or collector change was needed for this fix.

### Fresh verification after the fix

All pnpm commands used `uv run --locked` with the delegated real pnpm PATH;
Python children therefore ran actual CPython 3.9.25.

- `pnpm lint`, `pnpm typecheck`, `pnpm --filter @mindfoldhq/trellis lint:py`,
  `pnpm build`, `pnpm test`: all exit 0. Python: 0 errors / 68 baseline warnings.
  Full tests: core 401 passed / 2 existing skips; CLI 2,000 passed / 35 existing
  skips. Full-suite log: temporary `trellis-check-full.log`.
- `pnpm --filter @mindfoldhq/trellis exec vitest run` with
  `test/scripts/{hook-input-reader,hook-stdin,context-injection-limits}.integration.test.ts`,
  `test/templates/{shared-hooks,snow-write-trellis-context}.test.ts` and
  `test/configurators/platforms.test.ts`: 154 passed / 1 existing skip, six files.
  Log: temporary `trellis-check-focused-final.log`. New reader suites now have
  39 tests, not the implementer's original 38.
- Strict TypeScript program covering the five focused changed tests: 0 diagnostics.
  Direct basedpyright for canonical reader/Snow and the four modified Codex/Cursor
  mirrors: 0 errors / 0 warnings. Root basedpyright covers all product hook files.
- Actual Python 3.9 `py_compile` with temporary pyc destinations: 77 files pass.
  Rechecked 28 script twins, six hook twins, three helper copies, all three
  preserved drift hashes and equality of the eight original output artifacts.
- Ruff stdin HEAD/current comparisons for all 14 changed tracked Python files,
  rules `UP009,E402,I001,SIM105,S110,F`: no increased rule counts. The canonical
  new helper passes this scan. Snow's old counts (UP009=1, I001=1, SIM105=3,
  S110=6) become (1, 1, 2, 4); no new lint suppression or unrelated cleanup.
  Pi-lens edit diagnostics likewise identify only pre-existing Snow findings;
  no available LSP tool was mistaken for a completed active scan.
- Real 3.9 adversarial probes: split CRLF whitespace, a UTF-8 code point arriving
  in three writes, redirected regular-file input and a trickling incomplete
  stream all exit natively. Trickle read duration is 0.250 seconds with a 0.25
  deadline despite continuing writes; no per-chunk reset. Windows stdin was
  confirmed O_BINARY (32768), not guessed to be text-mode. ctypes HANDLE/DWORD
  signatures and borrowed descriptor lifetime were inspected without changing
  the platform workaround.
- Built binary temp-repo init with the same 12 explicit platform flags plus
  `--with-statusline`: canonical bytes and SHA-256 receipts for all 12 helpers.
  Initial/post-upgrade dry-runs are clean; a recorded user deletion stays absent;
  removing files AND receipts models the prior release and update installs all
  12. Uninstall dry-run includes all helper paths; dirty `uninstall --yes` refuses
  and leaves `.trellis` intact. Built Snow with held-open wrapped `{ }` exits 0,
  stderr empty, and emits nonempty Trellis context.
- Final `npm pack --dry-run --json` (lifecycle scripts enabled): 834 entries;
  canonical helper present; no `__pycache__` or `.pyc`. Review-only probe setup errors (inline
  Python quoting, npm 12's object-keyed JSON manifest, and Windows closed-writer
  errno 22) were corrected at their observed boundaries, then assertions rerun;
  no product change, larger budget, retry option or environment stripping.

Forced index-only refresh used ONLY the approved cached GitNexus 1.6.12 CLI.
Post-review `detect-changes --scope all`: 28 tracked files, 24 symbols,
43 affected processes, CRITICAL as expected for the previously warned shared
hook/collector boundary. The new Snow extractor accounts for the additional
symbol/flow; no unrelated product area. This remains an UNSTAGED tracked-diff
scan, not a substitute for main's final staged scan of new assets/tests.

No remaining in-scope findings. Native POSIX execution is still unverified on
this Windows host and remains a CI follow-up. `.pi`, marketplace, local workflow,
CLI document stdin and other tasks remain untouched. The spec now explicitly
requires wrapped-empty-object completion; doc debt: none.

## Main-session final gate

Final staged GitNexus detection included all new helper/assets/tests: 45 files,
63 symbols, 43 expected hook/distribution flows, CRITICAL within the warned scope.
Commit `9d0c72f7 fix(hooks): bound stdin intake across Python hook entrypoints`
includes `Ported from mindfold-ai/Trellis#591`. The real pre-commit hook ran
lint-staged and the complete core/CLI suites successfully. The working tree was
clean after that commit. Normal scoped archive is separate bookkeeping.

Fresh main LSP requests remained inconclusive (server startup/push-only coverage),
not a clean-file claim; direct validators and the reviewed baseline comparison
above supply the check evidence. Eight existing Snow Ruff findings were explicitly
deferred for this session without suppressions; the reader's two AST advisories
were reviewed as handled invalid-setting fallback and synchronized Queue/Event
communication. No new blocking finding remains in this change. No push, amend,
hook bypass or nested review-agent spawning.
