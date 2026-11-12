# Local task runner for this Trellis checkout.
#
# `install` replaces the machine `trellis` and `tl` commands with this
# checkout. The shims point at packages/cli/bin/trellis.js, so later source
# edits are picked up by `just build` without reinstalling.
#
# `trellis upgrade` runs `npm install -g @mindfoldhq/trellis@<tag>` and
# replaces those shims with the published package. Run `just install` again
# to point the machine back at this checkout.

set working-directory := "."

# just defaults to `sh -cu` on every OS, including Windows. This machine's
# interactive PATH has no `sh` (Git Bash is not on PATH), so recipes must
# use a shell that is always present.
set windows-shell := ["cmd.exe", "/c"]
# List recipes.
default:
    @just --list

# Install dependencies, build, and point global trellis/tl at this checkout.
[group('setup')]
install:
    node scripts/just-tasks.mjs install

# Remove this checkout's global trellis/tl shims. Does not install the npm release.
[group('setup')]
uninstall:
    node scripts/just-tasks.mjs uninstall

# Show whether the resolved trellis/tl commands are this checkout. Exits 1 if not.
[group('setup')]
which:
    node scripts/just-tasks.mjs which

# Install workspace dependencies.
[group('setup')]
deps:
    node scripts/just-tasks.mjs deps

# Build @mindfoldhq/trellis-core, then @mindfoldhq/trellis.
[group('dev')]
build:
    node scripts/just-tasks.mjs build

# Build, then run core and CLI tests.
[group('dev')]
test:
    node scripts/just-tasks.mjs test

# Lint TypeScript and the CLI Python sources.
[group('check')]
lint:
    node scripts/just-tasks.mjs lint

# Typecheck core and CLI.
[group('check')]
typecheck:
    node scripts/just-tasks.mjs typecheck

# eslint --fix on both packages, then prettier on the CLI.
[group('dev')]
fmt:
    node scripts/just-tasks.mjs fmt

# Delete package dist outputs.
[group('dev')]
clean:
    node scripts/just-tasks.mjs clean

# Build core, then watch the CLI TypeScript compiler.
[group('dev')]
dev:
    node scripts/just-tasks.mjs dev

# Run the same checks as .github/workflows/ci.yml.
[group('check')]
ci:
    node scripts/just-tasks.mjs ci
