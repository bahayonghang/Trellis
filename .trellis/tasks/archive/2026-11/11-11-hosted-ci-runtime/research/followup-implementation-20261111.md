# Classified hosted blockers — implementation and focused evidence

## Scope

Main classified the newly reachable failures in run43146333078 and added the finite R6/design boundaries before dispatch. This follow-up modifies three SessionStart source/mirror files and four directly owning fixture files; no other runtime/source, settings, hashes, deadlines, concurrency, existing skip eligibility or public JSON/root-selection contract was changed.

- Codex/Copilot `configure_project_encoding` still reuses the existing optional Windows common helper, then configures the selected hook's stdout through `getattr`/`callable` reconfigure support on every platform. Calls remain after valid owned-workspace selection. Unix stdin/stderr and the global common helper are unchanged; `ensure_ascii=False` and JSON shape stay unchanged. The tracked Codex hook mirror matches the Codex template as UTF8 text.
- `runHookProbe` adds the source shared-hook directory to the generated importlib probe's sys.path before loading that source module. This is a test import environment fix for adjacent support files, not a production import/containment change. The existing six symlink/escaping-ref cases and their existing platform eligibility remain intact.
- Doctor's four physical-root assertions and hook-root's shared ticket/Snow assertions use native physical canonicalization. Exact identity remains exact (`toBe`, or exact array membership / the existing exact formatted Repo line). No substring rewriting, case folding, root-resolver change or product workaround.
- OMP's `makeOmpProject` uses already-imported `os.tmpdir()` instead of TMPDIR-or-/tmp. One new persistent test explicitly deletes TMPDIR in its own process, checks the OS-temp fixture location and task file, restores the original variable and removes only its created fixture.

## Impact and tool limitation

Loaded python-design, script-conventions and relevant trellis-meta architecture/hook notes. An incremental index-only refresh returned malformed name/file impact targets with no symbol IDs and an unrelated88-symbol/43-direct CRITICAL fan-out through mem/configurator code. Exact UIDs were initially missing, so no edit was made on that result. Reported this anomaly to main; main warned the user. A full `analyze --index-only --force` rebuild restored correct owning nodes without changing tracked guides/skills.

After recovery, exact UIDs reported:

- Both template `configure_project_encoding`: LOW,1 direct main caller,2 upstream symbols,1 process.
- `runHookProbe`, `assertSelected`, `makeOmpProject`: LOW,1 direct each, no affected indexed production processes.
- Dogfood `.codex/hooks/session-start.py` is excluded from the index (exact UID not found); static inspection shows its single main caller and unchanged ownership gate. It was UTF8-text-identical to the template before and after this repair.
- Doctor test file impact: no upstream callers resolved (UNKNOWN, not proof of being unused); the changes touch only its four existing anonymous test assertions. Existing named helpers were not modified there.

The installation still lacks FTS; exact UID graph impact works after the rebuild. The anomalous/recovered tool outputs are retained in the agent tool transcript; this receipt records the corrected authoritative scope rather than counting unrelated fan-out as product impact.

## Isolated RED/GREEN

Owned fixture root: `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-followup-df71447bd61b4c75a828fdf0bf832e53`. Extracted a read-only HEAD archive into `snapshot`, attached existing dependency junctions, copied in the new OMP guard, and used native child Vitest processes. No shared-worktree revert/stash/index changes. The Windows physical Temp root has a genuine short alias `C:/Users/lyh/AppData/Local/Temp/TRB6BB~1/SHORT_~1`; the same alias is used before and after assertion fixes. TMPDIR is absent for the explicit OMP case.

| Check | RED | GREEN | Raw files under fixture root |
| --- | --- | --- | --- |
| New OMP absent-TMPDIR guard | exit1, expected OS temp but original fixture chose /tmp | exit0,1 pass/24 filtered | `omp-red-absent-tmpdir.log`, `omp-green-absent-tmpdir.log` |
| Existing doctor nested canonical-root case under8.3 Temp | exit1, exact short-versus-long identity assertion fails | exit0,1 pass/33 filtered | `doctor-red-short-confirmed.log`, `doctor-green-short.log` |
| Existing hook-root ordinary case under8.3 Temp | exit1, exact ticket physical identity mismatch | exit0,1 pass/33 filtered | `hook-root-red-short-confirmed.log`, `hook-root-green-short.log` |
| Both existing encoding helpers with cp1252 stdout and simulated nonWindows common no-op | exit1, both UnicodeEncodeError | exit0, decoded Unicode JSON retained for both | `encoding-red.log`, `encoding-green.log`, `encoding-final-green.log` |
| Actual source `runHookProbe` function, baseline versus corrected | original raises ModuleNotFoundError trellis_hook_input | corrected emits SOURCE_HOOK_LOADED | `hook-source-import-red-green.log` |

Expanded short-path GREEN coverage after the fixes: doctor4/4 formerly failing identity cases passed,30 other cases filtered (`doctor-green-short-all-four.log`); hook-root9/9 layout/precedence cases passed,25 others filtered (`hook-root-green-short-all-nine.log`). The source-fixture CLI dist junction points to the unchanged doctor product implementation; these fixture corrections do not alter that implementation.

The encoding control parses and compiles each actual helper's AST, provides an explicitly cp1252 TextIOWrapper and a common helper no-op to reproduce its nonWindows boundary, then writes/decodes actual Unicode JSON. It is a focused helper control on Windows, not a claimed Linux full-hook run. Existing full Codex/Copilot nonUTF8 subprocess regressions remain the durable platform guards; the two actual Linux RED cases are already in the hosted log. The source-import control executes the actual original/corrected TypeScript helper with the locally available Python3.9 child command, without changing the existing symlink suite's Windows eligibility. Actual Linux symlink/containment execution remains a hosted gate.

Initial fixture-doctor setup lacked archived dist, so its first failure was missing build output; attaching the existing dist junction allowed the confirmed original short-path assertion RED above. The first broad `ordinary` hook selection also selected the HEAD-byte compatibility case in a non-Git snapshot; the confirmed exact ordinary-layout RED excludes that fixture-only Git prerequisite. These setup failures are not counted as the regression RED evidence.

Fixture and dependency/dist junctions are left at the recorded owned Temp root; no recursive deletion across junctions or old Temp cleanup was performed.

## Focused current-worktree checks

- CLI lint passed; CLI TypeScript `tsc --noEmit` passed.
- Python3.9 compile of the three hook files passed. Final basedpyright passed with0 errors/68 existing warnings (`basedpyright-final.log`). The initial direct TextIO.reconfigure attribute access produced2 type errors; replacing it with getattr+callable fixed the types without ignores or added abstraction. Final helper Unicode control still passes2/2.
- OMP complete file25/25 passed, including the new absent-TMPDIR guard.
- Hook-root complete file34/34 passed, including ordinary current-HEAD protocol byte compatibility, nonUTF8 subprocess output, no-root no-side-effects, root selection and containment guards.
- Existing symlink suite retained its6 existing Windows skips; no new skip is introduced and Linux execution is not claimed locally.
- A combined run overlapped main's dist clean/build: doctor25 passed/9 failed because child imports temporarily found no dist/cli/index.js or no copied template files. That observed output is in the tool transcript; these were build-race errors, not path-identity failures. Main was notified; no code or timeout workaround was made. After main reported final build fully complete/idle, reran **doctor only**, all34/34 passed in83.05s (`doctor-final-full.log`). Other already-passing files were not rerun for the race.
- `git diff --check` and explicit UTF8 Codex source/mirror text parity passed.

No further source/test edits remain pending from the implement agent. Main owns final rebuilt self-use smoke, independent review, normal complete commit checks and hosted four-job validation. This receipt does not claim hosted success for the follow-up until those actual results exist.
