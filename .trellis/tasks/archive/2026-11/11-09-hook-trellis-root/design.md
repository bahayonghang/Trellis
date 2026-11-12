# Design: one valid-workspace rule for Python platform hooks

## Boundary

Selectively adapt #650 across the eight Python consumers inventoried in `research/upstream-650.md`. This changes workspace selection only; task/session resolver policy and context containment remain unchanged. No Python common-runtime root-policy change and no JS/TypeScript host-integration rewrite.

## Root contract

A standalone stdlib module, `trellis_hook_paths.py`, exposes a typed `find_trellis_root(start: str | Path) -> Path | None` (with postponed annotations for Python 3.9). It imports no project-local `common` module and performs no writes.

Resolve the starting path, inspect it and every parent INCLUDING the filesystem root, and select the first directory whose `.trellis` is a directory and contains a `workflow.md` file, `config.yaml` file, or `scripts` directory. `.git` is neither a prerequisite nor a stopping condition. Empty, cache-only, file-valued and broken markers are skipped. Use `is_dir`/`is_file`, not name-only existence. An `OSError` checking the `.trellis` directory skips that candidate and continues to accessible ancestors. Check its three internal marker alternatives independently: one marker's `OSError` cannot suppress an accessible valid sibling. Continue to a parent only if no alternative validates the child. Failure to resolve the starting path returns `None`; never continue with an unsafe lexical path. Do not invent Git/home fallback or global import fallback.

A symlinked `.trellis` validates through its target, but the result remains its containing workspace. Do not dereference that marker into a different project root. Existing subagent `realpath` containment continues to allow the actual workflow store as its second permitted base.

## Callers

- Preserve each hook's current source-hint order and normalization. A common root walker is not a new cross-hook candidate-selection policy.
- Use direct imports/aliases where signatures already match. Keep a tiny compatibility adapter only where a legacy API returns `str` or the `.trellis` directory rather than the workspace.
- No-root returns exit 0 with empty stdout/stderr before context-key/env persistence, encoding setup, ticket creation, Snow log writes or statusline Git queries. This includes optional statusline, as required by the PRD.
- Marker-only partial installations are still valid roots. A consumer lacking its project runtime must degrade safely at that chosen root, not search an enclosing workspace or import global `common`. Keep any needed dependency-presence guard narrow and cover it with a regression.
- Ordinary-root output envelopes and task context remain unchanged. Do not alter native-vs-legacy session fallback, selection isolation, task pointers, JSONL containment, bounded stdin settings or support/event capability separation.

## Distribution

Add the new module to the existing shared support-file list from #591. Keep four shared event entrypoints and all event registrations unchanged. Existing collectors distribute support modules before entrypoints; verify Snow and ZCode's direct path plus Codex/Copilot custom SessionStart and optional statusline. Init, update, hashes, package contents and uninstall ownership must include the second helper.

Snapshot dogfood hashes first. Mirror only the six currently matching consumer scripts; add the root helper beside the existing stdin helper in `.claude/hooks`, `.codex/hooks`, `.cursor/hooks`. Keep three already-divergent subagent scripts, `.pi`, marketplace and `.trellis/workflow.md` unchanged.

## Verification

RED first against current source: generated Claude PreToolUse and native Codex SubagentStart must demonstrate real task-context selection, not just helper output. Exercise all eight consumers for ordinary root, subdirectory, nested Git/worktree marker, non-Git workspace, nearer valid workspace, nearer invalid marker and no valid workspace. Check no-root side effects as well as output.

Test every validity alternative and negative file/directory shape, inclusive filesystem-root search without writing at the real drive root, and actual workflow symlinks/junctions with safe-containment controls. Preserve a valid-root protocol/control comparison. Use generated asset collectors in fixtures, with strict TypeScript checking for test files and actual Python 3.9 subprocess/compile checks. No new skips/retries/timeouts.

Run lint, typecheck, Python check, build and full tests via `uv run --locked`; independently review before main-session staged GitNexus detection and a commit attributed to #650.

## Rollback

Revert helper delivery and every importing consumer together. Never leave consumers importing an unshipped helper. Keep this independently reviewable from #591 and the later Codex launcher task. Native POSIX execution remains a CI check on this Windows host; do not claim it from Windows-only evidence.
