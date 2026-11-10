# Selective port review: mindfold-ai/Trellis#649

Reviewed `gh pr view 649 --repo mindfold-ai/Trellis --json number,title,body,author,state,url,files` and `gh pr diff 649 --repo mindfold-ai/Trellis` on 2026-11-10. Author: Huanyi Xie (`xiehuanyi`); open PR fixes #630. URL: https://github.com/mindfold-ai/Trellis/pull/649.

## Accepted design

- The move already returns the exact destination, including its actual archive month. Pass that `Path` through `cmd_archive` and `_auto_commit_archive` into `safe_archive_paths_to_add`.
- With `task_name`, stage only the concrete archived task plus explicitly modified children. Never fall back to the archive root when the destination is absent.
- Keep source deletion tracking, scoped commit pathspecs, never-tracked source handling (#629), session_auto_commit false and legacy helper behavior intact.
- Port product Python changes and mirror dogfood twins, which were byte-identical before this work. Do not merge whole branches.
- Extend upstream tests to satisfy this task's full matrix: unrelated staged/unstaged/partially staged archived edits together with staged source content; verify HEAD, index blob and working bytes unchanged. Include never-tracked source and auto-commit-disabled cases. Use temporary real Git repositories, no internal mocks.
- Upstream test helper hard-codes `python3` and conditionally skips when absent. Adapt to the native platform interpreter (`python` on Windows); no new skipped tests. Run via `uv run --locked` for checkout Python 3.9.

## Pre-edit scope

Forced GitNexus rebuild completed. Upstream impacts: safe_archive_paths_to_add LOW (one direct caller, two impacted symbols); _auto_commit_archive LOW (one direct cmd_archive caller). cmd_archive UNKNOWN because dictionary dispatch is not recorded; source `task.py` imports it and routes `archive` in its command map. Grep confirms the live chain is task.py → cmd_archive → _auto_commit_archive → safe_archive_paths_to_add. No other product callers found; dot-prefixed twins use identical code.

## Environment

Root uv environment was added separately in dd721110 at the user's request, without a new Trellis task. `.python-version` pins 3.9 and `.venv` contains CPython 3.9.25. Real Python 3.9 py_compile already passes all 73 tracked Python files. Keep pnpm's real executable directory before its broken Scoop shim in PATH for nested lint-staged commands. No need to install additional tools.
