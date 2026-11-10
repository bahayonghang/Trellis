# Selective #650 review

Upstream: https://github.com/mindfold-ai/Trellis/pull/650 (OPEN when reviewed).
Commands: explicit-field `gh pr view 650 --repo mindfold-ai/Trellis --json number,title,body,state,url,files` and `gh pr diff 650 --repo mindfold-ai/Trellis`.

## What is reused

The defect and regression scenarios: subagent discovery stops at a nested `.git`, or finds no Git repository even though an enclosing Trellis workspace exists. Select the nearest valid Trellis ancestor instead, without changing task-pointer resolution or existing realpath containment.

## Why this is not a wholesale port

- Upstream accepts any `.trellis` directory. The fork already proved that a home `.trellis/spec-inject` cache is not a workspace. Reuse the stricter existing workflow predicate: directory plus `workflow.md` file, `config.yaml` file, OR `scripts` directory.
- Upstream changes only subagent root search. The local request explicitly extends the rule to every Python platform hook, whose current implementations differ.
- Upstream overwrites three dogfood subagent copies. Those copies already differ from the canonical template here; preserve them byte-for-byte under the user's continuation constraints. Synchronize only pre-matched copies.
- Upstream skips directory-symlink tests on Windows. Do not port that skip: use an actual directory junction on Windows and a directory symlink on POSIX, with no new skips or retries.
- Existing context/session fallback, task containment and linked-workflow handling are not replaced by upstream's wider changes.

## Source inventory before implementation

| Consumer | Existing discovery | Intended root adaptation |
| --- | --- | --- |
| Shared subagent `find_repo_root` | First `.git`, excludes filesystem root | Shared valid predicate; legacy string adapter if needed |
| Shared workflow `find_trellis_root` | Correct marker predicate, excludes filesystem root | Canonical shared predicate; retain caller's payload/cwd choice |
| Shared shell `_find_trellis_root` | Any `.trellis`, inclusive walk | Canonical predicate; preserve payload-then-process-cwd fallback |
| Shared SessionStart `main` | First platform env hint, else normalized payload/default cwd, assumes already at root | Walk from the same selected hint; gate persistence on a discovered root |
| Codex/Copilot SessionStart `main` | Normalized payload/default cwd, assumes already at root | Walk from the same selected hint; gate encoding/context on a root |
| Snow `_find_repo_root` | Any `.trellis`, else start path | Canonical predicate; no-root return before `.snow/log` writes |
| Optional Claude statusline `_find_trellis_dir` | Any `.trellis` ancestor | Canonical predicate and no-root silent return |

There are eight consuming Python entrypoints. `trellis_hook_input.py` is input-only, not an entrypoint. `scripts/hooks/linear_sync.py` is a task-lifecycle callback using common runtime paths, not a platform workspace walker. OpenCode JS plugins use their host's supplied `directory`; Pi/OMP extensions are separate TypeScript integrations. Do not refactor their host contracts or the common Python resolver in this port.

## Distribution and compatibility

Task #591 just established support-file delivery distinct from four shared event names. Add one stdlib-only root module through that existing support-file list. Snow already collects all support assets, and Codex/Copilot install support before custom SessionStart. Verify actual generated/packaged artifacts for all twelve Python-hook platforms and optional statusline; do not assume enumeration implies installation.

Preserve per-hook candidate precedence, Windows shell-path normalization, output envelopes, session identity/fallback policy, symlink containment and the bounded input helper. Marker-only partial installations must not fall back into an enclosing workspace or import an unrelated global `common` package. No Codex launcher fix, billed host session, `.pi` edit, marketplace edit or local workflow overwrite belongs here.
