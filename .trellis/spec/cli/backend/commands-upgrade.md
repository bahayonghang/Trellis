# `trellis upgrade` Command

How `trellis upgrade` upgrades the globally installed Trellis CLI package.

This command is intentionally separate from `trellis update`:

- `trellis upgrade` updates the **CLI binary** by running npm's global install.
- `trellis update` updates a **project's bundled Trellis files** under `.trellis/`
  and platform directories.

---

## User-facing contract

```text
trellis upgrade [--tag <tag-or-version>] [--dry-run] [--force-npm]
```

Behavior:

- Package installations build and run `npm install -g @mindfoldhq/trellis@<tag>`.
- A CLI running from a git checkout refuses npm installation by default. Detection
  walks ancestors of the CLI module's real location, accepts a `.git` directory
  or worktree file, and exempts paths under `node_modules`. The user's working
  directory does not determine how the CLI is installed.
- Checkout refusal recommends `git pull`, then `just build` or `just install`.
- `--force-npm` explicitly allows replacing a checkout link with the official
  npm package; it is not forwarded as npm's `--force` flag.
- POSIX execution must spawn `npm` directly without shell execution.
- Windows execution must route through `cmd.exe /d /s /c npm install -g ...`
  instead of directly spawning `npm.cmd`.
- Uses the current CLI channel by default:
  - stable versions install `@latest`
  - `-beta.*` versions install `@beta`
  - `-rc.*` versions install `@rc`
- `--tag <tag-or-version>` overrides the inferred channel. Accept simple npm
  dist-tags or versions such as `latest`, `beta`, `rc`, or `0.6.0-beta.8`.
- `--dry-run` reports checkout detection and exits without changing anything.
  A protected checkout reports that npm installation would be blocked; package
  installations and explicit overrides print the exact npm command.

Outside git checkouts, npm remains the upgrade backend regardless of which
manager installed Node. The guard does not rewrite shims or install paths.

---

## Failure behavior

- If npm is unavailable, fail with the manual npm command.
- If npm exits non-zero, surface the exit code.
- If npm is interrupted by a signal, report the signal.
- Append troubleshooting guidance for npm global prefix / PATH mismatches,
  permissions, existing-bin or locked-file conflicts, and the manual command.
- Do not automatically run `sudo`, pass `--force`, rewrite npm prefix, delete
  files, or detect package managers.
- Reject shell-shaped `--tag` input before spawning npm. Never build a shell
  command string for POSIX execution.

## Success behavior

After npm reports success, print both:

```text
trellis --version
```

and a platform-specific binary-resolution check:

```text
which trellis   # POSIX
where trellis   # Windows
```

This catches the common case where npm installed into one global prefix while
the user's shell still resolves an older `trellis` binary earlier on PATH.

---

## Update hints

Any user-facing hint that previously said:

```text
npm install -g @mindfoldhq/trellis@latest
```

should now prefer:

```text
trellis upgrade
```

This applies to CLI startup warnings, `trellis update` downgrade guidance, and
session-start update hints.

---

## Test requirements

- Tag inference: stable → `latest`, beta → `beta`, RC → `rc`.
- Explicit tag override.
- Invalid tag rejection.
- POSIX direct npm command with `shell: false`.
- Windows `cmd.exe /d /s /c npm ...` command plan with `shell: false`.
- Dry-run does not spawn npm.
- Non-zero npm exit becomes a command failure with troubleshooting guidance.
- Real filesystem fixtures cover checkout directories, worktree files, npm
  `node_modules` paths inside checkout ancestors, and cwd independence.
- Checkout mutation refuses before the npm runner is called; explicit override
  invokes the unchanged npm command; both checkout dry-run branches never spawn.
