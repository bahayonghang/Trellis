# First post-fix hosted matrix: newly reachable blockers

Run https://github.com/bahayonghang/Trellis/actions/runs/43146333078 (push), source `c8972b98a0ca686581587a515f4af7713d6c58e8`, completed/failure. All four Checkout steps and Python3.9 setup steps succeeded. Ubuntu24.04 Node18 and Windows Node18 jobs succeeded including the built CLI smoke. Full logs are saved under `C:/Users/lyh/AppData/Local/Temp/trellis-runtime-ci-43146333078/` by job ID.

| Job | ID | Actual outcome |
| --- | --- | --- |
| Ubuntu24.04 / Node18.17 | 130944906124 | success, CPython3.9.25 and CLI smoke |
| Windows / Node18.17 | 130944906101 | success, CLI smoke |
| Ubuntu24.04 / Node26.7 | 130944906136 | core404 pass/1 existing skip; CLI2270 pass/4 fail |
| Windows / Node26.7 | 130944905755 | core403 pass/2 existing skips; CLI2250 pass/22 fail/35 existing skips |

The original Linux Python distribution and Windows native-watch failures are repaired in this run. Four-job success is not yet established. No unchanged-head rerun was requested.

## Classified direct blockers to the approved full-matrix acceptance

1. Two Linux SessionStart Unicode-output tests fail: Codex/Copilot print `json.dumps(..., ensure_ascii=False)` but their `configure_project_encoding` delegates to `common.configure_encoding`, which only acts on Windows. Explicit cp1252 stdout on Linux therefore raises UnicodeEncodeError on Unicode context. This is a hook output defect; fix only the owned-workspace stdout boundary. Preserve normal UTF8 stdout bytes, JSON schema and root/containment selection. Do not globally reconfigure common or change ensure_ascii to bypass the current-HEAD byte-compatibility test. Preliminary exact symbol impact LOW for each template helper:1 direct main caller,2 upstream symbols,1 process.
2. Two Linux symlink hook probes fail with `ModuleNotFoundError: trellis_hook_input`. `runHookProbe` dynamically imports the source hook by filename but does not put the source module's companion directory on sys.path. Generated installed hooks already include these support files. Repair the test probe import environment only; preserve positive symlink behavior and escaping-ref rejection.
3. Windows doctor4 and hook-root9 assertions compare two aliases of the same physical path. The log explicitly shows expected `C:\Users\RUNNER~1\...` versus actual `C:\Users\runneradmin\...`. Existing Node legacy fs.realpathSync retains8.3 components while Python/native canonicalization expands them. Use native physical canonicalization in those identity assertions; do not change product root selection, weaken exact equality or normalize arbitrary substrings.
4. Windows OMP9 fixture failures are `ENOENT mkdtemp '\tmp\trellis-omp-XXXXXX'`. `makeOmpProject` uses `process.env.TMPDIR ?? '/tmp'` although os is already imported. Windows runners need `os.tmpdir()` when TMPDIR is absent. Fix that fixture line and prove the absent-variable case; do not create a fake system /tmp or add a CI Temp override.

These additions implement step9/R5's already-approved diagnose-and-classify requirement and directly block its four-job criterion. The product goal, supported versions, API/protocol/permission boundaries and no-npm scope stay unchanged. Updated R6/design record the finite follow-up boundaries before code changes. Other unrelated defects remain outside the task.

## Additional pre-edit checks

An independent Node26 probe on the recorded physical watch directory confirmed legacy `fs.realpathSync` returns `.../TRA2F2~1/OBSERV~1` while `.native` returns the same directory's expanded long name. This directly supports the fixture canonicalization diagnosis, beyond the hosted expected/actual strings.

The implementer's incremental index refresh initially caused malformed target results (no symbol ID) and unrelated CRITICAL fan-out. No source was edited on that result. After an index-only forced graph rebuild, exact UID queries returned the expected owning targets: template encoding helpers LOW (1 direct main caller,2 upstream symbols,1 process), probe/assertion/OMP fixture helpers LOW (1 direct caller each). The dogfood Codex helper is excluded from the graph; its source is byte-identical to the template before changes and has a single main caller. The anomaly/correction was communicated before proceeding, and raw impact results are retained by the implementer. No GitNexus source/tool installation was modified.
