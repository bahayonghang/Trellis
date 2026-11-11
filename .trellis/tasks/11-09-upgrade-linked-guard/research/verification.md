# Upgrade guard verification

## Scope and impact

GitNexus refreshed with `analyze --index-only` before implementation.
Upstream impact of `upgrade` is LOW: one direct caller, `src/cli/index.ts`,
zero affected processes. The CLI's anonymous command callback is unindexed;
file-level impact returned UNKNOWN/zero edges. Direct source search identifies
the single upgrade command wiring site; UNKNOWN is not a proof of zero impact.

The runtime detector uses the executing module's path, not the user's cwd.
No package identity, installer script, dependency or global npm upgrade policy
is changed. `just which` before acceptance confirmed trellis/tl resolve to
this checkout's shims under the existing npm global prefix.

## Validation

- RED before product edits: checkout refusal case failed (upgrade resolved
  instead of rejecting); 1 failed / 10 passed in that run.
- GREEN: 18 upgrade tests, lint, typecheck, build, focused ESLint/Prettier and
  diff checks passed. Tests inject the npm runner, so do not install a package.
- `just install` completed successfully on Windows with no lockfile changes.
- Installed `trellis upgrade --dry-run` exited 0, detected this checkout,
  reported npm installation blocked, and printed git pull / just build/install.
- Installed `trellis upgrade --dry-run --force-npm` exited 0 and printed
  `npm install -g @mindfoldhq/trellis@latest` with no installation.
- Installed `trellis upgrade` exited 1 with refusal and guidance. `just which`
  afterwards still resolved trellis/tl to this fork's shims.
- Independent review: no blockers or edits. Lint, typecheck, 18/18 focused
  tests, Prettier and diff checks passed independently.
- Full pre-commit result: pending implementation commit.

No official npm upgrade was executed, and no remote push was made.
