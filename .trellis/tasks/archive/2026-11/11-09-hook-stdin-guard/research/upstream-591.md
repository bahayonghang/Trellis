# Selective port review: mindfold-ai/Trellis#591

Reviewed on 2026-11-10 with `gh pr view 591 --repo mindfold-ai/Trellis --json number,title,body,author,state,url,files` and `gh pr diff 591 --repo mindfold-ai/Trellis`. Open PR by `yao1019` (yaobetter), fixes #590. It copies the existing workflow-state thread/queue reader with a hard-coded 0.2s timeout into three shared hooks.

## Differences required by this task

Do not port the duplication or 0.2s deadline as-is. The PRD requires one helper, a reasonable configurable deadline, delayed valid input, large payloads and opt-in diagnostics. Its claim that daemon shutdown needs no special handling must be validated with actual held-open subprocesses on Python 3.9, not accepted from prose alone. A whole-stream `.read()` worker also cannot consume a complete object while the host keeps its pipe open; test that branch explicitly.

## Complete intake inventory

- Shared SessionStart: main directly json.loads(sys.stdin.read()).
- Shared workflow-state: _load_hook_input thread blocks on whole-stream read; main waits only 0.2s.
- Shared subagent: main uses json.load(sys.stdin).
- Shared shell-session: main directly json.loads(sys.stdin.read()).
- Standalone Codex and Copilot SessionStart: main directly json.loads(sys.stdin.read()).
- Optional Claude statusline: main directly json.loads(sys.stdin.read()).
- Snow: _drain_stdin has separate Windows thread / POSIX select implementations; _parse_stdin_json also supports wrapped payloads. Preserve parser behavior while sharing the bounded read primitive.
- Non-hook add_session.py stdin document input is intentionally excluded. JS/TS extensions receive structured events and do not read a raw pipe.

## Dogfood snapshot before edits

Byte-identical pairs to mirror: .claude/hooks/session-start.py and .cursor/hooks/session-start.py vs shared SessionStart; .codex/hooks/session-start.py vs standalone Codex; .claude/hooks/inject-workflow-state.py and .codex/hooks/inject-workflow-state.py vs shared workflow-state; .cursor/hooks/inject-shell-session-context.py vs shared shell-session.

Installed .claude/.cursor/.codex inject-subagent-context.py copies already differ from canonical source; do not edit them. No installed optional statusline, Snow or Copilot hook was found in the checked local trees. Newly importing copies must receive the canonical support asset. Preserve all unrelated drift.

## Pre-edit impact and caller scope

Hook main functions are invoked as subprocess entrypoints and resolve LOW (one direct module caller); registry/config wiring supplies the actual platform event callers. Workflow _load_hook_input and Snow _drain_stdin have one direct main caller, LOW. getSharedHookScripts / getSharedHookScriptsForPlatform are CRITICAL because shared support distribution affects 17 grouped configurator/init/update flows. Their real direct path is collectSharedHooks, used by each registered platform collector; standalone Snow delivery has LOW scope through getAllHooks/collectSnowStaticFiles → collectSnowTemplates. Main must warn before editing these shared distribution functions and run final staged detection plus installed-map parity tests.

Use only the cached GitNexus1.6.12 CLI at C:/home/lyh/.npm-global/.cache/_npx/5e786f48223a616c/node_modules/gitnexus/dist/cli/index.js; wrapper/dlx fallback previously fetched unnecessary external-cache dependencies. Force index refresh, no instruction/dependency injection.
