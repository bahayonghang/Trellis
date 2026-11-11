# Independent check

## Finding and local fix

Found a Windows init-migration preservation defect: `configureCodex` put the
safe command-only plan back into `writeTemplateMap`, whose second render rewrote
user-owned `python3` literals. An isolated built configurator control changed
both `userNote: "python3 must stay"` and a custom
`python3 custom-user-hook.py` command despite the pure planner preserving them.

The durable force-reinit regression failed before the fix; its skip-reinit
control passed. Both assert all CRLF/format bytes and the resulting receipt.
The narrow fix excludes an existing hooks plan from the second render and uses
the existing `writeFile` conflict/recording path for a proven migration. Fresh
defaults retain the normal map writer. No shared renderer, model-key logic,
Python hook or hash API was changed. The corresponding Codex spec now states
this exact-content write boundary.

Before editing `configureCodex`, precise GitNexus upstream impact reported LOW:
14 upstream nodes, 2 direct callers, one grouped `handleReinit` flow. This stays
inside the approved task scope.

## Independent verification after the fix

All runtime commands used `uv run --locked`: CPython 3.9.25 / Node 26.7.0,
native Windows. No build/test distribution races occurred.

- PASS: configurator 17 + pure planner 17 + init/update integration 11 = 45 tests.
- PASS: actual generated launcher matrix, 45 tests, including raw cmd /C and
  pwsh, actual task context, nearest real worktrees, Chinese/space/non-Git paths,
  fixed-source decoding and direct/native bounded-stdin controls.
- PASS: whole-platform configuration/parity suite, 57 tests.
- PASS: serial lint, typecheck and build; focused formatting and diff checks.
- PASS: strict TypeScript including all three new test files, 0 diagnostics.
- PASS: rebuilt isolated configurator control now equals the pure plan bytes
  and retains both user-owned `python3` literals.
- PASS: rebuilt CLI init/migration/dry-run/no-op/uninstall-preview/refusal smoke.
- PASS: all 89 protected file hashes unchanged; approved dogfood hooks JSON
  exactly matches the generated python3 rendering.

No remaining blocking code finding. Full pre-commit is the coordinator's next
gate and is not claimed here. Native Linux/remote Actions and real Codex 0.167.0
host/trust acceptance remain unverified. These shell/automation results do not
complete that acceptance or permit task archival.

## Explicit Git Bash shell controls

Ran the actual new commands from built init-generated hooks JSON with the
installed `C:/Program Files/Git/bin/bash.exe` in `-lc` mode. Four controls passed:
root and `packages/cli/src`, each with UserPromptSubmit and SubagentStart. Every
control asserts the event and actual breadcrumb/PRD context, not merely exit 0.
Both layouts retained their temporary cwd and resolved CPython 3.9.25 through
`uv run --locked`; shell/hook stderr was empty. Preliminary `-lc` and `-c` cwd/
version checks also passed without changing profiles, config or environment.

Durable reproduction from repository root after build:
`uv run --locked node .trellis/tasks/11-09-codex-subdir-hooks/research/git-bash-bootstrap-probe.mjs "C:/Program Files/Git/bin/bash.exe"`.
The executable path is an explicit probe argument, never generated config.
The task-local JavaScript probe passed syntax, ESLint and formatting checks;
no product code, shared test dependency, skip, timeout or trust state changed.
Git Bash remains a Windows shell check, not native POSIX/Linux or real Codex
0.167.0 host acceptance.
