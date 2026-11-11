# Draft PR proposal

Repository: bahayonghang/Trellis
Base: main
Head: dev
Draft: true
Title: ci: validate fork reliability v1 on Windows and Linux

## Body

This fork adds a native Windows/Ubuntu CI matrix, versioned Claude/Codex hook
payload replay, and read-only `trellis doctor` diagnostics. The branch also
contains the preceding reliability fixes and their local evidence. The PR is
for CI acceptance within this fork.

Node26.7 jobs run full lint, TypeScript/Python typecheck and core/CLI tests,
including replay and doctor. All four OS/runtime rows build and smoke the CLI
with Python3.9 in Chinese/space paths. Node18.17 runs built output because
Vitest4 requires a newer runtime.

Local source evidence at1eba38f6 records core401/CLI2239 passing tests and the
existing Windows skips. Native Codex0.167.1 Windows delivery is separately
recorded in task research. Hosted results are pending. Replay and doctor do
not establish native host delivery. The three children and parent remain open
until their actual CI and integration acceptance requirements hold.
